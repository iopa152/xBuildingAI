import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
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
import { cn } from "@buildingai/ui/lib/utils";
import { RotateCw } from "lucide-react";
import { useState } from "react";

import { usePromoLtvQuery } from "../../../services";
import { formatMoney } from "./shared";

const DAY_OPTIONS = [7, 14, 30];

export default function PromoLtvPage() {
    useDocumentHead({ title: "LTV 统计" });

    const [draftDays, setDraftDays] = useState(7);
    const [draftLinkId, setDraftLinkId] = useState<string>("__all");
    const [draftFrom, setDraftFrom] = useState("");
    const [draftTo, setDraftTo] = useState("");
    const [applied, setApplied] = useState<{
        days: number;
        linkId?: string;
        from?: string;
        to?: string;
    }>({
        days: 7,
    });

    const { data, isLoading, isFetching, refetch } = usePromoLtvQuery(applied);
    const items = data?.items ?? [];
    const days = data?.days ?? applied.days;
    const ltvColumns = Array.from({ length: days + 1 }, (_, i) => i);

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

                <span className="text-sm">LTV 天数</span>
                <Select
                    value={String(draftDays)}
                    onValueChange={(value) => setDraftDays(Number(value))}
                >
                    <SelectTrigger className="w-28">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {DAY_OPTIONS.map((day) => (
                            <SelectItem key={day} value={String(day)}>
                                {day} 天
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Input
                    type="date"
                    value={draftFrom}
                    onChange={(e) => setDraftFrom(e.target.value)}
                    className="w-40"
                    aria-label="开始日期"
                />
                <span className="text-muted-foreground text-sm">至</span>
                <Input
                    type="date"
                    value={draftTo}
                    onChange={(e) => setDraftTo(e.target.value)}
                    className="w-40"
                    aria-label="结束日期"
                />

                <Select value={draftLinkId} onValueChange={setDraftLinkId}>
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all">全部推广链接</SelectItem>
                        {(data?.links ?? []).map((link) => (
                            <SelectItem key={link.id} value={link.id}>
                                {link.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    onClick={() =>
                        setApplied({
                            days: draftDays,
                            linkId: draftLinkId === "__all" ? undefined : draftLinkId,
                            from: draftFrom || undefined,
                            to: draftTo || undefined,
                        })
                    }
                >
                    执行统计
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
                                <TableHead className="min-w-32">推广链接</TableHead>
                                <TableHead className="min-w-28">注册日期</TableHead>
                                <TableHead className="min-w-20">新增用户</TableHead>
                                <TableHead className="min-w-24">累计充值人数</TableHead>
                                <TableHead className="min-w-24">累计充值金额</TableHead>
                                <TableHead className="min-w-24">累计客单价</TableHead>
                                <TableHead className="min-w-20">今日注册</TableHead>
                                <TableHead className="min-w-24">今日充值人数</TableHead>
                                <TableHead className="min-w-24">今日充值金额</TableHead>
                                {ltvColumns.map((day) => (
                                    <TableHead key={day} className="min-w-20">
                                        LTV_{day}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row) => (
                                    <TableRow key={`${row.linkId}-${row.regDate}`}>
                                        <TableCell className="font-medium">
                                            {row.linkName}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.regDate}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.newUsers}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.payers}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatMoney(row.revenue)}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatMoney(row.avgRevenue)}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.todayNew}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.todayPayers}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatMoney(row.todayRevenue)}
                                        </TableCell>
                                        {ltvColumns.map((day) => (
                                            <TableCell key={day} className="tabular-nums">
                                                {formatMoney(row.ltv[day] ?? 0)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={9 + ltvColumns.length}
                                        className="h-24 text-center"
                                    >
                                        暂无数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </>
    );
}
