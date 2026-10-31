import { defineRouteOption } from "@buildingai/web-core";
import { Navigate, useLocation, useParams } from "react-router-dom";

import packageJson from "./../../package.json";
import BannerListPage from "./pages/console/banner/list";
import CategoryListPage from "./pages/console/category/list";
import DramaEditPage from "./pages/console/drama/edit";
import DramaEpisodesPage from "./pages/console/drama/episodes";
import DramaListPage from "./pages/console/drama/list";
import FaqManagePage from "./pages/console/help/faq";
import FeedbackManagePage from "./pages/console/help/feedback";
import WithdrawalManagePage from "./pages/console/help/withdrawal";
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
import VipPackagePage from "./pages/console/pay/vip-package";
import RedeemCodePage from "./pages/console/pay/redeem-code";
import RedeemRecordPage from "./pages/console/pay/redeem-record";
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
import TaskRecordsPage, { CheckinRecordsPage } from "./pages/console/task/records";
import TaskRewardPage from "./pages/console/task/rewards";
import CheckinConfigPage from "./pages/console/task/checkin";
import MemberGroupPage from "./pages/console/member/group";
import MemberRulePage from "./pages/console/member/rule";
import MemberScorePage from "./pages/console/member/score";
import MallCategoryPage from "./pages/console/mall/category";
import MallGoodsPage from "./pages/console/mall/goods";
import MallOrderPage from "./pages/console/mall/order";
import NovelChaptersPage from "./pages/console/novel/chapters";
import NovelListPage from "./pages/console/novel/list";
import NovelCategoryPage from "./pages/console/novel/category";
import {
    NovelBookshelfPage,
    NovelHistoryPage,
    NovelPurchasePage,
    NovelRatingPage,
} from "./pages/console/novel/records";
import AdminLogPage from "./pages/console/system/admin-log";
import AttachmentPage from "./pages/console/system/file";
import ConfigCenterPage from "./pages/console/system/config-center";
import ConfigCenterDetailPage from "./pages/console/system/config-center-detail";
import ProfilePage from "./pages/console/system/profile";
import IndexPage from "./pages/index";

function ConfigCenterDetailRoute() {
    const { category } = useParams();
    return <ConfigCenterDetailPage category={category ?? ""} />;
}

