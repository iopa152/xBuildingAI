import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { Param, Get, Post, Body, Res, Req, Query } from "@nestjs/common";
import type { Request, Response } from "express";

import { PromotionService } from "../../services/promotion.service";

/**
 * Promotion tracking (web / H5)
 */
@ExtensionWebController("promo")
export class PromotionWebController extends BaseController {
    constructor(private readonly promotionService: PromotionService) {
        super();
    }

    /**
     * Landing redirect: /drama/api/promo/t/:code → logs click, 302 to landing
     */
    @Get("t/:code")
    @Public()
    async track(
        @Param("code") code: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const { landing } = await this.promotionService.trackClick(code, {
            ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip,
            userAgent: req.headers["user-agent"],
            referer: req.headers.referer,
        });
        res.cookie("drama_plc", code, { maxAge: 30 * 24 * 3600 * 1000 });
        res.redirect(302, `${landing}${landing.includes("?") ? "&" : "?"}plc=${code}`);
    }

    /**
     * Ad landing redirect: /drama/api/promo/mid?p=CODE&campaign_id=...&ad_id=...
     */
    @Get("mid")
    @Public()
    async mid(
        @Query() query: Record<string, string | undefined>,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const code = query.p;
        if (!code) {
            res.redirect(302, "/");
            return;
        }
        try {
            const { landing } = await this.promotionService.trackClick(code, {
                ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip,
                userAgent: req.headers["user-agent"],
                referer: req.headers.referer,
                campaignId: query.campaign_id,
                adId: query.ad_id,
                fbclid: query.fbclid,
                platform: query.source,
                isRealAd: !!(query.campaign_id || query.ad_id),
            });
            res.cookie("drama_plc", code, { maxAge: 30 * 24 * 3600 * 1000 });
            const params = new URLSearchParams({ plc: code });
            if (query.fbclid) params.set("fbclid", query.fbclid);
            res.redirect(
                302,
                `${landing}${landing.includes("?") ? "&" : "?"}${params.toString()}`,
            );
        } catch {
            res.redirect(302, "/");
        }
    }

    /**
     * Bind current logged user to a promo code (first-touch attribution)
     */
    @Post("attribute")
    async attribute(@Playground() user: UserPlayground, @Body("code") code: string) {
        return this.promotionService.attribute(user.id, code);
    }

    /**
     * Price panel bound to a promo code (public, for recharge page)
     */
    @Get("panel/:code")
    @Public()
    async panel(@Param("code") code: string) {
        return this.promotionService.getPanelByCode(code);
    }
}
