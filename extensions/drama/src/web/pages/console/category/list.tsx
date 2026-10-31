import { useDocumentHead } from "@buildingai/hooks";
import { cn } from "@buildingai/ui/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@buildingai/ui/components/ui/alert-dialog";
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
import { Pencil, Plus, RotateCw, Search, Trash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
    useBatchDeleteCategoriesMutation,
    useCategoryListQuery,
    useDeleteCategoryMutation,
    useLanguageListQuery,
} from "../../../services";
import { Pager, Pill } from "../promo/shared";
import CategoryEditDialog from "./edit";

export default function CategoryListPage() {
    useDocumentHead({
        title: "短剧分类",
    });

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);

    const {
        data: categories = [],
        isLoading,
        isFetching,
        refetch,
    } = useCategoryListQuery({ keyword: keyword.trim() || undefined });
    const { data: languages = [] } = useLanguageListQuery();
    const deleteMutation = useDeleteCategoryMutation();
    const batchDeleteMutation = useBatchDeleteCategoriesMutation();

    const languageName = useMemo(() => {
        const map = new Map(languages.map((l) => [l.code, l.name]));
        return (code: string) => map.get(code) ?? code;
    }, [languages]);

    const total = categories.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageRows = categories.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );
    const pageIds = pageRows.map((c) => c.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    const someSelected = !allSelected && pageIds.some((id) => selected.has(id));
    const selectedIds = [...selected];

    useEffect(() => {
        setSelected((prev) => {
            const existing = new Set(categories.map((c) => c.id));
            const next = new Set([...prev].filter((id) => existing.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [categories]);

    const openCreate = () => {
        setEditingId(null);
        setEditDialogOpen(true);
    };

    const openEdit = (id: string) => {
        setEditingId(id);
        setEditDialogOpen(true);
    };

    const askDelete = (ids: string[]) => {
        if (!ids.length) return;
        setDeleteTargets(ids);
    };

    const confirmDelete = async () => {
        try {
            if (deleteTargets.length === 1) {
                await deleteMutation.mutateAsync(deleteTargets[0]);
            } else {
                await batchDeleteMutation.mutateAsync(deleteTargets);
            }
            toast.success("删除成功");
            setSelected(new Set());
            setDeleteTargets([]);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    const handleDialogClose = (shouldRefresh?: boolean) => {
        setEditDialogOpen(false);
        setEditingId(null);
        if (shouldRefresh) {
            refetch();
        }
    };

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="icon-sm" aria-label="刷新" onClick={() => refetch()}>
                    <RotateCw className={cn(isFetching && "animate-spin")} />
                </Button>
                <Button onClick={openCreate}>
                    <Plus />
                    添加
                </Button>
                <Button
                    disabled={selected.size !== 1}
                    onClick={() => selectedIds[0] && openEdit(selectedIds[0])}
                >
                    <Pencil />
                    编辑
                </Button>
                <Button
                    variant="destructive"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-destructive/60 disabled:text-white/50 disabled:opacity-100 dark:bg-destructive dark:hover:bg-destructive/90 dark:disabled:bg-destructive/60"
                    disabled={selected.size === 0}
                    onClick={() => askDelete(selectedIds)}
                >
                    <Trash />
                    删除
                </Button>
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="通过ID、名称、标识模糊搜索"
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
                                <TableHead className="min-w-32">URL标识</TableHead>
                                <TableHead className="min-w-32">分类名称</TableHead>
                                <TableHead className="w-16">图标</TableHead>
                                <TableHead className="min-w-24">语言</TableHead>
                                <TableHead className="w-16">排序</TableHead>
                                <TableHead className="w-20">状态</TableHead>
                                <TableHead className="w-24">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pageRows.length > 0 ? (
                                pageRows.map((category, idx) => (
                                    <TableRow
                                        key={category.id}
                                        data-state={
                                            selected.has(category.id) ? "selected" : undefined
                                        }
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selected.has(category.id)}
                                                onCheckedChange={() => {
                                                    const next = new Set(selected);
                                                    if (next.has(category.id)) next.delete(category.id);
                                                    else next.add(category.id);
                                                    setSelected(next);
                                                }}
                                                aria-label={`选择 ${category.name}`}
                                            />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {total - (currentPage - 1) * pageSize - idx}
                                        </TableCell>
                                        <TableCell>
                                            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                                                {category.code}
                                            </code>
                                        </TableCell>
                                        <TableCell className="font-medium">{category.name}</TableCell>
                                        <TableCell>
                                            <span className="text-lg">{category.icon || "-"}</span>
                                        </TableCell>
                                        <TableCell>{languageName(category.language)}</TableCell>
                                        <TableCell className="tabular-nums">
                                            {category.sort || 0}
                                        </TableCell>
                                        <TableCell>
                                            <Pill tone={category.status ? "green" : "gray"}>
                                                {category.status ? "显示" : "隐藏"}
                                            </Pill>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    size="icon-sm"
                                                    aria-label={`编辑 ${category.name}`}
                                                    onClick={() => openEdit(category.id)}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="destructive"
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                    aria-label={`删除 ${category.name}`}
                                                    onClick={() => askDelete([category.id])}
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
                                        暂无数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Pager
                page={currentPage}
                pageSize={pageSize}
                total={total}
                onPage={setPage}
                onPageSize={setPageSize}
            />

            <CategoryEditDialog
                open={editDialogOpen}
                id={editingId}
                onClose={handleDialogClose}
            />

            <AlertDialog
                open={deleteTargets.length > 0}
                onOpenChange={(open) => {
                    if (!open) setDeleteTargets([]);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确定删除选中记录?</AlertDialogTitle>
                        <AlertDialogDescription>
                            即将删除 {deleteTargets.length} 条分类记录，删除后不可恢复。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void confirmDelete()}
                        >
                            确定
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
