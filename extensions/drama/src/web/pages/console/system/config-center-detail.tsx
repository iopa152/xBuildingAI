import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
    useCategoryConfigsQuery,
    useComputeHeatMutation,
    useSaveProviderConfigMutation,
    useTestConnectionMutation,
    type ProviderConfigRow,
} from "../../../services";

/** field schema per (category, provider) — drives the generic form */
interface FieldDef {
    key: string;
    label: string;
    placeholder?: string;
    type?: "text" | "password" | "number";
    required?: boolean;
    hint?: string;
}

const SCHEMAS: Record<string, { label: string; fields: FieldDef[] }> = {
    "customer_service:whatsapp": {
        label: "WhatsApp",
        fields: [
            { key: "link", label: "客服链接", placeholder: "https://wa.me/<phone_number>", required: true, hint: "填写 WhatsApp 客服跳转链接" },
        ],
    },
    "customer_service:telegram": {
        label: "Telegram",
        fields: [
            { key: "link", label: "客服链接", placeholder: "https://t.me/<username>", required: true, hint: "填写 Telegram 客服跳转链接" },
        ],
    },
    "customer_service:viber": {
        label: "Viber",
        fields: [
            { key: "link", label: "客服链接", placeholder: "https://chats.viber.com/<channel>", required: true, hint: "填写 Viber 客服跳转链接" },
        ],
    },
    "push:firebase": {
        label: "Firebase",
        fields: [
            { key: "serverKey", label: "Server Key", type: "password", required: true },
            { key: "projectId", label: "Project ID", required: true },
        ],
    },
    "push:onesignal": {
        label: "OneSignal",
        fields: [
            { key: "appId", label: "App ID", required: true },
            { key: "apiKey", label: "REST API Key", type: "password", required: true },
        ],
    },
    "sms:twilio": {
        label: "Twilio",
        fields: [
            { key: "accountSid", label: "Account SID", required: true },
            { key: "authToken", label: "Auth Token", type: "password", required: true },
            { key: "from", label: "发送号码", placeholder: "+1xxxxxxxxxx" },
        ],
    },
    "sms:vonage": {
        label: "Vonage",
        fields: [
            { key: "apiKey", label: "API Key", required: true },
            { key: "apiSecret", label: "API Secret", type: "password", required: true },
            { key: "from", label: "发送签名" },
        ],
    },
    "sms:infobip": {
        label: "Infobip",
        fields: [
            { key: "apiKey", label: "API Key", type: "password", required: true },
            { key: "sender", label: "发送签名" },
        ],
    },
    "email:smtp": {
        label: "SMTP",
        fields: [
            { key: "host", label: "SMTP 主机", placeholder: "smtp.gmail.com", required: true },
            { key: "port", label: "端口", type: "number", placeholder: "465" },
            { key: "username", label: "账号", required: true },
            { key: "password", label: "密码/授权码", type: "password", required: true },
            { key: "from", label: "发件人", placeholder: "no-reply@example.com" },
        ],
    },
    "oauth:google": {
        label: "Google",
        fields: [
            { key: "clientId", label: "Client ID", required: true },
            { key: "clientSecret", label: "Client Secret", type: "password", required: true },
            { key: "redirectUri", label: "回调地址", placeholder: "https://域名/api/auth/oauth/google/callback" },
        ],
    },
    "oauth:facebook": {
        label: "Facebook",
        fields: [
            { key: "clientId", label: "App ID", required: true },
            { key: "clientSecret", label: "App Secret", type: "password", required: true },
            { key: "redirectUri", label: "回调地址" },
        ],
    },
    "oauth:apple": {
        label: "Apple",
        fields: [
            { key: "clientId", label: "Services ID", required: true },
            { key: "clientSecret", label: "Team Key", type: "password", required: true },
            { key: "redirectUri", label: "回调地址" },
        ],
    },
    "distribution:rebate": {
        label: "返佣配置",
        fields: [
            { key: "invitePoints", label: "邀请奖励积分", type: "number", hint: "每邀请新用户注册奖励的积分" },
            { key: "l1Rate", label: "一级返佣比例(%)", type: "number", hint: "直邀用户充值的返佣比例" },
            { key: "l2Rate", label: "二级返佣比例(%)", type: "number" },
            { key: "l3Rate", label: "三级返佣比例(%)", type: "number" },
            { key: "minWithdrawAmount", label: "最低提现金额", type: "number" },
        ],
    },
    "heat:algorithm": {
        label: "热度算法",
        fields: [
            { key: "viewWeight", label: "播放权重", type: "number", hint: "热度 = Σ(指标×权重)，可留空使用默认值" },
            { key: "likeWeight", label: "点赞权重", type: "number" },
            { key: "favoriteWeight", label: "收藏权重", type: "number" },
            { key: "commentWeight", label: "评论权重", type: "number", hint: "预留：暂未计入公式" },
            { key: "ratingWeight", label: "评分权重", type: "number" },
            { key: "decayDays", label: "半衰期(天)", type: "number", hint: "按剧目更新时间做时间衰减，0 为不衰减" },
        ],
    },
};

const CATEGORY_LABEL: Record<string, string> = {
    customer_service: "客服配置",
    push: "消息推送",
    sms: "短信服务",
    email: "邮件服务",
    oauth: "三方登录",
    distribution: "分销配置",
    heat: "短剧热度",
};

