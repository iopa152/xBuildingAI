import { useDocumentHead } from "@buildingai/hooks";
import { cn } from "@buildingai/ui/lib/utils";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { Minus, Pencil, Plus, RotateCw, Trash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
    useCreatePanelMutation,
    useDeletePanelMutation,
    usePanelListQuery,
    useUpdatePanelMutation,
} from "../../../services";
import type { PricePanel, PricePanelTier } from "../../../services/types";
import { centsToMoney, Pager, Pill } from "./shared";

const VIP_TYPES = ["日卡", "周卡", "月卡", "季卡", "年卡"];
const BADGES = ["无", "热门", "推荐", "超值"];

interface TierForm {
    type: "vip" | "coin";
    name: string;
    vipType: string;
    days: string;
    coins: string;
    bonusCoins: string;
    price: string;
    originalPrice: string;
    phpPrice: string;
    phpOriginalPrice: string;
    badge: string;
    sort: string;
    description: string;
    status: boolean;
}

const EMPTY_TIER: TierForm = {
    type: "vip",
    name: "",
    vipType: "月卡",
    days: "30",
    coins: "100",
    bonusCoins: "0",
    price: "",
    originalPrice: "0.00",
    phpPrice: "0.00",
    phpOriginalPrice: "0.00",
    badge: "无",
    sort: "0",
    description: "",
    status: true,
};

function tierType(tier: PricePanelTier) {
    return tier.type ?? "coin";
}

function moneyToCents(value: string) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function tierToForm(tier: PricePanelTier): TierForm {
    return {
        type: tierType(tier),
        name: tier.name ?? "",
        vipType: tier.vipType || "月卡",
        days: String(tier.days ?? 30),
        coins: String(tier.coins ?? 100),
        bonusCoins: String(tier.bonusCoins ?? 0),
        price: (Number(tier.price ?? 0) / 100).toFixed(2),
        originalPrice: (Number(tier.originalPrice ?? 0) / 100).toFixed(2),
        phpPrice: (Number(tier.phpPrice ?? 0) / 100).toFixed(2),
        phpOriginalPrice: (Number(tier.phpOriginalPrice ?? 0) / 100).toFixed(2),
        badge: tier.badge || "无",
        sort: String(tier.sort ?? 0),
        description: tier.description ?? "",
        status: tier.status !== false,
    };
}

function formToTier(form: TierForm): PricePanelTier {
    return {
        type: form.type,
        name: form.name.trim() || (form.type === "vip" ? form.vipType : "金币数量"),
        ...(form.type === "vip"
            ? { vipType: form.vipType, days: Number(form.days) || 0 }
            : {
                  coins: Number(form.coins) || 0,
                  bonusCoins: Number(form.bonusCoins) || 0,
              }),
        price: moneyToCents(form.price),
        originalPrice: moneyToCents(form.originalPrice),
        phpPrice: moneyToCents(form.phpPrice),
        phpOriginalPrice: moneyToCents(form.phpOriginalPrice),
        badge: form.badge === "无" ? "" : form.badge,
        sort: Number(form.sort) || 0,
        description: form.description.trim(),
        status: form.status,
    };
}

