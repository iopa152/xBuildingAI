import { useDocumentHead } from "@buildingai/hooks";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@buildingai/ui/components/ui/alert-dialog";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@buildingai/ui/components/ui/select";
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
import { cn } from "@buildingai/ui/lib/utils";
import { Crown, Pencil, Plus, RotateCw, Search, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useCreateVipPackageMutation,
    useDeleteVipPackageMutation,
    useUpdateVipPackageMutation,
    useVipPackageListQuery,
} from "../../../services";
import type { VipPackageRow } from "../../../services";
import {
    DurationBadge,
    SectionTitle,
    StatePill,
    Stepper,
    TAG_BADGE_STYLES,
} from "./shared";

const DURATION_OPTIONS = [
    { value: "week", label: "周卡" },
    { value: "month", label: "月卡" },
    { value: "quarter", label: "季卡" },
    { value: "year", label: "年卡" },
];

const DURATION_DAYS: Record<string, number> = { week: 7, month: 30, quarter: 90, year: 365 };

const TAG_OPTIONS = [
    { value: "__none", label: "无" },
    { value: "热门", label: "热门" },
    { value: "超值", label: "超值" },
    { value: "推荐", label: "推荐" },
];

interface VipForm {
    name: string;
    durationType: string;
    days: string;
    price: string;
    originalPrice: string;
    phpPrice: string;
    phpOriginalPrice: string;
    tag: string;
    sort: string;
    autoRenew: boolean;
    enabled: boolean;
    iosProductId: string;
    androidProductId: string;
    googleBasePlanId: string;
    stripePriceId: string;
    airwallexPriceId: string;
    paypalPlanId: string;
}

const emptyForm: VipForm = {
    name: "",
    durationType: "month",
    days: "30",
    price: "",
    originalPrice: "",
    phpPrice: "",
    phpOriginalPrice: "",
    tag: "__none",
    sort: "0",
    autoRenew: false,
    enabled: true,
    iosProductId: "",
    androidProductId: "",
    googleBasePlanId: "",
    stripePriceId: "",
    airwallexPriceId: "",
    paypalPlanId: "",
};

function num(v: string): number | null {
    const n = Number(v);
    return Number.isFinite(n) && v.trim() !== "" ? n : null;
}

function vipToPayload(form: VipForm) {
    return {
        name: form.name.trim(),
        durationType: form.durationType,
        days: Number(form.days),
        price: Number(form.price),
        originalPrice: num(form.originalPrice),
        phpPrice: num(form.phpPrice),
        phpOriginalPrice: num(form.phpOriginalPrice),
        tag: form.tag === "__none" ? "" : form.tag,
        sort: Number(form.sort || 0),
        autoRenew: form.autoRenew,
        enabled: form.enabled,
        iosProductId: form.iosProductId.trim(),
        androidProductId: form.androidProductId.trim(),
        googleBasePlanId: form.googleBasePlanId.trim(),
        stripePriceId: form.stripePriceId.trim(),
        airwallexPriceId: form.airwallexPriceId.trim(),
        paypalPlanId: form.paypalPlanId.trim(),
    };
}

