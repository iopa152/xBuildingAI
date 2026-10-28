import { defineRouteOption } from "@buildingai/web-core";

import packageJson from "./../../package.json";
import BannerListPage from "./pages/console/banner/list";
import CategoryListPage from "./pages/console/category/list";
import DramaEditPage from "./pages/console/drama/edit";
import DramaListPage from "./pages/console/drama/list";
import CommentManagePage from "./pages/console/record/comment";
import FavoriteRecordPage from "./pages/console/record/favorite";
import WatchHistoryPage from "./pages/console/record/history";
import RatingManagePage from "./pages/console/record/rating";
import LanguagePage from "./pages/console/ops/language";
import PlaylistPage from "./pages/console/ops/playlist";
import OpsPage from "./pages/console/ops";
import MemberPage from "./pages/console/stats/member";
import StatsOverviewPage from "./pages/console/stats/overview";
import PayConfigPage from "./pages/console/pay/config";
import PayOrderPage from "./pages/console/pay/order";
import CoinPackagePage from "./pages/console/pay/package";
import UnlockRecordPage from "./pages/console/record/unlock";
import PromotionPage from "./pages/console/promo/overview";
import PromoLinksPage from "./pages/console/promo/links";
import PromoPanelsPage from "./pages/console/promo/panels";
import PromoPixelsPage from "./pages/console/promo/pixels";
import PromoClicksPage from "./pages/console/promo/clicks";
import PromoCapiPage from "./pages/console/promo/capi";
import PromoMonitorPage from "./pages/console/promo/monitor";
import PromoLtvPage from "./pages/console/promo/ltv";
import TaskConfigPage from "./pages/console/task/list";
import TaskRecordsPage from "./pages/console/task/records";
import IndexPage from "./pages/index";

export const routeOption = defineRouteOption({
    base: `extension/${packageJson.name}`,
    identifier: packageJson.name,
    routes: [
        {
            index: true,
            element: <IndexPage />,
        },
    ],
    consoleMenus: [
        {
            title: "剧目管理",
            path: "/drama/list",
            icon: "clapperboard",
        },
        {
            title: "短剧分类",
            path: "/category/list",
            icon: "layout-grid",
        },
        {
            title: "轮播图管理",
            path: "/banner/list",
            icon: "image",
        },
        {
            title: "解锁记录",
            path: "/record/unlock",
            icon: "lock-open",
        },
        {
            title: "评论管理",
            path: "/record/comment",
            icon: "message-square",
        },
        {
            title: "评分管理",
            path: "/record/rating",
            icon: "star",
        },
        {
            title: "收藏记录",
            path: "/record/favorite",
            icon: "heart",
        },
        {
            title: "观看历史",
            path: "/record/history",
            icon: "history",
        },
        {
            title: "任务中心",
            path: "/task/list",
            icon: "calendar-check",
            children: [
                { title: "任务配置", path: "/task/list", icon: "calendar-check" },
                { title: "任务进度", path: "/task/records", icon: "clipboard-check" },
            ],
        },
        {
            title: "投放管理",
            path: "/promo/overview",
            icon: "megaphone",
            children: [
                { title: "推广链接", path: "/promo/links", icon: "link" },
                { title: "价格面板", path: "/promo/panels", icon: "table-2" },
                { title: "推广点击记录", path: "/promo/clicks", icon: "mouse-pointer-click" },
                { title: "CAPI回传日志", path: "/promo/capi", icon: "scroll-text" },
                { title: "投放概览", path: "/promo/overview", icon: "gauge" },
                { title: "LTV统计", path: "/promo/ltv", icon: "bar-chart" },
                { title: "CAPI监控", path: "/promo/monitor", icon: "activity" },
                { title: "像素管理", path: "/promo/pixels", icon: "target" },
            ],
        },
        {
            title: "短剧看板",
            path: "/stats/overview",
            icon: "bar-chart-3",
        },
        {
            title: "会员管理",
            path: "/stats/member",
            icon: "users",
        },
        {
            title: "充值管理",
            path: "/pay/config",
            icon: "credit-card",
            children: [
                { title: "金币充值套餐", path: "/pay/package", icon: "credit-card" },
                { title: "支付配置", path: "/pay/config", icon: "settings" },
                { title: "订单管理", path: "/pay/order", icon: "receipt" },
            ],
        },
        {
            title: "剧单管理",
            path: "/ops/playlist",
            icon: "list-video",
        },
        {
            title: "语言配置",
            path: "/ops/language",
            icon: "languages",
        },
        {
            title: "运营审核",
            path: "/ops",
            icon: "clipboard-check",
        },
    ],
    consoleRoutes: [
        {
            index: true,
            element: <DramaListPage />,
        },
        {
            path: "drama/list",
            element: <DramaListPage />,
        },
        {
            path: "drama/edit",
            element: <DramaEditPage />,
        },
        {
            path: "category/list",
            element: <CategoryListPage />,
        },
        {
            path: "banner/list",
            element: <BannerListPage />,
        },
        {
            path: "record/unlock",
            element: <UnlockRecordPage />,
        },
        {
            path: "record/comment",
            element: <CommentManagePage />,
        },
        {
            path: "record/rating",
            element: <RatingManagePage />,
        },
        {
            path: "record/favorite",
            element: <FavoriteRecordPage />,
        },
        {
            path: "record/history",
            element: <WatchHistoryPage />,
        },
        {
            path: "task/list",
            element: <TaskConfigPage />,
        },
        {
            path: "task/records",
            element: <TaskRecordsPage />,
        },
        {
            path: "promo/overview",
            element: <PromotionPage />,
        },
        {
            path: "promo/links",
            element: <PromoLinksPage />,
        },
        {
            path: "promo/panels",
            element: <PromoPanelsPage />,
        },
        {
            path: "promo/pixels",
            element: <PromoPixelsPage />,
        },
        {
            path: "promo/clicks",
            element: <PromoClicksPage />,
        },
        {
            path: "promo/capi",
            element: <PromoCapiPage />,
        },
        {
            path: "promo/monitor",
            element: <PromoMonitorPage />,
        },
        {
            path: "promo/ltv",
            element: <PromoLtvPage />,
        },
        {
            path: "pay/config",
            element: <PayConfigPage />,
        },
        {
            path: "pay/order",
            element: <PayOrderPage />,
        },
        {
            path: "pay/package",
            element: <CoinPackagePage />,
        },
        {
            path: "ops",
            element: <OpsPage />,
        },
        {
            path: "ops/playlist",
            element: <PlaylistPage />,
        },
        {
            path: "ops/language",
            element: <LanguagePage />,
        },
        {
            path: "stats/overview",
            element: <StatsOverviewPage />,
        },
        {
            path: "stats/member",
            element: <MemberPage />,
        },
    ],
});
