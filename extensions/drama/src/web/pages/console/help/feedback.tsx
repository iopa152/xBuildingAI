import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Label } from "@buildingai/ui/components/ui/label";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { Check, RotateCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useFeedbackListQuery, useResolveFeedbackMutation } from "../../../services";
import type { FeedbackRow } from "../../../services";

export default function FeedbackManagePage() {
    useDocumentHead({ title: "用户反馈" });

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [page, setPage] = useState(1);
    const { data, isLoading, isFetching, refetch } = useFeedbackListQuery({
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
    });
    const resolve = useResolveFeedbackMutation();

    const [target, setTarget] = useState<FeedbackRow | null>(null);
    const [reply, setReply] = useState("");

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    const openResolve = (row: FeedbackRow) => {
        setTarget(row);
        setReply(row.reply ?? "");
    };

    const submitResolve = async () => {
        if (!target) return;
        try {
            await resolve.mutateAsync({ id: target.id, reply: reply.trim() || undefined });
            toast.success("已处理");
            setTarget(null);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                {[
                    { key: "all", label: "全部" },
                    { key: "open", label: "待处理" },
                    { key: "resolved", label: "已处理" },
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
                <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="刷新"
                    disabled={isFetching}
                    onClick={() => refetch()}
                >
                    <RotateCw className={isFetching ? "animate-spin" : undefined} />
                </Button>
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
                                <TableHead>反馈内容</TableHead>
                                <TableHead>联系方式</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>时间</TableHead>
                                <TableHead className="w-24">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-mono text-xs">
                                            {row.userId.slice(0, 8)}
                                        </TableCell>
                                        <TableCell className="max-w-md">
                                            <div className="space-y-1">
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {row.content}
                                                </p>
                                                {row.reply && (
                                                    <p className="text-muted-foreground text-xs">
                                                        回复：{row.reply}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {row.contact || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    row.status === "resolved"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {row.status === "resolved" ? "已处理" : "待处理"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={row.createdAt}
                                                format="MM/DD HH:mm"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="处理"
                                                disabled={row.status === "resolved"}
                                                onClick={() => openResolve(row)}
                                            >
                                                <Check className="h-4 w-4 text-green-600" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
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
                        disabled={page * 20 >= total}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        下一页
                    </Button>
                </div>
            </div>

            <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>处理用户反馈</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
                            {target?.content}
                        </div>
                        <div className="space-y-1.5">
                            <Label>处理备注（可选）</Label>
                            <Textarea
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                placeholder="填写处理结果或给用户的回复"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTarget(null)}>
                            取消
                        </Button>
                        <Button onClick={submitResolve} loading={resolve.isPending}>
                            标记已处理
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