function VipPreviewCard({ pkg }: { pkg: VipPackageRow }) {
    return (
        <div className="bg-card relative rounded-xl border p-3 shadow-sm">
            {pkg.tag && TAG_BADGE_STYLES[pkg.tag] && (
                <span
                    className={cn(
                        "absolute -top-1.5 -right-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                        TAG_BADGE_STYLES[pkg.tag],
                    )}
                >
                    {pkg.tag}
                </span>
            )}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Crown className="size-4 text-amber-500" />
                    <span className="font-semibold">{pkg.name}</span>
                </div>
                <span className="text-lg font-bold">${Number(pkg.price).toFixed(2)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
                <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
                    {pkg.days}天
                </span>
                <span className="text-muted-foreground text-xs">
                    {DURATION_OPTIONS.find((d) => d.value === pkg.durationType)?.label ?? ""}
                </span>
                {pkg.originalPrice ? (
                    <span className="text-muted-foreground text-xs line-through">
                        ${Number(pkg.originalPrice).toFixed(2)}
                    </span>
                ) : null}
            </div>
            <div className="text-muted-foreground mt-2 text-xs">
                免费看所有短剧 · 1080P画质
            </div>
        </div>
    );
}

export default function VipPackagePage() {
    useDocumentHead({ title: "VIP会员套餐" });

    const { data: packages = [], isLoading, isFetching, refetch } = useVipPackageListQuery();
    const create = useCreateVipPackageMutation();
    const update = useUpdateVipPackageMutation();
    const remove = useDeleteVipPackageMutation();

    const [keyword, setKeyword] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<VipPackageRow | null>(null);
    const [form, setForm] = useState<VipForm>(emptyForm);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);

    const filtered = packages.filter((p) => {
        const kw = keyword.trim().toLowerCase();
        if (!kw) return true;
        return String(p.id).toLowerCase().includes(kw) || p.name.toLowerCase().includes(kw);
    });

    useEffect(() => {
        setSelectedIds((prev) => {
            const existing = new Set(packages.map((p) => p.id));
            const next = new Set([...prev].filter((id) => existing.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [packages]);

    const allSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));
    const someSelected = !allSelected && filtered.some((p) => selectedIds.has(p.id));

    const toggleRow = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) filtered.forEach((p) => next.delete(p.id));
            else filtered.forEach((p) => next.add(p.id));
            return next;
        });
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEdit = (row: VipPackageRow) => {
        setEditing(row);
        setForm({
            name: row.name,
            durationType: row.durationType,
            days: String(row.days),
            price: String(row.price),
            originalPrice: row.originalPrice ? String(row.originalPrice) : "",
            phpPrice: row.phpPrice ? String(row.phpPrice) : "",
            phpOriginalPrice: row.phpOriginalPrice ? String(row.phpOriginalPrice) : "",
            tag: row.tag || "__none",
            sort: String(row.sort),
            autoRenew: row.autoRenew,
            enabled: row.enabled,
            iosProductId: row.iosProductId ?? "",
            androidProductId: row.androidProductId ?? "",
            googleBasePlanId: row.googleBasePlanId ?? "",
            stripePriceId: row.stripePriceId ?? "",
            airwallexPriceId: row.airwallexPriceId ?? "",
            paypalPlanId: row.paypalPlanId ?? "",
        });
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.name.trim()) {
            toast.error("请输入套餐名称");
            return;
        }
        if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) {
            toast.error("请输入正确的价格");
            return;
        }
        const payload = vipToPayload(form);
        if (!Number.isInteger(payload.days) || payload.days <= 0) {
            toast.error("请输入有效天数");
            return;
        }
        try {
            if (editing) await update.mutateAsync({ id: editing.id, data: payload });
            else await create.mutateAsync(payload);
            toast.success(editing ? "保存成功" : "添加成功");
            setFormOpen(false);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    const askDelete = (ids: string[]) => {
        if (!ids.length) return;
        setDeleteTargets(ids);
        setDeleteOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await Promise.all(deleteTargets.map((id) => remove.mutateAsync(id)));
            toast.success("删除成功");
            setSelectedIds(new Set());
            setDeleteOpen(false);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    const previewPackages = packages.filter((p) => p.enabled);

    return (
        <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="刷新"
                        disabled={isFetching}
                        onClick={() => refetch()}
                    >
                        <RotateCw className={cn(isFetching && "animate-spin")} />
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus />
                        添加
                    </Button>
                    <Button
                        className="disabled:bg-primary/60 disabled:text-primary-foreground/50 disabled:opacity-100 dark:disabled:bg-primary/60"
                        disabled={selectedIds.size !== 1}
                        onClick={() => {
                            const row = packages.find((p) => selectedIds.has(p.id));
                            if (row) openEdit(row);
                        }}
                    >
                        <Pencil />
                        编辑
                    </Button>
                    <Button
                        variant="destructive"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-destructive/60 disabled:text-white/50 disabled:opacity-100 dark:bg-destructive dark:hover:bg-destructive/90 dark:disabled:bg-destructive/60"
                        disabled={selectedIds.size === 0}
                        onClick={() => askDelete([...selectedIds])}
                    >
                        <Trash />
                        删除
                    </Button>

                    <div className="relative ml-auto w-full sm:w-64">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="通过ID、套餐名称模糊搜索"
                            className="pl-9"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center py-20">
                        <Spinner className="size-8" />
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={
                                                allSelected ? true : someSelected ? "indeterminate" : false
                                            }
                                            onCheckedChange={toggleAll}
                                            aria-label="全选"
                                        />
                                    </TableHead>
                                    <TableHead className="w-16">ID</TableHead>
                                    <TableHead>套餐名称</TableHead>
                                    <TableHead>时长类型</TableHead>
                                    <TableHead>有效天数</TableHead>
                                    <TableHead>价格</TableHead>
                                    <TableHead>标签</TableHead>
                                    <TableHead>自动续费</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead className="w-28">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length > 0 ? (
                                    filtered.map((p, idx) => (
                                        <TableRow
                                            key={p.id}
                                            data-state={
                                                selectedIds.has(p.id) ? "selected" : undefined
                                            }
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(p.id)}
                                                    onCheckedChange={() => toggleRow(p.id)}
                                                    aria-label={`选择 ${p.name}`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className="text-muted-foreground font-mono text-xs"
                                                    title={p.id}
                                                >
                                                    {idx + 1}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell>
                                                <DurationBadge type={p.durationType} />
                                            </TableCell>
                                            <TableCell>
                                                <span className="bg-primary/10 text-primary inline-flex rounded px-1.5 py-0.5 text-xs font-medium">
                                                    {p.days}天
                                                </span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap tabular-nums">
                                                <span className="font-medium">
                                                    ${Number(p.price).toFixed(2)}
                                                </span>
                                                {p.phpPrice ? (
                                                    <span className="text-muted-foreground ml-1.5 text-xs">
                                                        ₱{Number(p.phpPrice).toFixed(2)}
                                                    </span>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                {p.tag && TAG_BADGE_STYLES[p.tag] ? (
                                                    <span
                                                        className={cn(
                                                            "inline-flex rounded px-1 py-0.5 text-[10px] font-medium",
                                                            TAG_BADGE_STYLES[p.tag],
                                                        )}
                                                    >
                                                        {p.tag}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatePill
                                                    active={p.autoRenew}
                                                    activeText="是"
                                                    inactiveText="否"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <StatePill
                                                    active={p.enabled}
                                                    activeText="启用"
                                                    inactiveText="禁用"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="icon-sm"
                                                        aria-label={`编辑 ${p.name}`}
                                                        onClick={() => openEdit(p)}
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        size="icon-sm"
                                                        variant="destructive"
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                        aria-label={`删除 ${p.name}`}
                                                        onClick={() => askDelete([p.id])}
                                                    >
                                                        <Trash />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24 text-center">
                                            {keyword.trim() ? "未找到匹配的套餐" : "暂无VIP套餐"}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div className="text-muted-foreground mt-4 text-sm">共 {filtered.length} 条</div>
            </div>

            <div className="w-72 shrink-0 rounded-lg border">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <span className="text-sm font-medium">VIP套餐预览</span>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="刷新预览"
                        disabled={isFetching}
                        onClick={() => refetch()}
                    >
                        <RotateCw className={cn(isFetching && "animate-spin")} />
                    </Button>
                </div>
                <div className="space-y-3 p-4">
                    <p className="text-muted-foreground text-xs">预览仅显示启用状态的套餐</p>
                    {previewPackages.length > 0 ? (
                        previewPackages.map((p) => <VipPreviewCard key={p.id} pkg={p} />)
                    ) : (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                            暂无启用套餐
                        </p>
                    )}
                </div>
            </div>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent
                    className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]"
                    aria-describedby={undefined}
                >
                    <DialogHeader className="px-6 pt-5">
                        <DialogTitle>{editing ? "编辑VIP套餐" : "添加VIP套餐"}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                        <SectionTitle>基本信息</SectionTitle>
                        <div className="grid grid-cols-[130px_1fr] items-center gap-x-4 gap-y-4">
                            <Label htmlFor="vip-name" className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                套餐名称
                            </Label>
                            <div>
                                <Input
                                    id="vip-name"
                                    value={form.name}
                                    maxLength={100}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="请输入套餐名称"
                                />
                                <p className="text-muted-foreground mt-1 text-right text-xs">
                                    {form.name.length} / 100
                                </p>
                            </div>

                            <Label className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                时长类型
                            </Label>
                            <Select
                                value={form.durationType}
                                onValueChange={(value) =>
                                    setForm({
                                        ...form,
                                        durationType: value,
                                        days: String(DURATION_DAYS[value] ?? form.days),
                                    })
                                }
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DURATION_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Label htmlFor="vip-days" className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                有效天数
                            </Label>
                            <div>
                                <Stepper
                                    value={form.days}
                                    onChange={(v) => setForm({ ...form, days: v })}
                                    min={1}
                                />
                                <p className="text-muted-foreground mt-1 text-xs">会员有效期天数</p>
                            </div>

                            <Label htmlFor="vip-price" className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                价格
                            </Label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                                        $
                                    </span>
                                    <Input
                                        id="vip-price"
                                        value={form.price}
                                        inputMode="decimal"
                                        onChange={(e) =>
                                            setForm({ ...form, price: e.target.value })
                                        }
                                        placeholder="0.00"
                                        className="pl-7"
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                                        ₱
                                    </span>
                                    <Input
                                        value={form.phpPrice}
                                        inputMode="decimal"
                                        onChange={(e) =>
                                            setForm({ ...form, phpPrice: e.target.value })
                                        }
                                        placeholder="0.00"
                                        className="pl-8"
                                    />
                                </div>
                            </div>

                            <Label className="justify-end font-normal">原价</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                                        $
                                    </span>
                                    <Input
                                        value={form.originalPrice}
                                        inputMode="decimal"
                                        onChange={(e) =>
                                            setForm({ ...form, originalPrice: e.target.value })
                                        }
                                        placeholder="0.00"
                                        className="pl-7"
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                                        ₱
                                    </span>
                                    <Input
                                        value={form.phpOriginalPrice}
                                        inputMode="decimal"
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                phpOriginalPrice: e.target.value,
                                            })
                                        }
                                        placeholder="0.00"
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                        </div>

                        <SectionTitle>展示设置</SectionTitle>
                        <div className="grid grid-cols-[130px_1fr] items-center gap-x-4 gap-y-4">
                            <Label className="justify-end font-normal">标签</Label>
                            <Select
                                value={form.tag || "__none"}
                                onValueChange={(value) => setForm({ ...form, tag: value })}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TAG_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Label htmlFor="vip-sort" className="justify-end font-normal">
                                排序
                            </Label>
                            <Stepper
                                value={form.sort}
                                onChange={(v) => setForm({ ...form, sort: v })}
                                min={0}
                            />

                            <Label htmlFor="vip-auto" className="justify-end font-normal">
                                自动续费
                            </Label>
                            <Switch
                                id="vip-auto"
                                checked={form.autoRenew}
                                onCheckedChange={(checked) =>
                                    setForm({ ...form, autoRenew: checked })
                                }
                            />

                            <Label className="justify-end font-normal">状态</Label>
                            <RadioGroup
                                value={form.enabled ? "enabled" : "disabled"}
                                onValueChange={(value) =>
                                    setForm({ ...form, enabled: value === "enabled" })
                                }
                                className="flex items-center gap-3"
                            >
                                <div
                                    className={cn(
                                        "border-input flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors",
                                        form.enabled && "border-primary",
                                    )}
                                >
                                    <RadioGroupItem id="vip-status-enabled" value="enabled" />
                                    <label htmlFor="vip-status-enabled" className="cursor-pointer">
                                        启用
                                    </label>
                                </div>
                                <div
                                    className={cn(
                                        "border-input flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors",
                                        !form.enabled && "border-primary",
                                    )}
                                >
                                    <RadioGroupItem id="vip-status-disabled" value="disabled" />
                                    <label
                                        htmlFor="vip-status-disabled"
                                        className="cursor-pointer"
                                    >
                                        禁用
                                    </label>
                                </div>
                            </RadioGroup>
                        </div>

                        <SectionTitle>支付配置</SectionTitle>
                        <div className="grid grid-cols-[130px_1fr] items-center gap-x-4 gap-y-4">
                            <Label htmlFor="vip-ios" className="justify-end font-normal">
                                iOS产品ID
                            </Label>
                            <Input
                                id="vip-ios"
                                value={form.iosProductId}
                                onChange={(e) =>
                                    setForm({ ...form, iosProductId: e.target.value })
                                }
                                placeholder="App Store订阅产品ID"
                            />

                            <Label htmlFor="vip-android" className="justify-end font-normal">
                                Android产品ID
                            </Label>
                            <Input
                                id="vip-android"
                                value={form.androidProductId}
                                onChange={(e) =>
                                    setForm({ ...form, androidProductId: e.target.value })
                                }
                                placeholder="Google Play订阅产品ID"
                            />

                            <Label htmlFor="vip-google" className="justify-end font-normal">
                                Google Base Plan ID
                            </Label>
                            <Input
                                id="vip-google"
                                value={form.googleBasePlanId}
                                onChange={(e) =>
                                    setForm({ ...form, googleBasePlanId: e.target.value })
                                }
                                placeholder="同一产品下有多个 base plan 时填写"
                            />

                            <Label htmlFor="vip-stripe" className="justify-end font-normal">
                                Stripe价格ID
                            </Label>
                            <Input
                                id="vip-stripe"
                                value={form.stripePriceId}
                                onChange={(e) =>
                                    setForm({ ...form, stripePriceId: e.target.value })
                                }
                                placeholder="用于H5支付"
                            />

                            <Label htmlFor="vip-awx" className="justify-end font-normal">
                                Airwallex价格ID
                            </Label>
                            <Input
                                id="vip-awx"
                                value={form.airwallexPriceId}
                                onChange={(e) =>
                                    setForm({ ...form, airwallexPriceId: e.target.value })
                                }
                                placeholder="用于空中云汇订阅支付（需为 recurring Price）"
                            />

                            <Label htmlFor="vip-paypal" className="justify-end font-normal">
                                PayPal Plan ID
                            </Label>
                            <Input
                                id="vip-paypal"
                                value={form.paypalPlanId}
                                onChange={(e) =>
                                    setForm({ ...form, paypalPlanId: e.target.value })
                                }
                                placeholder="请先在 PayPal 后台创建 Product 和 Subscription Plan，然后填入 P- 开头的 Plan ID"
                            />
                        </div>
                    </div>

                    <DialogFooter className="px-6 pb-5">
                        <Button variant="outline" onClick={() => setFormOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={save} loading={create.isPending || update.isPending}>
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            删除{deleteTargets.length > 1 ? ` ${deleteTargets.length} 个` : ""}
                            VIP套餐
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            删除后 H5 VIP 页将不再展示该套餐，确认删除吗？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
