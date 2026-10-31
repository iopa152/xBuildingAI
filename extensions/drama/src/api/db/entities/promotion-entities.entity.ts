import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    Index,
    PrimaryGeneratedColumn,
} from "typeorm";

export interface PricePanelTier {
    /** vip = 会员充值, coin = 金币充值; legacy rows without type are coin tiers */
    type?: "vip" | "coin";
    name?: string;
    vipType?: string;
    days?: number;
    coins?: number;
    bonusCoins?: number;
    /** USD price in cents */
    price: number;
    originalPrice?: number;
    /** PHP price in cents */
    phpPrice?: number;
    phpOriginalPrice?: number;
    badge?: string;
    sort?: number;
    description?: string;
    status?: boolean;
    currency?: string;
}

/**
 * Coin/price panel shown on the H5 recharge page (per promo link)
 */
@ExtensionEntity()
export class PricePanel {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 100, comment: "面板名称" })
    name: string;

    @Column({ type: "jsonb", default: [], comment: "档位配置" })
    tiers: PricePanelTier[];

    @Column({ type: "boolean", default: true, comment: "是否启用" })
    status: boolean;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/**
 * Promo link created by media buyers (投手)
 */
@ExtensionEntity()
@Index("uq_promo_code", ["code"], { unique: true })
export class PromoLink {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * Short code used in landing url /drama/api/promo/t/:code
     */
    @Column({ type: "varchar", length: 32, comment: "推广码" })
    code: string;

    @Column({ type: "varchar", length: 100, comment: "推广名称" })
    name: string;

    @Column({ type: "varchar", length: 500, nullable: true, comment: "备注" })
    remark?: string;

    @Column({ type: "uuid", nullable: true, comment: "价格面板ID" })
    panelId?: string;

    @Column({ type: "uuid", nullable: true, comment: "像素ID" })
    pixelId?: string;

    @Column({ type: "uuid", nullable: true, comment: "落地短剧ID" })
    dramaId?: string;

    @Column({ type: "uuid", nullable: true, comment: "落地集数ID" })
    episodeId?: string;

    /**
     * H5 landing path after redirect, default /
     */
    @Column({ type: "varchar", length: 255, default: "/", comment: "落地路径" })
    landing: string;

    @Column({
        type: "numeric",
        precision: 12,
        scale: 2,
        default: 0,
        comment: "日预算(USD)",
        transformer: {
            to: (value?: number | null) => value ?? 0,
            from: (value?: string | number | null) => Number(value ?? 0),
        },
    })
    budget: number;

    @Column({ type: "uuid", nullable: true, comment: "创建人(投手)用户ID" })
    creatorId?: string;

    /**
     * 投手显示名（参考站按投手维度管理链接）
     */
    @Column({ type: "varchar", length: 64, default: "Admin", comment: "投手名称" })
    creator: string;

    /**
     * CAPI 服务端回传开关
     */
    @Column({ type: "boolean", default: true, comment: "CAPI回传启用" })
    capiEnabled: boolean;

    @Column({ type: "int", default: 0, comment: "点击数(冗余)" })
    clicks: number;

    /**
     * active = 投放中, paused = 暂停, archived = 归档
     */
    @Column({ type: "varchar", length: 20, default: "active", comment: "状态" })
    status: string;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/**
 * Raw click log for attribution and reporting
 */
@ExtensionEntity()
@Index("idx_click_link_time", ["linkId", "createdAt"])
export class ClickLog {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "推广链接ID" })
    linkId: string;

    @Column({ type: "varchar", length: 64, nullable: true, comment: "IP" })
    ip?: string;

    @Column({ type: "varchar", length: 500, nullable: true, comment: "User-Agent" })
    userAgent?: string;

    @Column({ type: "varchar", length: 500, nullable: true, comment: "Referer" })
    referer?: string;

    @Column({ type: "uuid", nullable: true, comment: "用户ID" })
    userId?: string;

    @Column({ type: "varchar", length: 100, nullable: true, comment: "广告系列ID" })
    campaignId?: string;

    @Column({ type: "varchar", length: 100, nullable: true, comment: "广告ID" })
    adId?: string;

    @Column({ type: "varchar", length: 255, nullable: true, comment: "FB Click ID" })
    fbclid?: string;

    @Column({ type: "varchar", length: 50, nullable: true, comment: "平台来源" })
    platform?: string;

    @Column({ type: "boolean", default: false, comment: "真实广告" })
    isRealAd: boolean;

    @CreateDateColumn({ comment: "点击时间" })
    createdAt: Date;
}