export default function PromoPanelsPage() {
    useDocumentHead({ title: "价格面板" });

    const { data: panels = [], isLoading, isFetching, refetch } = usePanelListQuery();
    const create = useCreatePanelMutation();
    const update = useUpdatePanelMutation();
    const remove = useDeletePanelMutation();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<PricePanel | null>(null);
    const [name, setName] = useState("");
    const [status, setStatus] = useState(true);
    const [tiers, setTiers] = useState<PricePanelTier[]>([]);
    const [tierOpen, setTierOpen] = useState(false);
    const [tierIndex, setTierIndex] = useState<number | null>(null);
    const [tierForm, setTierForm] = useState<TierForm>(EMPTY_TIER);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);

    const sorted = useMemo(
        () =>
            [...panels].sort(
                (a, b) =>
                    new Date(b.createdAt ?? 0).getTime() -
                    new Date(a.createdAt ?? 0).getTime(),
            ),
        [panels],
    );

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const pageIds = pageRows.map((p) => p.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    const someSelected = !allSelected && pageIds.some((id) => selected.has(id));
    const selectedRows = panels.filter((p) => selected.has(p.id));
    const previewPanel = selectedRows[0] ?? null;

    useEffect(() => {
        setSelected((prev) => {
            const existing = new Set(panels.map((p) => p.id));
            const next = new Set([...prev].filter((id) => existing.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [panels]);

    const openCreate = () => {
        setEditing(null);
        setName("");
        setStatus(true);
        setTiers([]);
        setFormOpen(true);
    };

    const openEdit = (panel: PricePanel) => {
        setEditing(panel);
        setName(panel.name);
        setStatus(panel.status);
        setTiers(panel.tiers ?? []);
        setFormOpen(true);
    };

    const openTier = (index: number | null, type: "vip" | "coin") => {
        setTierIndex(index);
        if (index === null) {
            setTierForm({
                ...EMPTY_TIER,
                type,
                name: type === "vip" ? "" : "金币数量",
            });
        } else if (tiers[index]) {
            setTierForm(tierToForm(tiers[index]!));
        }
        setTierOpen(true);
    };

    const confirmTier = () => {
        const price = Number(tierForm.price);
        if (!Number.isFinite(price) || price < 0) {
            toast.error("请输入正确的金额");
            return;
        }
        const nextTier = formToTier(tierForm);
        setTiers((prev) => {
            const next = [...prev];
            if (tierIndex === null) next.push(nextTier);
            else next[tierIndex] = nextTier;
            return next;
        });
        setTierOpen(false);
    };

    const removeTier = (index: number) => {
        setTiers((prev) => prev.filter((_, i) => i !== index));
    };

    const save = async () => {
        if (!name.trim()) {
            toast.error("请输入面板名称");
            return;
        }
        const payload = {
            name: name.trim(),
            status,
            tiers,
        };
        try {
            if (editing) {
                await update.mutateAsync({ id: editing.id, data: payload });
                toast.success("保存成功");
            } else {
                await create.mutateAsync(payload);
                toast.success("添加成功");
            }
            setFormOpen(false);
            setEditing(null);
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
            setSelected(new Set());
            setDeleteOpen(false);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    const vipTiers = tiers.filter((tier) => tierType(tier) === "vip");
    const coinTiers = tiers.filter((tier) => tierType(tier) === "coin");

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button onClick={openCreate}>
                    <Plus />
                    添加
                </Button>
                <Button
                    className="disabled:bg-primary/60 disabled:text-primary-foreground/50 disabled:opacity-100 dark:disabled:bg-primary/60"
                    disabled={selectedRows.length !== 1}
                    onClick={() => selectedRows[0] && openEdit(selectedRows[0])}
                >
                    <Pencil />
                    编辑
                </Button>
                <Button
                    variant="destructive"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-destructive/60 disabled:text-white/50 disabled:opacity-100 dark:bg-destructive dark:hover:bg-destructive/90 dark:disabled:bg-destructive/60"
                    disabled={selected.size === 0}
                    onClick={() => askDelete([...selected])}
                >
                    <Trash />
                    删除
                </Button>
                <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="刷新"
                    className="ml-auto"
                    disabled={isFetching}
                    onClick={() => refetch()}
                >
                    <RotateCw className={cn(isFetching && "animate-spin")} />
                </Button>
            </div>

            <div className="flex flex-col items-start gap-4 xl:flex-row">
                <div className="min-w-0 flex-1 self-stretch">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
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
                                                    allSelected
                                                        ? true
                                                        : someSelected
                                                          ? "indeterminate"
                                                          : false
                                                }
                                                onCheckedChange={(checked) => {
                                                    const next = new Set(selected);
                                                    if (checked) pageIds.forEach((id) => next.add(id));
                                                    else pageIds.forEach((id) => next.delete(id));
                                                    setSelected(next);
                                                }}
                                                aria-label="全选"
                                            />
                                        </TableHead>
                                        <TableHead className="w-14">ID</TableHead>
                                        <TableHead className="min-w-32">面板名称</TableHead>
                                        <TableHead className="min-w-20">会员档位</TableHead>
                                        <TableHead className="min-w-20">金币档位</TableHead>
                                        <TableHead className="min-w-20">状态</TableHead>
                                        <TableHead className="min-w-40">创建时间</TableHead>
                                        <TableHead className="w-24">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pageRows.length > 0 ? (
                                        pageRows.map((panel, idx) => {
                                            const panelTiers = panel.tiers ?? [];
                                            return (
                                                <TableRow
                                                    key={panel.id}
                                                    data-state={
                                                        selected.has(panel.id) ? "selected" : undefined
                                                    }
                                                    className="cursor-pointer"
                                                    onClick={() => setSelected(new Set([panel.id]))}
                                                >
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={selected.has(panel.id)}
                                                            onCheckedChange={() => {
                                                                const next = new Set(selected);
                                                                if (next.has(panel.id)) next.delete(panel.id);
                                                                else next.add(panel.id);
                                                                setSelected(next);
                                                            }}
                                                            aria-label={`选择 ${panel.name}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground tabular-nums">
                                                        {total - (currentPage - 1) * pageSize - idx}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {panel.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {
                                                            panelTiers.filter(
                                                                (tier) => tierType(tier) === "vip",
                                                            ).length
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        {
                                                            panelTiers.filter(
                                                                (tier) => tierType(tier) === "coin",
                                                            ).length
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        <Pill tone={panel.status ? "green" : "gray"}>
                                                            {panel.status ? "启用" : "禁用"}
                                                        </Pill>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TimeText
                                                            value={panel.createdAt}
                                                            format="YYYY-MM-DD HH:mm:ss"
                                                        />
                                                    </TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center gap-1.5">
                                                            <Button
                                                                size="icon-sm"
                                                                aria-label={`编辑 ${panel.name}`}
                                                                onClick={() => openEdit(panel)}
                                                            >
                                                                <Pencil />
                                                            </Button>
                                                            <Button
                                                                size="icon-sm"
                                                                variant="destructive"
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                                aria-label={`删除 ${panel.name}`}
                                                                onClick={() => askDelete([panel.id])}
                                                            >
                                                                <Trash />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">
                                                暂无面板
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <Pager
                        page={currentPage}
                        pageSize={pageSize}
                        total={total}
                        onPage={setPage}
                        onPageSize={setPageSize}
                    />
                </div>

                <PanelPreview panel={previewPanel} onRefresh={() => refetch()} />
            </div>

            <Dialog
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditing(null);
                }}
            >
                <DialogContent
                    className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[800px]"
                    aria-describedby={undefined}
                >
                    <DialogHeader className="px-6 pt-5">
                        <DialogTitle>{editing ? "编辑价格面板" : "添加价格面板"}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-[100px_1fr] items-center gap-x-3 gap-y-[18px]">
                        <Label htmlFor="panel-name" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            面板名称
                        </Label>
                        <div className="relative">
                            <Input
                                id="panel-name"
                                value={name}
                                maxLength={100}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="请输入面板名称"
                                className="pr-16"
                            />
                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums">
                                {name.length} / 100
                            </span>
                        </div>

                        <Label className="justify-end font-normal">状态</Label>
                        <RadioGroup
                            value={status ? "enabled" : "disabled"}
                            onValueChange={(value) => setStatus(value === "enabled")}
                            className="flex items-center gap-3"
                        >
                            <TierRadio id="panel-status-disabled" value="disabled" label="禁用" />
                            <TierRadio id="panel-status-enabled" value="enabled" label="启用" />
                        </RadioGroup>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="bg-border h-px w-4" />
                        <span className="text-sm font-medium">添加档位</span>
                        <div className="bg-border h-px flex-1" />
                    </div>

                    <div>
                        <Button size="sm" onClick={() => openTier(null, "vip")}>
                            <Plus />
                            添加档位
                        </Button>
                    </div>

                    <div className="space-y-6">
                        <TierBlock
                            title="会员充值"
                            tiers={vipTiers}
                            badgeText="VIP"
                            columns={1}
                            onEdit={(tier) => openTier(tiers.indexOf(tier), "vip")}
                            onRemove={(tier) => removeTier(tiers.indexOf(tier))}
                        />
                        <TierBlock
                            title="金币充值"
                            tiers={coinTiers}
                            badgeText="金币"
                            columns={2}
                            onEdit={(tier) => openTier(tiers.indexOf(tier), "coin")}
                            onRemove={(tier) => removeTier(tiers.indexOf(tier))}
                        />
                    </div>
                    </div>

                    <DialogFooter className="px-6 pb-5">
                        <Button variant="outline" onClick={() => setFormOpen(false)}>
                            取消
                        </Button>
                        <Button loading={create.isPending || update.isPending} onClick={save}>
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={tierOpen} onOpenChange={setTierOpen}>
                <DialogContent
                    className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[620px]"
                    aria-describedby={undefined}
                >
                    <DialogHeader className="px-6 pt-5">
                        <DialogTitle>档位设置</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <SectionTitle>基本信息</SectionTitle>
                    <div className="grid grid-cols-[100px_1fr] items-center gap-x-3 gap-y-4">
                        <Label className="justify-end font-normal">充值场景</Label>
                        <Select
                            value={tierForm.type}
                            onValueChange={(value) => {
                                const type = value as "vip" | "coin";
                                setTierForm({
                                    ...tierForm,
                                    type,
                                    name:
                                        tierForm.name ||
                                        (type === "vip" ? "" : "金币数量"),
                                });
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="vip">会员充值</SelectItem>
                                <SelectItem value="coin">金币充值</SelectItem>
                            </SelectContent>
                        </Select>

                        <Label htmlFor="tier-name" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            档位名称
                        </Label>
                        <div className="relative">
                            <Input
                                id="tier-name"
                                value={tierForm.name}
                                maxLength={100}
                                onChange={(e) =>
                                    setTierForm({ ...tierForm, name: e.target.value })
                                }
                                placeholder="请输入档位名称"
                                className="pr-16"
                            />
                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums">
                                {tierForm.name.length} / 100
                            </span>
                        </div>

                        {tierForm.type === "vip" ? (
                            <>
                                <Label className="justify-end font-normal">会员类型</Label>
                                <Select
                                    value={tierForm.vipType}
                                    onValueChange={(value) =>
                                        setTierForm({ ...tierForm, vipType: value })
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VIP_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Label htmlFor="tier-days" className="justify-end font-normal">
                                    会员天数
                                </Label>
                                <Stepper
                                    value={tierForm.days}
                                    min={1}
                                    onChange={(value) =>
                                        setTierForm({ ...tierForm, days: value })
                                    }
                                />
                            </>
                        ) : (
                            <>
                                <Label htmlFor="tier-coins" className="justify-end font-normal">
                                    金币数量
                                </Label>
                                <Input
                                    id="tier-coins"
                                    value={tierForm.coins}
                                    inputMode="numeric"
                                    onChange={(e) =>
                                        setTierForm({ ...tierForm, coins: e.target.value })
                                    }
                                />

                                <Label htmlFor="tier-bonus" className="justify-end font-normal">
                                    赠送金币
                                </Label>
                                <Input
                                    id="tier-bonus"
                                    value={tierForm.bonusCoins}
                                    inputMode="numeric"
                                    onChange={(e) =>
                                        setTierForm({ ...tierForm, bonusCoins: e.target.value })
                                    }
                                />
                            </>
                        )}

                        <Label htmlFor="tier-price" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            金额
                        </Label>
                        <MoneyInput
                            id="tier-price"
                            symbol="$"
                            value={tierForm.price}
                            onChange={(value) => setTierForm({ ...tierForm, price: value })}
                        />

                        <Label htmlFor="tier-original" className="justify-end font-normal">
                            原价
                        </Label>
                        <MoneyInput
                            id="tier-original"
                            symbol="$"
                            value={tierForm.originalPrice}
                            onChange={(value) =>
                                setTierForm({ ...tierForm, originalPrice: value })
                            }
                        />

                        <Label htmlFor="tier-php" className="justify-end font-normal">
                            菲律宾价格
                        </Label>
                        <MoneyInput
                            id="tier-php"
                            symbol="₱"
                            value={tierForm.phpPrice}
                            onChange={(value) => setTierForm({ ...tierForm, phpPrice: value })}
                        />

                        <Label htmlFor="tier-php-original" className="justify-end font-normal">
                            菲律宾原价
                        </Label>
                        <MoneyInput
                            id="tier-php-original"
                            symbol="₱"
                            value={tierForm.phpOriginalPrice}
                            onChange={(value) =>
                                setTierForm({ ...tierForm, phpOriginalPrice: value })
                            }
                        />
                    </div>

                    <SectionTitle>展示设置</SectionTitle>
                    <div className="grid grid-cols-[100px_1fr] items-center gap-x-3 gap-y-4">
                        <Label className="justify-end font-normal">标签</Label>
                        <Select
                            value={tierForm.badge}
                            onValueChange={(value) =>
                                setTierForm({ ...tierForm, badge: value })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="请选择" />
                            </SelectTrigger>
                            <SelectContent>
                                {BADGES.map((badge) => (
                                    <SelectItem key={badge} value={badge}>
                                        {badge}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Label htmlFor="tier-sort" className="justify-end font-normal">
                            排序
                        </Label>
                        <Stepper
                            value={tierForm.sort}
                            onChange={(value) => setTierForm({ ...tierForm, sort: value })}
                        />

                        <Label htmlFor="tier-desc" className="justify-end font-normal">
                            描述
                        </Label>
                        <div className="relative">
                            <Textarea
                                id="tier-desc"
                                value={tierForm.description}
                                maxLength={200}
                                onChange={(e) =>
                                    setTierForm({ ...tierForm, description: e.target.value })
                                }
                                className="min-h-20 pb-5"
                            />
                            <span className="text-muted-foreground pointer-events-none absolute right-3 bottom-2 text-xs tabular-nums">
                                {tierForm.description.length} / 200
                            </span>
                        </div>

                        <Label className="justify-end font-normal">状态</Label>
                        <RadioGroup
                            value={tierForm.status ? "enabled" : "disabled"}
                            onValueChange={(value) =>
                                setTierForm({ ...tierForm, status: value === "enabled" })
                            }
                            className="flex items-center gap-3"
                        >
                            <TierRadio id="tier-status-disabled" value="disabled" label="禁用" />
                            <TierRadio id="tier-status-enabled" value="enabled" label="启用" />
                        </RadioGroup>
                    </div>
                    </div>

                    <DialogFooter className="px-6 pb-5">
                        <Button variant="outline" onClick={() => setTierOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={confirmTier}>确认</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            删除{deleteTargets.length > 1 ? ` ${deleteTargets.length} 个` : ""}价格面板
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            删除后不可恢复，绑定该面板的推广链接将回退到系统默认面板。确认删除吗？
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

const BADGE_STYLES: Record<string, string> = {
    热门: "bg-red-500 text-white",
    超值: "bg-emerald-500 text-white",
    推荐: "bg-blue-500 text-white",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <span className="bg-border h-px w-4" />
            <span className="text-sm font-medium">{children}</span>
            <div className="bg-border h-px flex-1" />
        </div>
    );
}

function Stepper({
    value,
    onChange,
    min = 0,
}: {
    value: string;
    onChange: (value: string) => void;
    min?: number;
}) {
    const step = (delta: number) => {
        const parsed = Math.floor(Number(value));
        const base = Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : min;
        onChange(String(Math.max(min, base + delta)));
    };
    return (
        <div className="border-input flex h-9 w-full items-center overflow-hidden rounded-md border">
            <button
                type="button"
                onClick={() => step(-1)}
                className="flex h-full w-9 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
            >
                <Minus className="size-3.5" />
            </button>
            <input
                type="number"
                value={value}
                onChange={(e) => {
                    const parsed = Math.floor(Number(e.target.value));
                    if (Number.isNaN(parsed) || parsed < min) return;
                    onChange(String(parsed));
                }}
                className="h-full flex-1 border-x bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
                type="button"
                onClick={() => step(1)}
                className="flex h-full w-9 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
            >
                <Plus className="size-3.5" />
            </button>
        </div>
    );
}

function TierBlock({
    title,
    tiers,
    badgeText,
    columns,
    onEdit,
    onRemove,
}: {
    title: string;
    tiers: PricePanelTier[];
    badgeText: string;
    columns: 1 | 2;
    onEdit: (tier: PricePanelTier) => void;
    onRemove: (tier: PricePanelTier) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{title}</span>
                <span className="text-muted-foreground text-xs">{tiers.length}</span>
                <div className="bg-border h-px flex-1" />
            </div>
            {tiers.length === 0 ? (
                <div className="text-muted-foreground rounded-md border border-dashed py-4 text-center text-xs">
                    暂无档位
                </div>
            ) : (
                <div
                    className={cn(
                        "gap-3",
                        columns === 1 ? "grid grid-cols-1" : "grid grid-cols-2",
                    )}
                >
                    {tiers.map((tier, index) => (
                        <div
                            key={`${tier.name}-${index}`}
                            className="relative rounded-lg border p-4"
                        >
                            {tier.badge ? (
                                <span
                                    className={cn(
                                        "absolute top-0 right-0 rounded-bl-lg rounded-tr-lg px-1.5 py-0.5 text-[10px] font-medium",
                                        BADGE_STYLES[tier.badge] ??
                                            "bg-primary text-primary-foreground",
                                    )}
                                >
                                    {tier.badge}
                                </span>
                            ) : null}
                            <TierCard tier={tier} badgeText={badgeText} />
                            <div className="bg-border mt-3 h-px" />
                            <div className="mt-3 flex items-center justify-center gap-3">
                                <Button
                                    size="icon-sm"
                                    className="rounded-full bg-blue-500 text-white hover:bg-blue-600"
                                    aria-label="编辑档位"
                                    onClick={() => onEdit(tier)}
                                >
                                    <Pencil />
                                </Button>
                                <Button
                                    size="icon-sm"
                                    className="rounded-full bg-red-500 text-white hover:bg-red-600"
                                    aria-label="删除档位"
                                    onClick={() => onRemove(tier)}
                                >
                                    <Trash />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TierCard({ tier, badgeText }: { tier: PricePanelTier; badgeText: string }) {
    const isVip = tierType(tier) === "vip";
    return (
        <div className={cn("space-y-1.5", !isVip && "flex flex-col items-center py-1")}>
            {isVip ? (
                <div className="text-sm font-semibold">{tier.name || "会员"}</div>
            ) : (
                <div className="flex items-start gap-1">
                    <span className="text-2xl leading-none font-bold text-amber-500">
                        {(tier.coins ?? 0).toLocaleString()}
                    </span>
                    {tier.bonusCoins ? (
                        <span className="text-sm font-semibold text-emerald-500">
                            +{tier.bonusCoins}
                        </span>
                    ) : null}
                </div>
            )}
            <div className="flex items-baseline gap-2">
                <span className={cn("font-bold", isVip && "text-xl")}>
                    {centsToMoney(tier.price)}
                </span>
                <span className="text-muted-foreground text-xs">
                    PHP {tier.phpPrice ? `₱${(tier.phpPrice / 100).toFixed(2)}` : "-"}
                </span>
            </div>
            {isVip ? (
                <span className="inline-flex w-fit items-center rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {badgeText}
                </span>
            ) : null}
        </div>
    );
}

function TierRadio({ id, value, label }: { id: string; value: string; label: string }) {
    return (
        <div className="border-input flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors has-[[data-state=checked]]:border-primary">
            <RadioGroupItem id={id} value={value} />
            <label htmlFor={id} className="cursor-pointer">
                {label}
            </label>
        </div>
    );
}

function MoneyInput({
    id,
    symbol,
    value,
    onChange,
}: {
    id: string;
    symbol: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                {symbol}
            </span>
            <Input
                id={id}
                value={value}
                inputMode="decimal"
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => {
                    const number = Number(value);
                    if (Number.isFinite(number)) onChange(number.toFixed(2));
                }}
                className="pl-8"
            />
        </div>
    );
}

function PanelPreview({
    panel,
    onRefresh,
}: {
    panel: PricePanel | null;
    onRefresh: () => void;
}) {
    const tiers = panel?.tiers ?? [];
    const coinTiers = tiers.filter((tier) => tierType(tier) === "coin");
    const vipTiers = tiers.filter((tier) => tierType(tier) === "vip");

    return (
        <div className="bg-muted/10 w-full shrink-0 rounded-md border p-4 xl:w-[420px]">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <div className="text-sm font-semibold">档位预览</div>
                    <div className="text-muted-foreground text-xs">
                        {panel ? panel.name : "选中面板后展示其档位效果"}
                    </div>
                </div>
                <Button size="icon-sm" variant="ghost" aria-label="刷新" onClick={onRefresh}>
                    <RotateCw />
                </Button>
            </div>

            {!panel ? (
                <div className="text-muted-foreground py-16 text-center text-sm">
                    请在左侧选择一个面板
                </div>
            ) : (
                <div className="space-y-5">
                    <PreviewSection title="金币充值" empty={coinTiers.length === 0}>
                        <div className="grid grid-cols-2 gap-2">
                            {coinTiers.map((tier, index) => (
                                <div
                                    key={`coin-${index}`}
                                    className="bg-background relative rounded-lg border p-3"
                                >
                                    {tier.badge ? (
                                        <span className="bg-primary text-primary-foreground absolute top-0 right-0 rounded-bl-md rounded-tr-lg px-1.5 py-0.5 text-[10px]">
                                            {tier.badge}
                                        </span>
                                    ) : null}
                                    <div className="text-lg font-semibold">
                                        {(tier.coins ?? 0).toLocaleString()}
                                    </div>
                                    {tier.bonusCoins ? (
                                        <div className="text-xs text-emerald-600">
                                            +{tier.bonusCoins.toLocaleString()}
                                        </div>
                                    ) : null}
                                    <div className="mt-2 text-sm font-medium">
                                        {centsToMoney(tier.price)}
                                    </div>
                                    {tier.phpPrice ? (
                                        <div className="text-muted-foreground text-xs">
                                            ₱{(tier.phpPrice / 100).toFixed(2)}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </PreviewSection>

                    <PreviewSection title="会员充值" empty={vipTiers.length === 0}>
                        <div className="grid grid-cols-2 gap-2">
                            {vipTiers.map((tier, index) => (
                                <div
                                    key={`vip-${index}`}
                                    className="bg-background relative rounded-lg border p-3"
                                >
                                    {tier.badge ? (
                                        <span className="bg-primary text-primary-foreground absolute top-0 right-0 rounded-bl-md rounded-tr-lg px-1.5 py-0.5 text-[10px]">
                                            {tier.badge}
                                        </span>
                                    ) : null}
                                    <div className="text-sm font-medium">{tier.name}</div>
                                    <div className="mt-1 text-sm font-semibold">
                                        {centsToMoney(tier.price)}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                        {tier.days ?? 0} 天
                                    </div>
                                    <div className="text-muted-foreground mt-1 text-[11px]">
                                        {tier.vipType || "VIP"} · 会员专享 · 高清画质
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PreviewSection>
                </div>
            )}
        </div>
    );
}

function PreviewSection({
    title,
    empty,
    children,
}: {
    title: string;
    empty: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{title}</span>
                <div className="bg-border h-px flex-1" />
            </div>
            {empty ? (
                <div className="text-muted-foreground rounded-md border border-dashed py-4 text-center text-xs">
                    暂无档位
                </div>
            ) : (
                children
            )}
        </div>
    );
}
