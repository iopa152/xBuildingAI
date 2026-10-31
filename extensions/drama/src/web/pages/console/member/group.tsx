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
    useCreateMemberGroupMutation,
    useDeleteMemberGroupMutation,
    useMemberGroupListQuery,
    useMemberRuleListQuery,
    useUpdateMemberGroupMutation,
} from "../../../services";
import type { MemberGroupRow } from "../../../services";

interface GroupForm {
    name: string;
    rules: string[];
    status: boolean;
    sort: string;
}

const emptyForm: GroupForm = { name: "", rules: [], status: true, sort: "0" };

export default function MemberGroupPage() {
    useDocumentHead({ title: "会员分组管理" });

    const { data: groups = [], isLoading, isFetching, refetch } = useMemberGroupListQuery();
    const { data: rules = [] } = useMemberRuleListQuery();
    const create = useCreateMemberGroupMutation();
    const update = useUpdateMemberGroupMutation();
    const remove = useDeleteMemberGroupMutation();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<MemberGroupRow | null>(null);
    const [form, setForm] = useState<GroupForm>(emptyForm);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEdit = (row: MemberGroupRow) => {
        setEditing(row);
        setForm({
            name: row.name,
            rules: row.rules ?? [],
            status: row.status,
            sort: String(row.sort),
        });
        setFormOpen(true);
    };

    const toggleRule = (id: string) => {
        setForm((prev) => ({
            ...prev,
            rules: prev.rules.includes(id)
                ? prev.rules.filter((r) => r !== id)
                : [...prev.rules, id],
        }));
    };

    const save = async () => {
        if (!form.name.trim()) {
            toast.error("请填写组别名称");
            return;
        }
        const payload = {
            name: form.name.trim(),
            rules: form.rules,
            status: form.status,
            sort: Number(form.sort) || 0,
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

    const askDelete = async (row: MemberGroupRow) => {
        if (!confirm(`确定删除分组「${row.name}」吗？`)) return;
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
                    添加分组
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
                                <TableHead>组别名称</TableHead>
                                <TableHead>权限数量</TableHead>
                                <TableHead>排序</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>更新时间</TableHead>
                                <TableHead>创建时间</TableHead>
                                <TableHead className="w-28">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groups.length > 0 ? (
                                groups.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell className="tabular-nums">
                                            {(row.rules ?? []).length}
                                        </TableCell>
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
                                                    aria-label={`编辑 ${row.name}`}
                                                    onClick={() => openEdit(row)}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="destructive"
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                    aria-label={`删除 ${row.name}`}
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
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        暂无会员分组
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="text-muted-foreground mt-4 text-sm">共 {groups.length} 条</div>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[560px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑会员分组" : "添加会员分组"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-[120px_1fr] items-start gap-x-3 gap-y-[18px]">
                        <Label htmlFor="group-name" className="mt-2 justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            组别名称
                        </Label>
                        <Input
                            id="group-name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="请输入组别名称"
                        />

                        <Label className="mt-1 justify-end font-normal">权限规则</Label>
                        <div className="max-h-56 overflow-y-auto rounded-md border p-2">
                            {rules.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {rules.map((rule) => (
                                        <label
                                            key={rule.id}
                                            className="flex cursor-pointer items-center gap-2 text-sm"
                                        >
                                            <Checkbox
                                                checked={form.rules.includes(rule.id)}
                                                onCheckedChange={() => toggleRule(rule.id)}
                                            />
                                            {rule.title}
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground py-2 text-sm">
                                    暂无规则，请先在会员规则管理中创建
                                </p>
                            )}
                        </div>

                        <Label htmlFor="group-sort" className="mt-2 justify-end font-normal">
                            排序
                        </Label>
                        <Input
                            id="group-sort"
                            value={form.sort}
                            inputMode="numeric"
                            onChange={(e) => setForm({ ...form, sort: e.target.value })}
                            placeholder="数字越小越靠前"
                        />

                        <Label className="mt-1 justify-end font-normal">状态</Label>
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
