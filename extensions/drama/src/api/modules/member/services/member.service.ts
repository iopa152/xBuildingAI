import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User as UserEntity } from "@buildingai/db/entities";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ExtensionBillingService } from "@buildingai/extension-sdk";
import { Injectable } from "@nestjs/common";

import { MemberGroup, MemberRule } from "../../../db/entities/member-entities.entity";

@Injectable()
export class MemberService {
    constructor(
        @InjectRepository(MemberGroup)
        private readonly groupRepository: Repository<MemberGroup>,
        @InjectRepository(MemberRule)
        private readonly ruleRepository: Repository<MemberRule>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        private readonly billingService: ExtensionBillingService,
        private readonly dataSource: DataSource,
    ) {}

    // ---------------- groups ----------------

    async listGroups() {
        return this.groupRepository.find({ order: { sort: "DESC", createdAt: "ASC" } });
    }

    async createGroup(dto: Partial<MemberGroup>) {
        if (!dto.name?.trim()) throw HttpErrorFactory.badRequest("请填写组别名称");
        return this.groupRepository.save(
            this.groupRepository.create({
                name: dto.name.trim(),
                rules: dto.rules ?? [],
                status: dto.status ?? true,
                sort: dto.sort ?? 0,
            }),
        );
    }

    async updateGroup(id: string, dto: Partial<MemberGroup>) {
        const group = await this.groupRepository.findOneBy({ id });
        if (!group) throw HttpErrorFactory.notFound("会员分组不存在");
        await this.groupRepository.update(
            { id },
            {
                name: dto.name?.trim() || group.name,
                rules: dto.rules ?? group.rules,
                status: dto.status ?? group.status,
                sort: dto.sort ?? group.sort,
            },
        );
        return { success: true };
    }

    async deleteGroup(id: string) {
        await this.groupRepository.delete({ id });
        return { success: true };
    }

    // ---------------- rules ----------------

    async listRules() {
        return this.ruleRepository.find({ order: { sort: "DESC", createdAt: "ASC" } });
    }

    async createRule(dto: Partial<MemberRule>) {
        if (!dto.title?.trim()) throw HttpErrorFactory.badRequest("请填写规则标题");
        return this.ruleRepository.save(
            this.ruleRepository.create({
                title: dto.title.trim(),
                path: dto.path?.trim() || undefined,
                icon: dto.icon?.trim() || undefined,
                sort: dto.sort ?? 0,
                status: dto.status ?? true,
            }),
        );
    }

    async updateRule(id: string, dto: Partial<MemberRule>) {
        const rule = await this.ruleRepository.findOneBy({ id });
        if (!rule) throw HttpErrorFactory.notFound("规则不存在");
        await this.ruleRepository.update(
            { id },
            {
                title: dto.title?.trim() || rule.title,
                path: dto.path?.trim() ?? rule.path,
                icon: dto.icon?.trim() ?? rule.icon,
                sort: dto.sort ?? rule.sort,
                status: dto.status ?? rule.status,
            },
        );
        return { success: true };
    }

    async deleteRule(id: string) {
        await this.ruleRepository.delete({ id });
        return { success: true };
    }

    // ---------------- score (coin) logs ----------------

    async memberInfo(userId: string) {
        const user = await this.userRepository
            .createQueryBuilder("u")
            .select(["u.id", "u.username", "u.nickname", "u.power"])
            .where("u.id = :id", { id: userId })
            .getOne();
        if (!user) throw HttpErrorFactory.notFound("会员不存在");
        return { id: user.id, username: user.username, nickname: user.nickname, score: user.power };
    }

    /**
     * Coin ledger (account_log.account_type = 500) rendered as member points history.
     */
    async scoreLogs(query: { page?: number; pageSize?: number; userId?: string; keyword?: string }) {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.max(1, Math.min(Number(query.pageSize) || 20, 100));
        const offset = (page - 1) * pageSize;
        const keyword = query.keyword?.trim();
        const userId = query.userId?.trim();

        const where: string[] = [`al.account_type = 500`];
        const params: unknown[] = [];
        if (userId) {
            params.push(userId);
            where.push(`al.user_id = $${params.length}::uuid`);
        }
        if (keyword) {
            params.push(`%${keyword}%`);
            where.push(
                `(u.username ILIKE $${params.length} OR u.nickname ILIKE $${params.length} OR al.remark ILIKE $${params.length})`,
            );
        }
        const whereSql = where.join(" AND ");

        const rows = await this.dataSource.query(
            `SELECT al.id, al.user_id, u.username, u.nickname, al.change_amount, al.action,
                    al.left_amount, al.remark, al.source_info, al.created_at
               FROM account_log al
               LEFT JOIN "user" u ON u.id = al.user_id
              WHERE ${whereSql}
              ORDER BY al.created_at DESC
              LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, pageSize, offset],
        );
        const countRows = await this.dataSource.query(
            `SELECT COUNT(*)::int AS total
               FROM account_log al
               LEFT JOIN "user" u ON u.id = al.user_id
              WHERE ${whereSql}`,
            params,
        );

        const items = rows.map(
            (r: {
                id: string;
                user_id: string;
                username?: string;
                nickname?: string;
                change_amount: number;
                action: number;
                left_amount: number;
                remark?: string;
                source_info?: { source?: string };
                created_at: Date;
            }) => {
                const change = Number(r.change_amount);
                const after = Number(r.left_amount);
                const income = Number(r.action) === 1;
                return {
                    id: r.id,
                    userId: r.user_id,
                    username: r.username ?? "",
                    nickname: r.nickname ?? "",
                    score: change,
                    type: income ? 1 : 2,
                    bizType: this.bizType(r.remark),
                    before: income ? after - change : after + change,
                    after,
                    description: r.source_info?.source || "",
                    memo: r.remark || "",
                    createdAt: r.created_at,
                };
            },
        );

        return { items, total: countRows[0]?.total ?? 0, page, pageSize };
    }

    private bizType(remark?: string) {
        if (!remark) return "other";
        if (remark.includes("后台调整")) return "admin_adjust";
        if (remark.includes("签到")) return "sign_in";
        if (remark.includes("任务")) return "task_reward";
        if (remark.includes("驳回")) return "withdraw_refund";
        if (remark.includes("提现")) return "withdraw";
        if (remark.includes("兑换")) return "redeem";
        return "other";
    }

    async adjustScore(userId: string, delta: number, memo?: string) {
        if (!Number.isInteger(delta) || delta === 0) {
            throw HttpErrorFactory.badRequest("请输入非零整数（正数增加，负数扣减）");
        }
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) throw HttpErrorFactory.notFound("会员不存在");
        const remark = memo?.trim() || `后台调整 ${delta > 0 ? "+" : ""}${delta}`;
        if (delta > 0) {
            await this.billingService.addUserPower({ userId, amount: delta, remark });
        } else {
            await this.billingService.deductUserPower({ userId, amount: -delta, remark });
        }
        return { success: true, message: "调整成功", score: user.power + delta };
    }
}
