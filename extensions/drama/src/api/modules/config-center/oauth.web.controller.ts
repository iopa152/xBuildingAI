import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { Public } from "@buildingai/decorators/public.decorator";
import { Get, Headers, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import { OauthService } from "./oauth.service";

/**
 * OAuth 三方登录 (H5). Public browser-facing endpoints: the redirect issues a
 * 302 to the provider, the callback 302s back to the H5 with a session token
 * in the hash router.
 */
@ExtensionWebController("oauth")
export class OauthWebController extends BaseController {
    constructor(private readonly oauthService: OauthService) {
        super();
    }

    @Get(":provider/redirect")
    @Public()
    async redirect(
        @Param("provider") provider: string,
        @Res() res: Response,
        @Headers("x-forwarded-host") forwardedHost?: string,
        @Headers("host") host?: string,
    ) {
        const base = forwardedHost ? `https://${forwardedHost}` : `http://${host ?? "localhost:4090"}`;
        const url = await this.oauthService.redirectUrl(provider, base);
        return res.redirect(302, url);
    }

    @Get(":provider/callback")
    @Public()
    async callback(
        @Param("provider") provider: string,
        @Query("code") code: string,
        @Query("state") state: string,
        @Res() res: Response,
        @Headers("x-forwarded-host") forwardedHost?: string,
        @Headers("host") host?: string,
    ) {
        const base = forwardedHost ? `https://${forwardedHost}` : `http://${host ?? "localhost:4090"}`;
        try {
            const h5 = process.env.H5_BASE_URL || "http://localhost:5180";
            const url = await this.oauthService.handleCallback(
                provider,
                code,
                state,
                base,
                h5,
            );
            return res.redirect(302, url);
        } catch (err) {
            const h5 = process.env.H5_BASE_URL || "http://localhost:5180";
            const message = encodeURIComponent((err as Error).message ?? "登录失败");
            return res.redirect(302, `${h5}/#/pages/login/login?error=${message}`);
        }
    }
}
