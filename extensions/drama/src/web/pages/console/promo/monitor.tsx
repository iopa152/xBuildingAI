import { useDocumentHead } from "@buildingai/hooks";
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
import { cn } from "@buildingai/ui/lib/utils";
import { RotateCw } from "lucide-react";
import { Fragment, useState } from "react";

import { useCapiMonitorDailyQuery } from "../../../services";
import type { CapiEventStat } from "../../../services";
import { formatPercent, lastDays } from "./shared";

const EVENT_COLUMNS: {
    key: "ViewContent" | "CompleteRegistration" | "Purchase";
    title: string;
    short: string;
}[] = [
    { key: "ViewContent", title: "ViewContent", short: "VC" },
    { key: "CompleteRegistration", title: "CompleteRegistration", short: "CR" },
    { key: "Purchase", title: "Purchase", short: "PU" },
];

export default function PromoMonitorPage() {
    useDocumentHead({ title: "CAPI 监控" });

    const [draft, setDraft] = useState(lastDays(7));
    const [applied, setApplied] = useState(draft);

    const { data, isLoading, isFetching, refetch } = useCapiMonitorDailyQuery(applied);
    const items = data?.items ?? [];

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

                <div className="border-input flex h-9 items-center gap-1 rounded-md border px-2">
                    <Input
                        type="date"
                        value={draft.from}
                        onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                        className="h-7 w-[130px] border-0 px-1 shadow-none focus-visible:ring-0"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                        type="date"
                        value={draft.to}
                        onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                        className="h-7 w-[130px] border-0 px-1 shadow-none focus-visible:ring-0"
                    />
                </div>
                <Button onClick={() => setApplied(draft)}>查询</Button>
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
                                <TableHead rowSpan={2} className="min-w-28 text-center">
                                    日期
                                </TableHead>
                                {EVENT_COLUMNS.map((event) => (
                                    <TableHead
                                        key={event.key}
                                        colSpan={3}
                                        className="border-l text-center"
                                    >
                                        {event.title}
                                    </TableHead>
                                ))}
                                <TableHead rowSpan={2} className="min-w-20 border-l text-center">
                                    总发送
                                </TableHead>
                                <TableHead rowSpan={2} className="min-w-20 text-center">
                                    总成功
                                </TableHead>
                                <TableHead rowSpan={2} className="min-w-20 text-center">
                                    总失败
                                </TableHead>
                                <TableHead rowSpan={2} className="min-w-20 text-center">
                                    成功率
                                </TableHead>
                            </TableRow>
                            <TableRow>
                                {EVENT_COLUMNS.flatMap((event) => [
                                    <TableHead
                                        key={`${event.key}-sent`}
                                        className="min-w-20 border-l text-center"
                                    >
                                        {event.short} 发送
                                    </TableHead>,
                                    <TableHead
                                        key={`${event.key}-success`}
                                        className="min-w-20 text-center"
                                    >
                                        {event.short} 成功
                                    </TableHead>,
                                    <TableHead
                                        key={`${event.key}-failed`}
                                        className="min-w-20 text-center"
                                    >
                                        {event.short} 失败
                                    </TableHead>,
                                ])}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row) => (
                                    <TableRow key={row.date}>
                                        <TableCell className="text-center font-medium">
                                            {row.date}
                                        </TableCell>
                                        {EVENT_COLUMNS.map((event) => {
                                            const stat: CapiEventStat = row[event.key];
                                            return (
                                                <Fragment key={`${row.date}-${event.key}`}>
                                                    <TableCell className="border-l text-center tabular-nums">
                                                        {stat.sent}
                                                    </TableCell>
                                                    <TableCell className="text-center tabular-nums">
                                                        {stat.success}
                                                    </TableCell>
                                                    <TableCell className="text-center tabular-nums">
                                                        {stat.failed}
                                                    </TableCell>
                                                </Fragment>
                                            );
                                        })}
                                        <TableCell className="border-l text-center tabular-nums">
                                            {row.totalSent}
                                        </TableCell>
                                        <TableCell className="text-center tabular-nums">
                                            {row.totalSuccess}
                                        </TableCell>
                                        <TableCell className="text-center tabular-nums">
                                            {row.totalFailed}
                                        </TableCell>
                                        <TableCell className="text-center tabular-nums">
                                            {formatPercent(row.successRate)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={16} className="h-24 text-center">
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