/**
 * First-touch attribution: user ← promo link
 */
@ExtensionEntity()
@Index("uq_attribution_user", ["userId"], { unique: true })
export class Attribution {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    @Column({ type: "uuid", comment: "推广链接ID" })
    linkId: string;

    @CreateDateColumn({ comment: "归因时间" })
    createdAt: Date;
}

/**
 * Ad pixel for server-side CAPI
 */
@ExtensionEntity()
export class Pixel {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 100, comment: "名称" })
    name: string;

    @Column({ type: "varchar", length: 100, comment: "Pixel ID" })
    pixelId: string;

    /**
     * meta / tiktok
     */
    @Column({ type: "varchar", length: 20, default: "meta", comment: "平台" })
    platform: string;

    @Column({ type: "varchar", length: 500, nullable: true, comment: "访问令牌" })
    accessToken?: string;

    @Column({ type: "boolean", default: true, comment: "是否启用" })
    status: boolean;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/**
 * CAPI send log; (pixelId, eventId) unique is the dedup key
 */
@ExtensionEntity()
@Index("uq_capi_event", ["pixelId", "eventId"], { unique: true })
export class CapiEvent {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "像素ID" })
    pixelId: string;

    /**
     * CompleteRegistration / Purchase / UnlockEpisode ...
     */
    @Column({ type: "varchar", length: 50, comment: "事件名" })
    eventName: string;

    /**
     * Dedup id shared with browser pixel (fbq('track', name, {eventID}))
     */
    @Column({ type: "varchar", length: 100, comment: "事件ID(去重)" })
    eventId: string;

    @Column({ type: "uuid", nullable: true, comment: "关联用户" })
    userId?: string;

    @Column({ type: "uuid", nullable: true, comment: "推广链接ID" })
    linkId?: string;

    @Column({ type: "numeric", nullable: true, comment: "事件价值" })
    value?: number;

    @Column({ type: "varchar", length: 8, nullable: true, comment: "币种" })
    currency?: string;

    /**
     * pending / sent / failed / duplicate
     */
    @Column({ type: "varchar", length: 20, default: "pending", comment: "状态" })
    status: string;

    @Column({ type: "text", nullable: true, comment: "响应/错误" })
    response?: string;

    @Column({ type: "text", nullable: true, comment: "请求数据" })
    requestBody?: string;

    @Column({ type: "varchar", length: 20, nullable: true, comment: "响应码" })
    responseCode?: string;

    @Column({ type: "int", nullable: true, comment: "接收事件数" })
    eventsReceived?: number;

    @Column({ type: "text", nullable: true, comment: "错误信息" })
    errorMessage?: string;

    @Column({ type: "int", default: 0, comment: "重试次数" })
    retryCount: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}

/**
 * Daily per-link aggregate for LTV overview
 */
@ExtensionEntity()
@Index("uq_promo_daily", ["statDate", "linkId"], { unique: true })
export class PromoDaily {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "date", comment: "统计日期" })
    statDate: string;

    @Column({ type: "uuid", comment: "推广链接ID" })
    linkId: string;

    @Column({ type: "int", default: 0, comment: "点击数" })
    clicks: number;

    @Column({ type: "int", default: 0, comment: "注册数" })
    registrations: number;

    @Column({ type: "int", default: 0, comment: "付费用户数" })
    payUsers: number;

    /**
     * Sum of coins spent by attributed users (unlock revenue proxy)
     */
    @Column({ type: "int", default: 0, comment: "金币消耗" })
    coinSpent: number;

    /** manual ad-spend entry for the day (major currency units), used for ROI */
    @Column({ type: "numeric", precision: 12, scale: 2, default: 0, comment: "广告消耗" })
    spend: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;
}
