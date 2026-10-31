import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import {
    Banknote,
    Bell,
    Headphones,
    Mail,
    Share2,
    Signal,
    Sparkles,
    Tv,
    Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
    useConfigSummaryQuery,
    useExportConfigsMutation,
    useImportConfigsMutation,
    type ConfigCardSummary,
} from "../../../services";

/** card visual metadata: icon + description + whether the detail page exists locally */
const CARD_META: Record<
    string,
    { icon: typeof Tv; desc: string; route?: string; external?: boolean }
> = {
    vod: {
        icon: Tv,
        desc: "视频上传与播放服务配置",
        route: "/pay/config",
        external: true,
    },
    pay: {
        icon: Wallet,
        desc: "支付渠道服务配置",
        route: "/pay/config",
        external: true,
    },
    customer_service: {
        icon: Headphones,
        desc: "WhatsApp、Telegram、Viber 等海外社交客服通道",
    },
    push: { icon: Bell, desc: "消息推送服务配置" },
    sms: { icon: Signal, desc: "短信发送服务配置" },
    email: { icon: Mail, desc: "SMTP邮件发送服务配置" },
    oauth: { icon: Share2, desc: "OAuth 三方登录服务配置" },
    distribution: { icon: Banknote, desc: "邀请码、三级分销返积分与提现配置" },
    heat: { icon: Sparkles, desc: "短剧热度算法与标签自动化配置" },
};

const ORDER = [
    "vod",
    "pay",
    "customer_service",
    "push",
    "sms",
    "email",
    "oauth",
    "distribution",
    "heat",
];

const PROVIDER_LABEL: Record<string, string> = {
    aliyun: "阿里云点播",
    stripe: "Stripe",
    airwallex: "Airwallex",
    paymongo: "PayMongo",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    viber: "Viber",
    firebase: "Firebase",
    onesignal: "OneSignal",
    twilio: "Twilio",
    vonage: "Vonage",
    infobip: "Infobip",
    smtp: "SMTP",
    google: "Google",
    facebook: "Facebook",
    apple: "Apple",
    rebate: "返佣配置",
    algorithm: "热度算法",
};

export function ConfigCenterPage() {
    useDocumentHead({ title: "配置中心" });
    const { data: cards, isLoading } = useConfigSummaryQuery();
    const exportConfigs = useExportConfigsMutation();
    const importConfigs = useImportConfigsMutation();

    const handleExport = async () => {
        const rows = await exportConfigs.mutateAsync();
        const blob = new Blob([JSON.stringify(rows, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `drama-config-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("配置已导出（敏感字段已脱敏）");
    };

    const handleImport = async () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const rows = JSON.parse(await file.text());
                if (!Array.isArray(rows)) throw new Error("格式错误");
                const res = await importConfigs.mutateAsync(rows);
                toast.success(`已导入 ${res.imported} 项配置`);
            } catch (err) {
                toast.error(`导入失败: ${(err as Error).message}`);
            }
        };
        input.click();
    };

    const go = (card: ConfigCardSummary) => {
        const meta = CARD_META[card.category];
        if (meta?.route) window.location.href = `/console/apps/drama/console${meta.route}`;
    };

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <Spinner className="size-8" />
            </div>
        );
    }

    const sorted = [...(cards ?? [])].sort(
        (a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category),
    );

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-bold">配置中心</h2>
                    <p className="text-muted-foreground text-sm">管理各类第三方服务配置</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} loading={exportConfigs.isPending}>
                        导出配置
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleImport} loading={importConfigs.isPending}>
                        导入配置
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sorted.map((card) => {
                    const meta = CARD_META[card.category] ?? { icon: Tv, desc: "" };
                    const Icon = meta.icon;
                    const navigable = Boolean(meta?.route);
                    return (
                        <Card
                            key={card.category}
                            className={
                                card.configured
                                    ? "border-emerald-500/60 dark:border-emerald-500/40"
                                    : ""
                            }
                        >
                            <CardContent className="flex h-full flex-col gap-3 pt-5">
                                <div className="flex items-start justify-between">
                                    <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                                        <Icon className="size-5" />
                                    </div>
                                    <Badge variant={card.configured ? "default" : "secondary"}>
                                        {card.configured ? "已配置" : "未配置"}
                                    </Badge>
                                </div>
                                <div>
                                    <h3 className="font-semibold">{card.label}</h3>
                                    <p className="text-muted-foreground text-xs">{meta.desc}</p>
                                </div>
                                <div className="mt-auto flex items-end justify-between pt-2">
                                    <div className="text-xs">
                                        <span className="text-muted-foreground">当前服务商: </span>
                                        <span
                                            className={
                                                card.currentProvider
                                                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                                                    : "text-muted-foreground"
                                            }
                                        >
                                            {card.currentProvider
                                                ? (PROVIDER_LABEL[card.currentProvider] ?? card.currentProvider)
                                                : "未启用服务商"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-lg font-bold leading-none">
                                                {card.configuredCount}
                                            </div>
                                            <div className="text-muted-foreground text-[10px]">
                                                服务商数量
                                            </div>
                                        </div>
                                        {navigable ? (
                                            <Button size="sm" variant="outline" onClick={() => go(card)}>
                                                配置
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    window.location.href = `/console/apps/drama/console/system/config-center/${card.category}`;
                                                }}
                                            >
                                                配置
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

export default ConfigCenterPage;
