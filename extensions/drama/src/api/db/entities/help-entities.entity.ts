import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

/**
 * Withdrawal status (merchant pays out offline after review)
 */
export enum WithdrawalStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
}

/**
 * User withdrawal request. Coins are frozen (deducted) at apply time and
 * refunded automatically when rejected.
 */
@ExtensionEntity()
@Index("idx_withdrawal_user", ["userId"])
export class WithdrawalRequest {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    /**
     * Coins to withdraw
     */
    @Column({ type: "int", comment: "提现金币" })
    coins: number;

    /**
     * payout method, e.g. paypal / usdt / bank
     */
    @Column({ type: "varchar", length: 32, comment: "收款方式" })
    method: string;

    /**
     * payout account (email / address / card no.)
     */
    @Column({ type: "varchar", length: 200, comment: "收款账户" })
    account: string;

    @Column({ type: "varchar", length: 20, default: WithdrawalStatus.PENDING, comment: "状态" })
    status: WithdrawalStatus | string;

    @Column({ type: "varchar", length: 255, nullable: true, comment: "审核备注" })
    note?: string;

    @Column({ type: "timestamptz", nullable: true, comment: "审核时间" })
    reviewedAt?: Date;

    @CreateDateColumn({ comment: "申请时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

/**
 * Help center FAQ entry
 */
@ExtensionEntity()
export class Faq {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 255, comment: "问题" })
    question: string;

    @Column({ type: "text", comment: "回答" })
    answer: string;

    @Column({ type: "int", default: 0, comment: "排序(大在前)" })
    sort: number;

    @Column({ type: "boolean", default: true, comment: "是否启用" })
    status: boolean;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/**
 * Feedback status
 */
export enum FeedbackStatus {
    OPEN = "open",
    RESOLVED = "resolved",
}

/**
 * User feedback submission
 */
@ExtensionEntity()
export class Feedback {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "varchar", length: 2000, comment: "反馈内容" })
    content: string;

    /**
     * optional contact info left by the user
     */
    @Column({ type: "varchar", length: 200, nullable: true, comment: "联系方式" })
    contact?: string;

    @Column({ type: "varchar", length: 20, default: FeedbackStatus.OPEN, comment: "状态" })
    status: FeedbackStatus | string;

    @Column({ type: "varchar", length: 255, nullable: true, comment: "处理备注" })
    reply?: string;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}
