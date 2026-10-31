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
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@buildingai/ui/components/ui/select";
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
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { Pencil, Plus, RotateCw, Search, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { resolveAssetUrl } from "../../../services";
import {
    useCreateNovelMutation,
    useDeleteNovelMutation,
    useNovelCategoryListQuery,
    useNovelListQuery,
    useUpdateNovelMutation,
} from "../../../services";
import type { NovelRow } from "../../../services";

interface NovelForm {
    title: string;
    author: string;
    cover: string;
    categoryId: string;
    description: string;
    tag: string;
    priceType: string;
    coinPrice: string;
    chapterCoinPrice: string;
    status: boolean;
    sort: string;
}

const emptyForm: NovelForm = {
    title: "",
    author: "",
    cover: "",
    categoryId: "",
    description: "",
    tag: "连载中",
    priceType: "free",
    coinPrice: "0",
    chapterCoinPrice: "0",
    status: true,
    sort: "0",
};

export default function NovelListPage() {
    useDocumentHead({ title: "小说列表" });

    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("all");
    const [categoryId, setCategoryId] = useState("all");
    const [priceType, setPriceType] = useState("all");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading, isFetching, refetch } = useNovelListQuery({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        status: status === "all" ? undefined : status,
        categoryId: categoryId === "all" ? undefined : categoryId,
        priceType: priceType === "all" ? undefined : priceType,
    });
    const { data: categories = [] } = useNovelCategoryListQuery();
    const create = useCreateNovelMutation();
    const update = useUpdateNovelMutation();
    const remove = useDeleteNovelMutation();

    const items = data?.items ?? [];
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<NovelRow | null>(null);
    const [form, setForm] = useState<NovelForm>(emptyForm);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEdit = (row: NovelRow) => {
        setEditing(row);
        setForm({
            title: row.title,
            author: row.author ?? "",
            cover: row.cover ?? "",
            categoryId: row.categoryId ?? "",
            description: row.description ?? "",
            tag: row.tag ?? "连载中",
            priceType: row.priceType ?? "free",
            coinPrice: String(row.coinPrice ?? 0),
            chapterCoinPrice: String(row.chapterCoinPrice ?? 0),
            status: row.status,
            sort: String(row.sort),
        });
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.title.trim()) {
            toast.error("请填写小说标题");
            return;
        }
        const payload = {
            title: form.title.trim(),
            author: form.author.trim(),
            cover: form.cover || undefined,
            categoryId: form.categoryId || undefined,
            description: form.description.trim(),
            tag: form.tag,
            priceType: form.priceType,
            coinPrice: Number(form.coinPrice) || 0,
            chapterCoinPrice: Number(form.chapterCoinPrice) || 0,
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

    const askDelete = async (row: NovelRow) => {
        if (!confirm(`确定删除小说「${row.title}」吗？`)) return;
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
                    添加小说
                </Button>
                <Select
                    value={status}
                    onValueChange={(v) => {
                        setStatus(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="状态" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="1">上架</SelectItem>
                        <SelectItem value="0">下架</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={categoryId}
                    onValueChange={(v) => {
                        setCategoryId(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="分类" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全部分类</SelectItem>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={priceType}
                    onValueChange={(v) => {
                        setPriceType(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="收费模式" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全部模式</SelectItem>
                        <SelectItem value="free">免费</SelectItem>
                        <SelectItem value="whole">整本收费</SelectItem>
                        <SelectItem value="chapter">按章收费</SelectItem>
                    </SelectContent>
                </Select>
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索小说标题/作者..."
                        className="pl-9"
                    />
                </div>
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
                                <TableHead>封面</TableHead>
                                <TableHead>小说标题</TableHead>
                                <TableHead>作者</TableHead>
                                <TableHead>分类</TableHead>
                                <TableHead>标签</TableHead>
                                <TableHead>章节/字数</TableHead>
                                <TableHead>价格</TableHead>
                                <TableHead>数据</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>排序</TableHead>
                                <TableHead className="w-40">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {(page - 1) * pageSize + index + 1}
                                        </TableCell>
                                        <TableCell>
                                            {row.cover ? (
                                                <img
                                                    src={resolveAssetUrl(row.cover)}
                                                    alt=""
                                                    className="h-14 w-10 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="bg-muted h-14 w-10 rounded" />
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{row.title}</TableCell>
                                        <TableCell>{row.author || "-"}</TableCell>
                                        <TableCell>{row.categoryName || "-"}</TableCell>
                                        <TableCell>
                                            <span className="bg-muted rounded px-1.5 py-0.5 text-xs">
                                                {row.tag || "连载中"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap tabular-nums">
                                            {row.chapterCount} 章 / {row.wordCount} 字
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {row.priceType === "whole"
                                                ? `${row.coinPrice} 金币/本`
                                                : row.priceType === "chapter"
                                                  ? `${row.chapterCoinPrice} 金币/章`
                                                  : "免费"}
                                        </TableCell>
                                        <TableCell className="text-xs whitespace-nowrap">
                                            <div>阅读 {row.viewCount}</div>
                                            <div>销量 {row.saleCount}</div>
                                            <div>
                                                ⭐ {row.ratingAvg}（{row.ratingCount}）
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {row.status ? (
                                                <span className="text-emerald-600">上架</span>
                                            ) : (
                                                <span className="text-muted-foreground">下架</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="tabular-nums">{row.sort}</TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={row.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        window.location.href = `/console/apps/drama/console/novel/chapters?novelId=${row.id}`;
                                                    }}
                                                >
                                                    章节
                                                </Button>
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
                                    <TableCell colSpan={12} className="h-24 text-center">
                                        暂无小说
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between">
                <span className="text-muted-foreground text-sm">共 {data?.total ?? 0} 条</span>
                <PaginationComponent className="mx-0 w-fit" />
            </div>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[600px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑小说" : "添加小说"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-[90px_1fr] items-center gap-x-3 gap-y-[18px]">
                        <Label htmlFor="novel-title" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            标题
                        </Label>
                        <Input
                            id="novel-title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />

                        <Label htmlFor="novel-author" className="justify-end font-normal">
                            作者
                        </Label>
                        <Input
                            id="novel-author"
                            value={form.author}
                            onChange={(e) => setForm({ ...form, author: e.target.value })}
                        />

                        <Label className="justify-end font-normal">封面</Label>
                        <ImageUpload
                            value={form.cover || undefined}
                            onChange={(url) => setForm({ ...form, cover: url ?? "" })}
                        />

                        <Label className="justify-end font-normal">分类</Label>
                        <Select
                            value={form.categoryId || "none"}
                            onValueChange={(v) =>
                                setForm({ ...form, categoryId: v === "none" ? "" : v })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="选择分类" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">不分类</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Label className="justify-end font-normal">标签</Label>
                        <Select value={form.tag} onValueChange={(v) => setForm({ ...form, tag: v })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="连载中">连载中</SelectItem>
                                <SelectItem value="已完结">已完结</SelectItem>
                            </SelectContent>
                        </Select>

                        <Label className="justify-end font-normal">收费模式</Label>
                        <Select
                            value={form.priceType}
                            onValueChange={(v) => setForm({ ...form, priceType: v })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="free">免费</SelectItem>
                                <SelectItem value="whole">整本收费</SelectItem>
                                <SelectItem value="chapter">按章收费</SelectItem>
                            </SelectContent>
                        </Select>

                        {form.priceType === "whole" && (
                            <>
                                <Label htmlFor="novel-price" className="justify-end font-normal">
                                    整本价格
                                </Label>
                                <Input
                                    id="novel-price"
                                    value={form.coinPrice}
                                    inputMode="numeric"
                                    placeholder="金币"
                                    onChange={(e) => setForm({ ...form, coinPrice: e.target.value })}
                                />
                            </>
                        )}

                        {form.priceType === "chapter" && (
                            <>
                                <Label htmlFor="novel-chprice" className="justify-end font-normal">
                                    章节价格
                                </Label>
                                <Input
                                    id="novel-chprice"
                                    value={form.chapterCoinPrice}
                                    inputMode="numeric"
                                    placeholder="金币/章"
                                    onChange={(e) =>
                                        setForm({ ...form, chapterCoinPrice: e.target.value })
                                    }
                                />
                            </>
                        )}

                        <Label htmlFor="novel-sort" className="justify-end font-normal">
                            排序
                        </Label>
                        <Input
                            id="novel-sort"
                            value={form.sort}
                            inputMode="numeric"
                            onChange={(e) => setForm({ ...form, sort: e.target.value })}
                        />

                        <Label className="justify-end font-normal">状态</Label>
                        <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                                checked={form.status}
                                onCheckedChange={(checked) =>
                                    setForm({ ...form, status: checked === true })
                                }
                            />
                            上架
                        </label>

                        <Label htmlFor="novel-desc" className="justify-end font-normal">
                            简介
                        </Label>
                        <Textarea
                            id="novel-desc"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={4}
                        />
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
