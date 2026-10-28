import { Module } from "@nestjs/common";

import { BannerModule } from "./banner/banner.module";
import { CategoryModule } from "./category/category.module";
import { DramaModule } from "./drama/drama.module";
import { EpisodeModule } from "./episode/episode.module";
import { HelpModule } from "./help/help.module";
import { OpsModule } from "./ops/ops.module";
import { PayModule } from "./pay/pay.module";
import { StatsModule } from "./stats/stats.module";
import { VodModule } from "./vod/vod.module";
import { PromotionModule } from "./promotion/promotion.module";
import { TaskModule } from "./task/task.module";
import { UnlockModule } from "./unlock/unlock.module";
import { WatchModule } from "./watch/watch.module";

@Module({
    imports: [
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
        VodModule,
        StatsModule,
        OpsModule,
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
        VodModule,
        StatsModule,
        OpsModule,
    ],
})
export class AppModule {}
