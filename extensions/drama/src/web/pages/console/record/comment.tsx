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
import { Check, RotateCw, Search, Trash, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useBatchCommentStatusMutation,
    useBatchDeleteCommentsMutation,
    useCommentListQuery,
    useCommentStatsQuery,
    useDeleteCommentMutation,
} from "../../../services";
import { Pager, Pill } from "../promo/shared";
import { DeleteConfirmDialog, StatCards, UserCell } from "./shared";

const STATUS_LABEL: Record<string, string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已拒绝",
};

export default function CommentManagePage() {
    useDocumentHead({ title: "评论管理" });

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);

    const { data, isLoading, isFetching, refetch } = useCommentListQuery({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
    });
    const { data: stats, refetch: refetchStats } = useCommentStatsQuery();
    const deleteOne = useDeleteCommentMutation();
    const deleteBatch = useBatchDeleteCommentsMutation();
    const batchStatus = useBatchCommentStatusMutation();

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const pageIds = items.map((c) => c.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    const someSelected = !allSelected && pageIds.some((id) => selected.has(id));
    const selectedIds = [...selected];

    useEffect(() => {
        setSelected((prev) => {
            const existing = new Set(items.map((c) => c.id));
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

    const setStatus = async (status: "approved" | "rejected") => {
        try {
            await batchStatus.mutateAsync({ ids: selectedIds, status });
            toast.success(status === "approved" ? "已通过" : "已拒绝");
            setSelected(new Set());
            refetch();
            refetchStats();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    return (
        <>
            <StatCards
                columns={5}
                items={[
                    { label: "评论总数", value: stats?.total ?? 0 },
                    { label: "今日新增", value: stats?.today ?? 0 },
                    { label: "待审核", value: stats?.pending ?? 0 },
                    { label: "已通过", value: stats?.approved ?? 0 },
                    { label: "已拒绝", value: stats?.rejected ?? 0 },
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
                <Button
                    variant="outline"
                    disabled={selected.size === 0}
                    onClick={() => void setStatus("approved")}
                >
                    <Check className="text-emerald-600" />
                    批量通过
                </Button>
                <Button
                    variant="outline"
                    disabled={selected.size === 0}
                    onClick={() => void setStatus("rejected")}
                >
                    <X className="text-destructive" />
                    批量拒绝
                </Button>
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索评论内容、用户或短剧"
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
                                <TableHead className="min-w-40">短剧标题</TableHead>
                                <TableHead className="w-20">集数</TableHead>
                                <TableHead className="min-w-56">评论内容</TableHead>
                                <TableHead className="w-16">点赞</TableHead>
                                <TableHead className="w-16">回复</TableHead>
                                <TableHead className="w-24">状态</TableHead>
                                <TableHead className="min-w-36">评论时间</TableHead>
                                <TableHead className="w-20">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((c, idx) => (
                                    <TableRow
                                        key={c.id}
                                        data-state={selected.has(c.id) ? "selected" : undefined}
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selected.has(c.id)}
                                                onCheckedChange={() => {
                                                    const next = new Set(selected);
                                                    if (next.has(c.id)) next.delete(c.id);
                                                    else next.add(c.id);
                                                    setSelected(next);
                                                }}
                                                aria-label="选择评论"
                                            />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {total - (page - 1) * pageSize - idx}
                                        </TableCell>
                                        <TableCell>
                                            <UserCell
                                                nickname={c.userNickname ?? c.user?.nickname}
                                                avatar={c.userAvatar ?? c.user?.avatar}
                                                userId={c.userId}
                                            />
                                        </TableCell>
                                        <TableCell className="max-w-48 truncate">
                                            {c.dramaTitle ?? c.drama?.title ?? "-"}
                                        </TableCell>
                                        <TableCell>
                                            {c.episodeNo ? `EP.${c.episodeNo}` : "-"}
                                        </TableCell>
                                        <TableCell className="max-w-72">
                                            <span className="line-clamp-2 text-sm">{c.content}</span>
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {c.likeCount ?? 0}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {c.replyCount ?? 0}
                                        </TableCell>
                                        <TableCell>
                                            <Pill
                                                tone={
                                                    c.status === "approved"
                                                        ? "green"
                                                        : c.status === "pending"
                                                          ? "amber"
                                                          : "red"
                                                }
                                            >
                                                {STATUS_LABEL[c.status] ?? c.status}
                                            </Pill>
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={c.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="icon-sm"
                                                variant="destructive"
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                aria-label="删除评论"
                                                onClick={() => setDeleteTargets([c.id])}
                                            >
                                                <Trash />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center">
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
        </>
    );
}
