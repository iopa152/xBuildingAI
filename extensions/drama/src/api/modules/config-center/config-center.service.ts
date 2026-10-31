import * as net from "node:net";

import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import { AirwallexConfig } from "../../db/entities/airwallex-config.entity";
import { PaymongoConfig } from "../../db/entities/paymongo-config.entity";
import { StripeConfig } from "../../db/entities/pay-entities.entity";
import { ThirdPartyConfig } from "../../db/entities/config-center.entity";
import { VodConfig } from "../../db/entities/vod-config.entity";
import { Drama } from "../../db/entities/drama.entity";

/**
 * Server-side catalog: which providers exist per config category. Field
 * schemas (labels/placeholders) live on the console frontend.
 */
export const CONFIG_CATALOG: Record<string, { providers: string[]; label: string }> = {
    customer_service: { providers: ["whatsapp", "telegram", "viber"], label: "客服配置" },
    push: { providers: ["firebase", "onesignal"], label: "消息推送" },
    sms: { providers: ["twilio", "vonage", "infobip"], label: "短信服务" },
    email: { providers: ["smtp"], label: "邮件服务" },
    oauth: { providers: ["google", "facebook", "apple"], label: "三方登录" },
    distribution: { providers: ["rebate"], label: "分销配置" },
    heat: { providers: ["algorithm"], label: "短剧热度" },
};

@Injectable()
export class ConfigCenterService extends BaseService<ThirdPartyConfig> {
    private readonly logger = new Logger(ConfigCenterService.name);

    constructor(
        @InjectRepository(ThirdPartyConfig)
        private readonly configRepository: Repository<ThirdPartyConfig>,
        @InjectRepository(VodConfig)
        private readonly vodRepository: Repository<VodConfig>,
        @InjectRepository(StripeConfig)
        private readonly stripeRepository: Repository<StripeConfig>,
        @InjectRepository(AirwallexConfig)
        private readonly awxRepository: Repository<AirwallexConfig>,
        @InjectRepository(PaymongoConfig)
        private readonly paymongoRepository: Repository<PaymongoConfig>,
        @InjectRepository(Drama)
        private readonly dramaRepository: Repository<Drama>,
    ) {
        super(configRepository);
    }

    // ---------------- summary (hub cards) ----------------

    /**
     * Card summary for the hub page. VOD / payment statuses come from their
     * dedicated config tables; the rest from the generic storage.
     */
    async summary() {
        const rows = await this.configRepository.find();
        const byCategory = new Map<string, ThirdPartyConfig[]>();
        for (const row of rows) {
            const list = byCategory.get(row.category) ?? [];
            list.push(row);
            byCategory.set(row.category, list);
        }

        const cards = Object.entries(CONFIG_CATALOG).map(([category, meta]) => {
            const list = byCategory.get(category) ?? [];
            const enabled = list.filter((r) => r.enabled);
            return {
                category,
                label: meta.label,
                providerCount: meta.providers.length,
                configuredCount: list.filter((r) => this.hasContent(r)).length,
                currentProvider: enabled[0]?.provider ?? null,
                configured: list.some((r) => r.enabled && this.hasContent(r)),
            };
        });

        // VOD card: status from the dedicated vod_config table
        const vod = await this.vodRepository.findOne({ where: {}, order: { updatedAt: "DESC" } });
        cards.unshift({
            category: "vod",
            label: "VOD云点播",
            providerCount: 4,
            configuredCount: vod?.accessKeyId ? 1 : 0,
            currentProvider: vod?.accessKeyId ? "aliyun" : null,
            configured: Boolean(vod?.enabled && vod?.accessKeyId),
        });

        // Payment card: aggregate the three channel tables
        const [stripe, awx, paymongo] = await Promise.all([
            this.stripeRepository.findOne({ where: {}, order: { updatedAt: "DESC" } }),
            this.awxRepository.findOne({ where: {}, order: { updatedAt: "DESC" } }),
            this.paymongoRepository.findOne({ where: {}, order: { updatedAt: "DESC" } }),
        ]);
        const payChannels = [
            { key: "stripe", ok: Boolean(stripe?.enabled && stripe?.secretKey) },
            { key: "airwallex", ok: Boolean(awx?.enabled && awx?.clientId && awx?.apiKey) },
            { key: "paymongo", ok: Boolean(paymongo?.enabled && paymongo?.secretKey) },
        ];
        const currentPay = payChannels.find((c) => c.ok)?.key ?? null;
        cards.splice(1, 0, {
            category: "pay",
            label: "支付配置",
            providerCount: 8,
            configuredCount: payChannels.filter((c) => c.ok).length,
            currentProvider: currentPay,
            configured: currentPay !== null,
        });

        return cards;
    }

