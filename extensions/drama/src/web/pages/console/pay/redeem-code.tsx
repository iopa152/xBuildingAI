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
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { cn } from "@buildingai/ui/lib/utils";
import { Copy, Layers, Pencil, Plus, RotateCw, Search, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    useBatchGenerateRedeemCodesMutation,
    useCreateRedeemCodeMutation,
    useDeleteRedeemCodeMutation,
    useRedeemCodeListQuery,
    useUpdateRedeemCodeMutation,
} from "../../../services";
import type { RedeemCodeRow } from "../../../services";
import { Pager, Pill } from "../promo/shared";
import { StatePill, Stepper } from "./shared";

interface CodeForm {
    code: string;
    batchNo: string;
    activityName: string;
    rewardType: string;
    rewardValue: string;
    maxUses: string;
    expireAt: string;
    enabled: boolean;
    weight: string;
}

const emptyForm: CodeForm = {
    code: "",
    batchNo: "",
    activityName: "",
    rewardType: "coin",
    rewardValue: "100",
    maxUses: "1",
    expireAt: "",
    enabled: true,
    weight: "0",
};

interface BatchForm {
    count: string;
    activityName: string;
    rewardType: string;
    rewardValue: string;
    maxUses: string;
    expireAt: string;
    weight: string;
}

const emptyBatch: BatchForm = {
    count: "10",
    activityName: "",
    rewardType: "coin",
    rewardValue: "100",
    maxUses: "1",
    expireAt: "",
    weight: "0",
};

function RewardPill({ type }: { type: string }) {
    return (
        <Pill tone={type === "vip" ? "blue" : "green"}>
            {type === "vip" ? "VIP会员" : "金币"}
        </Pill>
    );
}

function CopyCode({ code }: { code: string }) {
    return (
        <button
            type="button"
            className="hover:text-foreground text-muted-foreground inline-flex items-center gap-1"
            onClick={async () => {
                await navigator.clipboard.writeText(code);
                toast.success("已复制");
            }}
            title={code}
        >
            <span className="font-mono text-xs">{code}</span>
            <Copy className="size-3" />
        </button>
    );
}

