import { createSign, randomBytes } from "crypto";

import { DataSource } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import { ThirdPartyConfig } from "../../db/entities/config-center.entity";

interface ProviderEndpoints {
    authorize: (clientId: string, redirectUri: string, state: string) => string;
    token: (code: string, cfg: Record<string, unknown>, redirectUri: string) => Promise<string>;
    userinfo: (
        accessTokenOrIdToken: string,
    ) => Promise<{ openId: string; nickname?: string; email?: string; avatar?: string }>;
}

/** Apple client_secret: ES256-signed JWT from the .p8 key in the config */
function appleClientSecret(cfg: Record<string, unknown>): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "ES256", kid: String(cfg.keyId ?? "") };
    const payload = {
        iss: String(cfg.teamId ?? ""),
        iat: now,
        exp: now + 15_777_000,
        aud: "https://appleid.apple.com",
        sub: String(cfg.clientId ?? ""),
    };
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const input = `${b64(header)}.${b64(payload)}`;
    const privateKey = String(cfg.privateKey ?? "").replace(/\\n/g, "\n");
    const signer = createSign("sha256");
    signer.update(input);
    signer.end();
    return signer.sign(privateKey).toString("base64url");
}

const PROVIDERS: Record<string, ProviderEndpoints> = {
    google: {
        authorize: (clientId, redirectUri, state) =>
            `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("openid email profile")}&state=${state}`,
        token: async (code, cfg, redirectUri) => {
            const res = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    code,
                    client_id: String(cfg.clientId ?? ""),
                    client_secret: String(cfg.clientSecret ?? ""),
                    redirect_uri: redirectUri,
                    grant_type: "authorization_code",
                }),
            });
            const data = (await res.json()) as { access_token?: string; error_description?: string };
            if (!res.ok || !data.access_token) {
                throw new Error(data.error_description ?? `Google token HTTP ${res.status}`);
            }
            return data.access_token;
        },
        userinfo: async (accessToken) => {
            const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const u = (await res.json()) as { sub: string; name?: string; email?: string; picture?: string };
            return { openId: u.sub, nickname: u.name, email: u.email, avatar: u.picture };
        },
    },
    facebook: {
        authorize: (clientId, redirectUri, state) =>
            `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=email`,
        token: async (code, cfg, redirectUri) => {
            const url =
                `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${encodeURIComponent(String(cfg.clientId ?? ""))}` +
                `&client_secret=${encodeURIComponent(String(cfg.clientSecret ?? ""))}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`;
            const res = await fetch(url);
            const data = (await res.json()) as { access_token?: string; error?: { message?: string } };
            if (!data.access_token) throw new Error(data.error?.message ?? `Facebook token HTTP ${res.status}`);
            return data.access_token;
        },
        userinfo: async (accessToken) => {
            const res = await fetch(
                `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`,
            );
            const u = (await res.json()) as { id: string; name?: string; email?: string; picture?: { data?: { url?: string } } };
            return { openId: u.id, nickname: u.name, email: u.email, avatar: u.picture?.data?.url };
        },
    },
    apple: {
        authorize: (clientId, redirectUri, state) =>
            `https://appleid.apple.com/auth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("name email")}&response_mode=form_post&state=${state}`,
        token: async (code, cfg, redirectUri) => {
            const res = await fetch("https://appleid.apple.com/auth/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    code,
                    client_id: String(cfg.clientId ?? ""),
                    client_secret: appleClientSecret(cfg),
                    redirect_uri: redirectUri,
                    grant_type: "authorization_code",
                }),
            });
            const data = (await res.json()) as { id_token?: string; error_description?: string };
            if (!data.id_token) throw new Error(data.error_description ?? `Apple token HTTP ${res.status}`);
            return data.id_token;
        },
        // Apple identity comes from the id_token claims, no extra call
        userinfo: async (idToken) => {
            const claims = JSON.parse(
                Buffer.from(idToken.split(".")[1], "base64").toString("utf8"),
            ) as { sub: string; email?: string };
            return { openId: claims.sub, email: claims.email };
        },
    },
};

/**
 * OAuth login for the drama H5: provider config lives in the 配置中心
 * (category oauth, provider google/facebook/apple). Users are upserted into
 * the platform user table (openid = oauth:<provider>:<sub>) and a session
 * token row is issued the same way the platform login does.
 */
