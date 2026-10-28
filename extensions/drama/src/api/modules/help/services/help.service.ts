import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ExtensionBillingService } from "@buildingai/extension-sdk";
import { Injectable } from "@nestjs/common";

import {
    Faq,
    Feedback,
    FeedbackStatus,
    WithdrawalRequest,
    WithdrawalStatus,
} from "../../../db/entities/help-entities.entity";

/**
 * Help center (FAQ / feedback) + user withdrawal.
 * Withdrawal freezes coins on apply, refunds on reject.
 */
@Injectable()
export class HelpService extends BaseService<WithdrawalRequest> {
    constructor(
        @InjectRepository(WithdrawalRequest)
        private readonly withdrawalRepository: Repository<WithdrawalRequest>,
        @InjectRepository(Faq)
        private readonly faqRepository: Repository<Faq>,
        @InjectRepository(Feedback)
        private readonly feedbackRepository: Repository<Feedback>,
        private readonly billingService: ExtensionBillingService,
        private readonly dataSource: DataSource,
    ) {
        super(withdrawalRepository);
    }

    // ---------------- FAQ ----------------

    async listFaqs(): Promise<Faq[]> {
        return this.faqRepository.find({
            where: { status: true },
            order: { sort: "DESC", createdAt: "DESC" },
        });
    }

    async listFaqsForConsole(): Promise<Faq[]> {
        return this.faqRepository.find({ order: { sort: "DESC", createdAt: "DESC" } });
    }

    async createFaq(dto: Partial<Faq>) {
        return this.faqRepository.save(this.faqRepository.create(dto));
    }

    async updateFaq(id: string, dto: Partial<Faq>) {
        await this.faqRepository.update({ id }, dto);
    }

    async deleteFaq(id: string) {
        await this.faqRepository.delete({ id });
    }

    // ---------------- feedback ----------------

    async submitFeedback(userId: string, content: string, contact?: string) {
        if (!content?.trim() || content.length > 2000) {
            throw HttpErrorFactory.badRequest("反馈内容长度 1-2000");
        }
        return this.feedbackRepository.save(
            this.feedbackRepository.create({
                userId,
                content: content.trim(),
                contact: contact?.slice(0, 200),
                status: FeedbackStatus.OPEN,
            }),
        );
    }

    async listFeedbackForConsole(query: { page?: number; pageSize?: number; status?: string }) {
        const [items, total] = await this.feedbackRepository.findAndCount({
            where: query.status ? { status: query.status } : {},
            order: { createdAt: "DESC" },
            skip: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
            take: query.pageSize ?? 20,
        });
        return { items, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
    }

    async resolveFeedback(id: string, reply?: string) {
        await this.feedbackRepository.update(
            { id },
            { status: FeedbackStatus.RESOLVED, reply: reply?.slice(0, 255) },
        );
    }

    // ---------------- withdrawal ----------------

    /**
     * Apply: freeze coins immediately (deduct), refund later if rejected
     */
    async applyWithdrawal(userId: string, coins: number, method: string, account: string) {
        if (!Number.isInteger(coins) || coins <= 0) {
            throw HttpErrorFactory.badRequest("提现金币不合法");
        }
        if (!method?.trim() || !account?.trim()) {
            throw HttpErrorFactory.badRequest("请填写收款方式与账户");
        }

        return this.dataSource.transaction(async (em) => {
            const request = await em.save(
                WithdrawalRequest,
                em.create(WithdrawalRequest, {
                    userId,
                    coins,
                    method: method.trim().slice(0, 32),
                    account: account.trim().slice(0, 200),
                    status: WithdrawalStatus.PENDING,
                }),
            );
            await this.billingService.deductUserPower(
                { userId, amount: coins, remark: `提现申请 ${request.id.slice(0, 8)}` },
                em,
            );
            return request;
        });
    }

    async myWithdrawals(userId: string, page = 1, pageSize = 20) {
        const [items, total] = await this.withdrawalRepository.findAndCount({
            where: { userId },
            order: { createdAt: "DESC" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        return { items, total, page, pageSize };
    }

    async listWithdrawalsForConsole(query: {
        page?: number;
        pageSize?: number;
        status?: string;
    }) {
        const [items, total] = await this.withdrawalRepository.findAndCount({
            where: query.status ? { status: query.status } : {},
            order: { createdAt: "DESC" },
            skip: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
            take: query.pageSize ?? 20,
        });
        return { items, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
    }

    /**
     * Approve: merchant already paid out offline, just close the request
     */
    async approve(id: string, note?: string) {
        const updated = await this.withdrawalRepository.update(
            { id, status: WithdrawalStatus.PENDING },
            { status: WithdrawalStatus.APPROVED, note, reviewedAt: new Date() },
        );
        if (!updated.affected) {
            throw HttpErrorFactory.badRequest("申请不存在或已处理");
        }
        return { success: true };
    }

    /**
     * Reject: refund the frozen coins
     */
    async reject(id: string, note?: string) {
        const request = await this.withdrawalRepository.findOneBy({
            id,
            status: WithdrawalStatus.PENDING,
        });
        if (!request) {
            throw HttpErrorFactory.badRequest("申请不存在或已处理");
        }
        await this.dataSource.transaction(async (em) => {
            await em
                .createQueryBuilder()
                .update(WithdrawalRequest)
                .set({
                    status: WithdrawalStatus.REJECTED,
                    note,
                    reviewedAt: new Date(),
                })
                .where("id = :id AND status = :pending", {
                    id,
                    pending: WithdrawalStatus.PENDING,
                })
                .execute();
            await this.billingService.addUserPower(
                {
                    userId: request.userId,
                    amount: request.coins,
                    remark: "提现驳回退回",
                },
                em,
            );
        });
        return { success: true };
    }
}
