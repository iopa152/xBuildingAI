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
import { Pencil, Plus, RefreshCw, Search, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useCreatePromoLinkMutation,
    useDeletePromoLinkMutation,
    useDramaListQuery,
    useEpisodeListQuery,
    usePanelListQuery,
    usePixelListQuery,
    usePromoLinkListQuery,
    useUpdatePromoLinkMutation,
} from "../../../services";
import type { PromoLinkRow } from "../../../services";
import type { PromoLink, PromoLinkStatus } from "../../../services/types";
import { CopyValue, Pager, Pill } from "./shared";

const STATUS_META: Record<string, { label: string; tone: "green" | "amber" | "gray" }> = {
    active: { label: "投放中", tone: "green" },
    paused: { label: "暂停", tone: "amber" },
    archived: { label: "归档", tone: "gray" },
};

const MID_MACROS = [
    "campaign_id={{campaign.id}}",
    "campaign_name={{campaign.name}}",
    "adset_id={{adset.id}}",
    "adset_name={{adset.name}}",
    "ad_id={{ad.id}}",
    "ad_name={{ad.name}}",
    "placement={{placement}}",
    "source={{site_source_name}}",
].join("&");

interface LinkForm {
    code: string;
    name: string;
    remark: string;
    pixelId: string;
    panelId: string;
    dramaId: string;
    episodeId: string;
    budget: string;
    capiEnabled: boolean;
    status: PromoLinkStatus;
}

const EMPTY_FORM: LinkForm = {
    code: "",
    name: "",
    remark: "",
    pixelId: "",
    panelId: "",
    dramaId: "",
    episodeId: "",
    budget: "0.00",
    capiEnabled: true,
    status: "active",
};

async function copyText(value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success("已复制");
}

