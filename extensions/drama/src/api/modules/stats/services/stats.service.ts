import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { MembershipOrder, User as UserEntity, UserSubscription } from "@buildingai/db/entities";
import { Between, DataSource, In, MoreThan, Repository } from "@buildingai/db/typeorm";
import { ExtensionBillingService } from "@buildingai/extension-sdk";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { CoinOrder, CoinOrderStatus } from "../../../db/entities/pay-entities.entity";
import { UnlockRecord } from "../../../db/entities/unlock-record.entity";
import { WatchHistory } from "../../../db/entities/watch-entities.entity";

export interface StatsRangeQuery {
    startDate?: string;
    endDate?: string;
}

interface DayBucket {
    /** Coin recharge amount in cents */
    coin: number;
    /** VIP purchase amount in currency units */
    vip: number;
    /** Paid order count (coin + vip) */
    orders: number;
    newUsers: number;
    unlockCount: number;
    coinConsume: number;
    payers: Set<string>;
}

interface RangeCollect {
    start: Date;
    end: Date;
    coinOrders: CoinOrder[];
    vipOrders: MembershipOrder[];
    newUserIds: string[];
    unlocks: UnlockRecord[];
    activeUsers: number;
    buckets: Map<string, DayBucket>;
}

/**
 * Console dashboard statistics for the drama business
 */
