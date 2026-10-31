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
import { RotateCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
    useTaskConfigListQuery,
    useTaskRecordListQuery,
} from "../../../services";

export default function TaskRewardPage() {
    useDocumentHead({ title: "奖励记录" });

    const [code, setCode] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data: configs = [] } = useTaskConfigListQuery();
    const { data, isLoading, isFetching, refetch } = useTaskRecordListQuery({
        taskCode: code.trim() || undefined,
        rewarded: true,
        page,
        pageSize,
    });

    const configMap = useMemo(() => {
        const map = new Map(configs.map((item) => [item.code, item]));
        return map;
    }, [configs]);

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative max-w-xs flex-1">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索任务编码，如 daily_like..."
                        className="pl-9"
                    />
                </div>
                <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="刷新"
                    disabled={isFetching}
                    onClick={() => refetch()}
                >
                    <RotateCw className={isFetching ? "animate-spin" : undefined} />
                </Button>
                <span className="text-muted-foreground text-sm">共 {total} 条</span>
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
                                <TableHead>用户</TableHead>
                                <TableHead>任务</TableHead>
                                <TableHead>奖励金币</TableHead>
                                <TableHead>进度日期</TableHead>
                                <TableHead>领取时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row) => {
                                    const config = configMap.get(row.taskCode);
                                    return (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-mono text-xs">
                                                {row.userId.slice(0, 8)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-medium">
                                                        {config?.name ?? row.taskCode}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">
                                                        {row.taskCode}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    +{config?.reward ?? 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {row.progressDate ?? "-"}
                                            </TableCell>
                                            <TableCell>
                                                <TimeText
                                                    value={row.rewardedAt}
                                                    format="MM/DD HH:mm"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
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

            <div className="text-muted-foreground flex items-center justify-between text-sm">
                <span>
                    共 {total} 条 · 第 {page} 页
                </span>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        上一页
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page * pageSize >= total}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        下一页
                    </Button>
                </div>
            </div>
        </>
    );
}
