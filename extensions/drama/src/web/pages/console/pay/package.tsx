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
import { Pencil, Plus, RotateCw, Search, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useCoinPackageListQuery,
    useCreateCoinPackageMutation,
    useDeleteCoinPackageMutation,
    useUpdateCoinPackageMutation,
} from "../../../services";
import type { CoinPackageRow } from "../../../services";
import { SectionTitle, StatePill, Stepper, TAG_BADGE_STYLES } from "./shared";

interface PackageForm {
    name: string;
    coins: string;
    bonus: string;
    price: string;
    originalPrice: string;
    phpPrice: string;
    phpOriginalPrice: string;
    tag: string;
    sort: string;
    enabled: boolean;
    firstChargeExclusive: boolean;
    iosProductId: string;
    androidProductId: string;
}

const emptyForm: PackageForm = {
    name: "",
    coins: "",
    bonus: "0",
    price: "",
    originalPrice: "",
    phpPrice: "",
    phpOriginalPrice: "",
    tag: "",
    sort: "0",
    enabled: true,
    firstChargeExclusive: false,
    iosProductId: "",
    androidProductId: "",
};

const TAG_OPTIONS = [
    { value: "__none", label: "无" },
    { value: "热门", label: "热门" },
    { value: "超值", label: "超值" },
    { value: "推荐", label: "推荐" },
];

function formToPayload(form: PackageForm) {
    const num = (v: string) => {
        const n = Number(v);
        return Number.isFinite(n) && v.trim() !== "" ? n : null;
    };
    return {
        name: form.name.trim(),
        coins: Number(form.coins),
        bonus: Number(form.bonus || 0),
        price: Number(form.price),
        originalPrice: num(form.originalPrice),
        phpPrice: num(form.phpPrice),
        phpOriginalPrice: num(form.phpOriginalPrice),
        tag: form.tag === "__none" ? "" : form.tag,
        sort: Number(form.sort || 0),
        enabled: form.enabled,
        firstChargeExclusive: form.firstChargeExclusive,
        iosProductId: form.iosProductId.trim(),
        androidProductId: form.androidProductId.trim(),
    };
}