export function ConfigCenterDetailPage({ category }: { category: string }) {
    useDocumentHead({ title: `${CATEGORY_LABEL[category] ?? category} · 配置中心` });
    const { data: rows, isLoading } = useCategoryConfigsQuery(category);
    const save = useSaveProviderConfigMutation();
    const test = useTestConnectionMutation();
    const computeHeat = useComputeHeatMutation();

    const [active, setActive] = useState(0);
    const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
    const [remarks, setRemarks] = useState<Record<string, string>>({});

    const providerRows = rows ?? [];
    const current: ProviderConfigRow | undefined = providerRows[active];

    useEffect(() => {
        if (!current) return;
        setDraft((d) => ({
            ...d,
            [current.provider]: {
                ...(current.config ?? {}),
                ...d[current.provider],
            } as Record<string, string>,
        }));
        setRemarks((r) => ({ ...r, [current.provider]: current.remark ?? "" }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current?.provider, rows?.length]);

    const schema = useMemo(
        () => SCHEMAS[`${category}:${current?.provider ?? ""}`],
        [category, current?.provider],
    );

    const handleSave = async (enabled?: boolean) => {
        if (!current) return;
        const fields: Record<string, unknown> = {};
        for (const f of schema?.fields ?? []) {
            const v = draft[current.provider]?.[f.key];
            if (v !== undefined && v !== "") fields[f.key] = f.type === "number" ? Number(v) : v;
        }
        try {
            await save.mutateAsync({
                category,
                provider: current.provider,
                data: { enabled: enabled ?? current.enabled, config: fields, remark: remarks[current.provider] ?? "" },
            });
            toast.success("保存成功");
        } catch (err) {
            toast.error(`保存失败: ${(err as Error).message}`);
        }
    };

    const handleTest = async () => {
        if (!current) return;
        // save first so the test runs against the latest values
        await handleSave();
        const res = await test.mutateAsync({ category, provider: current.provider });
        if (res.ok) toast.success(res.message);
        else toast.error(res.message);
    };

    const handleReset = () => {
        if (!current) return;
        setDraft((d) => ({ ...d, [current.provider]: { ...(current.config ?? {}) } }));
        setRemarks((r) => ({ ...r, [current.provider]: current.remark ?? "" }));
        toast.success("已重置为已保存内容");
    };

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <span className="text-muted-foreground text-sm">加载中...</span>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            window.location.href = "/console/apps/drama/console/system/config-center";
                        }}
                    >
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold">{CATEGORY_LABEL[category] ?? category}</h2>
                        <p className="text-muted-foreground text-sm">
                            {category === "customer_service" && "WhatsApp、Telegram、Viber 等海外社交客服通道"}
                            {category === "push" && "消息推送服务配置"}
                            {category === "sms" && "短信发送服务配置"}
                            {category === "email" && "SMTP邮件发送服务配置"}
                            {category === "oauth" && "OAuth 三方登录服务配置"}
                            {category === "distribution" && "邀请码、三级分销返积分与提现配置"}
                            {category === "heat" && "短剧热度算法与标签自动化配置"}
                        </p>
                    </div>
                </div>
                {category === "heat" && (
                    <Button
                        size="sm"
                        onClick={async () => {
                            const res = await computeHeat.mutateAsync();
                            toast.success(`已重算 ${res.updated} 部剧目热度`);
                        }}
                        loading={computeHeat.isPending}
                    >
                        立即重算全库热度
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {providerRows.map((row, i) => (
                    <button
                        key={row.provider}
                        onClick={() => setActive(i)}
                        className={`rounded-md border px-3 py-1.5 text-sm ${
                            i === active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "hover:bg-muted"
                        }`}
                    >
                        {SCHEMAS[`${category}:${row.provider}`]?.label ?? row.provider}
                        {row.enabled ? (
                            <Badge className="ml-2" variant="default">已启用</Badge>
                        ) : row.configured ? (
                            <Badge className="ml-2" variant="secondary">未配置</Badge>
                        ) : (
                            <Badge className="ml-2" variant="secondary">未配置</Badge>
                        )}
                    </button>
                ))}
            </div>

            {current && (
                <Card>
                    <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
                        <div className="md:col-span-2 flex items-center gap-3">
                            <Switch
                                checked={current.enabled}
                                onCheckedChange={(v) => handleSave(v)}
                            />
                            <Label>启用此服务商{current.enabled ? "（同分类其他服务商将停用）" : ""}</Label>
                            {current.verified && (
                                <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3.5" /> 已验证
                                </span>
                            )}
                        </div>

                        {(schema?.fields ?? []).map((f) => (
                            <div key={f.key} className="space-y-1.5">
                                <Label>
                                    {f.required && <span className="text-destructive">* </span>}
                                    {f.label}
                                </Label>
                                <Input
                                    type={f.type === "number" ? "number" : f.type === "password" ? "password" : "text"}
                                    value={draft[current.provider]?.[f.key] ?? ""}
                                    placeholder={f.placeholder}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            [current.provider]: {
                                                ...d[current.provider],
                                                [f.key]: e.target.value,
                                            },
                                        }))
                                    }
                                />
                                {f.hint && <p className="text-muted-foreground text-xs">{f.hint}</p>}
                            </div>
                        ))}

                        <div className="space-y-1.5 md:col-span-2">
                            <Label>备注</Label>
                            <Input
                                value={remarks[current.provider] ?? ""}
                                placeholder="可选，如工作时间、客服说明"
                                onChange={(e) =>
                                    setRemarks((r) => ({ ...r, [current.provider]: e.target.value }))
                                }
                            />
                        </div>

                        <div className="flex items-center gap-2 md:col-span-2">
                            <Button onClick={() => handleSave()} loading={save.isPending}>
                                保存配置
                            </Button>
                            <Button variant="outline" onClick={handleTest} loading={test.isPending}>
                                测试连接
                            </Button>
                            <Button variant="ghost" onClick={handleReset}>
                                <RefreshCw className="mr-1 size-3.5" /> 重置
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default ConfigCenterDetailPage;
