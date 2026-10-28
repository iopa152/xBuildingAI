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
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { cn } from "@buildingai/ui/lib/utils";
import { Pencil, Plus, RotateCw, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useCoinPackageListQuery,
    useCreateCoinPackageMutation,
    useDeleteCoinPackageMutation,
    useUpdateCoinPackageMutation,
} from "../../../services";
import type { CoinPackageRow } from "../../../services";

interface PackageForm {
    coins: string;
    bonus: string;
    price: string;
    tag: string;
    sort: string;
    enabled: boolean;
}

const emptyForm: PackageForm = {
    coins: "",
    bonus: "0",
    price: "",
    tag: "",
    sort: "0",
    enabled: true,
};

function StatePill({ active }: { active: boolean }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
                active
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
            )}
        >
            <span
                className={cn(
                    "size-1.5 rounded-full",
                    active ? "bg-emerald-500" : "bg-muted-foreground/60",
                )}
            />
            {active ? "上架" : "下架"}
        </span>
    );
}

export default function CoinPackagePage() {
    useDocumentHead({ title: "金币充值套餐" });

    const { data: packages = [], isLoading, isFetching, refetch } = useCoinPackageListQuery();
    const create = useCreateCoinPackageMutation();
    const update = useUpdateCoinPackageMutation();
    const remove = useDeleteCoinPackageMutation();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<CoinPackageRow | null>(null);
    const [form, setForm] = useState<PackageForm>(emptyForm);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);

    useEffect(() => {
        setSelectedIds((prev) => {
            const existing = new Set(packages.map((p) => p.id));
            const next = new Set([...prev].filter((id) => existing.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [packages]);

    const allSelected =
        packages.length > 0 && packages.every((p) => selectedIds.has(p.id));
    const someSelected = !allSelected && packages.some((p) => selectedIds.has(p.id));

    const toggleRow = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelectedIds(() => (allSelected ? new Set() : new Set(packages.map((p) => p.id))));
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEdit = (row: CoinPackageRow) => {
        setEditing(row);
        setForm({
            coins: String(row.coins),
            bonus: String(row.bonus),
            price: String(row.price),
            tag: row.tag ?? "",
            sort: String(row.sort),
            enabled: row.enabled,
        });
        setFormOpen(true);
    };

    const save = async () => {
        const coins = Number(form.coins);
        const bonus = Number(form.bonus || 0);
        const price = Number(form.price);
        const sort = Number(form.sort || 0);
        if (!Number.isInteger(coins) || coins <= 0) {
            toast.error("请输入正整数金币数量");
            return;
        }
        if (!Number.isFinite(price) || price <= 0) {
            toast.error("请输入正确的价格");
            return;
        }
        const payload = {
            coins,
            bonus: Number.isInteger(bonus) && bonus >= 0 ? bonus : 0,
            price,
            tag: form.tag.trim(),
            sort: Number.isInteger(sort) ? sort : 0,
            enabled: form.enabled,
        };
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

    return (
        <>
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
                                <TableHead>金币</TableHead>
                                <TableHead>赠送</TableHead>
                                <TableHead>价格(USD)</TableHead>
                                <TableHead>角标</TableHead>
                                <TableHead>排序</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>更新时间</TableHead>
                                <TableHead className="w-28">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {packages.length > 0 ? (
                                packages.map((p) => (
                                    <TableRow
                                        key={p.id}
                                        data-state={selectedIds.has(p.id) ? "selected" : undefined}
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(p.id)}
                                                onCheckedChange={() => toggleRow(p.id)}
                                                aria-label={`选择 ${p.coins} 金币`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium tabular-nums">
                                            {p.coins}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {p.bonus > 0 ? `+${p.bonus}` : "-"}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            ${Number(p.price).toFixed(2)}
                                        </TableCell>
                                        <TableCell>{p.tag || "-"}</TableCell>
                                        <TableCell className="tabular-nums">{p.sort}</TableCell>
                                        <TableCell>
                                            <StatePill active={p.enabled} />
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={p.updatedAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    size="icon-sm"
                                                    aria-label={`编辑 ${p.coins} 金币`}
                                                    onClick={() => openEdit(p)}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="destructive"
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                    aria-label={`删除 ${p.coins} 金币`}
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
                                        暂无充值套餐
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="text-muted-foreground mt-4 text-sm">共 {packages.length} 条</div>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[560px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑金币套餐" : "添加金币套餐"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-[160px_1fr] items-center gap-x-3 gap-y-[18px]">
                        <Label htmlFor="pkg-coins" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            金币数量
                        </Label>
                        <Input
                            id="pkg-coins"
                            value={form.coins}
                            inputMode="numeric"
                            onChange={(e) => setForm({ ...form, coins: e.target.value })}
                            placeholder="例如 300"
                        />

                        <Label htmlFor="pkg-bonus" className="justify-end font-normal">
                            赠送金币
                        </Label>
                        <Input
                            id="pkg-bonus"
                            value={form.bonus}
                            inputMode="numeric"
                            onChange={(e) => setForm({ ...form, bonus: e.target.value })}
                            placeholder="例如 30"
                        />

                        <Label htmlFor="pkg-price" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            价格(USD)
                        </Label>
                        <Input
                            id="pkg-price"
                            value={form.price}
                            inputMode="decimal"
                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                            placeholder="例如 2.99"
                        />

                        <Label htmlFor="pkg-tag" className="justify-end font-normal">
                            角标
                        </Label>
                        <Input
                            id="pkg-tag"
                            value={form.tag}
                            maxLength={16}
                            onChange={(e) => setForm({ ...form, tag: e.target.value })}
                            placeholder="HOT / BEST，可留空"
                        />

                        <Label htmlFor="pkg-sort" className="justify-end font-normal">
                            排序
                        </Label>
                        <Input
                            id="pkg-sort"
                            value={form.sort}
                            inputMode="numeric"
                            onChange={(e) => setForm({ ...form, sort: e.target.value })}
                            placeholder="数字越小越靠前"
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
                                    !form.enabled && "border-primary",
                                )}
                            >
                                <RadioGroupItem id="pkg-status-disabled" value="disabled" />
                                <label htmlFor="pkg-status-disabled" className="cursor-pointer">
                                    下架
                                </label>
                            </div>
                            <div
                                className={cn(
                                    "border-input flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors",
                                    form.enabled && "border-primary",
                                )}
                            >
                                <RadioGroupItem id="pkg-status-enabled" value="enabled" />
                                <label htmlFor="pkg-status-enabled" className="cursor-pointer">
                                    上架
                                </label>
                            </div>
                        </RadioGroup>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>
                            取消
                        </Button>
                        <Button loading={create.isPending || update.isPending} onClick={save}>
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            删除{deleteTargets.length > 1 ? ` ${deleteTargets.length} 个` : ""}金币套餐
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
        </>
    );
}
