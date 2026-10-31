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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { cn } from "@buildingai/ui/lib/utils";
import { RotateCw, Search } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useCheckinRecordListQuery, useTaskRecordListQuery } from "../../../services";

type TaskRecordsPageProps = {
    defaultTab?: "progress" | "checkin";
};

export default function TaskRecordsPage({ defaultTab }: TaskRecordsPageProps = {}) {
    const [searchParams] = useSearchParams();
    const initialTab =
        defaultTab ?? (searchParams.get("tab") === "checkin" ? "checkin" : "progress");
    useDocumentHead({ title: initialTab === "checkin" ? "签到记录" : "任务进度" });

    return (
        <Tabs defaultValue={initialTab}>
            <TabsList>
                <TabsTrigger value="progress">任务进度</TabsTrigger>
                <TabsTrigger value="checkin">签到记录</TabsTrigger>
            </TabsList>
            <TabsContent value="progress" className="mt-4">
                <TaskProgressTab />
            </TabsContent>
            <TabsContent value="checkin" className="mt-4">
                <CheckinRecordTab />
            </TabsContent>
        </Tabs>
    );
}

export function CheckinRecordsPage() {
    return <TaskRecordsPage defaultTab="checkin" />;
}

function TaskProgressTab() {
    const [code, setCode] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading, isFetching, refetch } = useTaskRecordListQuery({
        taskCode: code.trim() || undefined,
        page,
        pageSize,
    });
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

    const items = data?.items ?? [];

    return (
        <>
            <div className="mb-4 flex items-center gap-3">
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
                    <RotateCw className={cn(isFetching && "animate-spin")} />
                </Button>
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
                                <TableHead>用户ID</TableHead>
                                <TableHead>任务编码</TableHead>
                                <TableHead>进度日期</TableHead>
                                <TableHead>当前进度</TableHead>
                                <TableHead>完成时间</TableHead>
                                <TableHead>领奖时间</TableHead>
                                <TableHead>创建时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>
                                            <span
                                                className="text-muted-foreground font-mono text-xs"
                                                title={r.userId}
                                            >
                                                {r.userId.slice(0, 8)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-xs">{r.taskCode}</span>
                                        </TableCell>
                                        <TableCell>{r.progressDate ?? "-"}</TableCell>
                                        <TableCell className="tabular-nums">{r.progress}</TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={r.completedAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={r.rewardedAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={r.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
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

function CheckinRecordTab() {
    const [userId, setUserId] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading, isFetching, refetch } = useCheckinRecordListQuery({
        userId: userId.trim() || undefined,
        page,
        pageSize,
    });
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

    const items = data?.items ?? [];

    return (
        <>
            <div className="mb-4 flex items-center gap-3">
                <div className="relative max-w-xs flex-1">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={userId}
                        onChange={(e) => {
                            setUserId(e.target.value);
                            setPage(1);
                        }}
                        placeholder="按用户ID精确筛选..."
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
                    <RotateCw className={cn(isFetching && "animate-spin")} />
                </Button>
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
                                <TableHead>用户ID</TableHead>
                                <TableHead>签到日期</TableHead>
                                <TableHead>周期天数</TableHead>
                                <TableHead>发放金币</TableHead>
                                <TableHead>签到时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>
                                            <span
                                                className="text-muted-foreground font-mono text-xs"
                                                title={r.userId}
                                            >
                                                {r.userId.slice(0, 8)}
                                            </span>
                                        </TableCell>
                                        <TableCell>{r.checkinDate}</TableCell>
                                        <TableCell className="tabular-nums">
                                            第 {r.dayNo} 天
                                        </TableCell>
                                        <TableCell className="tabular-nums">{r.coins}</TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={r.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
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

            <div className="mt-4">
                <PaginationComponent className="mx-0 w-fit" />
            </div>
        </>
    );
}
