import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { Pencil, Plus, RotateCw, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    useCreateMemberRuleMutation,
    useDeleteMemberRuleMutation,
    useMemberRuleListQuery,
    useUpdateMemberRuleMutation,
} from "../../../services";
import type { MemberRuleRow } from "../../../services";

interface RuleForm {
    title: string;
    path: string;
    icon: string;
    sort: string;
    status: boolean;
}

const emptyForm: RuleForm = { title: "", path: "", icon: "", sort: "0", status: true };

export default function MemberRulePage() {
    useDocumentHead({ title: "会员规则管理" });

    const { data: rules = [], isLoading, isFetching, refetch } = useMemberRuleListQuery();
    const create = useCreateMemberRuleMutation();
    const update = useUpdateMemberRuleMutation();
    const remove = useDeleteMemberRuleMutation();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<MemberRuleRow | null>(null);
    const [form, setForm] = useState<RuleForm>(emptyForm);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEdit = (row: MemberRuleRow) => {
        setEditing(row);
        setForm({
            title: row.title,
            path: row.path ?? "",
            icon: row.icon ?? "",
            sort: String(row.sort),
            status: row.status,
        });
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.title.trim()) {
            toast.error("请填写规则标题");
            return;
        }
        const payload = {
            title: form.title.trim(),
            path: form.path.trim(),
            icon: form.icon.trim(),
            sort: Number(form.sort) || 0,
            status: form.status,
        };
        try {
            if (editing) await update.mutateAsync({ id: editing.id, data: payload });
            else await create.mutateAsync(payload);
            toast.success(editing ? "保存成功" : "添加成功");
            setFormOpen(false);
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    const askDelete = async (row: MemberRuleRow) => {
        if (!confirm(`确定删除规则「${row.title}」吗？`)) return;
        try {
            await remove.mutateAsync(row.id);
            toast.success("删除成功");
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
                    添加规则
                </Button>
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
                                <TableHead className="w-16">ID</TableHead>
                                <TableHead>规则标题</TableHead>
                                <TableHead>路由/标识</TableHead>
                                <TableHead>图标</TableHead>
                                <TableHead>排序</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>更新时间</TableHead>
                                <TableHead>创建时间</TableHead>
                                <TableHead className="w-28">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.length > 0 ? (
                                rules.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className="font-medium">{row.title}</TableCell>
                                        <TableCell>
                                            {row.path ? (
                                                <code className="bg-muted rounded px-1 py-0.5 text-xs">
                                                    {row.path}
                                                </code>
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        <TableCell>{row.icon || "-"}</TableCell>
                                        <TableCell className="tabular-nums">{row.sort}</TableCell>
                                        <TableCell>
                                            {row.status ? (
                                                <span className="text-emerald-600">启用</span>
                                            ) : (
                                                <span className="text-muted-foreground">禁用</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={row.updatedAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={row.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="icon-sm"
                                                    aria-label={`编辑 ${row.title}`}
                                                    onClick={() => openEdit(row)}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="destructive"
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                    aria-label={`删除 ${row.title}`}
                                                    onClick={() => askDelete(row)}
                                                >
                                                    <Trash />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        暂无会员规则
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="text-muted-foreground mt-4 text-sm">共 {rules.length} 条</div>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[520px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑会员规则" : "添加会员规则"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-[100px_1fr] items-center gap-x-3 gap-y-[18px]">
                        <Label htmlFor="rule-title" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            标题
                        </Label>
                        <Input
                            id="rule-title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="例如：会员中心"
                        />

                        <Label htmlFor="rule-path" className="justify-end font-normal">
                            路由/标识
                        </Label>
                        <Input
                            id="rule-path"
                            value={form.path}
                            onChange={(e) => setForm({ ...form, path: e.target.value })}
                            placeholder="例如：/pages/member/index"
                        />

                        <Label htmlFor="rule-icon" className="justify-end font-normal">
                            图标
                        </Label>
                        <Input
                            id="rule-icon"
                            value={form.icon}
                            onChange={(e) => setForm({ ...form, icon: e.target.value })}
                            placeholder="图标名称，可留空"
                        />

                        <Label htmlFor="rule-sort" className="justify-end font-normal">
                            排序
                        </Label>
                        <Input
                            id="rule-sort"
                            value={form.sort}
                            inputMode="numeric"
                            onChange={(e) => setForm({ ...form, sort: e.target.value })}
                            placeholder="数字越小越靠前"
                        />

                        <Label className="justify-end font-normal">状态</Label>
                        <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                                checked={form.status}
                                onCheckedChange={(checked) =>
                                    setForm({ ...form, status: checked === true })
                                }
                            />
                            启用
                        </label>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={save} disabled={create.isPending || update.isPending}>
                            确定
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