function PreviewCard({ pkg }: { pkg: CoinPackageRow }) {
    const badge = pkg.tag && TAG_BADGE_STYLES[pkg.tag] ? pkg.tag : null;
    return (
        <div className="bg-card relative rounded-xl border p-3 text-center shadow-sm">
            {badge && (
                <span
                    className={cn(
                        "absolute -top-1.5 -right-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                        TAG_BADGE_STYLES[badge],
                    )}
                >
                    {badge}
                </span>
            )}
            <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold text-amber-500">{pkg.coins}</span>
                <span className="text-lg font-semibold text-amber-500/80">金币</span>
                {pkg.bonus > 0 && (
                    <span className="text-sm font-semibold text-emerald-500">+{pkg.bonus}</span>
                )}
            </div>
            <div className="mt-2 flex items-baseline justify-center gap-1.5">
                <span className="text-lg font-bold">${Number(pkg.price).toFixed(2)}</span>
                {pkg.originalPrice ? (
                    <span className="text-muted-foreground text-xs line-through">
                        ${Number(pkg.originalPrice).toFixed(2)}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

export default function CoinPackagePage() {
    useDocumentHead({ title: "金币充值套餐" });

    const { data: packages = [], isLoading, isFetching, refetch } = useCoinPackageListQuery();
    const create = useCreateCoinPackageMutation();
    const update = useUpdateCoinPackageMutation();
    const remove = useDeleteCoinPackageMutation();

    const [keyword, setKeyword] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<CoinPackageRow | null>(null);
    const [form, setForm] = useState<PackageForm>(emptyForm);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);

    const filtered = packages.filter((p) => {
        const kw = keyword.trim().toLowerCase();
        if (!kw) return true;
        return (
            String(p.id).toLowerCase().includes(kw) || (p.name ?? "").toLowerCase().includes(kw)
        );
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

    const openEdit = (row: CoinPackageRow) => {
        setEditing(row);
        setForm({
            name: row.name ?? "",
            coins: String(row.coins),
            bonus: String(row.bonus),
            price: String(row.price),
            originalPrice: row.originalPrice ? String(row.originalPrice) : "",
            phpPrice: row.phpPrice ? String(row.phpPrice) : "",
            phpOriginalPrice: row.phpOriginalPrice ? String(row.phpOriginalPrice) : "",
            tag: row.tag || "__none",
            sort: String(row.sort),
            enabled: row.enabled,
            firstChargeExclusive: row.firstChargeExclusive,
            iosProductId: row.iosProductId ?? "",
            androidProductId: row.androidProductId ?? "",
        });
        setFormOpen(true);
    };

    const save = async () => {
        const payload = formToPayload(form);
        if (!payload.name) {
            toast.error("请输入套餐名称");
            return;
        }
        if (!Number.isInteger(payload.coins) || payload.coins <= 0) {
            toast.error("请输入正整数金币数量");
            return;
        }
        if (!Number.isFinite(payload.price) || payload.price <= 0) {
            toast.error("请输入正确的价格");
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
                                    <TableHead>金币数量</TableHead>
                                    <TableHead>价格</TableHead>
                                    <TableHead>首充专享</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead className="w-16">排序</TableHead>
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
                                                    aria-label={`选择 ${p.name || p.coins}`}
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
                                            <TableCell className="font-medium">
                                                {p.name || "-"}
                                                {p.tag && TAG_BADGE_STYLES[p.tag] ? (
                                                    <span
                                                        className={cn(
                                                            "ml-1.5 inline-flex rounded px-1 py-0.5 align-middle text-[10px] font-medium",
                                                            TAG_BADGE_STYLES[p.tag],
                                                        )}
                                                    >
                                                        {p.tag}
                                                    </span>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap tabular-nums">
                                                <span className="font-semibold text-amber-500">
                                                    {p.coins}
                                                </span>
                                                {p.bonus > 0 && (
                                                    <span className="ml-1 text-emerald-500">
                                                        +{p.bonus}
                                                    </span>
                                                )}
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
                                                <StatePill
                                                    active={p.firstChargeExclusive}
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
                                            <TableCell className="tabular-nums">{p.sort}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="icon-sm"
                                                        aria-label={`编辑 ${p.name || p.coins}`}
                                                        onClick={() => openEdit(p)}
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        size="icon-sm"
                                                        variant="destructive"
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                        aria-label={`删除 ${p.name || p.coins}`}
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
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            {keyword.trim() ? "未找到匹配的套餐" : "暂无充值套餐"}
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
                    <span className="text-sm font-medium">充值套餐预览</span>
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
                        previewPackages.map((p) => <PreviewCard key={p.id} pkg={p} />)
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
                        <DialogTitle>{editing ? "编辑套餐" : "新增套餐"}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                        <SectionTitle>基本信息</SectionTitle>
                        <div className="grid grid-cols-[130px_1fr] items-center gap-x-4 gap-y-4">
                            <Label htmlFor="pkg-name" className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                套餐名称
                            </Label>
                            <div>
                                <Input
                                    id="pkg-name"
                                    value={form.name}
                                    maxLength={100}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="请输入套餐名称"
                                />
                                <p className="text-muted-foreground mt-1 text-right text-xs">
                                    {form.name.length} / 100
                                </p>
                            </div>

                            <Label htmlFor="pkg-coins" className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                金币数量
                            </Label>
                            <Stepper
                                value={form.coins}
                                onChange={(v) => setForm({ ...form, coins: v })}
                                min={1}
                            />

                            <Label htmlFor="pkg-bonus" className="justify-end font-normal">
                                赠送金币
                            </Label>
                            <div>
                                <Stepper
                                    value={form.bonus}
                                    onChange={(v) => setForm({ ...form, bonus: v })}
                                    min={0}
                                />
                                <p className="text-muted-foreground mt-1 text-xs">
                                    用户充值时额外赠送的金币数
                                </p>
                            </div>

                            <Label htmlFor="pkg-price" className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                价格
                            </Label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                                        $
                                    </span>
                                    <Input
                                        id="pkg-price"
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

                            <Label htmlFor="pkg-original" className="justify-end font-normal">
                                原价
                            </Label>
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                                            $
                                        </span>
                                        <Input
                                            id="pkg-original"
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
                                <p className="text-muted-foreground mt-1 text-xs">
                                    用于显示划线价，留空或为0则不显示；菲律宾价格为 PayMongo
                                    菲律宾 H5 使用，单位 PHP，填 0 或留空则不开放该套餐
                                </p>
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

                            <Label htmlFor="pkg-sort" className="justify-end font-normal">
                                排序
                            </Label>
                            <Stepper
                                value={form.sort}
                                onChange={(v) => setForm({ ...form, sort: v })}
                                min={0}
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
                                    <RadioGroupItem id="pkg-status-enabled" value="enabled" />
                                    <label htmlFor="pkg-status-enabled" className="cursor-pointer">
                                        启用
                                    </label>
                                </div>
                                <div
                                    className={cn(
                                        "border-input flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors",
                                        !form.enabled && "border-primary",
                                    )}
                                >
                                    <RadioGroupItem id="pkg-status-disabled" value="disabled" />
                                    <label
                                        htmlFor="pkg-status-disabled"
                                        className="cursor-pointer"
                                    >
                                        禁用
                                    </label>
                                </div>
                            </RadioGroup>
                        </div>

                        <SectionTitle>首充专享设置</SectionTitle>
                        <div className="grid grid-cols-[130px_1fr] items-center gap-x-4">
                            <Label htmlFor="pkg-first" className="justify-end font-normal">
                                首充专享
                            </Label>
                            <Switch
                                id="pkg-first"
                                checked={form.firstChargeExclusive}
                                onCheckedChange={(checked) =>
                                    setForm({ ...form, firstChargeExclusive: checked })
                                }
                            />
                        </div>

                        <SectionTitle>支付配置</SectionTitle>
                        <div className="grid grid-cols-[130px_1fr] items-center gap-x-4 gap-y-4">
                            <Label htmlFor="pkg-ios" className="justify-end font-normal">
                                iOS产品ID
                            </Label>
                            <div>
                                <Input
                                    id="pkg-ios"
                                    value={form.iosProductId}
                                    onChange={(e) =>
                                        setForm({ ...form, iosProductId: e.target.value })
                                    }
                                    placeholder="App Store内购产品ID"
                                />
                            </div>
                            <Label htmlFor="pkg-android" className="justify-end font-normal">
                                Android产品ID
                            </Label>
                            <div>
                                <Input
                                    id="pkg-android"
                                    value={form.androidProductId}
                                    onChange={(e) =>
                                        setForm({ ...form, androidProductId: e.target.value })
                                    }
                                    placeholder="Google Play内购产品ID"
                                />
                            </div>
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
                            金币套餐
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            删除后 H5 充值页将不再展示该档位，确认删除吗？
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
