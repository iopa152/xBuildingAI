import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import { Drama } from "../../../db/entities/drama.entity";
import { Episode } from "../../../db/entities/episode.entity";
import { CoinOrder, CoinOrderStatus } from "../../../db/entities/pay-entities.entity";
import {
    Attribution,
    CapiEvent,
    ClickLog,
    Pixel,
    PricePanel,
    PromoDaily,
    PromoLink,
} from "../../../db/entities/promotion-entities.entity";

const H5_BASE = process.env.DRAMA_H5_BASE_URL || "https://dramah5.changqingtch.com";
const EXTENSION_IDENTIFIER = "drama";

const MID_PARAMS = [
    "server=1",
    "p={code}",
    "campaign_id={{campaign.id}}",
    "campaign_name={{campaign.name}}",
    "adset_id={{adset.id}}",
    "adset_name={{adset.name}}",
    "ad_id={{ad.id}}",
    "ad_name={{ad.name}}",
    "placement={{placement}}",
    "source={{site_source_name}}",
].join("&");

interface ClickMeta {
    ip?: string;
    userAgent?: string;
    referer?: string;
    userId?: string;
    campaignId?: string;
    adId?: string;
    fbclid?: string;
    platform?: string;
    isRealAd?: boolean;
}

/**
 * Promotion domain: promo links, click tracking, first-touch attribution,
 * Meta Conversions API (server-side) and LTV overview.
 */
@Injectable()
export class PromotionService extends BaseService<PromoLink> {
    private readonly logger = new Logger(PromotionService.name);

    constructor(
        @InjectRepository(PromoLink)
        private readonly linkRepository: Repository<PromoLink>,
        @InjectRepository(PricePanel)
        private readonly panelRepository: Repository<PricePanel>,
        @InjectRepository(ClickLog)
        private readonly clickRepository: Repository<ClickLog>,
        @InjectRepository(Attribution)
        private readonly attributionRepository: Repository<Attribution>,
        @InjectRepository(Pixel)
        private readonly pixelRepository: Repository<Pixel>,
        @InjectRepository(CapiEvent)
        private readonly capiRepository: Repository<CapiEvent>,
        @InjectRepository(PromoDaily)
        private readonly dailyRepository: Repository<PromoDaily>,
        @InjectRepository(CoinOrder)
        private readonly orderRepository: Repository<CoinOrder>,
        @InjectRepository(Episode)
        private readonly episodeRepository: Repository<Episode>,
    ) {
        super(linkRepository);
    }

    // ---------------- click tracking ----------------

    /**
     * Track a promo click and return the landing path to redirect to.
     */
    async trackClick(
        code: string,
        meta: ClickMeta,
    ): Promise<{ landing: string; linkId: string }> {
        const link = await this.linkRepository.findOneBy({ code, status: "active" });
        if (!link) {
            throw HttpErrorFactory.notFound("推广链接不存在");
        }

        await this.clickRepository.insert({
            linkId: link.id,
            ip: meta.ip?.slice(0, 64),
            userAgent: meta.userAgent?.slice(0, 500),
            referer: meta.referer?.slice(0, 500),
            userId: meta.userId,
            campaignId: meta.campaignId?.slice(0, 100),
            adId: meta.adId?.slice(0, 100),
            fbclid: meta.fbclid?.slice(0, 255),
            platform: meta.platform?.slice(0, 50),
            isRealAd: !!meta.isRealAd,
        });
        await this.linkRepository.increment({ id: link.id }, "clicks", 1);
        await this.bumpDaily(link.id, { clicks: 1 });

        const landing =
            link.landing && link.landing !== "/"
                ? link.landing
                : this.landingForDrama(link.dramaId, link.episodeId);

        return { landing, linkId: link.id };
    }

