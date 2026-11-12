import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ExtensionBillingService } from "@buildingai/extension-sdk";
import { Injectable, Logger } from "@nestjs/common";

import {
    DistributionBind,
    InviteCode,
    RebateLog,
    VipMembership,
} from "../../db/entities/distribution-entities.entity";
import { ThirdPartyConfig } from "../../db/entities/config-center.entity";

interface RebateConfig {
    invitePoints: number;
    l1Rate: number;
    l2Rate: number;
    l3Rate: number;
}

/**
 * Distribution: invite codes, 3-level rebate on coin purchases, invite
 * rewards. Commission base is the coin amount credited to the buyer; rates
 * come from the 配置中心 distribution:rebate config.
 */
@Injectable()
export class DistributionService {
    private readonly logger = new Logger(DistributionService.name);

    constructor(
        @InjectRepository(InviteCode)
        private readonly codeRepository: Repository<InviteCode>,
        @InjectRepository(DistributionBind)
        private readonly bindRepository: Repository<DistributionBind>,
        @InjectRepository(RebateLog)
        private readonly rebateRepository: Repository<RebateLog>,
        @InjectRepository(VipMembership)
        private readonly vipRepository: Repository<VipMembership>,
        @InjectRepository(ThirdPartyConfig)
        private readonly tpConfigRepository: Repository<ThirdPartyConfig>,
        private readonly billingService: ExtensionBillingService,
    ) {}

    // ---------------- config ----------------

    private async rebateConfig(): Promise<RebateConfig> {
        const row = await this.tpConfigRepository.findOneBy({
            category: "distribution",
            provider: "rebate",
        });
        const c = row?.config ?? {};
        return {
            invitePoints: Number(c.invitePoints ?? 0),
            l1Rate: Number(c.l1Rate ?? 0),
            l2Rate: Number(c.l2Rate ?? 0),
            l3Rate: Number(c.l3Rate ?? 0),
        };
    }

    // ---------------- invite code ----------------

    /** lazily create the caller's invite code */
    async myInviteCode(userId: string): Promise<string> {
        const existing = await this.codeRepository.findOneBy({ userId });
        if (existing) return existing.code;
        for (let attempt = 0; attempt < 5; attempt++) {
            const code = this.randomCode();
            try {
                await this.codeRepository.insert({ code, userId });
                return code;
            } catch (err) {
                if ((err as { code?: string }).code === "23505") {
                    const dup = await this.codeRepository.findOneBy({ userId });
                    if (dup) return dup.code;
                    continue; // code collision, retry
                }
                throw err;
            }
        }
        throw HttpErrorFactory.badRequest("邀请码生成失败，请重试");
    }

