import { useDocumentHead } from "@buildingai/hooks";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Button } from "@buildingai/ui/components/ui/button";
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
import { cn } from "@buildingai/ui/lib/utils";
import { Check, Info, RotateCw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useWithdrawalActionMutation, useWithdrawalListQuery } from "../../../services";
import type { WithdrawalRow } from "../../../services";
import { Pager, Pill } from "../promo/shared";

const STATUS_META: Record<string, { label: string; tone: "green" | "amber" | "gray" | "red" }> = {
    approved: { label: "已通过", tone: "green" },
    pending: { label: "待审核", tone: "amber" },
    rejected: { label: "已拒绝", tone: "red" },
};

const EMPTY_FILTERS = {
    id: "",
    keyword: "",
    user: "",
    minCoins: "",
    maxCoins: "",
    currency: "__all",
    payee: "",
    bankCountry: "",
    bank: "",
    status: "__all",
    applyFrom: "",
    applyTo: "",
    reviewedFrom: "",
    reviewedTo: "",
};

type FilterState = typeof EMPTY_FILTERS;

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex min-w-0 items-center gap-2">
            <Label className="text-muted-foreground w-16 shrink-0 justify-end text-xs font-normal">
                {label}
            </Label>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}

export default function WithdrawalManagePage() {
    useDocumentHead({ title: "提现管理" });

    const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
    const [applied, setApplied] = useState<FilterState>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const queryParams = useMemo(
        () => ({
            keyword: applied.keyword.trim() || undefined,
            minCoins: applied.minCoins.trim() ? Number(applied.minCoins) : undefined,
            maxCoins: applied.maxCoins.trim() ? Number(applied.maxCoins) : undefined,
            currency: applied.currency === "__all" ? undefined : applied.currency,
            payee: applied.payee.trim() || undefined,
            bankCountry: applied.bankCountry.trim() || undefined,
            bank: applied.bank.trim() || undefined,
            status: applied.status === "__all" ? undefined : applied.status,
            applyFrom: applied.applyFrom || undefined,
            applyTo: applied.applyTo || undefined,
            reviewedFrom: applied.reviewedFrom || undefined,
            reviewedTo: applied.reviewedTo || undefined,
            page,
            pageSize,
        }),
        [applied, page, pageSize],
    );

    const { data, isLoading, isFetching, refetch } = useWithdrawalListQuery(queryParams);
    const action = useWithdrawalActionMutation();

    const [target, setTarget] = useState<WithdrawalRow | null>(null);
    const [nextAction, setNextAction] = useState<"approve" | "reject">("approve");
    const [note, setNote] = useState("");

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    const set = (patch: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...patch }));

    const search = () => {
        setApplied(filters);
        setPage(1);
    };

    const reset = () => {
        setFilters(EMPTY_FILTERS);
        setApplied(EMPTY_FILTERS);
        setPage(1);
    };

    const openAction = (row: WithdrawalRow, act: "approve" | "reject") => {
        setTarget(row);
        setNextAction(act);
        setNote("");
    };

    const submit = async () => {
        if (!target) return;
        try {
            await action.mutateAsync({
                id: target.id,
                action: nextAction,
                note: note.trim() || undefined,
            });
            toast.success(nextAction === "approve" ? "已通过" : "已拒绝");
            setTarget(null);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    return (
        <>
            <div className="bg-primary/5 text-primary mb-4 flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm">
                <Info className="size-4 shrink-0" />
                用户提现申请审核
            </div>

            <div className="bg-card mb-4 rounded-lg border p-4">
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
                    <FilterField label="ID">
                        <Input
                            value={filters.id}
                            onChange={(e) => set({ id: e.target.value })}
                            placeholder="提现单ID"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="提现单号">
                        <Input
                            value={filters.keyword}
                            onChange={(e) => set({ keyword: e.target.value })}
                            placeholder="提现单号"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="用户">
                        <Input
                            value={filters.user}
                            onChange={(e) => set({ user: e.target.value })}
                            placeholder="用户名"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="提现积分">
                        <div className="flex items-center gap-1.5">
                            <Input
                                value={filters.minCoins}
                                inputMode="numeric"
                                onChange={(e) => set({ minCoins: e.target.value })}
                                placeholder="最小值"
                                className="h-8"
                            />
                            <span className="text-muted-foreground">~</span>
                            <Input
                                value={filters.maxCoins}
                                inputMode="numeric"
                                onChange={(e) => set({ maxCoins: e.target.value })}
                                placeholder="最大值"
                                className="h-8"
                            />
                        </div>
                    </FilterField>
                    <FilterField label="币种">
                        <Select
                            value={filters.currency}
                            onValueChange={(v) => set({ currency: v })}
                        >
                            <SelectTrigger size="sm" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all">全部</SelectItem>
                                <SelectItem value="PHP">PHP</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterField>
                    <FilterField label="收款人">
                        <Input
                            value={filters.payee}
                            onChange={(e) => set({ payee: e.target.value })}
                            placeholder="收款人"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="银行国家">
                        <Input
                            value={filters.bankCountry}
                            onChange={(e) => set({ bankCountry: e.target.value })}
                            placeholder="银行国家"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="银行">
                        <Input
                            value={filters.bank}
                            onChange={(e) => set({ bank: e.target.value })}
                            placeholder="银行"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="状态">
                        <Select value={filters.status} onValueChange={(v) => set({ status: v })}>
                            <SelectTrigger size="sm" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all">全部</SelectItem>
                                <SelectItem value="pending">待审核</SelectItem>
                                <SelectItem value="approved">已通过</SelectItem>
                                <SelectItem value="rejected">已拒绝</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterField>
                    <FilterField label="申请时间">
                        <div className="flex items-center gap-1.5">
                            <Input
                                type="date"
                                value={filters.applyFrom}
                                onChange={(e) => set({ applyFrom: e.target.value })}
                                className="h-8"
                            />
                            <span className="text-muted-foreground">~</span>
                            <Input
                                type="date"
                                value={filters.applyTo}
                                onChange={(e) => set({ applyTo: e.target.value })}
                                className="h-8"
                            />
                        </div>
                    </FilterField>
                    <FilterField label="审核时间">
                        <div className="flex items-center gap-1.5">
                            <Input
                                type="date"
                                value={filters.reviewedFrom}
                                onChange={(e) => set({ reviewedFrom: e.target.value })}
                                className="h-8"
                            />
                            <span className="text-muted-foreground">~</span>
                            <Input
                                type="date"
                                value={filters.reviewedTo}
                                onChange={(e) => set({ reviewedTo: e.target.value })}
                                className="h-8"
                            />
                        </div>
                    </FilterField>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                    <Button size="sm" onClick={search}>
                        <Search />
                        搜索
                    </Button>
                    <Button size="sm" variant="outline" onClick={reset}>
                        重置
                    </Button>
                </div>
            </div>

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
                                <TableHead className="w-16">ID</TableHead>
                                <TableHead className="min-w-36">提现单号</TableHead>
                                <TableHead className="min-w-24">用户</TableHead>
                                <TableHead className="min-w-24">提现积分</TableHead>
                                <TableHead className="min-w-24">实际到账</TableHead>
                                <TableHead className="min-w-16">币种</TableHead>
                                <TableHead className="min-w-24">收款人</TableHead>
                                <TableHead className="min-w-20">银行国家</TableHead>
                                <TableHead className="min-w-32">银行</TableHead>
                                <TableHead className="min-w-20">状态</TableHead>
                                <TableHead className="w-28">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row, idx) => {
                                    const meta = STATUS_META[row.status] ?? {
                                        label: row.status,
                                        tone: "gray" as const,
                                    };
                                    return (
                                        <TableRow key={row.id}>
                                            <TableCell className="text-muted-foreground tabular-nums">
                                                {total - (page - 1) * pageSize - idx}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className="font-mono text-xs"
                                                    title={row.withdrawNo || row.id}
                                                >
                                                    {row.withdrawNo || row.id.slice(0, 8)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span title={row.userId}>
                                                    {row.username || row.userId.slice(0, 8)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium tabular-nums">
                                                {row.coins}
                                            </TableCell>
                                            <TableCell className="tabular-nums">
                                                {row.actualAmount
                                                    ? Number(row.actualAmount).toFixed(2)
                                                    : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Pill tone="gray" dot={false}>
                                                    {row.currency || "PHP"}
                                                </Pill>
                                            </TableCell>
                                            <TableCell>
                                                {row.payeeName || row.account || "-"}
                                            </TableCell>
                                            <TableCell>{row.bankCountry || "-"}</TableCell>
                                            <TableCell>
                                                {row.bankName || row.method || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Pill tone={meta.tone}>{meta.label}</Pill>
                                            </TableCell>
                                            <TableCell>
                                                {row.status === "pending" ? (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="icon-sm"
                                                            variant="outline"
                                                            aria-label="通过"
                                                            onClick={() => openAction(row, "approve")}
                                                        >
                                                            <Check className="text-emerald-500" />
                                                        </Button>
                                                        <Button
                                                            size="icon-sm"
                                                            variant="outline"
                                                            aria-label="拒绝"
                                                            onClick={() => openAction(row, "reject")}
                                                        >
                                                            <X className="text-destructive" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">
                                                        {row.reviewedAt ? (
                                                            <TimeText
                                                                value={row.reviewedAt}
                                                                format="MM-DD HH:mm"
                                                            />
                                                        ) : (
                                                            "已处理"
                                                        )}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center">
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
                onPageSize={(size) => {
                    setPageSize(size);
                    setPage(1);
                }}
            />

            <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {nextAction === "approve" ? "通过提现申请" : "拒绝提现申请"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-muted space-y-1 rounded-md p-3 text-sm">
                            <p>提现单号：{target?.withdrawNo || target?.id.slice(0, 8)}</p>
                            <p>提现积分：{target?.coins}</p>
                            <p>
                                收款：{target?.bankName || target?.method} ·{" "}
                                {target?.payeeName || target?.account}
                            </p>
                        </div>
                        {nextAction === "reject" && (
                            <p className="text-muted-foreground text-xs">
                                拒绝后冻结的金币将自动退回用户余额。
                            </p>
                        )}
                        <div className="space-y-1.5">
                            <Label>审核备注（可选）</Label>
                            <Textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="填写审核说明"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTarget(null)}>
                            取消
                        </Button>
                        <Button
                            variant={nextAction === "approve" ? "default" : "destructive"}
                            onClick={submit}
                            loading={action.isPending}
                        >
                            确认{nextAction === "approve" ? "通过" : "拒绝"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