    /**
     * Bind a registered/logged user to their first promo link (one-shot per user)
     */
    async attribute(userId: string, code: string) {
        const link = await this.linkRepository.findOneBy({ code, status: "active" });
        if (!link) {
            throw HttpErrorFactory.notFound("推广链接不存在");
        }
        const existing = await this.attributionRepository.findOneBy({ userId });
        if (existing) {
            return { attributed: false };
        }
        await this.attributionRepository
            .insert({ userId, linkId: link.id })
            .catch((err) => {
                if ((err as { code?: string }).code !== "23505") throw err;
            });
        await this.bumpDaily(link.id, { registrations: 1 });

        // server-side CAPI: CompleteRegistration
        await this.sendCapiForLink(link.id, "CompleteRegistration", userId).catch(() => undefined);
        return { attributed: true };
    }

    // ---------------- Meta CAPI ----------------

    /**
     * Send a server-side event through every enabled pixel bound to the link.
     * Deduped by (pixelId, eventId); failures are logged, never thrown to caller flow.
     */
    async sendCapiForLink(
        linkId: string,
        eventName: string,
        userId?: string,
        value?: number,
        currency = "USD",
    ) {
        const link = await this.linkRepository.findOneBy({ id: linkId });
        if (!link?.pixelId || link.capiEnabled === false) return;

        const pixel = await this.pixelRepository.findOneBy({ id: link.pixelId, status: true });
        if (!pixel?.accessToken) return;

        const eventId = `${eventName}:${userId ?? "anon"}:${Date.now()}`;
        const body = {
            data: [
                {
                    event_name: eventName,
                    event_time: Math.floor(Date.now() / 1000),
                    event_id: eventId,
                    action_source: "website",
                    ...(userId ? { external_id: userId } : {}),
                    ...(value !== undefined ? { value, currency } : {}),
                },
            ],
            access_token: pixel.accessToken,
        };
        const event = this.capiRepository.create({
            pixelId: pixel.id,
            linkId,
            eventName,
            eventId,
            userId,
            value,
            currency,
            status: "pending",
            requestBody: JSON.stringify(body, null, 2),
        });
        try {
            await this.capiRepository.insert(event);
        } catch (err) {
            if ((err as { code?: string }).code === "23505") return; // duplicate
            throw err;
        }

        try {
            const response = await fetch(
                `https://graph.facebook.com/v18.0/${pixel.pixelId}/events`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                },
            );
            const text = await response.text();
            let parsed: {
                events_received?: number;
                error?: { message?: string };
            } | null = null;
            try {
                parsed = JSON.parse(text);
            } catch {
                parsed = null;
            }
            const failed = !response.ok || !!parsed?.error;
            await this.capiRepository.update(
                { id: event.id },
                {
                    status: failed ? "failed" : "sent",
                    response: text.slice(0, 4000),
                    responseCode: String(response.status),
                    eventsReceived: Number(parsed?.events_received ?? 0) || 0,
                    errorMessage:
                        parsed?.error?.message ?? (failed ? text.slice(0, 1000) : undefined),
                },
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`CAPI send failed: ${message}`);
            await this.capiRepository.update(
                { id: event.id },
                {
                    status: "failed",
                    response: message.slice(0, 4000),
                    errorMessage: message.slice(0, 1000),
                },
            );
        }
    }

    /**
     * Resolve a promo code to its link then send the CAPI event
     */
    async sendCapiForLinkByCode(
        code: string,
        eventName: string,
        userId?: string,
        value?: number,
        currency = "USD",
    ) {
        const link = await this.linkRepository.findOneBy({ code, status: "active" });
        if (!link) return;
        return this.sendCapiForLink(link.id, eventName, userId, value, currency);
    }

    // ---------------- dashboard / LTV ----------------

    private async getDramaTitles() {
        const dramas = await this.linkRepository.manager.getRepository(Drama).find();
        return new Map(dramas.map((d) => [d.id, d.title]));
    }

    private async getPaidOrders(codes: string[], from?: string, to?: string) {
        if (!codes.length) return [];
        const qb = this.orderRepository
            .createQueryBuilder("o")
            .where("o.status = :status", { status: CoinOrderStatus.PAID })
            .andWhere("o.promoCode IN (:...codes)", { codes });
        if (from && to) {
            qb.andWhere("COALESCE(o.paidAt, o.createdAt) BETWEEN :from AND :to", {
                from: `${from} 00:00:00`,
                to: `${to} 23:59:59`,
            });
        }
        qb.select("o.promoCode", "code")
            .addSelect("o.userId", "userId")
            .addSelect("o.amount", "amount")
            .addSelect("TO_CHAR(COALESCE(o.paidAt, o.createdAt), 'YYYY-MM-DD')", "day");
        return qb.getRawMany<{
            code: string;
            userId: string;
            amount: string;
            day: string;
        }>();
    }

    /**
     * Daily funnel per link within [from, to]:
     * clicks / registrations / payers / revenue, grouped by day, link or drama.
     */
    async overview(query: {
        from: string;
        to: string;
        linkId?: string;
        dramaId?: string;
        creator?: string;
        dimension?: "day" | "link" | "drama";
    }) {
        const dimension = query.dimension ?? "day";
        const links = await this.linkRepository.find();
        const linkMap = new Map(links.map((l) => [l.id, l]));
        const dramaTitles = await this.getDramaTitles();

        const scoped = links.filter(
            (l) =>
                (!query.linkId || l.id === query.linkId) &&
                (!query.dramaId || l.dramaId === query.dramaId) &&
                (!query.creator || l.creator === query.creator),
        );
        const scopedIds = new Set(scoped.map((l) => l.id));

        const dailyRows = await this.dailyRepository
            .createQueryBuilder("p")
            .where("p.statDate BETWEEN :from AND :to", { from: query.from, to: query.to })
            .getMany();

        const keyOf = (linkId: string, day: string) => {
            const link = linkMap.get(linkId);
            if (dimension === "link") return linkId;
            if (dimension === "drama") return link?.dramaId || "none";
            return day;
        };

        const buckets = new Map<
            string,
            {
                key: string;
                label: string;
                date?: string;
                clicks: number;
                registrations: number;
                revenueCents: number;
                payers: Set<string>;
            }
        >();
        const bucketFor = (key: string, day: string) => {
            let entry = buckets.get(key);
            if (!entry) {
                let label = key;
                let date: string | undefined;
                if (dimension === "day") {
                    label = day;
                    date = day;
                } else if (dimension === "link") {
                    label = linkMap.get(key)?.name ?? "-";
                } else {
                    label = dramaTitles.get(key) ?? "未指定";
                }
                entry = {
                    key,
                    label,
                    date,
                    clicks: 0,
                    registrations: 0,
                    revenueCents: 0,
                    payers: new Set(),
                };
                buckets.set(key, entry);
            }
            return entry;
        };

        for (const row of dailyRows) {
            if (!scopedIds.has(row.linkId)) continue;
            const bucket = bucketFor(keyOf(row.linkId, row.statDate), row.statDate);
            bucket.clicks += row.clicks;
            bucket.registrations += row.registrations;
        }

        const orders = await this.getPaidOrders(
            scoped.map((l) => l.code),
            query.from,
            query.to,
        );
        const codeMap = new Map(scoped.map((l) => [l.code, l]));
        for (const order of orders) {
            const link = codeMap.get(order.code);
            if (!link) continue;
            const bucket = bucketFor(keyOf(link.id, order.day), order.day);
            bucket.revenueCents += Number(order.amount ?? 0);
            bucket.payers.add(order.userId);
        }

        const items = Array.from(buckets.values())
            .map((b) => {
                const revenue = +(b.revenueCents / 100).toFixed(2);
                return {
                    key: b.key,
                    label: b.label,
                    date: b.date,
                    clicks: b.clicks,
                    registrations: b.registrations,
                    registrationRate: b.clicks ? +(b.registrations / b.clicks).toFixed(4) : 0,
                    payUsers: b.payers.size,
                    revenue,
                    payRate: b.registrations ? +(b.payers.size / b.registrations).toFixed(4) : 0,
                    avgOrder: b.payers.size ? +(revenue / b.payers.size).toFixed(2) : 0,
                    arpu: b.registrations ? +(revenue / b.registrations).toFixed(2) : 0,
                };
            })
            .sort((a, b) =>
                dimension === "day"
                    ? (b.date ?? "").localeCompare(a.date ?? "")
                    : b.revenue - a.revenue,
            );

        const totals = items.reduce(
            (acc, item) => ({
                clicks: acc.clicks + item.clicks,
                registrations: acc.registrations + item.registrations,
                payUsers: acc.payUsers + item.payUsers,
                revenue: +(acc.revenue + item.revenue).toFixed(2),
            }),
            { clicks: 0, registrations: 0, payUsers: 0, revenue: 0 },
        );
        const totalRates = {
            ...totals,
            registrationRate: totals.clicks
                ? +(totals.registrations / totals.clicks).toFixed(4)
                : 0,
            payRate: totals.registrations
                ? +(totals.payUsers / totals.registrations).toFixed(4)
                : 0,
            avgOrder: totals.payUsers ? +(totals.revenue / totals.payUsers).toFixed(2) : 0,
            arpu: totals.registrations
                ? +(totals.revenue / totals.registrations).toFixed(2)
                : 0,
        };

        const creators = Array.from(new Set(links.map((l) => l.creator).filter(Boolean)));
        const dramas = links
            .filter((l): l is PromoLink & { dramaId: string } => !!l.dramaId)
            .map((l) => ({ id: l.dramaId, title: dramaTitles.get(l.dramaId) ?? l.dramaId }));
        const dramaOptions = Array.from(
            new Map(dramas.map((d) => [d.id, d])).values(),
        );

        return {
            items,
            totals: totalRates,
            links: links.map((l) => ({ id: l.id, name: l.name, code: l.code })),
            creators,
            dramas: dramaOptions,
        };
    }

    /**
     * Cohort LTV: revenue per newly registered user on day 0..N.
     */
    async ltvStats(query: {
        days?: number;
        from?: string;
        to?: string;
        linkId?: string;
        creator?: string;
        dramaId?: string;
    }) {
        const days = Math.min(Math.max(query.days ?? 7, 0), 30);
        const links = await this.linkRepository.find();
        const linkMap = new Map(links.map((l) => [l.id, l]));
        const scoped = links.filter(
            (l) =>
                (!query.linkId || l.id === query.linkId) &&
                (!query.creator || l.creator === query.creator) &&
                (!query.dramaId || l.dramaId === query.dramaId),
        );
        const scopedIds = new Set(scoped.map((l) => l.id));
        if (scopedIds.size === 0) {
            return {
                items: [],
                days,
                links: links.map((l) => ({ id: l.id, name: l.name, code: l.code })),
            };
        }

        const to = query.to || this.today();
        const from =
            query.from ||
            new Date(Date.parse(`${to}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);
        const attributions = await this.attributionRepository
            .createQueryBuilder("a")
            .where("a.linkId IN (:...ids)", { ids: Array.from(scopedIds) })
            .andWhere("a.createdAt BETWEEN :from AND :to", {
                from: `${from} 00:00:00`,
                to: `${to} 23:59:59`,
            })
            .getMany();

        const cohortMap = new Map<
            string,
            {
                linkId: string;
                regDate: string;
                users: Set<string>;
                payers: Set<string>;
                revenueCents: number;
                todayNew: number;
                todayPayers: Set<string>;
                todayRevenueCents: number;
                ltvRevenueCents: number[];
            }
        >();
        const userCohort = new Map<string, string>();
        const today = this.today();
        for (const row of attributions) {
            if (!scopedIds.has(row.linkId)) continue;
            const regDate = this.dayOf(row.createdAt);
            const key = `${row.linkId}:${regDate}`;
            let cohort = cohortMap.get(key);
            if (!cohort) {
                cohort = {
                    linkId: row.linkId,
                    regDate,
                    users: new Set(),
                    payers: new Set(),
                    revenueCents: 0,
                    todayNew: 0,
                    todayPayers: new Set(),
                    todayRevenueCents: 0,
                    ltvRevenueCents: Array.from({ length: days + 1 }, () => 0),
                };
                cohortMap.set(key, cohort);
            }
            cohort.users.add(row.userId);
            userCohort.set(row.userId, key);
            if (regDate === today) cohort.todayNew += 1;
        }

        const orders = await this.getPaidOrders(scoped.map((l) => l.code));
        for (const order of orders) {
            const key = userCohort.get(order.userId);
            if (!key) continue;
            const cohort = cohortMap.get(key);
            if (!cohort) continue;
            const amount = Number(order.amount ?? 0);
            cohort.revenueCents += amount;
            cohort.payers.add(order.userId);
            if (order.day === today) {
                cohort.todayPayers.add(order.userId);
                cohort.todayRevenueCents += amount;
            }
            const offset = this.dayOffset(order.day, cohort.regDate);
            if (offset >= 0 && offset <= days) {
                cohort.ltvRevenueCents[offset] = (cohort.ltvRevenueCents[offset] ?? 0) + amount;
            }
        }

        const items = Array.from(cohortMap.values())
            .map((cohort) => {
                const newUsers = cohort.users.size;
                const revenue = +(cohort.revenueCents / 100).toFixed(2);
                const ltv: number[] = [];
                let cumulativeCents = 0;
                for (let day = 0; day <= days; day += 1) {
                    cumulativeCents += cohort.ltvRevenueCents[day] ?? 0;
                    ltv.push(newUsers ? +(cumulativeCents / 100 / newUsers).toFixed(2) : 0);
                }
                return {
                    linkId: cohort.linkId,
                    linkName: linkMap.get(cohort.linkId)?.name ?? "-",
                    regDate: cohort.regDate,
                    newUsers,
                    payers: cohort.payers.size,
                    revenue,
                    avgRevenue: cohort.payers.size
                        ? +(revenue / cohort.payers.size).toFixed(2)
                        : 0,
                    todayNew: cohort.todayNew,
                    todayPayers: cohort.todayPayers.size,
                    todayRevenue: +(cohort.todayRevenueCents / 100).toFixed(2),
                    ltv,
                };
            })
            .sort(
                (a, b) =>
                    b.regDate.localeCompare(a.regDate) ||
                    a.linkName.localeCompare(b.linkName),
            );

        return {
            items,
            days,
            links: links.map((l) => ({ id: l.id, name: l.name, code: l.code })),
        };
    }

    /**
     * CAPI daily monitor: per-event sent / success / failed counts by day.
     */
    async capiMonitorDaily(query: { from?: string; to?: string }) {
        const to = query.to || this.today();
        const from =
            query.from ||
            new Date(Date.parse(`${to}T00:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10);
        const rows = await this.capiRepository
            .createQueryBuilder("c")
            .where("c.createdAt BETWEEN :from AND :to", {
                from: `${from} 00:00:00`,
                to: `${to} 23:59:59`,
            })
            .select("TO_CHAR(c.createdAt, 'YYYY-MM-DD')", "day")
            .addSelect("c.eventName", "eventName")
            .addSelect("COUNT(*)", "sent")
            .addSelect("SUM(CASE WHEN c.status = 'sent' THEN 1 ELSE 0 END)", "success")
            .addSelect("SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END)", "failed")
            .groupBy("TO_CHAR(c.createdAt, 'YYYY-MM-DD')")
            .addGroupBy("c.eventName")
            .orderBy("TO_CHAR(c.createdAt, 'YYYY-MM-DD')", "DESC")
            .getRawMany();

        const events = ["ViewContent", "CompleteRegistration", "Purchase"];
        const byDay = new Map<
            string,
            {
                date: string;
                ViewContent: { sent: number; success: number; failed: number };
                CompleteRegistration: { sent: number; success: number; failed: number };
                Purchase: { sent: number; success: number; failed: number };
                totalSent: number;
                totalSuccess: number;
                totalFailed: number;
            }
        >();
        const emptyEvent = () => ({ sent: 0, success: 0, failed: 0 });
        for (const row of rows) {
            const date = row.day as string;
            let entry = byDay.get(date);
            if (!entry) {
                entry = {
                    date,
                    ViewContent: emptyEvent(),
                    CompleteRegistration: emptyEvent(),
                    Purchase: emptyEvent(),
                    totalSent: 0,
                    totalSuccess: 0,
                    totalFailed: 0,
                };
                byDay.set(date, entry);
            }
            if (events.includes(row.eventName)) {
                const target = entry[row.eventName as (typeof events)[number]];
                target.sent += Number(row.sent);
                target.success += Number(row.success);
                target.failed += Number(row.failed);
            }
            entry.totalSent += Number(row.sent);
            entry.totalSuccess += Number(row.success);
            entry.totalFailed += Number(row.failed);
        }

        const items = Array.from(byDay.values()).map((item) => ({
            ...item,
            successRate: item.totalSent
                ? +(item.totalSuccess / item.totalSent).toFixed(4)
                : 0,
        }));
        return { items };
    }

    /**
     * CAPI monitor: counts grouped by event name and status
     */
    async capiMonitor() {
        const byEvent = await this.capiRepository
            .createQueryBuilder("c")
            .select("c.eventName", "eventName")
            .addSelect("COUNT(*)", "count")
            .addSelect("SUM(CASE WHEN c.status = 'sent' THEN 1 ELSE 0 END)", "sent")
            .addSelect("SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END)", "failed")
            .addSelect("SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END)", "pending")
            .groupBy("c.eventName")
            .getRawMany();
        const byStatus = await this.capiRepository
            .createQueryBuilder("c")
            .select("c.status", "status")
            .addSelect("COUNT(*)", "count")
            .groupBy("c.status")
            .getRawMany();
        return {
            byEvent: byEvent.map((r) => ({
                eventName: r.eventName,
                count: Number(r.count),
                sent: Number(r.sent),
                failed: Number(r.failed),
                pending: Number(r.pending),
            })),
            byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
        };
    }

    // ---------------- console CRUD ----------------

    /**
     * Console link list: fuzzy search + pixel/panel names joined + pagination
     */
    async listLinksForConsole(query: {
        page?: number;
        pageSize?: number;
        keyword?: string;
        status?: string;
    }) {
        const page = query.page ?? 1;
        const pageSize = Math.min(query.pageSize ?? 20, 100);

        const qb = this.linkRepository
            .createQueryBuilder("l")
            .orderBy("l.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize);

        if (query.keyword) {
            qb.andWhere("(l.name ILIKE :kw OR l.code ILIKE :kw)", {
                kw: `%${query.keyword}%`,
            });
        }
        if (query.status) {
            qb.andWhere("l.status = :status", { status: query.status });
        }

        const [links, total] = await qb.getManyAndCount();

        const pixels = await this.pixelRepository.find();
        const panels = await this.panelRepository.find();
        const pixelMap = new Map(pixels.map((p) => [p.id, p]));
        const panelMap = new Map(panels.map((p) => [p.id, p]));
        const dramaTitles = await this.getDramaTitles();

        return {
            items: links.map((l) => ({
                ...l,
                pixelName: l.pixelId ? pixelMap.get(l.pixelId)?.name ?? null : null,
                pixelBusinessId: l.pixelId ? pixelMap.get(l.pixelId)?.pixelId ?? null : null,
                panelName: l.panelId ? panelMap.get(l.panelId)?.name ?? null : null,
                dramaTitle: l.dramaId ? dramaTitles.get(l.dramaId) ?? null : null,
                landingUrl: this.buildLandingUrl(l),
                trackPath: `/${EXTENSION_IDENTIFIER}/api/promo/mid?${MID_PARAMS.replace("{code}", l.code)}`,
            })),
            total,
            page,
            pageSize,
        };
    }

    async createLink(dto: Partial<PromoLink>) {
        const code = dto.code?.trim() || (await this.generateCode());
        const existing = await this.linkRepository.findOneBy({ code });
        if (existing) {
            throw HttpErrorFactory.badRequest("推广码已存在");
        }
        const landing = dto.landing || this.landingForDrama(dto.dramaId, dto.episodeId);
        return this.linkRepository.save(
            this.linkRepository.create({
                ...dto,
                code,
                landing,
                status: dto.status || "active",
            }),
        );
    }

    async updateLink(id: string, dto: Partial<PromoLink>) {
        const payload = { ...dto };
        const touchesLanding = payload.dramaId !== undefined || payload.episodeId !== undefined;
        if (touchesLanding && !payload.landing) {
            const current = await this.linkRepository.findOneBy({ id });
            const dramaId = payload.dramaId !== undefined ? payload.dramaId : current?.dramaId;
            const episodeId =
                payload.episodeId !== undefined ? payload.episodeId : current?.episodeId;
            payload.landing = this.landingForDrama(dramaId ?? undefined, episodeId ?? undefined);
        }
        await this.linkRepository.update({ id }, payload);
    }

    async deleteLink(id: string) {
        await this.linkRepository.delete({ id });
    }

    async listPanels() {
        return this.panelRepository.find({ order: { createdAt: "DESC" } });
    }

    async listEpisodes(dramaId: string) {
        const episodes = await this.episodeRepository.find({
            where: { drama: { id: dramaId } },
            order: { episodeNo: "ASC" },
        });
        return episodes.map((e) => ({
            id: e.id,
            episodeNo: e.episodeNo,
            title: e.title ?? `第${e.episodeNo}集`,
        }));
    }

    async createPanel(dto: Partial<PricePanel>) {
        return this.panelRepository.save(this.panelRepository.create(dto));
    }

    async updatePanel(id: string, dto: Partial<PricePanel>) {
        await this.panelRepository.update({ id }, dto);
    }

    async deletePanel(id: string) {
        await this.panelRepository.delete({ id });
    }

    async listPixels() {
        return this.pixelRepository.find({ order: { createdAt: "DESC" } });
    }

    async createPixel(dto: Partial<Pixel>) {
        return this.pixelRepository.save(this.pixelRepository.create(dto));
    }

    async updatePixel(id: string, dto: Partial<Pixel>) {
        await this.pixelRepository.update({ id }, dto);
    }

    async deletePixel(id: string) {
        await this.pixelRepository.delete({ id });
    }

    async listClicks(query: {
        page?: number;
        pageSize?: number;
        linkId?: string;
        keyword?: string;
    }) {
        const page = query.page ?? 1;
        const pageSize = Math.min(query.pageSize ?? 20, 100);
        const qb = this.clickRepository
            .createQueryBuilder("c")
            .orderBy("c.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize);
        if (query.linkId) {
            qb.andWhere("c.linkId = :linkId", { linkId: query.linkId });
        }
        if (query.keyword) {
            const kw = `%${query.keyword}%`;
            qb.andWhere(
                "(c.ip ILIKE :kw OR c.user_id::text ILIKE :kw OR c.campaign_id ILIKE :kw OR c.ad_id ILIKE :kw OR c.fbclid ILIKE :kw OR c.link_id IN (SELECT l.id FROM drama.promo_link l WHERE l.code ILIKE :kw OR l.name ILIKE :kw))",
                { kw },
            );
        }
        const [items, total] = await qb.getManyAndCount();
        const linkIds = Array.from(new Set(items.map((i) => i.linkId)));
        const links = linkIds.length
            ? await this.linkRepository.find({ where: { id: In(linkIds) } })
            : [];
        const linkMap = new Map(links.map((l) => [l.id, l]));
        return {
            items: items.map((i) => ({
                ...i,
                linkCode: linkMap.get(i.linkId)?.code ?? null,
                linkName: linkMap.get(i.linkId)?.name ?? null,
            })),
            total,
            page,
            pageSize,
        };
    }

    async listCapiEvents(query: {
        page?: number;
        pageSize?: number;
        pixelId?: string;
        keyword?: string;
        status?: string;
    }) {
        const page = query.page ?? 1;
        const pageSize = Math.min(query.pageSize ?? 20, 100);
        const qb = this.capiRepository
            .createQueryBuilder("c")
            .orderBy("c.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize);
        if (query.pixelId) {
            qb.andWhere("c.pixelId = :pixelId", { pixelId: query.pixelId });
        }
        if (query.status) {
            qb.andWhere("c.status = :status", { status: query.status });
        }
        if (query.keyword) {
            qb.andWhere(
                "(c.event_name ILIKE :kw OR c.event_id ILIKE :kw OR c.user_id::text ILIKE :kw OR c.pixel_id IN (SELECT p.id FROM drama.pixel p WHERE p.pixel_id ILIKE :kw OR p.name ILIKE :kw))",
                { kw: `%${query.keyword}%` },
            );
        }
        const [events, total] = await qb.getManyAndCount();
        const linkIds = Array.from(
            new Set(events.map((e) => e.linkId).filter((id): id is string => !!id)),
        );
        const pixelIds = Array.from(new Set(events.map((e) => e.pixelId)));
        const links = linkIds.length
            ? await this.linkRepository.find({ where: { id: In(linkIds) } })
            : [];
        const pixels = pixelIds.length
            ? await this.pixelRepository.find({ where: { id: In(pixelIds) } })
            : [];
        const linkMap = new Map(links.map((l) => [l.id, l]));
        const pixelMap = new Map(pixels.map((p) => [p.id, p]));
        return {
            items: events.map((e) => ({
                ...e,
                linkName: e.linkId ? linkMap.get(e.linkId)?.name ?? null : null,
                linkCode: e.linkId ? linkMap.get(e.linkId)?.code ?? null : null,
                pixelBusinessId: pixelMap.get(e.pixelId)?.pixelId ?? null,
                pixelName: pixelMap.get(e.pixelId)?.name ?? null,
            })),
            total,
            page,
            pageSize,
        };
    }

    /**
     * Panel bound to a promo link (public, for H5 recharge page)
     */
    async getPanelByCode(code: string) {
        const link = await this.linkRepository.findOneBy({ code, status: "active" });
        if (!link?.panelId) return null;
        return this.panelRepository.findOneBy({ id: link.panelId, status: true });
    }

    private buildLandingUrl(link: PromoLink) {
        const landing =
            link.landing && link.landing !== "/"
                ? link.landing
                : this.landingForDrama(link.dramaId, link.episodeId);
        const base = /^https?:\/\//i.test(landing) ? landing : `${H5_BASE}${landing}`;
        if (/[?&]p=/.test(base)) return base;
        return `${base}${base.includes("?") ? "&" : "?"}p=${link.code}`;
    }

    private landingForDrama(dramaId?: string, episodeId?: string) {
        if (!dramaId) return "/";
        const episode = episodeId ? `&episodeId=${episodeId}` : "";
        return `/pagesPlayer/drama-detail/drama-detail?id=${dramaId}${episode}`;
    }

    private async generateCode() {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const code = `XTV_US_${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
            const existing = await this.linkRepository.findOneBy({ code });
            if (!existing) return code;
        }
        return `XTV_US_${Date.now().toString(16).slice(-8).toUpperCase()}`;
    }

    private dayOf(value: Date | string) {
        const date = typeof value === "string" ? new Date(value) : value;
        return date.toISOString().slice(0, 10);
    }

    private today() {
        return this.dayOf(new Date());
    }

    private dayOffset(day: string, base: string) {
        return Math.round(
            (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${base}T00:00:00Z`)) / 86400000,
        );
    }

    private async bumpDaily(linkId: string, delta: { clicks?: number; registrations?: number }) {
        const today = new Date().toISOString().slice(0, 10);
        // ensure the row exists (zeros), never overwrite existing counters
        await this.dailyRepository
            .insert({ statDate: today, linkId, clicks: 0, registrations: 0 })
            .catch((err) => {
                if ((err as { code?: string }).code !== "23505") throw err;
            });
        if (delta.clicks) {
            await this.dailyRepository
                .createQueryBuilder()
                .update(PromoDaily)
                .set({ clicks: () => `clicks + ${delta.clicks}` })
                .where("statDate = :d AND linkId = :l", { d: today, l: linkId })
                .execute();
        }
        if (delta.registrations) {
            await this.dailyRepository
                .createQueryBuilder()
                .update(PromoDaily)
                .set({ registrations: () => `registrations + ${delta.registrations}` })
                .where("statDate = :d AND linkId = :l", { d: today, l: linkId })
                .execute();
        }
    }
}
