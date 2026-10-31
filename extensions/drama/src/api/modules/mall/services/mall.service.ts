import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ExtensionBillingService } from "@buildingai/extension-sdk";
import { Injectable } from "@nestjs/common";

import {
    MallCategory,
    MallGoods,
    MallOrder,
    MallOrderItem,
    MallOrderStatus,
} from "../../../db/entities/mall-entities.entity";

@Injectable()
export class MallService {
    constructor(
        @InjectRepository(MallCategory)
        private readonly categoryRepository: Repository<MallCategory>,
        @InjectRepository(MallGoods)
        private readonly goodsRepository: Repository<MallGoods>,
        @InjectRepository(MallOrder)
        private readonly orderRepository: Repository<MallOrder>,
        @InjectRepository(MallOrderItem)
        private readonly orderItemRepository: Repository<MallOrderItem>,
        private readonly billingService: ExtensionBillingService,
        private readonly dataSource: DataSource,
    ) {}

    // ---------------- categories ----------------

    async listCategories() {
        return this.categoryRepository.find({ order: { sort: "DESC", createdAt: "ASC" } });
    }

    async createCategory(dto: Partial<MallCategory>) {
        if (!dto.name?.trim()) throw HttpErrorFactory.badRequest("请填写分类名称");
        return this.categoryRepository.save(this.categoryRepository.create(dto));
    }

    async updateCategory(id: string, dto: Partial<MallCategory>) {
        await this.categoryRepository.update({ id }, dto);
        return { success: true };
    }

    async deleteCategory(id: string) {
        await this.categoryRepository.delete({ id });
        return { success: true };
    }

    // ---------------- goods ----------------

