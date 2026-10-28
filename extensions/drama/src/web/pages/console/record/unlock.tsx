import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
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
import { useState } from "react";

import { useUnlockListQuery, useUnlockStatsQuery } from "../../../services";

export default function UnlockRecordPage() {
    useDocumentHead({ title: "解锁记录" });
    const [page, setPage] = useState(1);

    const { data, isLoading } = useUnlockListQuery({ page, pageSize: 20 });
    const { data: stats } = useUnlockStatsQuery();

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    return (
        <>
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-muted-foreground text-sm">今日解锁次数</p>
                        <p className="text-2xl font-bold">{stats?.todayUnlocks ?? 0}</p>
                    </CardContent>
                </Card>
                {(stats?.topDramas ?? []).slice(0, 3).map((d) => (
                    <Card key={d.dramaId}>
                        <CardContent className="pt-6">
                            <p className="text-muted-foreground truncate text-sm">
                                {d.title}
                            </p>
                            <p className="text-2xl font-bold">
                                {d.unlocks}
                                <span className="text-muted-foreground ml-1 text-sm">
                                    次 / {d.coins} 金币
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {isLoading ? (
                <div className="flex flex-1 items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="mb-4 overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead>用户ID</TableHead>
                                <TableHead>剧目</TableHead>
                                <TableHead>类型</TableHead>
                                <TableHead>消耗金币</TableHead>
                                <TableHead>时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>
                                            <code className="text-xs">{r.userId.slice(0, 8)}</code>
                                        </TableCell>
                                        <TableCell>{r.drama?.title ?? r.dramaId.slice(0, 8)}</TableCell>
                                        <TableCell>
                                            <Badge variant={r.type === "whole" ? "default" : "secondary"}>
                                                {r.type === "whole" ? "整剧" : "单集"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{r.coins}</TableCell>
                                        <TableCell>
                                            <TimeText value={r.createdAt} format="MM/DD HH:mm" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        暂无数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                    共 {total} 条 · 第 {page} 页
                </div>
                <div className="flex gap-2">
                    <button
                        className="border rounded px-3 py-1 text-sm disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        上一页
                    </button>
                    <button
                        className="border rounded px-3 py-1 text-sm disabled:opacity-50"
                        disabled={page * 20 >= total}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        下一页
                    </button>
                </div>
            </div>
        </>
    );
}
