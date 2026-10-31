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
    useCreateMallCategoryMutation,
    useDeleteMallCategoryMutation,
    useMallCategoryListQuery,
    useUpdateMallCategoryMutation,
} from "../../../services";
import type { MallCategoryRow } from "../../../services";

interface CategoryForm {
    name: string;
    icon: string;
    languageCode: string;
    allRegion: boolean;
    status: boolean;
    sort: string;
}

const emptyForm: CategoryForm = {
    name: "",
    icon: "",
    languageCode: "en",
    allRegion: false,
    status: true,
    sort: "0",
};

export default function MallCategoryPage() {
    useDocumentHead({ title: "商城分类" });

    const { data: categories = [], isLoading, isFetching, refetch } = useMallCategoryListQuery();
    const create = useCreateMallCategoryMutation();
    const update = useUpdateMallCategoryMutation();
    const remove = useDeleteMallCategoryMutation();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<MallCategoryRow | null>(null);
    const [form, setForm] = useState<CategoryForm>(emptyForm);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEdit = (row: MallCategoryRow) => {
        setEditing(row);
        setForm({
            name: row.name,
            icon: row.icon ?? "",
            languageCode: row.languageCode || "en",
            allRegion: row.allRegion,
            status: row.status,
            sort: String(row.sort),
        });
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.name.trim()) {
            toast.error("请填写分类名称");
            return;
        }
        const payload = {
            name: form.name.trim(),
            icon: form.icon.trim(),
            languageCode: form.languageCode.trim() || "en",
            allRegion: form.allRegion,
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

    const askDelete = async (row: MallCategoryRow) => {
        if (!confirm(`确定删除分类「${row.name}」吗？`)) return;
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
                    添加分类
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
                                <TableHead>分类名称</TableHead>
                                <TableHead>图标</TableHead>
                                <TableHead>语言地区</TableHead>
                                <TableHead>全地区展示</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>排序</TableHead>
                                <TableHead>更新时间</TableHead>
                                <TableHead className="w-28">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.length > 0 ? (
                                categories.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell className="max-w-40 truncate text-xs">
                                            {row.icon || "-"}
                                        </TableCell>
                                        <TableCell>{row.languageCode}</TableCell>
                                        <TableCell>{row.allRegion ? "是" : "否"}</TableCell>
                                        <TableCell>
                                            {row.status ? (
                                                <span className="text-emerald-600">启用</span>
                                            ) : (
                                                <span className="text-muted-foreground">禁用</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="tabular-nums">{row.sort}</TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={row.updatedAt}
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
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        暂无商城分类
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="text-muted-foreground mt-4 text-sm">共 {categories.length} 条</div>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[520px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑商城分类" : "添加商城分类"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-[100px_1fr] items-center gap-x-3 gap-y-[18px]">
                        <Label htmlFor="mall-cat-name" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            分类名称
                        </Label>
                        <Input
                            id="mall-cat-name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="请输入分类名称"
                        />

                        <Label htmlFor="mall-cat-icon" className="justify-end font-normal">
                            图标
                        </Label>
                        <Input
                            id="mall-cat-icon"
                            value={form.icon}
                            onChange={(e) => setForm({ ...form, icon: e.target.value })}
                            placeholder="图标 URL 或名称"
                        />

                        <Label htmlFor="mall-cat-lang" className="justify-end font-normal">
                            语言地区
                        </Label>
                        <Input
                            id="mall-cat-lang"
                            value={form.languageCode}
                            onChange={(e) => setForm({ ...form, languageCode: e.target.value })}
                            placeholder="例如 en / zh-CN"
                        />

                        <Label htmlFor="mall-cat-sort" className="justify-end font-normal">
                            排序
                        </Label>
                        <Input
                            id="mall-cat-sort"
                            value={form.sort}
                            inputMode="numeric"
                            onChange={(e) => setForm({ ...form, sort: e.target.value })}
                        />

                        <Label className="justify-end font-normal">展示设置</Label>
                        <div className="flex items-center gap-4 text-sm">
                            <label className="flex cursor-pointer items-center gap-2">
                                <Checkbox
                                    checked={form.allRegion}
                                    onCheckedChange={(checked) =>
                                        setForm({ ...form, allRegion: checked === true })
                                    }
                                />
                                全地区展示
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
                                <Checkbox
                                    checked={form.status}
                                    onCheckedChange={(checked) =>
                                        setForm({ ...form, status: checked === true })
                                    }
                                />
                                启用
                            </label>
                        </div>
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
