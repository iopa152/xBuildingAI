import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
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
import { cn } from "@buildingai/ui/lib/utils";
import { Eye, RotateCw, Search, Truck, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    useCancelMallOrderMutation,
    useMallOrderDetailQuery,
    useMallOrderListQuery,
    useShipMallOrderMutation,
} from "../../../services";
import type { MallOrderRow } from "../../../services";

const statusLabels: Record<string, { label: string; className: string }> = {
    paid: { label: "待发货", className: "bg-amber-500/10 text-amber-600" },
    shipped: { label: "已发货", className: "bg-sky-500/10 text-sky-600" },
    completed: { label: "已完成", className: "bg-emerald-500/10 text-emerald-600" },
    cancelled: { label: "已取消", className: "bg-muted text-muted-foreground" },
    refunded: { label: "已退款", className: "bg-rose-500/10 text-rose-600" },
};

function StatusPill({ status }: { status: string }) {
    const meta = statusLabels[status] ?? {
        label: status,
        className: "bg-muted text-muted-foreground",
    };
    return (
        <span
            className={cn(
                "inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium",
                meta.className,
            )}
        >
            {meta.label}
        </span>
    );
}

export default function MallOrderPage() {
    useDocumentHead({ title: "订单管理" });

    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading, isFetching, refetch } = useMallOrderListQuery({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        status: status === "all" ? undefined : status,
    });
    const cancel = useCancelMallOrderMutation();
    const ship = useShipMallOrderMutation();

    const items = data?.items ?? [];
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

    const [detailId, setDetailId] = useState<string | undefined>(undefined);
    const { data: detail, isLoading: detailLoading } = useMallOrderDetailQuery(detailId);

    const [shipRow, setShipRow] = useState<MallOrderRow | null>(null);
    const [shipForm, setShipForm] = useState({
        logisticsCompany: "",
        logisticsNo: "",
        remark: "",
    });

    const openShip = (row: MallOrderRow) => {
        setShipRow(row);
        setShipForm({
            logisticsCompany: row.logisticsCompany ?? "",
            logisticsNo: row.logisticsNo ?? "",
            remark: "",
        });
    };

    const saveShip = async () => {
        if (!shipRow) return;
        if (!shipForm.logisticsCompany.trim() || !shipForm.logisticsNo.trim()) {
            toast.error("请填写物流公司和物流单号");
            return;
        }
        try {
            await ship.mutateAsync({ id: shipRow.id, data: shipForm });
            toast.success("发货成功");
            setShipRow(null);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    const askCancel = async (row: MallOrderRow) => {
        if (!confirm(`确定取消订单「${row.orderNo}」并退款吗？`)) return;
        try {
            await cancel.mutateAsync(row.id);
            toast.success("订单已取消并退款");
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
                    <RotateCw className={isFetching ? "animate-spin" : undefined} />
                </Button>
                <Select
                    value={status}
                    onValueChange={(v) => {
                        setStatus(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="状态" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="paid">待发货</SelectItem>
                        <SelectItem value="shipped">已发货</SelectItem>
                        <SelectItem value="completed">已完成</SelectItem>
                        <SelectItem value="cancelled">已取消</SelectItem>
                        <SelectItem value="refunded">已退款</SelectItem>
                    </SelectContent>
                </Select>
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索订单号/用户名..."
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
                                <TableHead className="w-16">ID</TableHead>
                                <TableHead>订单号</TableHead>
                                <TableHead>用户</TableHead>
                                <TableHead>金币合计</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>物流公司</TableHead>
                                <TableHead>物流单号</TableHead>
                                <TableHead>下单时间</TableHead>
                                <TableHead className="w-40">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {(page - 1) * pageSize + index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs">{row.orderNo}</code>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm font-medium">
                                                {row.nickname || row.username || "-"}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {row.userId?.slice(0, 8) ?? "-"}
                                            </p>
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.totalCoin}
                                        </TableCell>
                                        <TableCell>
                                            <StatusPill status={row.status} />
                                        </TableCell>
                                        <TableCell>{row.logisticsCompany || "-"}</TableCell>
                                        <TableCell>{row.logisticsNo || "-"}</TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={row.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="icon-sm"
                                                    variant="outline"
                                                    aria-label="详情"
                                                    onClick={() => setDetailId(row.id)}
                                                >
                                                    <Eye />
                                                </Button>
                                                {row.status === "paid" && (
                                                    <Button
                                                        size="icon-sm"
                                                        aria-label="发货"
                                                        onClick={() => openShip(row)}
                                                    >
                                                        <Truck />
                                                    </Button>
                                                )}
                                                {(row.status === "paid" ||
                                                    row.status === "shipped") && (
                                                    <Button
                                                        size="icon-sm"
                                                        variant="destructive"
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                        aria-label="取消退款"
                                                        onClick={() => askCancel(row)}
                                                    >
                                                        <XCircle />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        暂无订单
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between">
                <span className="text-muted-foreground text-sm">共 {data?.total ?? 0} 条</span>
                <PaginationComponent className="mx-0 w-fit" />
            </div>

            <Dialog
                open={!!detailId}
                onOpenChange={(open) => {
                    if (!open) setDetailId(undefined);
                }}
            >
                <DialogContent className="sm:max-w-[640px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>订单详情</DialogTitle>
                    </DialogHeader>

                    {detailLoading || !detail ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner className="size-6" />
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                <div>
                                    订单号：
                                    <span className="font-medium">{detail.orderNo}</span>
                                </div>
                                <div>
                                    状态：<StatusPill status={detail.status} />
                                </div>
                                <div>
                                    用户：
                                    {detail.address?.name
                                        ? String(detail.address.name)
                                        : detail.userId?.slice(0, 8)}
                                </div>
                                <div>
                                    金币合计：
                                    <span className="tabular-nums">{detail.totalCoin}</span>
                                </div>
                                <div>
                                    下单时间：
                                    <TimeText
                                        value={detail.createdAt}
                                        format="YYYY-MM-DD HH:mm:ss"
                                    />
                                </div>
                                <div>
                                    支付时间：
                                    {detail.paidAt ? (
                                        <TimeText
                                            value={detail.paidAt}
                                            format="YYYY-MM-DD HH:mm:ss"
                                        />
                                    ) : (
                                        "-"
                                    )}
                                </div>
                            </div>

                            {detail.address && (
                                <div className="rounded-md border p-3">
                                    <p className="mb-1 font-medium">收货地址</p>
                                    <p>{String(detail.address.name ?? "")} {String(detail.address.phone ?? "")}</p>
                                    <p className="text-muted-foreground">
                                        {[detail.address.country, detail.address.city, detail.address.detail]
                                            .filter(Boolean)
                                            .join(" ")}
                                    </p>
                                </div>
                            )}

                            <div className="overflow-hidden rounded-md border">
                                <Table>
                                    <TableHeader className="bg-muted">
                                        <TableRow>
                                            <TableHead>商品</TableHead>
                                            <TableHead>规格</TableHead>
                                            <TableHead>数量</TableHead>
                                            <TableHead>金币价</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detail.items?.length ? (
                                            detail.items.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.goodsTitle}</TableCell>
                                                    <TableCell>{item.skuSpecs || "-"}</TableCell>
                                                    <TableCell className="tabular-nums">
                                                        {item.quantity}
                                                    </TableCell>
                                                    <TableCell className="tabular-nums">
                                                        {item.coinPrice}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-16 text-center">
                                                    暂无商品明细
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {detail.logisticsNo && (
                                <p>
                                    物流：{detail.logisticsCompany} / {detail.logisticsNo}
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailId(undefined)}>
                            关闭
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!shipRow}
                onOpenChange={(open) => {
                    if (!open) setShipRow(null);
                }}
            >
                <DialogContent className="sm:max-w-[480px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>订单发货</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-[90px_1fr] items-center gap-x-3 gap-y-[18px]">
                        <Label htmlFor="ship-company" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            物流公司
                        </Label>
                        <Input
                            id="ship-company"
                            value={shipForm.logisticsCompany}
                            onChange={(e) =>
                                setShipForm({ ...shipForm, logisticsCompany: e.target.value })
                            }
                            placeholder="例如 DHL"
                        />

                        <Label htmlFor="ship-no" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            物流单号
                        </Label>
                        <Input
                            id="ship-no"
                            value={shipForm.logisticsNo}
                            onChange={(e) =>
                                setShipForm({ ...shipForm, logisticsNo: e.target.value })
                            }
                        />

                        <Label htmlFor="ship-remark" className="justify-end font-normal">
                            发货备注
                        </Label>
                        <Input
                            id="ship-remark"
                            value={shipForm.remark}
                            onChange={(e) =>
                                setShipForm({ ...shipForm, remark: e.target.value })
                            }
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShipRow(null)}>
                            取消
                        </Button>
                        <Button onClick={saveShip} disabled={ship.isPending}>
                            确定发货
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
