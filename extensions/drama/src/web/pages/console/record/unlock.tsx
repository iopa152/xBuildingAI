import { useDocumentHead } from "@buildingai/hooks";
import { cn } from "@buildingai/ui/lib/utils";
import { Button } from "@buildingai/ui/components/ui/button";
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
import { RotateCw } from "lucide-react";
import { useState } from "react";

import { useUnlockListQuery, useUnlockStatsQuery } from "../../../services";
import { Pager, Pill } from "../promo/shared";
import { StatCards } from "./shared";

export default function UnlockRecordPage() {
    useDocumentHead({ title: "购买记录" });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const { data, isLoading, isFetching, refetch } = useUnlockListQuery({ page, pageSize });
    const { data: stats, refetch: refetchStats } = useUnlockStatsQuery();

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    return (
        <>
            <StatCards
                columns={6}
                items={[
                    { label: "总订单数", value: stats?.totalOrders ?? 0 },
                    { label: "单集购买数", value: stats?.episodeOrders ?? 0 },
                    { label: "整剧购买数", value: stats?.wholeOrders ?? 0 },
                    { label: "总收入(金币)", value: stats?.totalCoins ?? 0 },
                    { label: "今日订单", value: stats?.todayOrders ?? 0 },
                    { label: "今日收入(金币)", value: stats?.todayCoins ?? 0 },
                ]}
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="刷新"
                    disabled={isFetching}
                    onClick={() => {
                        refetch();
                        refetchStats();
                    }}
                >
                    <RotateCw className={cn(isFetching && "animate-spin")} />
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead className="w-14">ID</TableHead>
                                <TableHead className="min-w-32">用户昵称</TableHead>
                                <TableHead className="min-w-44">短剧标题</TableHead>
                                <TableHead className="w-24">第几集</TableHead>
                                <TableHead className="w-24">购买类型</TableHead>
                                <TableHead className="w-24">支付金币</TableHead>
                                <TableHead className="w-24">原价金币</TableHead>
                                <TableHead className="min-w-36">购买时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((r, idx) => {
                                    const whole = r.type === "whole";
                                    return (
                                        <TableRow key={r.id}>
                                            <TableCell className="text-muted-foreground tabular-nums">
                                                {total - (page - 1) * pageSize - idx}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {r.userNickname ?? r.userId.slice(0, 8)}
                                            </TableCell>
                                            <TableCell className="max-w-56 truncate">
                                                {r.dramaTitle ?? r.drama?.title ?? "-"}
                                            </TableCell>
                                            <TableCell>
                                                {whole ? "整剧" : r.episodeNo ? `EP.${r.episodeNo}` : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Pill tone={whole ? "amber" : "blue"}>
                                                    {whole ? "整剧购买" : "单集购买"}
                                                </Pill>
                                            </TableCell>
                                            <TableCell className="tabular-nums">{r.coins}</TableCell>
                                            <TableCell className="text-muted-foreground tabular-nums">
                                                {r.originalPrice ?? 0}
                                            </TableCell>
                                            <TableCell>
                                                <TimeText
                                                    value={r.createdAt}
                                                    format="YYYY-MM-DD HH:mm:ss"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
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
        </>
    );
}