@Injectable()
export class OauthService {
    private readonly logger = new Logger(OauthService.name);
    private readonly states = new Map<string, { provider: string; createdAt: number }>();

    constructor(private readonly dataSource: DataSource) {}

    private repo() {
        return this.dataSource.getRepository(ThirdPartyConfig);
    }

    private async providerConfig(provider: string): Promise<Record<string, unknown> | null> {
        const row = await this.repo().findOneBy({ category: "oauth", provider });
        return row?.enabled && row.config && Object.keys(row.config).length > 0 ? row.config : null;
    }

    async redirectUrl(provider: string, baseDomain: string): Promise<string> {
        const endpoints = PROVIDERS[provider];
        if (!endpoints) throw HttpErrorFactory.badRequest(`不支持的三方登录: ${provider}`);
        const cfg = await this.providerConfig(provider);
        if (!cfg) throw HttpErrorFactory.badRequest("该三方登录未配置或未启用");

        const state = randomBytes(12).toString("hex");
        this.states.set(state, { provider, createdAt: Date.now() });
        for (const [k, v] of this.states) {
            if (Date.now() - v.createdAt > 10 * 60 * 1000) this.states.delete(k);
        }
        const redirectUri =
            String(cfg.redirectUri ?? "").trim() ||
            `${baseDomain.replace(/\/$/, "")}/drama/api/oauth/${provider}/callback`;
        return endpoints.authorize(String(cfg.clientId ?? ""), redirectUri, state);
    }

    /**
     * Exchange the code, upsert the user, issue a session token. Returns the
     * H5 URL (hash router) the browser should be redirected to.
     */
    async handleCallback(
        provider: string,
        code: string,
        state: string,
        baseDomain: string,
        h5Origin: string,
    ): Promise<string> {
        const endpoints = PROVIDERS[provider];
        if (!endpoints) throw HttpErrorFactory.badRequest(`不支持的三方登录: ${provider}`);
        const st = this.states.get(state);
        if (!st || st.provider !== provider || Date.now() - st.createdAt > 10 * 60 * 1000) {
            throw HttpErrorFactory.badRequest("state 已过期，请重新发起登录");
        }
        this.states.delete(state);

        const cfg = await this.providerConfig(provider);
        if (!cfg) throw HttpErrorFactory.badRequest("该三方登录未配置或未启用");
        const redirectUri =
            String(cfg.redirectUri ?? "").trim() ||
            `${baseDomain.replace(/\/$/, "")}/drama/api/oauth/${provider}/callback`;

        const accessToken = await endpoints.token(code, cfg, redirectUri);
        const profile = await endpoints.userinfo(accessToken);
        const openid = `oauth:${provider}:${profile.openId}`;

        const q = (sql: string, params: unknown[]) =>
            this.dataSource.query(sql, params) as Promise<Record<string, unknown>[]>;

        const existing = await q(`SELECT id, username FROM public."user" WHERE openid = $1`, [openid]);
        let userId: string;
        let username: string;
        if (existing.length > 0) {
            userId = String(existing[0].id);
            username = String(existing[0].username);
        } else {
            username = `${provider}_${randomBytes(4).toString("hex")}`;
            const userNo = `NO${Date.now()}`;
            const insert = await q(
                `INSERT INTO public."user" (username, password, nickname, openid, source, status, user_no, avatar)
                 VALUES ($1, '', $2, $3, '5'::user_create_source_enum, 1, $4, $5) RETURNING id, username`,
                [username, profile.nickname ?? "用户", openid, userNo, profile.avatar ?? null],
            );
            userId = String(insert[0].id);
            username = String(insert[0].username);
        }

        const payload = { id: userId, username, isRoot: 0, terminal: 1 };
        const jwt = require("jsonwebtoken") as typeof import("jsonwebtoken");
        const token = jwt.sign(payload, process.env.JWT_SECRET || "buildingai", { expiresIn: "30d" });
        await q(
            `INSERT INTO public.user_token (user_id, token, expires_at, terminal, is_revoked)
             VALUES ($1, $2, $3, 1, false)`,
            [userId, token, new Date(Date.now() + 30 * 86_400_000)],
        );
        this.logger.log(`oauth login ok: ${provider} -> user ${userId}`);
        return `${h5Origin.replace(/\/$/, "")}/#/pages/index/index?token=${encodeURIComponent(token)}`;
    }
}