@Injectable()
export class StatsService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(UserSubscription)
        private readonly subscriptionRepository: Repository<UserSubscription>,
        @InjectRepository(CoinOrder)
        private readonly orderRepository: Repository<CoinOrder>,
        @InjectRepository(UnlockRecord)
        private readonly unlockRepository: Repository<UnlockRecord>,
        @InjectRepository(WatchHistory)
        private readonly historyRepository: Repository<WatchHistory>,
        private readonly billingService: ExtensionBillingService,
        private readonly dataSource: DataSource,
    ) {}

    /**
     * Today snapshot + range summary + trends + composition + rankings
     */
    async overview(query: StatsRangeQuery = {}) {
        const todayStart = this.dayStart(0);
        const tomorrow = this.dayStart(-1);
        const yesterdayStart = this.dayStart(1);
        const { start, end } = this.resolveRange(query);

        const [todayData, yesterdayData, rangeData] = await Promise.all([
            this.collect(todayStart, tomorrow),
            this.collect(yesterdayStart, todayStart),
            this.collect(start, end),
        ]);

        const today = this.totals(todayData);
        const yesterday = this.totals(yesterdayData);
        const summary = this.totals(rangeData);

        const revenueTrend = [...rangeData.buckets.entries()].map(([date, bucket]) => ({
            date,
            coin_recharge_amount: this.round2(bucket.coin / 100),
            vip_purchase_amount: this.round2(bucket.vip),
            order_count: bucket.orders,
        }));

        const userTrend = [...rangeData.buckets.entries()].map(([date, bucket]) => ({
            date,
            new_users: bucket.newUsers,
            pay_users: bucket.payers.size,
            pay_rate: bucket.newUsers
                ? this.round2((bucket.payers.size / bucket.newUsers) * 100)
                : 0,
        }));

        const [byType, byChannel] = await Promise.all([
            this.revenueByType(rangeData),
            Promise.resolve(this.revenueByChannel(rangeData)),
        ]);

        const [rechargeRank, unlockUserRank, dramaRank] = await Promise.all([
            this.rechargeRanking(rangeData),
            this.unlockUserRanking(rangeData),
            this.dramaRanking(rangeData),
        ]);

        return {
            range: {
                start_date: this.dateKey(start),
                end_date: this.dateKey(new Date(end.getTime() - 1)),
            },
            today: {
                pay_amount: today.payAmount,
                pay_amount_change: this.change(today.payAmount, yesterday.payAmount),
                order_count: today.orders,
                order_count_change: this.change(today.orders, yesterday.orders),
                new_users: today.newUsers,
                new_users_change: this.change(today.newUsers, yesterday.newUsers),
                active_users: today.activeUsers,
                active_users_change: this.change(today.activeUsers, yesterday.activeUsers),
                // Kept for the drama extension overview page
                rechargeAmount: today.payAmount,
                rechargeOrders: today.orders,
                unlocks: todayData.unlocks.length,
                coinSpent: today.coinConsume,
            },
            summary: {
                total_pay_amount: summary.payAmount,
                total_pay_users: summary.payers,
                total_new_users: summary.newUsers,
                total_coin_consume: summary.coinConsume,
            },
            revenue_trend: revenueTrend,
            revenue_composition: {
                by_type: byType,
                by_channel: byChannel,
            },
            user_trend: userTrend,
            coin_consume: [],
            rankings: {
                top_recharge_users: rechargeRank,
                top_dramas: dramaRank,
            },
            // Kept for the drama extension overview page
            trend: revenueTrend.map((item) => {
                const bucket = rangeData.buckets.get(item.date);
                return {
                    date: item.date,
                    newUsers: bucket?.newUsers ?? 0,
                    recharge: this.round2(item.coin_recharge_amount + item.vip_purchase_amount),
                    unlocks: bucket?.unlockCount ?? 0,
                };
            }),
            topDramas: dramaRank.map((item) => ({
                dramaId: item.dramaId,
                title: item.title,
                unlocks: item.purchase_count,
                coins: item.total_coins,
            })),
            topUsers: unlockUserRank,
        };
    }

    private totals(data: RangeCollect) {
        let coin = 0;
        let vip = 0;
        let orders = 0;
        let coinConsume = 0;
        const payers = new Set<string>();

        data.coinOrders.forEach((order) => {
            coin += order.amount;
            orders += 1;
            payers.add(order.userId);
        });
        data.vipOrders.forEach((order) => {
            vip += Number(order.orderAmount);
            orders += 1;
            payers.add(order.userId);
        });
        data.unlocks.forEach((unlock) => {
            coinConsume += unlock.coins ?? 0;
        });

        return {
            payAmount: this.round2(coin / 100 + vip),
            orders,
            newUsers: data.newUserIds.length,
            activeUsers: data.activeUsers,
            coinConsume,
            payers: payers.size,
        };
    }

    private async collect(start: Date, end: Date): Promise<RangeCollect> {
        const endInclusive = new Date(end.getTime() - 1);

        const [coinOrders, vipOrders, newUsers, unlocks, activeRaw] = await Promise.all([
            this.orderRepository.find({
                where: { status: CoinOrderStatus.PAID, paidAt: Between(start, endInclusive) },
            }),
            this.dataSource.getRepository(MembershipOrder).find({
                where: {
                    status: 1,
                    payState: 1,
                    refundStatus: 0,
                    payTime: Between(start, endInclusive),
                },
            }),
            this.userRepository.find({
                where: { createdAt: Between(start, endInclusive) },
                select: ["id", "createdAt"],
            }),
            this.unlockRepository.find({
                where: { createdAt: Between(start, endInclusive) },
                select: ["userId", "dramaId", "coins", "createdAt"],
            }),
            this.historyRepository
                .createQueryBuilder("h")
                .select("COUNT(DISTINCT h.userId)", "c")
                .where("h.updatedAt >= :s AND h.updatedAt < :e", { s: start, e: end })
                .getRawOne(),
        ]);

        const buckets = new Map<string, DayBucket>();
        for (let cursor = new Date(start); cursor < end; cursor = this.nextDay(cursor)) {
            buckets.set(this.dateKey(cursor), {
                coin: 0,
                vip: 0,
                orders: 0,
                newUsers: 0,
                unlockCount: 0,
                coinConsume: 0,
                payers: new Set(),
            });
        }

        coinOrders.forEach((order) => {
            if (!order.paidAt) return;
            const bucket = buckets.get(this.dateKey(order.paidAt));
            if (!bucket) return;
            bucket.coin += order.amount;
            bucket.orders += 1;
            bucket.payers.add(order.userId);
        });
        vipOrders.forEach((order) => {
            if (!order.payTime) return;
            const bucket = buckets.get(this.dateKey(order.payTime));
            if (!bucket) return;
            bucket.vip += Number(order.orderAmount);
            bucket.orders += 1;
            bucket.payers.add(order.userId);
        });
        newUsers.forEach((user) => {
            const bucket = buckets.get(this.dateKey(user.createdAt));
            if (bucket) bucket.newUsers += 1;
        });
        unlocks.forEach((unlock) => {
            const bucket = buckets.get(this.dateKey(unlock.createdAt));
            if (!bucket) return;
            bucket.unlockCount += 1;
            bucket.coinConsume += unlock.coins ?? 0;
        });

        return {
            start,
            end,
            coinOrders,
            vipOrders,
            newUserIds: newUsers.map((user) => user.id),
            unlocks,
            activeUsers: Number(activeRaw?.c ?? 0),
            buckets,
        };
    }

    private async revenueByType(data: RangeCollect) {
        let coin = 0;
        data.coinOrders.forEach((order) => {
            coin += order.amount;
        });

        const firstPaid = await this.firstPaidTimes(data.vipOrders);
        let first = 0;
        let renewal = 0;
        data.vipOrders.forEach((order) => {
            if (!order.payTime) {
                first += Number(order.orderAmount);
                return;
            }
            const firstTime = firstPaid.get(order.userId);
            const isRenewal =
                firstTime !== undefined && order.payTime.getTime() > firstTime;
            if (isRenewal) {
                renewal += Number(order.orderAmount);
            } else {
                first += Number(order.orderAmount);
            }
        });

        return [
            { name: "金币充值", value: this.round2(coin / 100) },
            { name: "VIP首单", value: this.round2(first) },
            { name: "VIP续费", value: this.round2(renewal) },
        ].filter((item) => item.value > 0);
    }

    private revenueByChannel(data: RangeCollect) {
        const totals = new Map<string, number>();
        data.coinOrders.forEach((order) => {
            this.addTotal(totals, this.channelLabel(order.channel), order.amount / 100);
        });
        data.vipOrders.forEach((order) => {
            this.addTotal(totals, this.payTypeLabel(order.payType), Number(order.orderAmount));
        });
        return [...totals.entries()]
            .map(([name, value]) => ({ name, value: this.round2(value) }))
            .filter((item) => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }

    private async rechargeRanking(data: RangeCollect) {
        const aggregated = new Map<string, { amount: number; orders: number }>();
        data.coinOrders.forEach((order) => {
            const item = aggregated.get(order.userId) ?? { amount: 0, orders: 0 };
            item.amount += order.amount / 100;
            item.orders += 1;
            aggregated.set(order.userId, item);
        });
        data.vipOrders.forEach((order) => {
            const item = aggregated.get(order.userId) ?? { amount: 0, orders: 0 };
            item.amount += Number(order.orderAmount);
            item.orders += 1;
            aggregated.set(order.userId, item);
        });

        const top = [...aggregated.entries()]
            .sort((a, b) => b[1].amount - a[1].amount)
            .slice(0, 10);
        const nicknames = await this.namesFor(
            top.map(([userId]) => userId),
            "user",
        );

        return top.map(([userId, item]) => ({
            userId,
            nickname: nicknames.get(userId) ?? userId,
            total_amount: this.round2(item.amount),
            order_count: item.orders,
        }));
    }

    private async unlockUserRanking(data: RangeCollect) {
        const aggregated = new Map<string, { unlocks: number; coins: number }>();
        data.unlocks.forEach((unlock) => {
            const item = aggregated.get(unlock.userId) ?? { unlocks: 0, coins: 0 };
            item.unlocks += 1;
            item.coins += unlock.coins ?? 0;
            aggregated.set(unlock.userId, item);
        });

        const top = [...aggregated.entries()].sort((a, b) => b[1].coins - a[1].coins).slice(0, 10);
        const nicknames = await this.namesFor(
            top.map(([userId]) => userId),
            "user",
        );

        return top.map(([userId, item]) => ({
            userId,
            nickname: nicknames.get(userId) ?? userId,
            unlocks: item.unlocks,
            coins: item.coins,
        }));
    }

    private async dramaRanking(data: RangeCollect) {
        const aggregated = new Map<string, { purchases: number; coins: number }>();
        data.unlocks.forEach((unlock) => {
            const item = aggregated.get(unlock.dramaId) ?? { purchases: 0, coins: 0 };
            item.purchases += 1;
            item.coins += unlock.coins ?? 0;
            aggregated.set(unlock.dramaId, item);
        });

        const top = [...aggregated.entries()]
            .sort((a, b) => b[1].purchases - a[1].purchases)
            .slice(0, 10);
        const titles = await this.namesFor(
            top.map(([dramaId]) => dramaId),
            "drama",
        );

        return top.map(([dramaId, item]) => ({
            dramaId,
            title: titles.get(dramaId) ?? dramaId,
            purchase_count: item.purchases,
            total_coins: item.coins,
        }));
    }

    private async firstPaidTimes(orders: MembershipOrder[]) {
        const map = new Map<string, number>();
        const ids = [...new Set(orders.map((order) => order.userId))];
        if (!ids.length) return map;

        const rows = await this.dataSource
            .getRepository(MembershipOrder)
            .createQueryBuilder("m")
            .select("m.userId", "userId")
            .addSelect("MIN(m.payTime)", "first")
            .where("m.userId IN (:...ids)", { ids })
            .andWhere("m.status = 1 AND m.payState = 1 AND m.refundStatus = 0")
            .groupBy("m.userId")
            .getRawMany<{ userId: string; first: Date | string }>();

        rows.forEach((row) => {
            const time =
                row.first instanceof Date ? row.first.getTime() : new Date(row.first).getTime();
            if (!Number.isNaN(time)) map.set(row.userId, time);
        });
        return map;
    }

    private addTotal(map: Map<string, number>, key: string, amount: number) {
        map.set(key, (map.get(key) ?? 0) + amount);
    }

    private channelLabel(channel?: string) {
        const key = (channel || "other").toLowerCase();
        const labels: Record<string, string> = {
            stripe: "Stripe",
            airwallex: "Airwallex",
            paypal: "PayPal",
            apple: "Apple IAP",
            google: "Google IAP",
            antom: "Antom",
            paymongo: "PayMongo",
            other: "其他",
        };
        return labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
    }

    private payTypeLabel(payType: number) {
        if (payType === 1) return "微信支付";
        if (payType === 2) return "支付宝";
        return `支付方式${payType}`;
    }

    private change(today: number, yesterday: number) {
        if (!yesterday) return today ? 100 : 0;
        return this.round2(((today - yesterday) / yesterday) * 100);
    }

    private resolveRange(query: StatsRangeQuery) {
        const tomorrow = this.dayStart(-1);
        const start = this.parseDay(query.startDate) ?? this.dayStart(6);
        const endDay = this.parseDay(query.endDate);
        let end = endDay ? this.nextDay(endDay) : tomorrow;
        if (end > tomorrow) end = tomorrow;
        if (end <= start) end = this.nextDay(start);
        return { start, end };
    }

    private parseDay(value?: string): Date | null {
        if (!value) return null;
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match) return null;
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return Number.isNaN(date.getTime()) ? null : date;
    }

    private dayStart(offset: number): Date {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - offset);
        return date;
    }

    private nextDay(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    }

    private dateKey(date: Date): string {
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const day = `${date.getDate()}`.padStart(2, "0");
        return `${date.getFullYear()}-${month}-${day}`;
    }

    private round2(value: number) {
        return Math.round(value * 100) / 100;
    }

    private async namesFor(ids: string[], kind: "user" | "drama") {
        const map = new Map<string, string>();
        if (!ids.length) return map;
        if (kind === "user") {
            const repo = this.dataSource.getRepository(UserEntity);
            const users = await repo.find({
                where: { id: In(ids) } as never,
                select: ["id", "nickname"],
            });
            users.forEach((u) => map.set(u.id, u.nickname));
        } else {
            const rows = await this.dataSource.query(
                `SELECT id, title FROM drama.drama WHERE id = ANY($1)`,
                [ids],
            );
            rows.forEach((r: { id: string; title: string }) => map.set(r.id, r.title));
        }
        return map;
    }
}

