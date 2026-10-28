import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useAwxConfigQuery,
    useCoinOrderListQuery,
    usePayConfigQuery,
    useRefundMutation,
    useSaveAwxConfigMutation,
    useSavePayConfigMutation,
    useSaveVodConfigMutation,
    useVodConfigQuery,
} from "../../../services";

export default function PayConfigPage() {
    useDocumentHead({ title: "充值管理" });

    const { data: config, isLoading } = usePayConfigQuery();
    const { data: orders } = useCoinOrderListQuery({ page: 1, pageSize: 20 });
    const save = useSavePayConfigMutation();
    const refund = useRefundMutation();
    const awxConfig = useAwxConfigQuery();
    const saveAwx = useSaveAwxConfigMutation();
    const vodConfig = useVodConfigQuery();
    const saveVod = useSaveVodConfigMutation();
    const [awx, setAwx] = useState({ clientId: "", apiKey: "", webhookSecret: "", enabled: false });
    const [vod, setVod] = useState({ accessKeyId: "", accessKeySecret: "", region: "cn-shanghai", enabled: false });

    const [form, setForm] = useState({
        secretKey: "",
        webhookSecret: "",
        enabled: false,
        successUrl: "/",
        cancelUrl: "/",
    });

    useEffect(() => {
        if (config) {
            setForm((f) => ({
                ...f,
                enabled: config.enabled,
                successUrl: config.successUrl || "/",
                cancelUrl: config.cancelUrl || "/",
            }));
        }
    }, [config]);

    const handleSaveAwx = async () => {
        const payload: Record<string, unknown> = { enabled: awx.enabled };
        if (awx.clientId.trim().length > 4) payload.clientId = awx.clientId.trim();
        if (awx.apiKey.trim().length > 4) payload.apiKey = awx.apiKey.trim();
        if (awx.webhookSecret.trim().length > 4) payload.webhookSecret = awx.webhookSecret.trim();
        await saveAwx.mutateAsync(payload);
        toast.success("Airwallex 已保存");
        setAwx((f) => ({ ...f, clientId: "", apiKey: "", webhookSecret: "" }));
    };

    const handleSaveVod = async () => {
        const payload: Record<string, unknown> = { enabled: vod.enabled, region: vod.region };
        if (vod.accessKeyId.trim().length > 4) payload.accessKeyId = vod.accessKeyId.trim();
        if (vod.accessKeySecret.trim().length > 4)
            payload.accessKeySecret = vod.accessKeySecret.trim();
        await saveVod.mutateAsync(payload);
        toast.success("VOD 已保存");
        setVod((f) => ({ ...f, accessKeyId: "", accessKeySecret: "" }));
    };

    const handleSave = async () => {
        const payload: Record<string, unknown> = {
            enabled: form.enabled,
            successUrl: form.successUrl,
            cancelUrl: form.cancelUrl,
        };
        // only overwrite secrets when the admin typed new ones
        if (form.secretKey.trim().length > 8) payload.secretKey = form.secretKey.trim();
        if (form.webhookSecret.trim().length > 6)
            payload.webhookSecret = form.webhookSecret.trim();
        await save.mutateAsync(payload);
        toast.success("已保存");
        setForm((f) => ({ ...f, secretKey: "", webhookSecret: "" }));
    };

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <Spinner className="size-8" />
            </div>
        );
    }

    return (
        <>
            <Card className="mb-6">
                <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>
                            Secret Key{" "}
                            {config?.secretKeyMasked && (
                                <span className="text-muted-foreground text-xs">
                                    （当前 {config.secretKeyMasked}，留空不修改）
                                </span>
                            )}
                        </Label>
                        <Input
                            value={form.secretKey}
                            onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                            placeholder="sk_live_... / sk_test_..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>
                            Webhook Signing Secret{" "}
                            {config?.webhookSecretMasked && (
                                <span className="text-muted-foreground text-xs">
                                    （当前 {config.webhookSecretMasked}）
                                </span>
                            )}
                        </Label>
                        <Input
                            value={form.webhookSecret}
                            onChange={(e) =>
                                setForm({ ...form, webhookSecret: e.target.value })
                            }
                            placeholder="whsec_..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>支付成功跳转</Label>
                        <Input
                            value={form.successUrl}
                            onChange={(e) => setForm({ ...form, successUrl: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>取消支付跳转</Label>
                        <Input
                            value={form.cancelUrl}
                            onChange={(e) => setForm({ ...form, cancelUrl: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-3 md:col-span-2">
                        <Switch
                            checked={form.enabled}
                            onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                        />
                        <Label>启用 Stripe 通道</Label>
                        <Button
                            className="ml-auto"
                            onClick={handleSave}
                            loading={save.isPending}
                        >
                            保存配置
                        </Button>
                    </div>
                    <p className="text-muted-foreground md:col-span-2 text-xs">
                        Webhook 地址（填到 Stripe 控制台）：
                        <code className="bg-muted rounded px-1">
                            https://你的域名/drama/api/pay/webhook/stripe
                        </code>
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                    <div className="mb-2 font-semibold md:col-span-2">
                        Airwallex 通道
                        {awxConfig.data?.clientId && (
                            <span className="text-muted-foreground ml-2 text-xs">
                                当前 {awxConfig.data.clientId}
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Client ID</Label>
                        <Input value={awx.clientId} onChange={(e) => setAwx({ ...awx, clientId: e.target.value })} placeholder="whl_..." />
                    </div>
                    <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input value={awx.apiKey} onChange={(e) => setAwx({ ...awx, apiKey: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Webhook Secret</Label>
                        <Input value={awx.webhookSecret} onChange={(e) => setAwx({ ...awx, webhookSecret: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch checked={awx.enabled} onCheckedChange={(v) => setAwx({ ...awx, enabled: v })} />
                        <Label>启用</Label>
                        <Button className="ml-auto" size="sm" onClick={handleSaveAwx} loading={saveAwx.isPending}>
                            保存
                        </Button>
                    </div>
                    <p className="text-muted-foreground md:col-span-2 text-xs">
                        Webhook 地址：
                        <code className="bg-muted rounded px-1">https://你的域名/drama/api/airwallex/webhook</code>
                    </p>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                    <div className="mb-2 font-semibold md:col-span-2">
                        阿里云 VOD 点播
                        {vodConfig.data?.accessKeyIdMasked && (
                            <span className="text-muted-foreground ml-2 text-xs">
                                当前 {vodConfig.data.accessKeyIdMasked}
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>AccessKeyId</Label>
                        <Input value={vod.accessKeyId} onChange={(e) => setVod({ ...vod, accessKeyId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>AccessKeySecret</Label>
                        <Input value={vod.accessKeySecret} onChange={(e) => setVod({ ...vod, accessKeySecret: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>区域</Label>
                        <Input value={vod.region} onChange={(e) => setVod({ ...vod, region: e.target.value })} placeholder="cn-shanghai" />
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch checked={vod.enabled} onCheckedChange={(v) => setVod({ ...vod, enabled: v })} />
                        <Label>启用</Label>
                        <Button className="ml-auto" size="sm" onClick={handleSaveVod} loading={saveVod.isPending}>
                            保存
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="mb-2 font-medium">金币订单</div>
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead>订单号</TableHead>
                            <TableHead>用户</TableHead>
                            <TableHead>金币</TableHead>
                            <TableHead>金额</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>时间</TableHead>
                            <TableHead className="w-24">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(orders?.items ?? []).length > 0 ? (
                            orders!.items.map((o) => (
                                <TableRow key={o.id}>
                                    <TableCell>
                                        <code className="text-xs">{o.orderNo}</code>
                                    </TableCell>
                                    <TableCell>
                                        <code className="text-xs">{o.userId.slice(0, 8)}</code>
                                    </TableCell>
                                    <TableCell>{o.coins}</TableCell>
                                    <TableCell>
                                        ${(o.amount / 100).toFixed(2)} {o.currency.toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                o.status === "paid"
                                                    ? "default"
                                                    : o.status === "pending"
                                                      ? "secondary"
                                                      : "destructive"
                                            }
                                        >
                                            {o.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <TimeText value={o.createdAt} format="MM/DD HH:mm" />
                                    </TableCell>
                                    <TableCell>
                                        {o.status === "paid" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={async () => {
                                                    if (!confirm("退款将回收金币，确定？")) return;
                                                    try {
                                                        await refund.mutateAsync(o.id);
                                                        toast.success("退款成功");
                                                    } catch (e) {
                                                        console.error(e);
                                                    }
                                                }}
                                            >
                                                退款
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    暂无订单
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