export default function RedeemCodePage() {
    useDocumentHead({ title: "兑换码管理" });

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const { data, isLoading, isFetching, refetch } = useRedeemCodeListQuery({
        keyword: keyword.trim() || undefined,
        page,
        pageSize,
    });
    const create = useCreateRedeemCodeMutation();
    const update = useUpdateRedeemCodeMutation();
    const remove = useDeleteRedeemCodeMutation();
    const batch = useBatchGenerateRedeemCodesMutation();

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<RedeemCodeRow | null>(null);
    const [form, setForm] = useState<CodeForm>(emptyForm);
    const [batchOpen, setBatchOpen] = useState(false);
    const [batchForm, setBatchForm] = useState<BatchForm>(emptyBatch);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);

    const set = (patch: Partial<CodeForm>) => setForm((prev) => ({ ...prev, ...patch }));
    const setBatch = (patch: Partial<BatchForm>) => setBatchForm((prev) => ({ ...prev, ...patch }));

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEdit = (row: RedeemCodeRow) => {
        setEditing(row);
        setForm({
            code: row.code,
            batchNo: row.batchNo,
            activityName: row.activityName,
            rewardType: row.rewardType,
            rewardValue: String(row.rewardValue),
            maxUses: String(row.maxUses),
            expireAt: row.expireAt ? row.expireAt.slice(0, 10) : "",
            enabled: row.enabled,
            weight: String(row.weight),
        });
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.code.trim()) {
            toast.error("请输入兑换码");
            return;
        }
        const payload = {
            code: form.code.trim(),
            batchNo: form.batchNo.trim(),
            activityName: form.activityName.trim(),
            rewardType: form.rewardType,
            rewardValue: Number(form.rewardValue || 0),
            maxUses: Number(form.maxUses || 0),
            expireAt: form.expireAt || null,
            enabled: form.enabled,
            weight: Number(form.weight || 0),
        };
        if (!Number.isInteger(payload.rewardValue) || payload.rewardValue <= 0) {
            toast.error("请输入正确的奖励值");
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

    const submitBatch = async () => {
        const count = Number(batchForm.count || 0);
        if (!Number.isInteger(count) || count <= 0) {
            toast.error("请输入正确的生成数量");
            return;
        }
        const rewardValue = Number(batchForm.rewardValue || 0);
        if (!Number.isInteger(rewardValue) || rewardValue <= 0) {
            toast.error("请输入正确的奖励值");
            return;
        }
        try {
            const res = await batch.mutateAsync({
                count,
                activityName: batchForm.activityName.trim(),
                rewardType: batchForm.rewardType,
                rewardValue,
                maxUses: Number(batchForm.maxUses || 1),
                expireAt: batchForm.expireAt || undefined,
                weight: Number(batchForm.weight || 0),
            });
            toast.success(`已生成 ${res.count} 个兑换码，批次号 ${res.batchNo}`);
            setBatchOpen(false);
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

    const pageIds = items.map((c) => c.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const someSelected = !allSelected && pageIds.some((id) => selectedIds.has(id));

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
                        const row = items.find((c) => selectedIds.has(c.id));
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
                <Button variant="outline" onClick={() => setBatchOpen(true)}>
                    <Layers />
                    批量生成
                </Button>

                <div className="relative ml-auto w-full sm:w-64">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="通过兑换码/批次号/活动名称搜索"
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
                                        onCheckedChange={() => {
                                            setSelectedIds((prev) => {
                                                const next = new Set(prev);
                                                if (allSelected)
                                                    pageIds.forEach((id) => next.delete(id));
                                                else pageIds.forEach((id) => next.add(id));
                                                return next;
                                            });
                                        }}
                                        aria-label="全选"
                                    />
                                </TableHead>
                                <TableHead className="w-16">ID</TableHead>
                                <TableHead className="min-w-32">兑换码</TableHead>
                                <TableHead className="min-w-28">批次号</TableHead>
                                <TableHead className="min-w-32">活动名称</TableHead>
                                <TableHead className="min-w-20">奖励类型</TableHead>
                                <TableHead className="min-w-20">奖励值</TableHead>
                                <TableHead className="min-w-24">最大使用次数</TableHead>
                                <TableHead className="min-w-24">已使用次数</TableHead>
                                <TableHead className="min-w-28">过期时间</TableHead>
                                <TableHead className="min-w-16">状态</TableHead>
                                <TableHead className="w-16">权重</TableHead>
                                <TableHead className="w-28">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row, idx) => {
                                    const expired =
                                        row.expireAt && new Date(row.expireAt).getTime() < Date.now();
                                    return (
                                        <TableRow
                                            key={row.id}
                                            data-state={
                                                selectedIds.has(row.id) ? "selected" : undefined
                                            }
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(row.id)}
                                                    onCheckedChange={() => {
                                                        setSelectedIds((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(row.id)) next.delete(row.id);
                                                            else next.add(row.id);
                                                            return next;
                                                        });
                                                    }}
                                                    aria-label={`选择 ${row.code}`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground tabular-nums">
                                                {total - (page - 1) * pageSize - idx}
                                            </TableCell>
                                            <TableCell>
                                                <CopyCode code={row.code} />
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs">
                                                    {row.batchNo || "-"}
                                                </span>
                                            </TableCell>
                                            <TableCell>{row.activityName || "-"}</TableCell>
                                            <TableCell>
                                                <RewardPill type={row.rewardType} />
                                            </TableCell>
                                            <TableCell className="font-medium tabular-nums">
                                                {row.rewardValue}
                                                {row.rewardType === "coin" ? "金币" : "天"}
                                            </TableCell>
                                            <TableCell className="tabular-nums">
                                                {row.maxUses > 0 ? row.maxUses : "不限"}
                                            </TableCell>
                                            <TableCell className="tabular-nums">
                                                {row.usedCount}
                                            </TableCell>
                                            <TableCell>
                                                {row.expireAt ? (
                                                    <TimeText
                                                        value={row.expireAt}
                                                        format="YYYY-MM-DD HH:mm:ss"
                                                    />
                                                ) : (
                                                    "永不过期"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatePill
                                                    active={row.enabled && !expired}
                                                    activeText="启用"
                                                    inactiveText={expired ? "已过期" : "禁用"}
                                                />
                                            </TableCell>
                                            <TableCell className="tabular-nums">
                                                {row.weight}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="icon-sm"
                                                        aria-label={`编辑 ${row.code}`}
                                                        onClick={() => openEdit(row)}
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        size="icon-sm"
                                                        variant="destructive"
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                        aria-label={`删除 ${row.code}`}
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
                                        {keyword.trim() ? "未找到匹配的兑换码" : "暂无兑换码"}
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
                onPageSize={(size) => {
                    setPageSize(size);
                    setPage(1);
                }}
            />

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent
                    className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]"
                    aria-describedby={undefined}
                >
                    <DialogHeader className="px-6 pt-5">
                        <DialogTitle>{editing ? "编辑兑换码" : "添加兑换码"}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-[130px_1fr] items-center gap-x-4 gap-y-4">
                            <Label htmlFor="rc-code" className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                兑换码
                            </Label>
                            <Input
                                id="rc-code"
                                value={form.code}
                                maxLength={32}
                                onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                                placeholder="请输入兑换码"
                            />
                            <Label htmlFor="rc-batch" className="justify-end font-normal">
                                批次号
                            </Label>
                            <Input
                                id="rc-batch"
                                value={form.batchNo}
                                maxLength={40}
                                onChange={(e) => set({ batchNo: e.target.value })}
                                placeholder="可留空"
                            />
                            <Label htmlFor="rc-activity" className="justify-end font-normal">
                                活动名称
                            </Label>
                            <Input
                                id="rc-activity"
                                value={form.activityName}
                                maxLength={100}
                                onChange={(e) => set({ activityName: e.target.value })}
                                placeholder="请输入活动名称"
                            />
                            <Label className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                奖励类型
                            </Label>
                            <Select
                                value={form.rewardType}
                                onValueChange={(v) => set({ rewardType: v })}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="coin">金币</SelectItem>
                                    <SelectItem value="vip">VIP会员</SelectItem>
                                </SelectContent>
                            </Select>
                            <Label className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                奖励值
                            </Label>
                            <Stepper
                                value={form.rewardValue}
                                onChange={(v) => set({ rewardValue: v })}
                                min={1}
                            />
                            <Label className="justify-end font-normal">最大使用次数</Label>
                            <Stepper
                                value={form.maxUses}
                                onChange={(v) => set({ maxUses: v })}
                                min={0}
                            />
                            <Label htmlFor="rc-expire" className="justify-end font-normal">
                                过期时间
                            </Label>
                            <Input
                                id="rc-expire"
                                type="date"
                                value={form.expireAt}
                                onChange={(e) => set({ expireAt: e.target.value })}
                            />
                            <Label className="justify-end font-normal">状态</Label>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={form.enabled}
                                    onCheckedChange={(checked) => set({ enabled: checked })}
                                />
                                <span className="text-muted-foreground text-sm">
                                    {form.enabled ? "启用" : "禁用"}
                                </span>
                            </div>
                            <Label className="justify-end font-normal">权重</Label>
                            <Stepper
                                value={form.weight}
                                onChange={(v) => set({ weight: v })}
                                min={0}
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

            <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
                <DialogContent
                    className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]"
                    aria-describedby={undefined}
                >
                    <DialogHeader className="px-6 pt-5">
                        <DialogTitle>批量生成兑换码</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-[130px_1fr] items-center gap-x-4 gap-y-4">
                            <Label className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                生成数量
                            </Label>
                            <Stepper
                                value={batchForm.count}
                                onChange={(v) => setBatch({ count: v })}
                                min={1}
                            />
                            <Label htmlFor="rcb-activity" className="justify-end font-normal">
                                活动名称
                            </Label>
                            <Input
                                id="rcb-activity"
                                value={batchForm.activityName}
                                maxLength={100}
                                onChange={(e) => setBatch({ activityName: e.target.value })}
                                placeholder="请输入活动名称"
                            />
                            <Label className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                奖励类型
                            </Label>
                            <Select
                                value={batchForm.rewardType}
                                onValueChange={(v) => setBatch({ rewardType: v })}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="coin">金币</SelectItem>
                                    <SelectItem value="vip">VIP会员</SelectItem>
                                </SelectContent>
                            </Select>
                            <Label className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                奖励值
                            </Label>
                            <Stepper
                                value={batchForm.rewardValue}
                                onChange={(v) => setBatch({ rewardValue: v })}
                                min={1}
                            />
                            <Label className="justify-end font-normal">最大使用次数</Label>
                            <Stepper
                                value={batchForm.maxUses}
                                onChange={(v) => setBatch({ maxUses: v })}
                                min={0}
                            />
                            <Label htmlFor="rcb-expire" className="justify-end font-normal">
                                过期时间
                            </Label>
                            <Input
                                id="rcb-expire"
                                type="date"
                                value={batchForm.expireAt}
                                onChange={(e) => setBatch({ expireAt: e.target.value })}
                            />
                            <Label className="justify-end font-normal">权重</Label>
                            <Stepper
                                value={batchForm.weight}
                                onChange={(v) => setBatch({ weight: v })}
                                min={0}
                            />
                        </div>
                    </div>

                    <DialogFooter className="px-6 pb-5">
                        <Button variant="outline" onClick={() => setBatchOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={submitBatch} loading={batch.isPending}>
                            生成
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            删除{deleteTargets.length > 1 ? ` ${deleteTargets.length} 个` : ""}
                            兑换码
                        </AlertDialogTitle>
                        <AlertDialogDescription>删除后不可恢复，确认删除吗？</AlertDialogDescription>
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
