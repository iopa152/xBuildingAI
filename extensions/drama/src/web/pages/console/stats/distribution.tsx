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
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { RotateCw, Search } from "lucide-react";
import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../../../services/base";

interface ReportRow {
    inviterId: string;
    username: string;
    nickname: string;
    inviteeCount: number;
    rebateCoins: number;
}

interface RecentLog {
    level: number;
    coins: number;
    beneficiary: string;
    fromUsername: string;
    orderNo: string | null;
    createdAt: string;
}

export default function DistributionReportPage() {
    useDocumentHead({ title: "分销报表" });

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["drama-distribution", "report", page, keyword],
        queryFn: () =>
            consoleHttpClient.get<{
                items: ReportRow[];
                total: number;
                recentLogs: RecentLog[];
            }>("/distribution/report", {
                params: {
                    page,
                    pageSize,
                    keyword: keyword.trim() || undefined,
                },
            }),
    });

    const items = data?.items ?? [];
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

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
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索邀请人昵称/用户名..."
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
                                <TableHead className="w-16">排名</TableHead>
                                <TableHead>邀请人</TableHead>
                                <TableHead>已邀请人数</TableHead>
                                <TableHead>累计返佣金币</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row, idx) => (
                                    <TableRow key={row.inviterId}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {(page - 1) * pageSize + idx + 1}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {row.nickname || row.username}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.inviteeCount}
                                        </TableCell>
                                        <TableCell className="font-semibold tabular-nums">
                                            {row.rebateCoins}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        暂无分销数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between">
                <span className="text-muted-foreground text-sm">共 {data?.total ?? 0} 人</span>
                <PaginationComponent className="mx-0 w-fit" />
            </div>

            <div className="mt-6 mb-2 font-medium">最近返佣记录</div>
            <div className="overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="w-24">层级</TableHead>
                            <TableHead>受益人</TableHead>
                            <TableHead>来源用户</TableHead>
                            <TableHead>关联订单</TableHead>
                            <TableHead>金币</TableHead>
                            <TableHead>时间</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(data?.recentLogs ?? []).length > 0 ? (
                            (data?.recentLogs ?? []).map((l, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        {l.level === 0 ? "邀请奖励" : `L${l.level}`}
                                    </TableCell>
                                    <TableCell>{l.beneficiary}</TableCell>
                                    <TableCell>{l.fromUsername}</TableCell>
                                    <TableCell>
                                        <code className="text-xs">{l.orderNo ?? "-"}</code>
                                    </TableCell>
                                    <TableCell className="font-semibold tabular-nums">
                                        +{l.coins}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {(l.createdAt ?? "").slice(0, 19).replace("T", " ")}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-16 text-center">
                                    暂无返佣记录
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