    // ---------------- per-category CRUD ----------------

    async listByCategory(category: string) {
        const meta = CONFIG_CATALOG[category];
        if (!meta) throw HttpErrorFactory.badRequest(`未知配置分类: ${category}`);
        const rows = await this.configRepository.find({
            where: { category },
        });
        return meta.providers.map((provider) => {
            const row = rows.find((r) => r.provider === provider);
            return {
                provider,
                enabled: row?.enabled ?? false,
                config: row?.config ?? {},
                remark: row?.remark ?? "",
                verified: row?.verified ?? false,
                configured: row ? this.hasContent(row) : false,
            };
        });
    }

    async saveProvider(
        category: string,
        provider: string,
        dto: { enabled?: boolean; config?: Record<string, unknown>; remark?: string },
    ) {
        const meta = CONFIG_CATALOG[category];
        if (!meta || !meta.providers.includes(provider)) {
            throw HttpErrorFactory.badRequest(`未知配置项: ${category}/${provider}`);
        }
        // enabling one provider disables its siblings (one active provider per card)
        if (dto.enabled) {
            const siblings = await this.configRepository.find({ where: { category } });
            for (const sib of siblings) {
                if (sib.provider !== provider && sib.enabled) {
                    await this.configRepository.update(
                        { id: sib.id },
                        { enabled: false },
                    );
                }
            }
        }
        const existing = await this.configRepository.findOneBy({ category, provider });
        if (existing) {
            const patch: Partial<ThirdPartyConfig> = {};
            if (dto.enabled !== undefined) patch.enabled = dto.enabled;
            if (dto.remark !== undefined) patch.remark = dto.remark.slice(0, 300);
            if (dto.config !== undefined) {
                // merge so omitted secret fields don't wipe stored values
                patch.config = { ...existing.config, ...dto.config };
            }
            // content changed → previously verified flag no longer trustworthy
            if (dto.config !== undefined) patch.verified = false;
            await this.configRepository.update({ id: existing.id }, patch);
        } else {
            await this.configRepository.insert(
                this.configRepository.create({
                    category,
                    provider,
                    enabled: dto.enabled ?? false,
                    config: dto.config ?? {},
                    remark: (dto.remark ?? "").slice(0, 300),
                }),
            );
        }
        const row = await this.configRepository.findOneBy({ category, provider });
        return {
            provider: row!.provider,
            enabled: row!.enabled,
            config: row!.config,
            remark: row!.remark,
            verified: row!.verified,
            configured: this.hasContent(row!),
        };
    }

    // ---------------- test connection ----------------

    async testConnection(category: string, provider: string) {
        const row = await this.configRepository.findOneBy({ category, provider });
        if (!row) return { ok: false, message: "尚未保存配置" };
        const cfg = row.config ?? {};
        let result: { ok: boolean; message: string } = { ok: false, message: "不支持该类型的测试" };

        try {
            if (category === "email" && provider === "smtp") {
                result = await this.testSmtp(
                    String(cfg.host ?? ""),
                    Number(cfg.port ?? 465),
                );
            } else if (category === "customer_service") {
                const link = String(cfg.link ?? "");
                const patterns: Record<string, RegExp> = {
                    whatsapp: /^https:\/\/(wa\.me|chat\.whatsapp\.com)\//,
                    telegram: /^https:\/\/(t\.me|telegram\.me)\//,
                    viber: /^https:\/\/(viber\.com|chats\.viber\.com)\//,
                };
                const ok = patterns[provider]?.test(link) ?? /^https?:\/\//.test(link);
                result = ok
                    ? { ok: true, message: "客服链接格式正确" }
                    : { ok: false, message: `链接格式不符合 ${provider} 规范` };
            } else if (category === "oauth") {
                const ok = Boolean(cfg.clientId && cfg.clientSecret);
                result = ok
                    ? { ok: true, message: "OAuth 凭据已填写完整" }
                    : { ok: false, message: "clientId / clientSecret 未填写完整" };
            } else if (category === "push" || category === "sms") {
                const values = Object.values(cfg).filter(
                    (v) => typeof v === "string" && v.length > 4,
                );
                result =
                    values.length >= 2
                        ? { ok: true, message: "服务凭据已填写完整" }
                        : { ok: false, message: "服务凭据未填写完整" };
            }
        } catch (err) {
            result = { ok: false, message: (err as Error).message };
        }

        await this.configRepository.update(
            { id: row.id },
            { verified: result.ok },
        );
        return result;
    }

