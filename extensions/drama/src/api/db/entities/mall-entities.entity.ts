import { ExtensionEntity } from "@buildingai/core/decorators";
import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@ExtensionEntity()
export class MallCategory {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 64, comment: "分类名称" })
    name: string;

    @Column({ type: "varchar", length: 255, nullable: true, comment: "图标" })
    icon?: string;

    @Column({ type: "varchar", length: 16, default: "en", comment: "语言地区" })
    languageCode: string;

    @Column({ type: "boolean", default: false, comment: "全地区展示" })
    allRegion: boolean;

    @Column({ type: "boolean", default: true, comment: "状态" })
    status: boolean;

    @Column({ type: "int", default: 0, comment: "排序" })
    sort: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

@ExtensionEntity()
export class MallGoods {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", nullable: true, comment: "商品分类" })
    categoryId?: string;

    @Column({ type: "varchar", length: 128, comment: "商品标题" })
    title: string;

    @Column({ type: "varchar", length: 128, nullable: true, comment: "副标题" })
    subtitle?: string;

    @Column({ type: "varchar", length: 500, nullable: true, comment: "封面图" })
    coverImage?: string;

    @Column({ type: "jsonb", default: () => "'[]'", comment: "轮播图" })
    images: string[];

    @Column({ type: "text", nullable: true, comment: "商品详情" })
    description?: string;

    @Column({ type: "varchar", length: 255, nullable: true, comment: "标签" })
    tags?: string;

    @Column({ type: "int", default: 0, comment: "金币价" })
    coinPrice: number;

    @Column({ type: "int", default: 0, comment: "划线价" })
    originalCoinPrice: number;

    @Column({ type: "int", default: 0, comment: "库存" })
    stock: number;

    @Column({ type: "int", default: 0, comment: "销量" })
    salesCount: number;

    @Column({ type: "varchar", length: 16, default: "en", comment: "语言地区" })
    languageCode: string;

    @Column({ type: "boolean", default: false, comment: "全地区展示" })
    allRegion: boolean;

    @Column({ type: "boolean", default: false, comment: "热门" })
    hot: boolean;

    @Column({ type: "boolean", default: false, comment: "免邮" })
    freeShipping: boolean;

    @Column({ type: "boolean", default: true, comment: "上架" })
    status: boolean;

    @Column({ type: "int", default: 0, comment: "排序" })
    sort: number;

    @CreateDateColumn({ comment: "创建时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

export enum MallOrderStatus {
    PAID = "paid",
    SHIPPED = "shipped",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded",
}

@ExtensionEntity()
export class MallOrder {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 40, unique: true, comment: "订单号" })
    orderNo: string;

    @Column({ type: "uuid", nullable: true, comment: "用户ID" })
    userId?: string;

    @Column({ type: "int", default: 0, comment: "金币合计" })
    totalCoin: number;

    @Column({ type: "varchar", length: 24, default: MallOrderStatus.PAID, comment: "订单状态" })
    status: string;

    @Column({ type: "varchar", length: 64, nullable: true, comment: "物流公司" })
    logisticsCompany?: string;

    @Column({ type: "varchar", length: 64, nullable: true, comment: "物流单号" })
    logisticsNo?: string;

    @Column({ type: "varchar", length: 255, nullable: true, comment: "发货备注" })
    shipRemark?: string;

    @Column({ type: "jsonb", default: () => "'{}'", comment: "收货地址" })
    address?: Record<string, string>;

    @Column({ type: "timestamp", nullable: true, comment: "支付时间" })
    paidAt?: Date;

    @Column({ type: "timestamp", nullable: true, comment: "发货时间" })
    shippedAt?: Date;

    @CreateDateColumn({ comment: "下单时间" })
    createdAt: Date;

    @UpdateDateColumn({ comment: "更新时间" })
    updatedAt: Date;
}

@ExtensionEntity()
export class MallOrderItem {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid", comment: "订单ID" })
    orderId: string;

    @Column({ type: "uuid", nullable: true, comment: "商品ID" })
    goodsId?: string;

    @Column({ type: "varchar", length: 128, comment: "商品" })
    goodsTitle: string;

    @Column({ type: "varchar", length: 128, nullable: true, comment: "规格" })
    skuSpecs?: string;

    @Column({ type: "int", default: 1, comment: "数量" })
    quantity: number;

    @Column({ type: "int", default: 0, comment: "金币单价" })
    coinPrice: number;
}
