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
    useCreateMallGoodsMutation,
    useDeleteMallGoodsMutation,
    useMallCategoryListQuery,
    useMallGoodsListQuery,
    useUpdateMallGoodsMutation,
} from "../../../services";
import type { MallGoodsRow } from "../../../services";

interface GoodsForm {
    title: string;
    subtitle: string;
    categoryId: string;
    coverImage: string;
    images: string;
    description: string;
    tags: string;
    coinPrice: string;
    originalCoinPrice: string;
    stock: string;
    salesCount: string;
    languageCode: string;
    allRegion: boolean;
    hot: boolean;
    freeShipping: boolean;
    status: boolean;
    sort: string;
}

const emptyForm: GoodsForm = {
    title: "",
    subtitle: "",
    categoryId: "",
    coverImage: "",
    images: "",
    description: "",
    tags: "",
    coinPrice: "",
    originalCoinPrice: "0",
    stock: "0",
    salesCount: "0",
    languageCode: "en",
    allRegion: false,
    hot: false,
    freeShipping: false,
    status: true,
    sort: "0",
};

export default function MallGoodsPage() {
    useDocumentHead({ title: "商品管理" });

    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading, isFetching, refetch } = useMallGoodsListQuery({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        status: status === "all" ? undefined : status,
    });
    const { data: categories = [] } = useMallCategoryListQuery();
    const create = useCreateMallGoodsMutation();
    const update = useUpdateMallGoodsMutation();
    const remove = useDeleteMallGoodsMutation();

    const items = data?.items ?? [];
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<MallGoodsRow | null>(null);
    const [form, setForm] = useState<GoodsForm>(emptyForm);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEdit = (row: MallGoodsRow) => {
        setEditing(row);
        setForm({
            title: row.title,
            subtitle: row.subtitle ?? "",
            categoryId: row.categoryId ?? "",
            coverImage: row.coverImage ?? "",
            images: (row.images ?? []).join("\n"),
            description: row.description ?? "",
            tags: row.tags ?? "",
            coinPrice: String(row.coinPrice),
            originalCoinPrice: String(row.originalCoinPrice),
            stock: String(row.stock),
            salesCount: String(row.salesCount),
            languageCode: row.languageCode || "en",
            allRegion: row.allRegion,
            hot: row.hot,
            freeShipping: row.freeShipping,
            status: row.status,
            sort: String(row.sort),
        });
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.title.trim()) {
            toast.error("请填写商品标题");
            return;
        }
        const coinPrice = Number(form.coinPrice);
        if (!Number.isInteger(coinPrice) || coinPrice < 0) {
            toast.error("请输入正确的金币价");
            return;
        }
        const payload = {
            title: form.title.trim(),
            subtitle: form.subtitle.trim(),
            categoryId: form.categoryId || undefined,
            coverImage: form.coverImage || undefined,
            images: form.images
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            description: form.description.trim(),
            tags: form.tags.trim(),
            coinPrice,
            originalCoinPrice: Number(form.originalCoinPrice) || 0,
            stock: Number(form.stock) || 0,
            salesCount: Number(form.salesCount) || 0,
            languageCode: form.languageCode.trim() || "en",
            allRegion: form.allRegion,
            hot: form.hot,
            freeShipping: form.freeShipping,
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

    const askDelete = async (row: MallGoodsRow) => {
        if (!confirm(`确定删除商品「${row.title}」吗？`)) return;
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
                    添加商品
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
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索商品标题/标签..."
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
                                <TableHead>封面图</TableHead>
                                <TableHead>商品标题</TableHead>
                                <TableHead>分类</TableHead>
                                <TableHead>语言地区</TableHead>
                                <TableHead>金币价</TableHead>
                                <TableHead>库存</TableHead>
                                <TableHead>销量</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>更新时间</TableHead>
                                <TableHead className="w-28">操作</TableHead>
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
                                            {row.coverImage ? (
                                                <img
                                                    src={resolveAssetUrl(row.coverImage)}
                                                    alt=""
                                                    className="size-10 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="bg-muted size-10 rounded" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <p className="max-w-56 truncate font-medium">
                                                {row.title}
                                            </p>
                                            {row.subtitle && (
                                                <p className="text-muted-foreground max-w-56 truncate text-xs">
                                                    {row.subtitle}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>{row.categoryName || "-"}</TableCell>
                                        <TableCell>{row.languageCode}</TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.coinPrice}
                                        </TableCell>
                                        <TableCell className="tabular-nums">{row.stock}</TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.salesCount}
                                        </TableCell>
                                        <TableCell>
                                            {row.status ? (
                                                <span className="text-emerald-600">上架</span>
                                            ) : (
                                                <span className="text-muted-foreground">下架</span>
                                            )}
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
                                    <TableCell colSpan={11} className="h-24 text-center">
                                        暂无商品
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
                <DialogContent className="sm:max-w-[720px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{editing ? "编辑商品" : "添加商品"}</DialogTitle>
                    </DialogHeader>

                    <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                        <div className="grid grid-cols-[110px_1fr] items-center gap-x-3 gap-y-3">
                            <Label htmlFor="goods-title" className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                商品标题
                            </Label>
                            <Input
                                id="goods-title"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />

                            <Label htmlFor="goods-subtitle" className="justify-end font-normal">
                                副标题
                            </Label>
                            <Input
                                id="goods-subtitle"
                                value={form.subtitle}
                                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                            />

                            <Label className="justify-end font-normal">商品分类</Label>
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

                            <Label className="justify-end font-normal">封面图</Label>
                            <ImageUpload
                                value={form.coverImage || undefined}
                                onChange={(url) =>
                                    setForm({ ...form, coverImage: url ?? "" })
                                }
                            />

                            <Label htmlFor="goods-tags" className="justify-end font-normal">
                                标签
                            </Label>
                            <Input
                                id="goods-tags"
                                value={form.tags}
                                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                                placeholder="多个标签用逗号分隔"
                            />

                            <Label htmlFor="goods-coins" className="justify-end gap-1 font-normal">
                                <span className="text-destructive">*</span>
                                金币价
                            </Label>
                            <Input
                                id="goods-coins"
                                value={form.coinPrice}
                                inputMode="numeric"
                                onChange={(e) => setForm({ ...form, coinPrice: e.target.value })}
                            />

                            <Label htmlFor="goods-origin" className="justify-end font-normal">
                                划线价
                            </Label>
                            <Input
                                id="goods-origin"
                                value={form.originalCoinPrice}
                                inputMode="numeric"
                                onChange={(e) =>
                                    setForm({ ...form, originalCoinPrice: e.target.value })
                                }
                            />

                            <Label htmlFor="goods-stock" className="justify-end font-normal">
                                库存
                            </Label>
                            <Input
                                id="goods-stock"
                                value={form.stock}
                                inputMode="numeric"
                                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                            />

                            <Label htmlFor="goods-sales" className="justify-end font-normal">
                                销量
                            </Label>
                            <Input
                                id="goods-sales"
                                value={form.salesCount}
                                inputMode="numeric"
                                onChange={(e) => setForm({ ...form, salesCount: e.target.value })}
                            />

                            <Label htmlFor="goods-lang" className="justify-end font-normal">
                                语言地区
                            </Label>
                            <Input
                                id="goods-lang"
                                value={form.languageCode}
                                onChange={(e) =>
                                    setForm({ ...form, languageCode: e.target.value })
                                }
                                placeholder="例如 en / zh-CN"
                            />

                            <Label htmlFor="goods-sort" className="justify-end font-normal">
                                排序
                            </Label>
                            <Input
                                id="goods-sort"
                                value={form.sort}
                                inputMode="numeric"
                                onChange={(e) => setForm({ ...form, sort: e.target.value })}
                            />

                            <Label htmlFor="goods-images" className="justify-end font-normal">
                                轮播图
                            </Label>
                            <Textarea
                                id="goods-images"
                                value={form.images}
                                onChange={(e) => setForm({ ...form, images: e.target.value })}
                                placeholder="每行一个图片 URL"
                                rows={3}
                            />

                            <Label htmlFor="goods-desc" className="justify-end font-normal">
                                商品详情
                            </Label>
                            <Textarea
                                id="goods-desc"
                                value={form.description}
                                onChange={(e) =>
                                    setForm({ ...form, description: e.target.value })
                                }
                                rows={4}
                            />

                            <Label className="justify-end font-normal">展示设置</Label>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
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
                                        checked={form.hot}
                                        onCheckedChange={(checked) =>
                                            setForm({ ...form, hot: checked === true })
                                        }
                                    />
                                    热门
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <Checkbox
                                        checked={form.freeShipping}
                                        onCheckedChange={(checked) =>
                                            setForm({ ...form, freeShipping: checked === true })
                                        }
                                    />
                                    包邮
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <Checkbox
                                        checked={form.status}
                                        onCheckedChange={(checked) =>
                                            setForm({ ...form, status: checked === true })
                                        }
                                    />
                                    上架
                                </label>
                            </div>
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