    private testSmtp(host: string, port: number): Promise<{ ok: boolean; message: string }> {
        if (!host) return Promise.resolve({ ok: false, message: "SMTP 主机未填写" });
        return new Promise((resolve) => {
            const socket = net.createConnection({ host, port: port || 465 });
            const finish = (ok: boolean, message: string) => {
                socket.destroy();
                resolve({ ok, message });
            };
            socket.setTimeout(4000);
            socket.on("connect", () => finish(true, `SMTP ${host}:${port} 连接成功`));
            socket.on("timeout", () => finish(false, "连接超时（4 秒）"));
            socket.on("error", (err) => finish(false, `连接失败: ${err.message}`));
        });
    }

    // ---------------- import / export ----------------

    async exportAll() {
        const rows = await this.configRepository.find({ order: { category: "ASC", provider: "ASC" } });
        return rows.map((row) => ({
            category: row.category,
            provider: row.provider,
            enabled: row.enabled,
            config: this.maskConfig(row.config),
            remark: row.remark,
        }));
    }

    async importAll(
        rows: {
            category: string;
            provider: string;
            enabled?: boolean;
            config?: Record<string, unknown>;
            remark?: string;
        }[],
    ) {
        let imported = 0;
        for (const item of rows ?? []) {
            if (!CONFIG_CATALOG[item.category]) continue;
            if (!CONFIG_CATALOG[item.category].providers.includes(item.provider)) continue;
            await this.saveProvider(item.category, item.provider, {
                enabled: item.enabled,
                config: item.config,
                remark: item.remark,
            });
            imported += 1;
        }
        return { imported };
    }

    private maskConfig(config: Record<string, unknown>): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(config ?? {})) {
            const sensitive = /secret|password|token|key/i.test(k);
            out[k] = sensitive && typeof v === "string" && v.length > 6
                ? `${v.slice(0, 4)}***${v.slice(-3)}`
                : v;
        }
        return out;
    }

    private hasContent(row: ThirdPartyConfig): boolean {
        const values = Object.values(row.config ?? {});
        return values.some((v) => typeof v === "string" ? v.trim().length > 0 : v !== null && v !== undefined);
    }

    // ---------------- heat ----------------

    /**
     * Recompute drama heat from engagement metrics using the configured
     * weights: view/like/favorite/comment/rating + optional decay by days.
     */
    async computeHeat() {
        const cfgRow =
            (await this.configRepository.findOneBy({ category: "heat", provider: "algorithm" }))
                ?.config ?? {};
        const w = {
            view: Number(cfgRow.viewWeight ?? 1),
            like: Number(cfgRow.likeWeight ?? 5),
            favorite: Number(cfgRow.favoriteWeight ?? 10),
            comment: Number(cfgRow.commentWeight ?? 8),
            rating: Number(cfgRow.ratingWeight ?? 20),
        };
        // note: Drama has no commentCount column; the comment weight is kept
        // in the config for forward-compatibility but not summed here.
        const decayDays = Number(cfgRow.decayDays ?? 0);

        const dramas = await this.dramaRepository.find();
        const now = Date.now();
        let updated = 0;
        for (const drama of dramas) {
            let heat =
                (drama.viewCount ?? 0) * w.view +
                (drama.likeCount ?? 0) * w.like +
                (drama.favoriteCount ?? 0) * w.favorite +
                Math.round((drama.ratingAvg ?? 0) * (drama.ratingCount ?? 0) * w.rating);
            if (heat < 0) heat = 0;
            if (decayDays > 0 && drama.updatedAt) {
                const days = Math.floor((now - new Date(drama.updatedAt).getTime()) / 86_400_000);
                const factor = Math.pow(0.5, days / decayDays);
                heat = Math.round(heat * factor);
            }
            await this.dramaRepository.update({ id: drama.id }, { heat });
            updated += 1;
        }
        this.logger.log(`heat recomputed for ${updated} dramas (weights: ${JSON.stringify(w)})`);
        return { updated, weights: w, decayDays };
    }

    // ---------------- public (H5) ----------------

    /** Enabled customer-service entry for the H5 floating/profile link */
    async customerService() {
        const rows = await this.configRepository.find({
            where: { category: "customer_service", enabled: true },
        });
        const row = rows[0];
        if (!row) return null;
        return {
            provider: row.provider,
            link: String(row.config?.link ?? ""),
            remark: row.remark,
        };
    }
}