/**
 * Drama-flavored member management: list + coin adjustment
 */
@Injectable()
export class MemberService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(UserSubscription)
        private readonly subscriptionRepository: Repository<UserSubscription>,
        @InjectRepository(UnlockRecord)
        private readonly unlockRepository: Repository<UnlockRecord>,
        private readonly billingService: ExtensionBillingService,
        private readonly dataSource: DataSource,
    ) {}

    /**
     * Member list with power, VIP flag and unlock aggregates
     */
    async list(query: { page?: number; pageSize?: number; keyword?: string; vip?: boolean }) {
        const page = query.page ?? 1;
        const pageSize = Math.min(query.pageSize ?? 20, 100);

        const qb = this.userRepository
            .createQueryBuilder("u")
            .select(["u.id", "u.username", "u.nickname", "u.avatar", "u.power", "u.status", "u.createdAt"])
            .orderBy("u.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize);

        if (query.keyword) {
            qb.andWhere("(u.username ILIKE :kw OR u.nickname ILIKE :kw)", {
                kw: `%${query.keyword}%`,
            });
        }

        const [users, total] = await qb.getManyAndCount();

        const now = new Date();
        const vipRows = await this.subscriptionRepository.find({
            where: { endTime: MoreThan(now) },
            select: ["userId"],
        });
        const vipSet = new Set(vipRows.map((v) => v.userId));

        const spendRows = await this.unlockRepository
            .createQueryBuilder("u")
            .select("u.userId", "userId")
            .addSelect("COUNT(*)", "unlocks")
            .addSelect("SUM(u.coins)", "coins")
            .groupBy("u.userId")
            .getRawMany();
        const spendMap = new Map(
            spendRows.map((r: { userId: string; unlocks: string; coins: string }) => [
                r.userId,
                { unlocks: Number(r.unlocks), coins: Number(r.coins) },
            ]),
        );

        let items = users.map((u) => ({
            id: u.id,
            username: u.username,
            nickname: u.nickname,
            avatar: u.avatar,
            power: u.power,
            status: u.status,
            createdAt: u.createdAt,
            isVip: vipSet.has(u.id),
            unlocks: spendMap.get(u.id)?.unlocks ?? 0,
            coinsSpent: spendMap.get(u.id)?.coins ?? 0,
        }));

        if (query.vip !== undefined) {
            items = items.filter((u) => u.isVip === query.vip);
        }

        return { items, total, page, pageSize };
    }

    /**
     * Adjust member coins (+/-) with an account log entry
     */
    async adjustCoins(operatorId: string, userId: string, delta: number, remark?: string) {
        if (!Number.isInteger(delta) || delta === 0) {
            throw HttpErrorFactory.badRequest("调整数量不合法");
        }
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw HttpErrorFactory.notFound("会员不存在");
        }
        if (delta > 0) {
            await this.billingService.addUserPower({
                userId,
                amount: delta,
                remark: remark || `后台调整 +${delta}`,
            });
        } else {
            await this.billingService.deductUserPower({
                userId,
                amount: -delta,
                remark: remark || `后台调整 ${delta}`,
            });
        }
        return { success: true, message: `已${delta > 0 ? "增加" : "扣减"} ${Math.abs(delta)} 金币` };
    }

    /**
     * Enable / disable a member account
     */
    async setStatus(userId: string, status: number) {
        await this.userRepository.update({ id: userId }, { status });
        return { success: true };
    }
}