    async listGoods(query: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.max(1, Math.min(Number(query.pageSize) || 20, 100));
        const where: string[] = ["1=1"];
        const params: unknown[] = [];
        if (query.keyword?.trim()) {
            params.push(`%${query.keyword.trim()}%`);
            where.push(`(g.title ILIKE $${params.length} OR g.tags ILIKE $${params.length})`);
        }
        if (query.status === "0" || query.status === "1") {
            params.push(query.status === "1");
            where.push(`g.status = $${params.length}`);
        }
        const whereSql = where.join(" AND ");
        const rows = await this.dataSource.query(
            `SELECT g.*, c.name AS category_name
               FROM drama.mall_goods g
               LEFT JOIN drama.mall_category c ON c.id = g.category_id
              WHERE ${whereSql}
              ORDER BY g.sort DESC, g.created_at DESC
              LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, pageSize, (page - 1) * pageSize],
        );
        const count = await this.dataSource.query(
            `SELECT COUNT(*)::int AS total FROM drama.mall_goods g WHERE ${whereSql}`,
            params,
        );
        return {
            items: rows.map(this.mapGoods),
            total: count[0]?.total ?? 0,
            page,
            pageSize,
        };
    }

    private mapGoods = (r: Record<string, unknown>) => ({
        id: r.id,
        categoryId: r.category_id,
        categoryName: r.category_name ?? "",
        title: r.title,
        subtitle: r.subtitle,
        coverImage: r.cover_image,
        images: r.images ?? [],
        description: r.description,
        tags: r.tags,
        coinPrice: Number(r.coin_price),
        originalCoinPrice: Number(r.original_coin_price),
        stock: Number(r.stock),
        salesCount: Number(r.sales_count),
        languageCode: r.language_code,
        allRegion: r.all_region,
        hot: r.hot,
        freeShipping: r.free_shipping,
        status: r.status,
        sort: Number(r.sort),
        createdAt: r.created_at,
    });

    async getGoods(id: string) {
        const goods = await this.goodsRepository.findOneBy({ id });
        if (!goods) throw HttpErrorFactory.notFound("商品不存在");
        return goods;
    }

    async createGoods(dto: Partial<MallGoods>) {
        if (!dto.title?.trim()) throw HttpErrorFactory.badRequest("请输入商品标题");
        return this.goodsRepository.save(
            this.goodsRepository.create({
                ...dto,
                title: dto.title.trim(),
                coinPrice: Number(dto.coinPrice) || 0,
                originalCoinPrice: Number(dto.originalCoinPrice) || 0,
                stock: Number(dto.stock) || 0,
                images: dto.images ?? [],
            }),
        );
    }

    async updateGoods(id: string, dto: Partial<MallGoods>) {
        await this.goodsRepository.update(
            { id },
            {
                ...dto,
                coinPrice: dto.coinPrice === undefined ? undefined : Number(dto.coinPrice),
                originalCoinPrice:
                    dto.originalCoinPrice === undefined
                        ? undefined
                        : Number(dto.originalCoinPrice),
                stock: dto.stock === undefined ? undefined : Number(dto.stock),
            },
        );
        return { success: true };
    }

    async deleteGoods(id: string) {
        await this.goodsRepository.delete({ id });
        return { success: true };
    }

    // ---------------- orders ----------------

    async listOrders(query: {
        page?: number;
        pageSize?: number;
        status?: string;
        keyword?: string;
    }) {
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.max(1, Math.min(Number(query.pageSize) || 20, 100));
        const where: string[] = ["1=1"];
        const params: unknown[] = [];
        if (query.status) {
            params.push(query.status);
            where.push(`o.status = $${params.length}`);
        }
        if (query.keyword?.trim()) {
            params.push(`%${query.keyword.trim()}%`);
            where.push(`(o.order_no ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
        }
        const whereSql = where.join(" AND ");
        const rows = await this.dataSource.query(
            `SELECT o.*, u.username, u.nickname
               FROM drama.mall_order o
               LEFT JOIN "user" u ON u.id = o.user_id
              WHERE ${whereSql}
              ORDER BY o.created_at DESC
              LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, pageSize, (page - 1) * pageSize],
        );
        const count = await this.dataSource.query(
            `SELECT COUNT(*)::int AS total
               FROM drama.mall_order o
               LEFT JOIN "user" u ON u.id = o.user_id
              WHERE ${whereSql}`,
            params,
        );
        return {
            items: rows.map((r: Record<string, unknown>) => ({
                id: r.id,
                orderNo: r.order_no,
                userId: r.user_id,
                username: r.username ?? "",
                nickname: r.nickname ?? "",
                totalCoin: Number(r.total_coin),
                status: r.status,
                logisticsCompany: r.logistics_company,
                logisticsNo: r.logistics_no,
                shipRemark: r.ship_remark,
                address: r.address,
                paidAt: r.paid_at,
                shippedAt: r.shipped_at,
                createdAt: r.created_at,
            })),
            total: count[0]?.total ?? 0,
            page,
            pageSize,
        };
    }

    async getOrder(id: string) {
        const order = await this.orderRepository.findOneBy({ id });
        if (!order) throw HttpErrorFactory.notFound("订单不存在");
        const items = await this.orderItemRepository.find({ where: { orderId: id } });
        return { ...order, items };
    }

    async ship(id: string, dto: { logisticsCompany?: string; logisticsNo?: string; remark?: string }) {
        const order = await this.orderRepository.findOneBy({ id });
        if (!order) throw HttpErrorFactory.notFound("订单不存在");
        if (order.status !== MallOrderStatus.PAID) {
            throw HttpErrorFactory.badRequest("仅待发货订单可以发货");
        }
        await this.orderRepository.update(
            { id },
            {
                status: MallOrderStatus.SHIPPED,
                logisticsCompany: dto.logisticsCompany?.trim() || "Manual",
                logisticsNo: dto.logisticsNo?.trim() || undefined,
                shipRemark: dto.remark?.trim() || undefined,
                shippedAt: new Date(),
            },
        );
        return { success: true };
    }

    async cancel(id: string) {
        const order = await this.orderRepository.findOneBy({ id });
        if (!order) throw HttpErrorFactory.notFound("订单不存在");
        if (![MallOrderStatus.PAID, MallOrderStatus.SHIPPED].includes(order.status as MallOrderStatus)) {
            throw HttpErrorFactory.badRequest("当前订单状态不可取消");
        }
        const items = await this.orderItemRepository.find({ where: { orderId: id } });
        await this.dataSource.transaction(async (manager) => {
            await manager.update(MallOrder, { id }, { status: MallOrderStatus.CANCELLED });
            if (order.userId && order.totalCoin > 0) {
                await this.billingService.addUserPower(
                    {
                        userId: order.userId,
                        amount: order.totalCoin,
                        remark: `商城订单取消退款 ${order.orderNo}`,
                    },
                    manager,
                );
            }
            for (const item of items) {
                if (item.goodsId) {
                    await manager
                        .createQueryBuilder()
                        .update(MallGoods)
                        .set({ stock: () => `stock + ${item.quantity}` })
                        .where("id = :id", { id: item.goodsId })
                        .execute();
                }
            }
        });
        return { success: true };
    }
}
