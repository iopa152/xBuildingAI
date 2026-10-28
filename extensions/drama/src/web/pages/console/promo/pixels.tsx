import { useDocumentHead } from "@buildingai/hooks";
import { cn } from "@buildingai/ui/lib/utils";
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
import { TimeText } from "@buildingai/ui/components/ui/time-text";
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
import {
    ArrowDown,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Eye,
    EyeOff,
    Pencil,
    Plus,
    RotateCw,
    Search,
    Trash,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
    useCreatePixelMutation,
    useDeletePixelMutation,
    usePixelListQuery,
    useUpdatePixelMutation,
} from "../../../services";
import type { Pixel } from "../../../services/types";

const PAGE_SIZES = [10, 20, 50];

type SortKey = "id" | "createdAt";

interface PixelForm {
    name: string;
    pixelId: string;
    accessToken: string;
    status: boolean;
}

const emptyForm: PixelForm = { name: "", pixelId: "", accessToken: "", status: true };

function StatePill({ active, activeText, inactiveText }: {
    active: boolean;
    activeText: string;
    inactiveText: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
                active
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
            )}
        >
            <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-muted-foreground/60")} />
            {active ? activeText : inactiveText}
        </span>
    );
}

export default function PromoPixelsPage() {
    useDocumentHead({ title: "像素管理" });

    const { data: pixels = [], isLoading, isFetching, refetch } = usePixelListQuery();
    const create = useCreatePixelMutation();
    const update = useUpdatePixelMutation();
    const remove = useDeletePixelMutation();

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [jump, setJump] = useState("1");
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Pixel | null>(null);
    const [form, setForm] = useState<PixelForm>(emptyForm);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
    const [showToken, setShowToken] = useState(true);

    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        if (!kw) return pixels;
        return pixels.filter(
            (p) =>
                p.name.toLowerCase().includes(kw) ||
                p.pixelId.toLowerCase().includes(kw),
        );
    }, [pixels, keyword]);

    const sorted = useMemo(() => {
        if (!sortKey) return filtered;
        const factor = sortDir === "asc" ? 1 : -1;
        return [...filtered].sort((a, b) => {
            const av = sortKey === "createdAt" ? new Date(a.createdAt ?? 0).getTime() : a.id;
            const bv = sortKey === "createdAt" ? new Date(b.createdAt ?? 0).getTime() : b.id;
            if (av === bv) return 0;
            return av > bv ? factor : -factor;
        });
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        setJump(String(currentPage));
    }, [currentPage]);

    useEffect(() => {
        setSelectedIds((prev) => {
            const existing = new Set(pixels.map((p) => p.id));
            const next = new Set([...prev].filter((id) => existing.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [pixels]);

    const pageIds = pageRows.map((p) => p.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const someSelected = !allSelected && pageIds.some((id) => selectedIds.has(id));
    const selectedRows = pixels.filter((p) => selectedIds.has(p.id));

    const toggleSort = (key: SortKey) => {
        if (sortKey !== key) {
            setSortKey(key);
            setSortDir("asc");
        } else if (sortDir === "asc") {
            setSortDir("desc");
        } else {
            setSortKey(null);
            setSortDir("desc");
        }
        setPage(1);
    };

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
            if (allSelected) pageIds.forEach((id) => next.delete(id));
            else pageIds.forEach((id) => next.add(id));
            return next;
        });
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setShowToken(true);
        setFormOpen(true);
    };

    const openEdit = (pixel: Pixel) => {
        setEditing(pixel);
        setForm({
            name: pixel.name,
            pixelId: pixel.pixelId,
            accessToken: pixel.accessToken ?? "",
            status: pixel.status,
        });
        setShowToken(true);
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.name.trim()) {
            toast.error("请输入名称");
            return;
        }
        if (!form.pixelId.trim()) {
            toast.error("请输入像素");
            return;
        }
        const payload = {
            name: form.name.trim(),
            pixelId: form.pixelId.trim(),
            accessToken: form.accessToken.trim(),
            status: form.status,
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

    const submitJump = () => {
        const target = Number(jump);
        if (!Number.isFinite(target)) {
            setJump(String(currentPage));
            return;
        }
        const next = Math.min(Math.max(1, Math.floor(target)), totalPages);
        setPage(next);
        setJump(String(next));
    };

    const sortIcon = (key: SortKey) => {
        if (sortKey !== key) return <ChevronsUpDown className="size-3.5 opacity-50" />;
        return sortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
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
                    disabled={selectedRows.length !== 1}
                    onClick={() => selectedRows[0] && openEdit(selectedRows[0])}
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
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="通过名称、像素模糊搜索"
                        className="pl-9"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-1 items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                        onCheckedChange={toggleAll}
                                        aria-label="全选"
                                    />
                                </TableHead>
                                <TableHead className="w-24">
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 font-medium"
                                        onClick={() => toggleSort("id")}
                                    >
                                        ID {sortIcon("id")}
                                    </button>
                                </TableHead>
                                <TableHead>名称</TableHead>
                                <TableHead>像素</TableHead>
                                <TableHead>token</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 font-medium"
                                        onClick={() => toggleSort("createdAt")}
                                    >
                                        创建时间 {sortIcon("createdAt")}
                                    </button>
                                </TableHead>
                                <TableHead className="w-28">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pageRows.length > 0 ? (
                                pageRows.map((p) => (
                                    <TableRow key={p.id} data-state={selectedIds.has(p.id) ? "selected" : undefined}>
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
                                                {p.id.slice(0, 8)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>
                                            <span className="font-mono text-xs">{p.pixelId}</span>
                                        </TableCell>
                                        <TableCell>
                                            <StatePill
                                                active={!!p.accessToken}
                                                activeText="已配置"
                                                inactiveText="未配置"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <StatePill
                                                active={p.status}
                                                activeText="启用"
                                                inactiveText="禁用"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TimeText value={p.createdAt} format="YYYY-MM-DD HH:mm:ss" />
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
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        {keyword.trim() ? "未找到匹配的像素" : "暂无像素"}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
                    }}
                >
                    <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PAGE_SIZES.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                                {size}条/页
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-muted-foreground text-sm">共 {sorted.length} 条</span>

                <div className="ml-auto flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="上一页"
                        disabled={currentPage <= 1}
                        onClick={() => setPage(currentPage - 1)}
                    >
                        <ChevronLeft />
                    </Button>
                    <span className="bg-primary text-primary-foreground inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm">
                        {currentPage}
                    </span>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="下一页"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage(currentPage + 1)}
                    >
                        <ChevronRight />
                    </Button>
                    <span className="text-muted-foreground ml-2 text-sm">前往</span>
                    <Input
                        value={jump}
                        onChange={(e) => setJump(e.target.value)}
                        onBlur={submitJump}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") submitJump();
                        }}
                        className="h-8 w-14 text-center"
                        inputMode="numeric"
                        aria-label="页码"
                    />
                    <span className="text-muted-foreground text-sm">页</span>
                </div>
            </div>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[560px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑像素" : "添加像素"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-[160px_1fr] items-center gap-x-3 gap-y-[18px]">
                        <Label htmlFor="pixel-name" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            名称
                        </Label>
                        <div className="relative">
                            <Input
                                id="pixel-name"
                                value={form.name}
                                maxLength={100}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="请输入名称"
                                className="pr-16"
                            />
                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums">
                                {form.name.length} / 100
                            </span>
                        </div>

                        <Label htmlFor="pixel-id" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            像素
                        </Label>
                        <div className="relative">
                            <Input
                                id="pixel-id"
                                value={form.pixelId}
                                maxLength={50}
                                onChange={(e) => setForm({ ...form, pixelId: e.target.value })}
                                placeholder="请输入像素（Facebook Pixel ID）"
                                className="pr-16"
                            />
                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums">
                                {form.pixelId.length} / 50
                            </span>
                        </div>

                        <Label htmlFor="pixel-token" className="justify-end font-normal">
                            token
                        </Label>
                        <div className="relative">
                            <Input
                                id="pixel-token"
                                type={showToken ? "text" : "password"}
                                value={form.accessToken}
                                maxLength={2000}
                                onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                                placeholder="请输入 token（System User Access Token）"
                                className="pr-9"
                            />
                            <button
                                type="button"
                                aria-label={showToken ? "隐藏 token" : "显示 token"}
                                onClick={() => setShowToken((visible) => !visible)}
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 transition-colors"
                            >
                                {showToken ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                            </button>
                        </div>

                        <Label className="justify-end font-normal">状态</Label>
                        <RadioGroup
                            value={form.status ? "enabled" : "disabled"}
                            onValueChange={(value) =>
                                setForm({ ...form, status: value === "enabled" })
                            }
                            className="flex items-center gap-3"
                        >
                            <div
                                className={cn(
                                    "border-input flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors",
                                    !form.status && "border-primary",
                                )}
                            >
                                <RadioGroupItem id="pixel-status-disabled" value="disabled" />
                                <label htmlFor="pixel-status-disabled" className="cursor-pointer">
                                    禁用
                                </label>
                            </div>
                            <div
                                className={cn(
                                    "border-input flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors",
                                    form.status && "border-primary",
                                )}
                            >
                                <RadioGroupItem id="pixel-status-enabled" value="enabled" />
                                <label htmlFor="pixel-status-enabled" className="cursor-pointer">
                                    启用
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
                            删除{deleteTargets.length > 1 ? ` ${deleteTargets.length} 个` : ""}像素
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            删除后不可恢复，相关 CAPI 回传将停止。确认删除吗？
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