export default function PromoLinksPage() {
    useDocumentHead({ title: "推广链接" });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<PromoLinkRow | null>(null);
    const [form, setForm] = useState<LinkForm>(EMPTY_FORM);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
    const [keywordInput, setKeywordInput] = useState("");
    const [keyword, setKeyword] = useState("");

    const { data, isLoading, isFetching, refetch } = usePromoLinkListQuery({
        page,
        pageSize,
        keyword: keyword || undefined,
    });
    const create = useCreatePromoLinkMutation();
    const update = useUpdatePromoLinkMutation();
    const remove = useDeletePromoLinkMutation();
    const { data: pixels = [] } = usePixelListQuery();
    const { data: panels = [] } = usePanelListQuery();
    const { data: dramaData } = useDramaListQuery({ page: 1, pageSize: 100 });
    const { data: episodes = [] } = useEpisodeListQuery(form.dramaId);

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    useEffect(() => {
        setSelected((prev) => {
            const existing = new Set(items.map((i) => i.id));
            const next = new Set([...prev].filter((id) => existing.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [items]);

    const pageIds = items.map((i) => i.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    const someSelected = !allSelected && pageIds.some((id) => selected.has(id));
    const selectedRows = items.filter((i) => selected.has(i.id));

    const openCreate = () => {
        setEditing(null);
        setForm({
            ...EMPTY_FORM,
            pixelId: pixels[0]?.id ?? "",
        });
        setFormOpen(true);
    };

    const openEdit = (row: PromoLinkRow) => {
        setEditing(row);
        setForm({
            code: row.code,
            name: row.name,
            remark: row.remark ?? "",
            pixelId: row.pixelId ?? "",
            panelId: row.panelId ?? "",
            dramaId: row.dramaId ?? "",
            episodeId: row.episodeId ?? "",
            budget: Number(row.budget ?? 0).toFixed(2),
            capiEnabled: row.capiEnabled !== false,
            status: (row.status as PromoLinkStatus) || "active",
        });
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.name.trim()) {
            toast.error("请输入推广名称");
            return;
        }
        const budget = Number(form.budget);
        if (!Number.isFinite(budget) || budget < 0) {
            toast.error("日预算格式不正确");
            return;
        }
        const payload = {
            code: form.code.trim() || undefined,
            name: form.name.trim(),
            remark: form.remark.trim() || null,
            pixelId: form.pixelId || null,
            panelId: form.panelId || null,
            dramaId: form.dramaId || null,
            episodeId: form.episodeId || null,
            budget,
            capiEnabled: form.capiEnabled,
            status: form.status,
        };
        try {
            if (editing) {
                await update.mutateAsync({
                    id: editing.id,
                    data: payload as unknown as Partial<PromoLink>,
                });
                toast.success("保存成功");
            } else {
                await create.mutateAsync(payload as unknown as Partial<PromoLink>);
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

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button size="icon-sm" variant="ghost" aria-label="刷新" onClick={() => refetch()}>
                    <RefreshCw className={cn(isFetching && "animate-spin")} />
                </Button>
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
                <div className="ml-auto flex items-center gap-2">
                    <Input
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                setPage(1);
                                setKeyword(keywordInput.trim());
                            }
                        }}
                        placeholder="通过名称、推广码模糊搜索"
                        className="h-9 w-64"
                    />
                    <Button
                        size="icon"
                        variant="outline"
                        aria-label="搜索"
                        onClick={() => {
                            setPage(1);
                            setKeyword(keywordInput.trim());
                        }}
                    >
                        <Search />
                    </Button>
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
                                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
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
                                <TableHead className="min-w-40">推广码</TableHead>
                                <TableHead className="min-w-32">推广名称</TableHead>
                                <TableHead className="min-w-28">关联像素</TableHead>
                                <TableHead className="min-w-28">价格面板</TableHead>
                                <TableHead className="min-w-24">投手</TableHead>
                                <TableHead className="min-w-24">状态</TableHead>
                                <TableHead className="min-w-24">CAPI回传</TableHead>
                                <TableHead className="min-w-[220px]">目标落地页URL</TableHead>
                                <TableHead className="min-w-[320px]">投放链接</TableHead>
                                <TableHead className="min-w-40">创建时间</TableHead>
                                <TableHead className="w-24">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row, idx) => {
                                    const status = STATUS_META[row.status] ?? STATUS_META.active;
                                    const ordinal = total - (page - 1) * pageSize - idx;
                                    const trackUrl = `${window.location.origin}${
                                        row.trackPath ??
                                        `/drama/api/promo/mid?server=1&p=${row.code}&${MID_MACROS}`
                                    }`;
                                    return (
                                        <TableRow
                                            key={row.id}
                                            data-state={selected.has(row.id) ? "selected" : undefined}
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={selected.has(row.id)}
                                                    onCheckedChange={() => {
                                                        const next = new Set(selected);
                                                        if (next.has(row.id)) next.delete(row.id);
                                                        else next.add(row.id);
                                                        setSelected(next);
                                                    }}
                                                    aria-label={`选择 ${row.name}`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground tabular-nums">
                                                {ordinal}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs">{row.code}</span>
                                            </TableCell>
                                            <TableCell className="font-medium" title={row.remark}>
                                                {row.name}
                                            </TableCell>
                                            <TableCell>
                                                {row.pixelName ? (
                                                    <span className="text-sm">{row.pixelName}</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">未关联</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.panelName ? (
                                                    <span className="text-sm">{row.panelName}</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">系统默认</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{row.creator || "Admin"}</TableCell>
                                            <TableCell>
                                                <Pill tone={status.tone}>{status.label}</Pill>
                                            </TableCell>
                                            <TableCell>
                                                <Pill
                                                    tone={row.capiEnabled === false ? "gray" : "green"}
                                                >
                                                    {row.capiEnabled === false ? "禁用" : "启用"}
                                                </Pill>
                                            </TableCell>
                                            <TableCell className="max-w-[240px]">
                                                <CopyValue
                                                    value={row.landingUrl ?? row.landing}
                                                    label="复制落地页"
                                                />
                                            </TableCell>
                                            <TableCell className="max-w-[360px]">
                                                <CopyValue value={trackUrl} label="复制投放链接" />
                                            </TableCell>
                                            <TableCell>
                                                <TimeText
                                                    value={row.createdAt}
                                                    format="YYYY-MM-DD HH:mm:ss"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="icon-sm"
                                                        aria-label={`编辑 ${row.name}`}
                                                        onClick={() => openEdit(row)}
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        size="icon-sm"
                                                        variant="destructive"
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                        aria-label={`删除 ${row.name}`}
                                                        onClick={() => askDelete([row.id])}
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
                                    <TableCell colSpan={13} className="h-24 text-center">
                                        暂无数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Pager
                page={page}
                pageSize={pageSize}
                total={total}
                onPage={setPage}
                onPageSize={setPageSize}
            />

            <Dialog
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditing(null);
                }}
            >
                <DialogContent className="sm:max-w-[680px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑推广链接" : "新建推广链接"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-[120px_1fr] items-start gap-x-3 gap-y-[18px]">
                        <Label htmlFor="link-code" className="h-9 justify-end font-normal">
                            推广码
                        </Label>
                        <div className="flex items-start gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="link-code"
                                    value={form.code}
                                    maxLength={32}
                                    disabled={!!editing}
                                    onChange={(e) =>
                                        setForm({ ...form, code: e.target.value.toUpperCase() })
                                    }
                                    placeholder="点击右侧按钮自动生成"
                                    className="pr-16"
                                />
                                <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums">
                                    {form.code.length} / 32
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={!!editing}
                                onClick={() =>
                                    setForm({
                                        ...form,
                                        code: `XTV_US_${Math.random()
                                            .toString(16)
                                            .slice(2, 10)
                                            .toUpperCase()}`,
                                    })
                                }
                            >
                                生成推广码
                            </Button>
                        </div>

                        <Label htmlFor="link-name" className="h-9 justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            推广名称
                        </Label>
                        <div className="relative">
                            <Input
                                id="link-name"
                                value={form.name}
                                maxLength={200}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="如：ES-复仇剧-0901"
                                className="pr-16"
                            />
                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums">
                                {form.name.length} / 200
                            </span>
                        </div>

                        <Label htmlFor="link-remark" className="h-9 justify-end font-normal">
                            备注
                        </Label>
                        <div className="relative">
                            <Textarea
                                id="link-remark"
                                value={form.remark}
                                maxLength={500}
                                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                                placeholder="备注信息"
                                className="min-h-20 pb-5"
                            />
                            <span className="text-muted-foreground pointer-events-none absolute right-3 bottom-2 text-xs tabular-nums">
                                {form.remark.length} / 500
                            </span>
                        </div>

                        <Label className="h-9 justify-end font-normal">关联像素</Label>
                        <Select
                            value={form.pixelId || "__none"}
                            onValueChange={(value) =>
                                setForm({ ...form, pixelId: value === "__none" ? "" : value })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="未指定" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none">未指定</SelectItem>
                                {pixels.map((pixel) => (
                                    <SelectItem key={pixel.id} value={pixel.id}>
                                        {pixel.name} ({pixel.pixelId})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Label className="h-9 justify-end font-normal">价格面板</Label>
                        <Select
                            value={form.panelId || "__none"}
                            onValueChange={(value) =>
                                setForm({ ...form, panelId: value === "__none" ? "" : value })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="系统默认" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none">系统默认</SelectItem>
                                {panels.map((panel) => (
                                    <SelectItem key={panel.id} value={panel.id}>
                                        {panel.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Label className="h-9 justify-end font-normal">落地短剧</Label>
                        <Select
                            value={form.dramaId || "__none"}
                            onValueChange={(value) =>
                                setForm({
                                    ...form,
                                    dramaId: value === "__none" ? "" : value,
                                    episodeId: "",
                                })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="未指定" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                                <SelectItem value="__none">未指定</SelectItem>
                                {(dramaData?.items ?? []).map((drama) => (
                                    <SelectItem key={drama.id} value={drama.id}>
                                        {drama.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Label className="h-9 justify-end font-normal">落地集数</Label>
                        <Select
                            value={form.episodeId || "__none"}
                            disabled={!form.dramaId}
                            onValueChange={(value) =>
                                setForm({ ...form, episodeId: value === "__none" ? "" : value })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="--" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                                <SelectItem value="__none">--</SelectItem>
                                {episodes.map((episode) => (
                                    <SelectItem key={episode.id} value={episode.id}>
                                        E{episode.episodeNo} - {episode.title || `第${episode.episodeNo}集`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Label htmlFor="link-budget" className="h-9 justify-end font-normal">
                            日预算
                        </Label>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="减少预算"
                                onClick={() => {
                                    const value = Math.max(0, Number(form.budget) - 1);
                                    setForm({ ...form, budget: value.toFixed(2) });
                                }}
                            >
                                −
                            </Button>
                            <Input
                                id="link-budget"
                                value={form.budget}
                                inputMode="decimal"
                                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                                onBlur={() => {
                                    const value = Number(form.budget);
                                    if (Number.isFinite(value)) {
                                        setForm({ ...form, budget: value.toFixed(2) });
                                    }
                                }}
                                className="text-center tabular-nums"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="增加预算"
                                onClick={() => {
                                    const value = Math.max(0, Number(form.budget) + 1);
                                    setForm({ ...form, budget: value.toFixed(2) });
                                }}
                            >
                                +
                            </Button>
                        </div>

                        <Label className="h-9 justify-end font-normal">CAPI回传</Label>
                        <RadioGroup
                            value={form.capiEnabled ? "enabled" : "disabled"}
                            onValueChange={(value) =>
                                setForm({ ...form, capiEnabled: value === "enabled" })
                            }
                            className="flex flex-wrap items-center gap-3"
                        >
                            <RadioBox
                                id="link-capi-disabled"
                                value="disabled"
                                checked={!form.capiEnabled}
                                label="禁用"
                            />
                            <RadioBox
                                id="link-capi-enabled"
                                value="enabled"
                                checked={form.capiEnabled}
                                label="启用"
                            />
                        </RadioGroup>

                        <Label className="h-9 justify-end font-normal">状态</Label>
                        <RadioGroup
                            value={form.status}
                            onValueChange={(value) =>
                                setForm({ ...form, status: value as PromoLinkStatus })
                            }
                            className="flex flex-wrap items-center gap-3"
                        >
                            <RadioBox
                                id="link-status-archived"
                                value="archived"
                                checked={form.status === "archived"}
                                label="归档"
                            />
                            <RadioBox
                                id="link-status-active"
                                value="active"
                                checked={form.status === "active"}
                                label="投放中"
                            />
                            <RadioBox
                                id="link-status-paused"
                                value="paused"
                                checked={form.status === "paused"}
                                label="暂停"
                            />
                        </RadioGroup>

                        {editing ? (
                            <>
                                <Label className="h-9 justify-end font-normal">目标落地页URL</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={editing.landingUrl ?? editing.landing}
                                        className="flex-1 font-mono text-xs"
                                    />
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            copyText(editing.landingUrl ?? editing.landing)
                                        }
                                    >
                                        复制
                                    </Button>
                                </div>

                                <Label className="h-9 justify-end font-normal">投放链接</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={`${window.location.origin}${editing.trackPath ?? ""}`}
                                        className="flex-1 font-mono text-xs"
                                    />
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            copyText(
                                                `${window.location.origin}${editing.trackPath ?? ""}`,
                                            )
                                        }
                                    >
                                        复制
                                    </Button>
                                </div>
                            </>
                        ) : null}
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
                            删除{deleteTargets.length > 1 ? ` ${deleteTargets.length} 个` : ""}推广链接
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            删除后不可恢复，历史点击与回传记录将保留。确认删除吗？
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

function RadioBox({
    id,
    value,
    checked,
    label,
}: {
    id: string;
    value: string;
    checked: boolean;
    label: string;
}) {
    return (
        <div
            className={cn(
                "border-input flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors",
                checked && "border-primary",
            )}
        >
            <RadioGroupItem id={id} value={value} />
            <label htmlFor={id} className="cursor-pointer">
                {label}
            </label>
        </div>
    );
}
