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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { Minus, Pencil, Plus, RotateCw, Search, Trash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
    useDeleteLanguageMutation,
    useLanguageListQuery,
    useSaveLanguageMutation,
} from "../../../services";
import type { LanguagePayload, LanguageRow } from "../../../services";
import { Pager, Pill } from "../promo/shared";

interface LanguageForm {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
    sort: number;
    status: boolean;
}

const EMPTY_FORM: LanguageForm = {
    code: "",
    name: "",
    nativeName: "",
    flag: "",
    sort: 0,
    status: true,
};

function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
    const button =
        "text-foreground flex h-full w-9 shrink-0 cursor-pointer items-center justify-center transition-colors hover:bg-muted active:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-40";
    return (
        <div className="flex h-9 w-full items-stretch overflow-hidden rounded-md border">
            <button
                type="button"
                className={button}
                onClick={() => onChange(Math.max(0, value - 1))}
                disabled={value <= 0}
                aria-label="减少"
            >
                <Minus className="h-4 w-4" />
            </button>
            <input
                type="number"
                className="h-full w-full min-w-0 border-x bg-transparent text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={value}
                min={0}
                onChange={(e) => {
                    const next = Number(e.target.value);
                    onChange(Number.isFinite(next) ? Math.max(0, next) : 0);
                }}
            />
            <button
                type="button"
                className={button}
                onClick={() => onChange(value + 1)}
                aria-label="增加"
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function LanguagePage() {
    useDocumentHead({ title: "语言配置" });

    const { data: languages = [], isLoading, isFetching, refetch } = useLanguageListQuery();
    const save = useSaveLanguageMutation();
    const remove = useDeleteLanguageMutation();

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<LanguageRow | null>(null);
    const [form, setForm] = useState<LanguageForm>(EMPTY_FORM);
    const [deleteTargets, setDeleteTargets] = useState<string[]>([]);

    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        if (!kw) return languages;
        return languages.filter((l) =>
            [l.id, l.code, l.name, l.nativeName ?? ""].some((value) =>
                value.toLowerCase().includes(kw),
            ),
        );
    }, [languages, keyword]);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const pageIds = pageRows.map((l) => l.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    const someSelected = !allSelected && pageIds.some((id) => selected.has(id));
    const selectedIds = [...selected];

    useEffect(() => {
        setSelected((prev) => {
            const existing = new Set(languages.map((l) => l.id));
            const next = new Set([...prev].filter((id) => existing.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [languages]);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setDialogOpen(true);
    };

    const openEdit = (row: LanguageRow) => {
        setEditing(row);
        setForm({
            code: row.code,
            name: row.name,
            nativeName: row.nativeName ?? "",
            flag: row.flag ?? "",
            sort: row.sort ?? 0,
            status: row.status,
        });
        setDialogOpen(true);
    };

    const submit = async () => {
        if (!form.code.trim() || !form.name.trim()) {
            toast.error("请填写语言代码与语言名称");
            return;
        }
        const payload: LanguagePayload = {
            code: form.code.trim(),
            name: form.name.trim(),
            nativeName: form.nativeName.trim() || undefined,
            flag: form.flag.trim() || undefined,
            sort: form.sort || 0,
            status: form.status,
        };
        try {
            await save.mutateAsync({ id: editing?.id, data: payload });
            toast.success(editing ? "保存成功" : "添加成功");
            setDialogOpen(false);
            setEditing(null);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    const confirmDelete = async () => {
        try {
            await Promise.all(deleteTargets.map((id) => remove.mutateAsync(id)));
            toast.success("删除成功");
            setSelected(new Set());
            setDeleteTargets([]);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
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
                    onClick={() => {
                        const row = languages.find((l) => l.id === selectedIds[0]);
                        if (row) openEdit(row);
                    }}
                >
                    <Pencil />
                    编辑
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
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="通过id、code、name模糊搜索"
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
                                <TableHead className="min-w-24">语言代码</TableHead>
                                <TableHead className="min-w-28">语言名称</TableHead>
                                <TableHead className="min-w-28">原生名称</TableHead>
                                <TableHead className="w-20">国旗</TableHead>
                                <TableHead className="w-16">排序</TableHead>
                                <TableHead className="w-20">状态</TableHead>
                                <TableHead className="w-24">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pageRows.length > 0 ? (
                                pageRows.map((row, idx) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={selected.has(row.id) ? "selected" : undefined}
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selected.has(row.id)}
                                                onCheckedChange={() => {
                                                    const next = new Set(selected);
                                                    if (next.has(row.id)) next.delete(row.id);
                                                    else next.add(row.id);
                                                    setSelected(next);
                                                }}
                                                aria-label={`选择 ${row.name}`}
                                            />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {total - (currentPage - 1) * pageSize - idx}
                                        </TableCell>
                                        <TableCell>
                                            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                                                {row.code}
                                            </code>
                                        </TableCell>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell>{row.nativeName || "-"}</TableCell>
                                        <TableCell>
                                            {row.flag ? (
                                                <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                                                    {row.flag}
                                                </span>
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.sort || 0}
                                        </TableCell>
                                        <TableCell>
                                            <Pill tone={row.status ? "green" : "gray"}>
                                                {row.status ? "启用" : "禁用"}
                                            </Pill>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
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
                                                    onClick={() => setDeleteTargets([row.id])}
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

            <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
                <DialogContent className="sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑语言" : "添加语言"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="lang-code">
                                    语言代码 <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="lang-code"
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                                    placeholder="如：en"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lang-name">
                                    语言名称 <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="lang-name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="如：英语"
                                />
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="lang-native">原生名称</Label>
                                <Input
                                    id="lang-native"
                                    value={form.nativeName}
                                    onChange={(e) =>
                                        setForm({ ...form, nativeName: e.target.value })
                                    }
                                    placeholder="如：English"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lang-flag">国旗</Label>
                                <Input
                                    id="lang-flag"
                                    value={form.flag}
                                    onChange={(e) => setForm({ ...form, flag: e.target.value })}
                                    placeholder="如：US / RU / TR"
                                />
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>排序</Label>
                                <Stepper
                                    value={form.sort}
                                    onChange={(value) => setForm({ ...form, sort: value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>状态</Label>
                                <RadioGroup
                                    className="flex h-9 items-center gap-6"
                                    value={form.status ? "enabled" : "disabled"}
                                    onValueChange={(value) =>
                                        setForm({ ...form, status: value === "enabled" })
                                    }
                                >
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="enabled" id="lang-status-enabled" />
                                        <Label htmlFor="lang-status-enabled" className="font-normal">
                                            启用
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="disabled" id="lang-status-disabled" />
                                        <Label htmlFor="lang-status-disabled" className="font-normal">
                                            禁用
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={() => void submit()} loading={save.isPending}>
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                            即将删除 {deleteTargets.length} 条语言配置，删除后不可恢复。
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
