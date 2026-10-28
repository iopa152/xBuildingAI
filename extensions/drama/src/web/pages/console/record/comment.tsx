import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
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
import { Check, Trash, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    useCommentListQuery,
    useDeleteCommentMutation,
    useSetCommentStatusMutation,
} from "../../../services";

export default function CommentManagePage() {
    useDocumentHead({ title: "评论管理" });
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [page, setPage] = useState(1);

    const { data, isLoading, refetch } = useCommentListQuery({
        page,
        pageSize: 20,
        status: statusFilter !== "all" ? statusFilter : undefined,
    });
    const setStatus = useSetCommentStatusMutation();
    const remove = useDeleteCommentMutation();

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    return (
        <>
            <div className="mb-4 flex items-center gap-2">
                {[
                    { key: "all", label: "全部" },
                    { key: "approved", label: "已过审" },
                    { key: "pending", label: "待审核" },
                    { key: "rejected", label: "已拒绝" },
                ].map((f) => (
                    <Button
                        key={f.key}
                        size="sm"
                        variant={statusFilter === f.key ? "default" : "outline"}
                        onClick={() => {
                            setStatusFilter(f.key);
                            setPage(1);
                        }}
                    >
                        {f.label}
                    </Button>
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
                                <TableHead>用户</TableHead>
                                <TableHead>内容</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>时间</TableHead>
                                <TableHead className="w-28">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {c.user?.avatar && (
                                                    <img
                                                        src={c.user.avatar}
                                                        alt=""
                                                        className="h-6 w-6 rounded-full"
                                                    />
                                                )}
                                                <span className="text-sm">
                                                    {c.user?.nickname ?? c.userId.slice(0, 8)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-md">
                                            <span className="line-clamp-2 text-sm">{c.content}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    c.status === "approved"
                                                        ? "default"
                                                        : c.status === "pending"
                                                          ? "secondary"
                                                          : "destructive"
                                                }
                                            >
                                                {c.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <TimeText value={c.createdAt} format="MM/DD HH:mm" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="通过"
                                                    onClick={async () => {
                                                        await setStatus.mutateAsync({
                                                            id: c.id,
                                                            status: "approved",
                                                        });
                                                        toast.success("已通过");
                                                        refetch();
                                                    }}
                                                >
                                                    <Check className="h-4 w-4 text-green-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="拒绝"
                                                    onClick={async () => {
                                                        await setStatus.mutateAsync({
                                                            id: c.id,
                                                            status: "rejected",
                                                        });
                                                        toast.success("已拒绝");
                                                        refetch();
                                                    }}
                                                >
                                                    <X className="h-4 w-4 text-orange-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="删除"
                                                    onClick={async () => {
                                                        if (!confirm("确定删除该评论？")) return;
                                                        await remove.mutateAsync(c.id);
                                                        toast.success("已删除");
                                                        refetch();
                                                    }}
                                                >
                                                    <Trash className="text-destructive h-4 w-4" />
                                                </Button>
                                            </div>
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

            <div className="text-muted-foreground flex items-center justify-between text-sm">
                <span>共 {total} 条 · 第 {page} 页</span>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        上一页
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page * 20 >= total}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        下一页
                    </Button>
                </div>
            </div>
        </>
    );
}
