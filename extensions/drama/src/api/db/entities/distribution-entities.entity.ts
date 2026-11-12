import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    Index,
    PrimaryGeneratedColumn,
} from "typeorm";

/** Invite code owned by a user (1:1) */
@ExtensionEntity()
@Index("uq_invite_code_code", ["code"], { unique: true })
@Index("uq_invite_code_user", ["userId"], { unique: true })
export class InviteCode {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 16, comment: "邀请码" })
    code: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/** Who invited whom (1:1 per invited user; inviter chain feeds 3-level rebate) */
@ExtensionEntity()
@Index("uq_distribution_bind_user", ["userId"], { unique: true })
export class DistributionBind {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "被邀请用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "邀请人用户ID" })
    inviterId: string;

    @CreateDateColumn({ comment: "绑定时间" })
    createdAt: Date;
}

/**
 * Commission ledger. level 1/2/3 = rebate from downline payment depth,
 * level 0 = flat invite reward.
 */
@ExtensionEntity()
@Index("idx_rebate_beneficiary", ["userId", "createdAt"])
export class RebateLog {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /** user receiving the commission */
    @Column({ type: "uuid", comment: "受益人用户ID" })
    userId: string;

    /** user whose payment generated it */
    @Column({ type: "uuid", comment: "来源用户ID" })
    fromUserId: string;

    /** 0 = invite reward, 1-3 = downline depth */
    @Column({ type: "int", comment: "层级(0=邀请奖励)" })
    level: number;

    @Column({ type: "int", default: 0, comment: "返佣金币" })
    coins: number;

    @Column({ type: "varchar", length: 64, nullable: true, comment: "关联订单号" })
    orderNo?: string | null;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/** Drama-scoped VIP grant (coin-purchased vip packages) */
@ExtensionEntity()
@Index("uq_vip_membership_user", ["userId"], { unique: true })
export class VipMembership {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "套餐ID" })
    packageId: string;

    @Column({ type: "timestamptz", comment: "开始时间" })
    startTime: Date;

    @Column({ type: "timestamptz", comment: "到期时间" })
    endTime: Date;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}