    private randomCode(): string {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let out = "";
        for (let i = 0; i < 8; i++) {
            out += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return out;
    }

    // ---------------- bind ----------------

    /**
     * Bind the caller to an inviter. One-time; self-bind and cycles rejected.
     * Grants the inviter the flat invite reward on success.
     */
    async bind(userId: string, code: string) {
        const invite = await this.codeRepository.findOneBy({
            code: (code ?? "").trim().toUpperCase(),
        });
        if (!invite) throw HttpErrorFactory.badRequest("邀请码不存在");
        if (invite.userId === userId) throw HttpErrorFactory.badRequest("不能邀请自己");

        const existing = await this.bindRepository.findOneBy({ userId });
        if (existing) throw HttpErrorFactory.badRequest("已绑定邀请人，无法重复绑定");

        // reject cycles: walk up from the inviter; if we meet the caller it'd loop
        const chain: string[] = [];
        let cursor: string | null = invite.userId;
        for (let depth = 0; depth < 3 && cursor; depth++) {
            if (cursor === userId) throw HttpErrorFactory.badRequest("邀请链路存在循环");
            chain.push(cursor);
            const up = await this.bindRepository.findOneBy({ userId: cursor });
            cursor = up?.inviterId ?? null;
        }

        await this.bindRepository.insert({ userId, inviterId: invite.userId });

        const cfg = await this.rebateConfig();
        let reward = 0;
        if (cfg.invitePoints > 0) {
            reward = cfg.invitePoints;
            await this.billingService.addUserPower({
                userId: invite.userId,
                amount: reward,
                remark: `邀请奖励 ${userId.slice(0, 8)}`,
            });
            await this.rebateRepository.insert({
                userId: invite.userId,
                fromUserId: userId,
                level: 0,
                coins: reward,
                orderNo: null,
            });
        }
        return { bound: true, inviterId: invite.userId, inviteReward: reward };
    }

    // ---------------- rebate on paid orders ----------------

    /**
     * Called after a coin order completes. Credits L1→L3 commission up the
     * inviter chain (single insert per level, coins = orderCoins × rate%).
     */
    async onPaidOrder(userId: string, orderNo: string, orderCoins: number) {
        try {
            if (orderCoins <= 0) return;
            const cfg = await this.rebateConfig();
            if (cfg.l1Rate <= 0 && cfg.l2Rate <= 0 && cfg.l3Rate <= 0) return;

            const chain: string[] = [];
            let cursor: string | null = userId;
            for (let depth = 0; depth < 3; depth++) {
                const up = cursor
                    ? await this.bindRepository.findOneBy({ userId: cursor })
                    : null;
                if (!up) break;
                chain.push(up.inviterId);
                cursor = up.inviterId;
            }

            const rates = [cfg.l1Rate, cfg.l2Rate, cfg.l3Rate];
            for (let i = 0; i < chain.length; i++) {
                const rate = rates[i] ?? 0;
                const coins = Math.floor((orderCoins * rate) / 100);
                if (coins <= 0) continue;
                await this.billingService.addUserPower({
                    userId: chain[i],
                    amount: coins,
                    remark: `分销返佣 L${i + 1} 订单 ${orderNo}`,
                });
                await this.rebateRepository.insert({
                    userId: chain[i],
                    fromUserId: userId,
                    level: i + 1,
                    coins,
                    orderNo,
                });
            }
        } catch (err) {
            // rebate must never break the payment flow
            this.logger.warn(`rebate failed for order ${orderNo}: ${(err as Error).message}`);
        }
    }

    // ---------------- reports ----------------

    /** caller's distribution center payload (H5) */
    async myDistribution(userId: string) {
        const code = await this.myInviteCode(userId);
        const invitees = await this.bindRepository.find({
            where: { inviterId: userId },
            order: { createdAt: "DESC" },
        });
        const logs = await this.rebateRepository.find({
            where: { userId },
            order: { createdAt: "DESC" },
            take: 50,
        });
        const totalCoins = logs.reduce((sum, l) => sum + l.coins, 0);
        const cfgRow = await this.tpConfigRepository.findOneBy({
            category: "distribution",
            provider: "rebate",
        });
        return {
            inviteCode: code,
            inviteeCount: invitees.length,
            totalCoins,
            minWithdrawAmount: Number(cfgRow?.config?.minWithdrawAmount ?? 0),
            invitees: invitees.map((b) => ({
                userId: b.userId,
                boundAt: b.createdAt,
            })),
            logs: logs.map((l) => ({
                level: l.level,
                coins: l.coins,
                orderNo: l.orderNo,
                createdAt: l.createdAt,
            })),
        };
    }

    /** console report: per inviter aggregates */
    async report(query: { page?: number; pageSize?: number; keyword?: string }) {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.max(1, Math.min(Number(query.pageSize) || 20, 100));
        const keyword = query.keyword?.trim();
        const params: unknown[] = [];
        let where = "";
        if (keyword) {
            params.push(`%${keyword}%`);
            where = `WHERE u.username ILIKE $1 OR u.nickname ILIKE $1`;
        }
        const rows = await this.dataSourceQuery(
            `SELECT b.inviter_id AS inviter_id, COUNT(*)::int AS invitee_count,
                    COALESCE(SUM(r.coins), 0)::int AS rebate_coins, u.username, u.nickname
               FROM drama.distribution_bind b
               LEFT JOIN drama.rebate_log r ON r.from_user_id = b.user_id
               JOIN "user" u ON u.id = b.inviter_id
               ${where}
              GROUP BY b.inviter_id, u.username, u.nickname
              ORDER BY rebate_coins DESC
              LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, pageSize, (page - 1) * pageSize],
        );
        const countRows = await this.dataSourceQuery(
            `SELECT COUNT(DISTINCT b.inviter_id)::int AS total
               FROM drama.distribution_bind b
               JOIN "user" u ON u.id = b.inviter_id
               ${where}`,
            params,
        );
        const logs = await this.dataSourceQuery(
            `SELECT r.level, r.coins, r.created_at, u1.username AS beneficiary,
                    u2.username AS from_username, r.order_no
               FROM drama.rebate_log r
               LEFT JOIN "user" u1 ON u1.id = r.user_id
               LEFT JOIN "user" u2 ON u2.id = r.from_user_id
              ORDER BY r.created_at DESC LIMIT 50`,
        );
        return {
            items: rows.map((r: Record<string, unknown>) => ({
                inviterId: r.inviter_id,
                username: r.username ?? "",
                nickname: r.nickname ?? "",
                inviteeCount: Number(r.invitee_count ?? 0),
                rebateCoins: Number(r.rebate_coins ?? 0),
            })),
            total: countRows[0]?.total ?? 0,
            page,
            pageSize,
            recentLogs: logs.map((r: Record<string, unknown>) => ({
                level: Number(r.level ?? 0),
                coins: Number(r.coins ?? 0),
                beneficiary: r.beneficiary ?? "",
                fromUsername: r.from_username ?? "",
                orderNo: r.order_no ?? null,
                createdAt: r.created_at,
            })),
        };
    }

    private dataSourceQuery(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
        // thin wrapper keeps raw SQL in one style; uses the billing module's
        // datasource via the injected repos
        return (this.rebateRepository.manager.query as (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>)(sql, params);
    }

    // ---------------- drama VIP membership ----------------

    /** grants/extends the caller's drama VIP by package days */
    async grantVip(userId: string, packageId: string, days: number): Promise<void> {
        const existing = await this.vipRepository.findOneBy({ userId });
        const now = new Date();
        if (existing && new Date(existing.endTime) > now) {
            const endTime = new Date(existing.endTime.getTime() + days * 86_400_000);
            await this.vipRepository.update(
                { id: existing.id },
                { endTime, packageId },
            );
        } else {
            const start = existing ? new Date(existing.startTime) : now;
            if (existing) {
                await this.vipRepository.update(
                    { id: existing.id },
                    { packageId, startTime: start, endTime: new Date(now.getTime() + days * 86_400_000) },
                );
            } else {
                await this.vipRepository.insert({
                    userId,
                    packageId,
                    startTime: now,
                    endTime: new Date(now.getTime() + days * 86_400_000),
                });
            }
        }
    }

    async isVip(userId: string): Promise<boolean> {
        const row = await this.vipRepository.findOneBy({ userId });
        return Boolean(row && new Date(row.endTime) > new Date());
    }
}
