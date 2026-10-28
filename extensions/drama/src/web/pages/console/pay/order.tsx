import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
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
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useCoinOrderListQuery, useRefundMutation } from "../../../services";

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    paid: { label: "已支付", variant: "default" },
    pending: { label: "待支付", variant: "secondary" },
    failed: { label: "失败", variant: "destructive" },
    refunded: { label: "已退款", variant: "outline" },
    cancelled: { label: "已取消", variant: "outline" },
};

const STATUS_FILTERS = [
    { key: "all", label: "全部" },
    { key: "paid", label: "已支付" },
    { key: "pending", label: "待支付" },
    { key: "failed", label: "失败" },
    { key: "refunded", label: "已退款" },
];

export default function PayOrderPage() {
    useDocumentHead({ title: "订单管理" });
    const [status, setStatus] = useState("all");
    const [userId, setUserId] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading } = useCoinOrderListQuery({
        status: status === "all" ? undefined : status,
        userId: userId.trim() || undefined,
        page,
        pageSize,
    });
    const refund = useRefundMutation();
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

    const items = data?.items ?? [];

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                {STATUS_FILTERS.map((f) => (
                    <Button
                        key={f.key}
                        size="sm"
                        variant={status === f.key ? "default" : "outline"}
                        onClick={() => {
                            setStatus(f.key);
                            setPage(1);
                        }}
                    >
                        {f.label}
                    </Button>
                ))}
                <div className="relative ml-auto w-64">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={userId}
                        onChange={(e) => {
                            setUserId(e.target.value);
                            setPage(1);
                        }}
                        placeholder="按用户 ID 筛选..."
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
                                <TableHead>订单号</TableHead>
                                <TableHead>用户 ID</TableHead>
                                <TableHead>金币</TableHead>
                                <TableHead>金额</TableHead>
                                <TableHead>通道</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>创建时间</TableHead>
                                <TableHead>支付时间</TableHead>
                                <TableHead className="w-20">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((o) => {
                                    const meta = STATUS_META[o.status] ?? {
                                        label: o.status,
                                        variant: "secondary" as const,
                                    };
                                    return (
                                        <TableRow key={o.id}>
                                            <TableCell>
                                                <code className="text-xs">{o.orderNo}</code>
                                            </TableCell>
                                            <TableCell>
                                                <code className="text-xs">
                                                    {o.userId.slice(0, 8)}
                                                </code>
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                {o.coins.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                ${(o.amount / 100).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="uppercase">
                                                {o.channel ?? "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={meta.variant}>{meta.label}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <TimeText
                                                    value={o.createdAt}
                                                    format="YYYY/MM/DD HH:mm"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {o.paidAt ? (
                                                    <TimeText
                                                        value={o.paidAt}
                                                        format="YYYY/MM/DD HH:mm"
                                                    />
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {o.status === "paid" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        loading={refund.isPending}
                                                        onClick={async () => {
                                                            if (!confirm(`确认退款订单 ${o.orderNo}？`)) return;
                                                            try {
                                                                await refund.mutateAsync(o.id);
                                                                toast.success("退款已提交");
                                                            } catch {
                                                                toast.error("退款失败，请检查支付配置");
                                                            }
                                                        }}
                                                    >
                                                        <RotateCcw className="size-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        暂无数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="mt-4">
                <PaginationComponent className="mx-0 w-fit" />
            </div>
        </>
    );
}