function LegacyDramaEditRedirect() {
    const location = useLocation();
    return <Navigate to={{ pathname: "/console/drama/edit", search: location.search }} replace />;
}

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
            title: "短剧管理",
            path: "/drama/list",
            icon: "clapperboard",
            children: [
                { title: "短剧主管理", path: "/drama/list", icon: "film" },
                { title: "短剧分类管理", path: "/category/list", icon: "layout-grid" },
                { title: "短剧语言配置管理", path: "/ops/language", icon: "languages" },
                { title: "评分记录", path: "/record/rating", icon: "star" },
                { title: "评论管理", path: "/record/comment", icon: "message-square" },
                { title: "购买记录", path: "/record/unlock", icon: "shopping-bag" },
                { title: "收藏记录", path: "/record/favorite", icon: "heart" },
                { title: "观看历史", path: "/record/history", icon: "history" },
            ],
        },
        {
            title: "运营管理",
            path: "/banner/list",
            icon: "layout-dashboard",
            children: [
                { title: "轮播图管理", path: "/banner/list", icon: "image" },
                { title: "剧单管理", path: "/ops/playlist", icon: "list-video" },
                { title: "运营审核", path: "/ops", icon: "clipboard-check" },
                { title: "短剧看板", path: "/stats/overview", icon: "bar-chart-3" },
            ],
        },
        {
            title: "会员管理",
            path: "/stats/member",
            icon: "crown",
            children: [
                { title: "会员管理", path: "/stats/member", icon: "users" },
                { title: "会员分组管理", path: "/member/group", icon: "users-round" },
                { title: "会员规则管理", path: "/member/rule", icon: "list-checks" },
                { title: "会员积分管理", path: "/member/score", icon: "coins" },
                { title: "签到配置", path: "/task/checkin", icon: "calendar-days" },
                { title: "签到记录", path: "/task/checkin-records", icon: "calendar-clock" },
            ],
        },
        {
            title: "任务中心",
            path: "/task/list",
            icon: "calendar-check",
            children: [
                { title: "任务配置", path: "/task/list", icon: "calendar-check" },
                { title: "任务进度", path: "/task/records", icon: "clipboard-check" },
                { title: "奖励记录", path: "/task/rewards", icon: "gift" },
            ],
        },
        {
            title: "小说管理",
            path: "/novel/list",
            icon: "book-open",
            children: [
                { title: "小说列表", path: "/novel/list", icon: "book-open" },
                { title: "分类管理", path: "/novel/category", icon: "folder-tree" },
                { title: "评分管理", path: "/novel/rating", icon: "star" },
                { title: "书架管理", path: "/novel/bookshelf", icon: "library" },
                { title: "阅读历史", path: "/novel/history", icon: "history" },
                { title: "购买记录", path: "/novel/purchase", icon: "shopping-bag" },
            ],
        },
        {
            title: "商城管理",
            path: "/mall/goods",
            icon: "store",
            children: [
                { title: "商城分类", path: "/mall/category", icon: "layout-grid" },
                { title: "商品管理", path: "/mall/goods", icon: "package" },
                { title: "订单管理", path: "/mall/order", icon: "receipt" },
            ],
        },
        {
            title: "常规管理",
            path: "/system/profile",
            icon: "settings",
            children: [
                { title: "配置中心", path: "/system/config-center", icon: "settings-2" },
                { title: "管理员日志管理", path: "/system/admin-log", icon: "scroll-text" },
                { title: "附件管理", path: "/system/file", icon: "paperclip" },
                { title: "个人资料", path: "/system/profile", icon: "user" },
            ],
        },
        {
            title: "支付管理",
            path: "/pay/package",
            icon: "credit-card",
            children: [
                { title: "金币充值套餐", path: "/pay/package", icon: "credit-card" },
                { title: "VIP会员套餐", path: "/pay/vip-package", icon: "crown" },
                { title: "订单管理", path: "/pay/order", icon: "receipt" },
                { title: "提现管理", path: "/help/withdrawal", icon: "banknote" },
                { title: "兑换码管理", path: "/pay/redeem-code", icon: "ticket" },
                { title: "兑换记录", path: "/pay/redeem-record", icon: "list" },
                { title: "支付配置", path: "/pay/config", icon: "settings" },
            ],
        },
        {
            title: "帮助中心",
            path: "/help/faq",
            icon: "circle-help",
            children: [
                { title: "FAQ管理", path: "/help/faq", icon: "circle-help" },
                { title: "用户反馈", path: "/help/feedback", icon: "message-circle" },
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
            path: "drama/episodes",
            element: <DramaEpisodesPage />,
        },
        {
            path: "drama/list/edit",
            element: <LegacyDramaEditRedirect />,
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
            path: "task/checkin-records",
            element: <CheckinRecordsPage />,
        },
        {
            path: "task/rewards",
            element: <TaskRewardPage />,
        },
        {
            path: "task/checkin",
            element: <CheckinConfigPage />,
        },
        {
            path: "help/faq",
            element: <FaqManagePage />,
        },
        {
            path: "help/feedback",
            element: <FeedbackManagePage />,
        },
        {
            path: "help/withdrawal",
            element: <WithdrawalManagePage />,
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
            path: "pay/vip-package",
            element: <VipPackagePage />,
        },
        {
            path: "pay/redeem-code",
            element: <RedeemCodePage />,
        },
        {
            path: "pay/redeem-record",
            element: <RedeemRecordPage />,
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
        {
            path: "member/group",
            element: <MemberGroupPage />,
        },
        {
            path: "member/rule",
            element: <MemberRulePage />,
        },
        {
            path: "member/score",
            element: <MemberScorePage />,
        },
        {
            path: "mall/category",
            element: <MallCategoryPage />,
        },
        {
            path: "mall/goods",
            element: <MallGoodsPage />,
        },
        {
            path: "mall/order",
            element: <MallOrderPage />,
        },
        {
            path: "novel/chapters",
            element: <NovelChaptersPage />,
        },
        {
            path: "novel/list",
            element: <NovelListPage />,
        },
        {
            path: "novel/category",
            element: <NovelCategoryPage />,
        },
        {
            path: "novel/rating",
            element: <NovelRatingPage />,
        },
        {
            path: "novel/bookshelf",
            element: <NovelBookshelfPage />,
        },
        {
            path: "novel/history",
            element: <NovelHistoryPage />,
        },
        {
            path: "novel/purchase",
            element: <NovelPurchasePage />,
        },
        {
            path: "system/admin-log",
            element: <AdminLogPage />,
        },
        {
            path: "system/file",
            element: <AttachmentPage />,
        },
        {
            path: "system/config-center/:category",
            element: <ConfigCenterDetailRoute />,
        },
        {
            path: "system/config-center",
            element: <ConfigCenterPage />,
        },
        {
            path: "system/profile",
            element: <ProfilePage />,
        },
    ],
});
