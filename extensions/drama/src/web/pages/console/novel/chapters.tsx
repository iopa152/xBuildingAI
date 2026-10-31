import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
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
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { ArrowLeft, Import, Pencil, Plus, RotateCw, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useCreateNovelChapterMutation,
    useDeleteNovelChapterMutation,
    useImportNovelChaptersMutation,
    useNovelChapterContentQuery,
    useNovelChapterListQuery,
    useUpdateNovelChapterMutation,
    type NovelChapterRow,
} from "../../../services";

interface ChapterForm {
    chapterNo: string;
    title: string;
    content: string;
    isFree: boolean;
    coinPrice: string;
}

const emptyForm: ChapterForm = {
    chapterNo: "",
    title: "",
    content: "",
    isFree: false,
    coinPrice: "0",
};

export default function NovelChaptersPage() {
    useDocumentHead({ title: "章节管理" });

    const [novelId, setNovelId] = useState("");
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("novelId") ?? "";
        setNovelId(id);
    }, []);

    const { data: chapters = [], isLoading, isFetching, refetch } =
        useNovelChapterListQuery(novelId || undefined);
    const create = useCreateNovelChapterMutation();
    const update = useUpdateNovelChapterMutation();
    const remove = useDeleteNovelChapterMutation();
    const importChapters = useImportNovelChaptersMutation();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<NovelChapterRow | null>(null);
    const [form, setForm] = useState<ChapterForm>(emptyForm);
    const [contentId, setContentId] = useState<string | null>(null);
    const { data: contentData } = useNovelChapterContentQuery(contentId);

    const [importOpen, setImportOpen] = useState(false);
    const [importRaw, setImportRaw] = useState("");

    const back = () => {
        window.location.href = "/console/apps/drama/console/novel/list";
    };

    const openCreate = () => {
        setEditing(null);
        const next =
            chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapterNo)) + 1 : 1;
        setForm({ ...emptyForm, chapterNo: String(next) });
        setFormOpen(true);
    };

    const openEdit = async (row: NovelChapterRow) => {
        setEditing(row);
        setForm({
            chapterNo: String(row.chapterNo),
            title: row.title,
            content: "",
            isFree: row.isFree,
            coinPrice: String(row.coinPrice),
        });
        setFormOpen(true);
        setContentId(row.id);
    };

    // hydrate the textarea once the full body arrives
    useEffect(() => {
        if (editing && contentData && contentData.id === editing.id) {
            setForm((f) => ({ ...f, content: contentData.content }));
        }
    }, [contentData, editing]);

    const save = async () => {
        if (!form.title.trim()) {
            toast.error("请填写章节标题");
            return;
        }
        const payload: Record<string, unknown> = {
            chapterNo: Number(form.chapterNo) || undefined,
            title: form.title.trim(),
            isFree: form.isFree,
            coinPrice: Number(form.coinPrice) || 0,
        };
        if (form.content.trim()) payload.content = form.content;
        try {
            if (editing) await update.mutateAsync({ id: editing.id, data: payload });
            else await create.mutateAsync({ ...payload, novelId });
            toast.success(editing ? "保存成功" : "添加成功");
            setFormOpen(false);
            setContentId(null);
        } catch {
            // http client shows the error
        }
    };

    const askDelete = async (row: NovelChapterRow) => {
        if (!confirm(`确定删除第 ${row.chapterNo} 章「${row.title}」吗？`)) return;
        try {
            await remove.mutateAsync(row.id);
            toast.success("删除成功");
        } catch {
            // http client shows the error
        }
    };

    const saveImport = async () => {
        if (!importRaw.trim()) {
            toast.error("请粘贴章节内容");
            return;
        }
        try {
            const res = await importChapters.mutateAsync({ novelId, raw: importRaw });
            toast.success(`已导入 ${res.created} 章`);
            setImportOpen(false);
            setImportRaw("");
        } catch {
            // http client shows the error
        }
    };

    if (!novelId) {
        return (
            <div className="py-16 text-center">
                <p className="text-muted-foreground mb-3 text-sm">缺少 novelId 参数</p>
                <Button variant="outline" onClick={back}>
                    返回小说列表
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="icon-sm" aria-label="返回" onClick={back}>
                    <ArrowLeft />
                </Button>
                <div className="mr-2">
                    <div className="font-semibold">章节管理</div>
                    <div className="text-muted-foreground text-xs">
                        共 {chapters.length} 章 · 每章以「标题 + 正文」维护，收费模式在小说信息中设置
                    </div>
                </div>
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
                    添加章节
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                    <Import />
                    批量导入
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
                                <TableHead className="w-20">章节号</TableHead>
                                <TableHead>标题</TableHead>
                                <TableHead>内容预览</TableHead>
                                <TableHead className="w-24">字数</TableHead>
                                <TableHead className="w-28">收费</TableHead>
                                <TableHead className="w-32">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {chapters.length > 0 ? (
                                chapters.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="tabular-nums">
                                            第 {row.chapterNo} 章
                                        </TableCell>
                                        <TableCell className="font-medium">{row.title}</TableCell>
                                        <TableCell className="text-muted-foreground max-w-[360px] truncate text-xs">
                                            {row.preview || "（无正文）"}
                                        </TableCell>
                                        <TableCell className="tabular-nums">{row.wordCount}</TableCell>
                                        <TableCell>
                                            {row.isFree ? (
                                                <Badge variant="secondary">免费</Badge>
                                            ) : (
                                                <Badge>{row.coinPrice} 金币</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="icon-sm"
                                                    aria-label={`编辑第 ${row.chapterNo} 章`}
                                                    onClick={() => openEdit(row)}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="destructive"
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    aria-label={`删除第 ${row.chapterNo} 章`}
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
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        暂无章节，点击「添加章节」或「批量导入」
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setContentId(null);
                }}
            >
                <DialogContent
                    className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px]"
                    aria-describedby={undefined}
                >
                    <DialogHeader className="px-6 pt-5">
                        <DialogTitle>{editing ? "编辑章节" : "添加章节"}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-[90px_1fr_90px_1fr] items-center gap-x-3 gap-y-4">
                            <Label htmlFor="ch-no" className="justify-end font-normal">
                                章节号
                            </Label>
                            <Input
                                id="ch-no"
                                value={form.chapterNo}
                                inputMode="numeric"
                                onChange={(e) => setForm({ ...form, chapterNo: e.target.value })}
                            />
                            <Label htmlFor="ch-title" className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                标题
                            </Label>
                            <Input
                                id="ch-title"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <Checkbox
                                    checked={form.isFree}
                                    onCheckedChange={(checked) =>
                                        setForm({ ...form, isFree: checked === true })
                                    }
                                />
                                本章免费
                            </label>
                            {!form.isFree && (
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="ch-price" className="font-normal">
                                        金币价格
                                    </Label>
                                    <Input
                                        id="ch-price"
                                        className="w-28"
                                        value={form.coinPrice}
                                        inputMode="numeric"
                                        onChange={(e) =>
                                            setForm({ ...form, coinPrice: e.target.value })
                                        }
                                    />
                                </div>
                            )}
                            <span className="text-muted-foreground ml-auto text-xs">
                                字数 {form.content.replace(/\s/g, "").length}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="ch-content">正文</Label>
                            <Textarea
                                id="ch-content"
                                value={form.content}
                                rows={14}
                                placeholder={
                                    editing ? "正在加载正文…" : "粘贴章节正文，支持换行"
                                }
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t px-6 py-4">
                        <Button variant="outline" onClick={() => setFormOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={save} disabled={create.isPending || update.isPending}>
                            确定
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogContent className="sm:max-w-[680px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>批量导入章节</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <p className="text-muted-foreground text-xs">
                            用一行 <code className="bg-muted rounded px-1">===</code> 分隔每章；
                            每块第一行作为章节标题，其余为正文。章节号自动续接现有最大号。
                        </p>
                        <Textarea
                            value={importRaw}
                            rows={14}
                            placeholder={"第一章 相遇\n正文…\n\n===\n\n第二章 离别\n正文…"}
                            onChange={(e) => setImportRaw(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setImportOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={saveImport} disabled={importChapters.isPending}>
                            导入
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
