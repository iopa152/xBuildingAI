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
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Pencil, Plus, RotateCw, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    useCreateFaqMutation,
    useDeleteFaqMutation,
    useFaqListQuery,
    useUpdateFaqMutation,
} from "../../../services";
import type { FaqRow } from "../../../services";

const emptyForm = { question: "", answer: "", sort: "0", status: true };

export default function FaqManagePage() {
    useDocumentHead({ title: "FAQ管理" });

    const { data: faqs = [], isLoading, isFetching, refetch } = useFaqListQuery();
    const create = useCreateFaqMutation();
    const update = useUpdateFaqMutation();
    const remove = useDeleteFaqMutation();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<FaqRow | null>(null);
    const [form, setForm] = useState(emptyForm);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEdit = (row: FaqRow) => {
        setEditing(row);
        setForm({
            question: row.question,
            answer: row.answer,
            sort: String(row.sort ?? 0),
            status: row.status,
        });
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.question.trim() || !form.answer.trim()) {
            toast.error("请填写问题与回答");
            return;
        }
        const payload = {
            question: form.question.trim(),
            answer: form.answer.trim(),
            sort: Number(form.sort) || 0,
            status: form.status,
        };
        try {
            if (editing) await update.mutateAsync({ id: editing.id, data: payload });
            else await create.mutateAsync(payload);
            toast.success(editing ? "保存成功" : "添加成功");
            setFormOpen(false);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

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
                <Button onClick={openCreate}>
                    <Plus />
                    新增问题
                </Button>
                <span className="text-muted-foreground text-sm">共 {faqs.length} 条</span>
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
                                <TableHead className="w-16">排序</TableHead>
                                <TableHead>问题</TableHead>
                                <TableHead>回答</TableHead>
                                <TableHead className="w-20">状态</TableHead>
                                <TableHead className="w-28">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {faqs.length > 0 ? (
                                faqs.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.sort ?? 0}</TableCell>
                                        <TableCell className="max-w-64">
                                            <span className="line-clamp-2 text-sm font-medium">
                                                {row.question}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-md">
                                            <span className="text-muted-foreground line-clamp-2 text-sm">
                                                {row.answer}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={row.status ? "default" : "secondary"}>
                                                {row.status ? "启用" : "停用"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="编辑"
                                                    onClick={() => openEdit(row)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="删除"
                                                    onClick={async () => {
                                                        if (!confirm("确定删除该问题？")) return;
                                                        await remove.mutateAsync(row.id);
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

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑 FAQ" : "新增 FAQ"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>问题</Label>
                            <Input
                                value={form.question}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, question: e.target.value }))
                                }
                                placeholder="请输入问题"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>回答</Label>
                            <Textarea
                                value={form.answer}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, answer: e.target.value }))
                                }
                                placeholder="请输入回答内容"
                                rows={6}
                            />
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="space-y-1.5">
                                <Label>排序（大在前）</Label>
                                <Input
                                    type="number"
                                    value={form.sort}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, sort: e.target.value }))
                                    }
                                    className="w-32"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-5">
                                <Switch
                                    checked={form.status}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({ ...prev, status: checked }))
                                    }
                                />
                                <span className="text-sm">启用</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={save} loading={create.isPending || update.isPending}>
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
