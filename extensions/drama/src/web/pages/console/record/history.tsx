import { useDocumentHead } from "@buildingai/hooks";
import { cn } from "@buildingai/ui/lib/utils";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
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
import { Flame, RotateCw, Search, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useBatchDeleteHistoryMutation,
    useDeleteHistoryMutation,
    useWatchHistoryListQuery,
    useWatchHistoryStatsQuery,
} from "../../../services";
import { Pager, Pill } from "../promo/shared";
import {
    DeleteConfirmDialog,
    DramaCell,
    formatClock,
    RankingDialog,
    StatCards,
    UserCell,
} from "./shared";

function progressPercent(progress: number, duration: number) {
    if (!duration) return 0;
    return Math.min(100, Math.round((progress / duration) * 100));
}

export default function WatchHistoryPage() {
    useDocumentHead({ title: "观看历史" });

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
    const [rankOpen, setRankOpen] = useState(false);

    const {
        data,
        isLoading,
        isFetching,
        refetch,
    } = useWatchHistoryListQuery({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
    });
    const { data: stats, refetch: refetchStats } = useWatchHistoryStatsQuery();
    const deleteOne = useDeleteHistoryMutation();
    const deleteBatch = useBatchDeleteHistoryMutation();

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const pageIds = items.map((r) => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    const someSelected = !allSelected && pageIds.some((id) => selected.has(id));
    const selectedIds = [...selected];

    useEffect(() => {
        setSelected((prev) => {
            const existing = new Set(items.map((r) => r.id));
            const next = new Set([...prev].filter((id) => existing.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [items]);

    const confirmDelete = async () => {
        try {
            if (deleteTargets.length === 1) {
                await deleteOne.mutateAsync(deleteTargets[0]);
            } else {
                await deleteBatch.mutateAsync(deleteTargets);
            }
            toast.success("删除成功");
            setSelected(new Set());
            setDeleteTargets([]);
            refetch();
            refetchStats();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    return (
        <>
            <StatCards
                items={[
                    { label: "观看记录总数", value: stats?.total ?? 0 },
                    { label: "总时长(小时)", value: stats?.totalHours ?? 0 },
                    { label: "完成观看数", value: stats?.completed ?? 0 },
                    { label: "今日观看", value: stats?.today ?? 0 },
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
                <Button
                    variant="destructive"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-destructive/60 disabled:text-white/50 disabled:opacity-100 dark:bg-destructive dark:hover:bg-destructive/90 dark:disabled:bg-destructive/60"
                    disabled={selected.size === 0}
                    onClick={() => setDeleteTargets(selectedIds)}
                >
                    <Trash />
                    删除
                </Button>
                <Button variant="outline" onClick={() => setRankOpen(true)}>
                    <Flame />
                    热门观看排行
                </Button>
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索用户昵称或短剧标题"
                        className="pl-9"
                    />
                </div>
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
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={
                                            allSelected
                                                ? true
                                                : someSelected
                                                  ? "indeterminate"
                                                  : false
                                        }
                                        onCheckedChange={(checked) => {
                                            const next = new Set(selected);
                                            if (checked) pageIds.forEach((id) => next.add(id));
                                            else pageIds.forEach((id) => next.delete(id));
                                            setSelected(next);
                                        }}
                                        aria-label="全选"
                                    />
                                </TableHead>
                                <TableHead className="w-14">ID</TableHead>
                                <TableHead className="min-w-32">用户昵称</TableHead>
                                <TableHead className="min-w-44">短剧标题</TableHead>
                                <TableHead className="w-20">第几集</TableHead>
                                <TableHead className="min-w-32">观看进度</TableHead>
                                <TableHead className="w-20">进度</TableHead>
                                <TableHead className="w-24">是否完成</TableHead>
                                <TableHead className="min-w-36">最后观看时间</TableHead>
                                <TableHead className="w-20">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((r, idx) => {
                                    const percent = progressPercent(
                                        r.progressSeconds,
                                        r.duration,
                                    );
                                    return (
                                        <TableRow
                                            key={r.id}
                                            data-state={
                                                selected.has(r.id) ? "selected" : undefined
                                            }
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={selected.has(r.id)}
                                                    onCheckedChange={() => {
                                                        const next = new Set(selected);
                                                        if (next.has(r.id)) next.delete(r.id);
                                                        else next.add(r.id);
                                                        setSelected(next);
                                                    }}
                                                    aria-label="选择记录"
                                                />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground tabular-nums">
                                                {total - (page - 1) * pageSize - idx}
                                            </TableCell>
                                            <TableCell>
                                                <UserCell
                                                    nickname={r.userNickname}
                                                    avatar={r.userAvatar}
                                                    userId={r.userId}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <DramaCell
                                                    cover={r.drama?.coverVertical}
                                                    title={r.drama?.title}
                                                    id={r.dramaId}
                                                />
                                            </TableCell>
                                            <TableCell>EP.{r.episodeNo}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm tabular-nums">
                                                {formatClock(r.progressSeconds)} /{" "}
                                                {formatClock(r.duration)}
                                            </TableCell>
                                            <TableCell>
                                                <Pill tone={percent >= 95 ? "green" : "blue"}>
                                                    {percent}%
                                                </Pill>
                                            </TableCell>
                                            <TableCell>
                                                <Pill
                                                    tone={percent >= 95 ? "green" : "gray"}
                                                >
                                                    {percent >= 95 ? "已完成" : "未完成"}
                                                </Pill>
                                            </TableCell>
                                            <TableCell>
                                                <TimeText
                                                    value={r.updatedAt}
                                                    format="YYYY-MM-DD HH:mm:ss"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="icon-sm"
                                                    variant="destructive"
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                    aria-label="删除记录"
                                                    onClick={() => setDeleteTargets([r.id])}
                                                >
                                                    <Trash />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">
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

            <DeleteConfirmDialog
                open={deleteTargets.length > 0}
                count={deleteTargets.length}
                onOpenChange={(open) => {
                    if (!open) setDeleteTargets([]);
                }}
                onConfirm={() => void confirmDelete()}
            />

            <RankingDialog
                open={rankOpen}
                onOpenChange={setRankOpen}
                title="热门观看排行"
                items={stats?.topDramas ?? []}
            />
        </>
    );
}
