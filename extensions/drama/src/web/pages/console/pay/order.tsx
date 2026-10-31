import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
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
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { cn } from "@buildingai/ui/lib/utils";
import { RotateCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { useCoinOrderListQuery } from "../../../services";
import { Pager, Pill } from "../promo/shared";

const STATUS_META: Record<string, { label: string; tone: "green" | "amber" | "gray" | "red" | "blue" }> = {
    paid: { label: "已支付", tone: "green" },
    pending: { label: "待支付", tone: "amber" },
    failed: { label: "失败", tone: "red" },
    refunded: { label: "已退款", tone: "gray" },
};

const EMPTY_FILTERS = {
    id: "",
    keyword: "",
    username: "",
    orderType: "__all",
    market: "__all",
    channel: "__all",
    status: "__all",
    promoCode: "",
    pitcher: "",
    subscriber: "__all",
    createdFrom: "",
    createdTo: "",
    paidFrom: "",
    paidTo: "",
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

export default function PayOrderPage() {
    useDocumentHead({ title: "订单管理" });

    const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
    const [applied, setApplied] = useState<FilterState>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const queryParams = useMemo(
        () => ({
            id: applied.id.trim() || undefined,
            keyword: applied.keyword.trim() || undefined,
            username: applied.username.trim() || undefined,
            orderType: applied.orderType === "__all" ? undefined : applied.orderType,
            market: applied.market === "__all" ? undefined : applied.market,
            channel: applied.channel === "__all" ? undefined : applied.channel,
            status: applied.status === "__all" ? undefined : applied.status,
            promoCode: applied.promoCode.trim() || undefined,
            pitcher: applied.pitcher.trim() || undefined,
            subscriber: applied.subscriber === "__all" ? undefined : applied.subscriber,
            createdFrom: applied.createdFrom || undefined,
            createdTo: applied.createdTo || undefined,
            paidFrom: applied.paidFrom || undefined,
            paidTo: applied.paidTo || undefined,
            page,
            pageSize,
        }),
        [applied, page, pageSize],
    );

    const { data, isLoading, isFetching, refetch } = useCoinOrderListQuery(queryParams);
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

    const pageIds = items.map((o) => o.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const someSelected = !allSelected && pageIds.some((id) => selectedIds.has(id));

    return (
        <>
            <div className="bg-card mb-4 rounded-lg border p-4">
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
                    <FilterField label="ID">
                        <Input
                            value={filters.id}
                            onChange={(e) => set({ id: e.target.value })}
                            placeholder="订单ID"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="订单号">
                        <Input
                            value={filters.keyword}
                            onChange={(e) => set({ keyword: e.target.value })}
                            placeholder="订单号"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="用户名">
                        <Input
                            value={filters.username}
                            onChange={(e) => set({ username: e.target.value })}
                            placeholder="用户名"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="订单类型">
                        <Select
                            value={filters.orderType}
                            onValueChange={(v) => set({ orderType: v })}
                        >
                            <SelectTrigger size="sm" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all">全部</SelectItem>
                                <SelectItem value="coin">金币充值</SelectItem>
                                <SelectItem value="vip">VIP购买</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterField>
                    <FilterField label="市场">
                        <Select value={filters.market} onValueChange={(v) => set({ market: v })}>
                            <SelectTrigger size="sm" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all">全部</SelectItem>
                                <SelectItem value="web">Web</SelectItem>
                                <SelectItem value="ios">iOS</SelectItem>
                                <SelectItem value="android">Android</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterField>
                    <FilterField label="支付渠道">
                        <Select value={filters.channel} onValueChange={(v) => set({ channel: v })}>
                            <SelectTrigger size="sm" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all">全部</SelectItem>
                                <SelectItem value="stripe">Stripe</SelectItem>
                                <SelectItem value="airwallex">Airwallex</SelectItem>
                                <SelectItem value="paymongo">PayMongo</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterField>
                    <FilterField label="状态">
                        <Select value={filters.status} onValueChange={(v) => set({ status: v })}>
                            <SelectTrigger size="sm" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all">全部</SelectItem>
                                <SelectItem value="pending">待支付</SelectItem>
                                <SelectItem value="paid">已支付</SelectItem>
                                <SelectItem value="failed">失败</SelectItem>
                                <SelectItem value="refunded">已退款</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterField>
                    <FilterField label="推广码">
                        <Input
                            value={filters.promoCode}
                            onChange={(e) => set({ promoCode: e.target.value })}
                            placeholder="推广码"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="投手">
                        <Input
                            value={filters.pitcher}
                            onChange={(e) => set({ pitcher: e.target.value })}
                            placeholder="投手"
                            className="h-8"
                        />
                    </FilterField>
                    <FilterField label="是否订阅">
                        <Select
                            value={filters.subscriber}
                            onValueChange={(v) => set({ subscriber: v })}
                        >
                            <SelectTrigger size="sm" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all">全部</SelectItem>
                                <SelectItem value="yes">是</SelectItem>
                                <SelectItem value="no">否</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterField>
                    <FilterField label="创建时间">
                        <div className="flex items-center gap-1.5">
                            <Input
                                type="date"
                                value={filters.createdFrom}
                                onChange={(e) => set({ createdFrom: e.target.value })}
                                className="h-8"
                            />
                            <span className="text-muted-foreground">~</span>
                            <Input
                                type="date"
                                value={filters.createdTo}
                                onChange={(e) => set({ createdTo: e.target.value })}
                                className="h-8"
                            />
                        </div>
                    </FilterField>
                    <FilterField label="支付时间">
                        <div className="flex items-center gap-1.5">
                            <Input
                                type="date"
                                value={filters.paidFrom}
                                onChange={(e) => set({ paidFrom: e.target.value })}
                                className="h-8"
                            />
                            <span className="text-muted-foreground">~</span>
                            <Input
                                type="date"
                                value={filters.paidTo}
                                onChange={(e) => set({ paidTo: e.target.value })}
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
                <div className="relative ml-auto w-full sm:w-64">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={filters.keyword}
                        onChange={(e) => set({ keyword: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") search();
                        }}
                        placeholder="通过订单号模糊搜索"
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
                                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
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
                                <TableHead className="min-w-36">订单号</TableHead>
                                <TableHead className="min-w-28">用户名</TableHead>
                                <TableHead className="min-w-24">订单类型</TableHead>
                                <TableHead className="min-w-20">金额</TableHead>
                                <TableHead className="min-w-16">币种</TableHead>
                                <TableHead className="min-w-20">USD金额</TableHead>
                                <TableHead className="min-w-20">PHP金额</TableHead>
                                <TableHead className="min-w-24">支付渠道</TableHead>
                                <TableHead className="min-w-20">状态</TableHead>
                                <TableHead className="min-w-20">金币数</TableHead>
                                <TableHead className="min-w-16">VIP天数</TableHead>
                                <TableHead className="min-w-20">推广码</TableHead>
                                <TableHead className="min-w-20">投手</TableHead>
                                <TableHead className="min-w-16">是否订阅</TableHead>
                                <TableHead className="min-w-40">创建时间</TableHead>
                                <TableHead className="min-w-40">支付时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((o, idx) => (
                                    <TableRow
                                        key={o.id}
                                        data-state={selectedIds.has(o.id) ? "selected" : undefined}
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(o.id)}
                                                onCheckedChange={() => {
                                                    setSelectedIds((prev) => {
                                                        const next = new Set(prev);
                                                        if (next.has(o.id)) next.delete(o.id);
                                                        else next.add(o.id);
                                                        return next;
                                                    });
                                                }}
                                                aria-label={`选择 ${o.orderNo}`}
                                            />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {total - (page - 1) * pageSize - idx}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-xs" title={o.orderNo}>
                                                {o.orderNo}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span title={o.userId}>
                                                {o.username || o.userId.slice(0, 8)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Pill tone={o.orderType === "vip" ? "blue" : "green"}>
                                                {o.orderType === "vip" ? "VIP购买" : "金币充值"}
                                            </Pill>
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {(o.amount / 100).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Pill tone="gray" dot={false}>
                                                {o.currency.toUpperCase()}
                                            </Pill>
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {o.currency === "usd"
                                                ? (o.amount / 100).toFixed(2)
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {o.phpAmount > 0 ? (o.phpAmount / 100).toFixed(2) : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Pill tone="blue" dot={false}>
                                                {o.channel ?? "-"}
                                            </Pill>
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const meta = STATUS_META[o.status] ?? {
                                                    label: o.status,
                                                    tone: "gray" as const,
                                                };
                                                return <Pill tone={meta.tone}>{meta.label}</Pill>;
                                            })()}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {o.coins || "-"}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {o.vipDays || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-xs">
                                                {o.promoCode || "-"}
                                            </span>
                                        </TableCell>
                                        <TableCell>{o.pitcher || "-"}</TableCell>
                                        <TableCell>
                                            <Pill tone={o.subscriber ? "green" : "gray"}>
                                                {o.subscriber ? "是" : "否"}
                                            </Pill>
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={o.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {o.paidAt ? (
                                                <TimeText
                                                    value={o.paidAt}
                                                    format="YYYY-MM-DD HH:mm:ss"
                                                />
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={18} className="h-24 text-center">
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
        </>
    );
}
