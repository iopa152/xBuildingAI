import { Module } from "@nestjs/common";

import { BannerModule } from "./banner/banner.module";
import { CategoryModule } from "./category/category.module";
import { ConfigCenterModule } from "./config-center/config-center.module";
import { DramaModule } from "./drama/drama.module";
import { EpisodeModule } from "./episode/episode.module";
import { HelpModule } from "./help/help.module";
import { MallModule } from "./mall/mall.module";
import { MemberModule } from "./member/member.module";
import { NovelModule } from "./novel/novel.module";
import { OpsModule } from "./ops/ops.module";
import { PayModule } from "./pay/pay.module";
import { StatsModule } from "./stats/stats.module";
import { SystemModule } from "./system/system.module";
import { VodModule } from "./vod/vod.module";
import { PromotionModule } from "./promotion/promotion.module";
import { TaskModule } from "./task/task.module";
import { UnlockModule } from "./unlock/unlock.module";
import { WatchModule } from "./watch/watch.module";

@Module({
    imports: [
        CategoryModule,
        ConfigCenterModule,
        DramaModule,
        EpisodeModule,
        BannerModule,
        UnlockModule,
        WatchModule,
        TaskModule,
        PromotionModule,
        PayModule,
        HelpModule,
        MemberModule,
        MallModule,
        NovelModule,
        VodModule,
        StatsModule,
        OpsModule,
        SystemModule,
    ],
    exports: [
        CategoryModule,
        DramaModule,
        EpisodeModule,
        BannerModule,
        UnlockModule,
        WatchModule,
        TaskModule,
        PromotionModule,
        PayModule,
        HelpModule,
        MemberModule,
        MallModule,
        NovelModule,
        VodModule,
        StatsModule,
        OpsModule,
        SystemModule,
    ],
})
export class AppModule {}
