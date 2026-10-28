import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import { Input } from "@buildingai/ui/components/ui/input";
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@buildingai/ui/components/ui/tooltip";
import { Eye, Flame, Pencil, Plus, Rocket, Star, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import {
    useCategoryListQuery,
    useDeleteDramaMutation,
    useDramaListQuery,
    useOfflineDramaMutation,
    usePublishDramaMutation,
    useSetDramaFeaturedMutation,
} from "../../../services";

const statusBadgeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "预告中", variant: "secondary" },
    published: { label: "已上线", variant: "default" },
    offline: { label: "已下线", variant: "destructive" },
};

export default function DramaListPage() {
    useDocumentHead({ title: "剧目管理" });
    const navigate = useNavigate();

    const [searchTitle, setSearchTitle] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const { data: categories = [] } = useCategoryListQuery();

    const { data: dramaPage, isLoading, refetch } = useDramaListQuery({
        page,
        pageSize: 20,
        title: searchTitle || undefined,
        status: statusFilter !== "all" ? (statusFilter as never) : undefined,
        categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
    });

    const publishMutation = usePublishDramaMutation();
    const offlineMutation = useOfflineDramaMutation();
    const featuredMutation = useSetDramaFeaturedMutation();
    const deleteMutation = useDeleteDramaMutation();

    const dramas = dramaPage?.items ?? [];
    const total = dramaPage?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / 20));

    const handleDelete = async (id: string) => {
        if (!confirm("删除剧目会同时删除其全部剧集，确定删除吗？")) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success("删除成功");
            refetch();
        } catch (error) {
            console.error(error);
        }
    };

    const handleToggleRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-4">
                <Input
                    placeholder="搜索剧目标题..."
                    value={searchTitle}
                    onChange={(e) => {
                        setSearchTitle(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-xs"
                />

                <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                        setStatusFilter(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="状态" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="draft">预告中</SelectItem>
                        <SelectItem value="published">已上线</SelectItem>
                        <SelectItem value="offline">已下线</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={categoryFilter}
                    onValueChange={(v) => {
                        setCategoryFilter(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="分类" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全部分类</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="ml-auto flex items-end gap-2">
                    <Button
                        disabled={selectedIds.size === 0}
                        variant="destructive"
                        onClick={async () => {
                            if (!confirm(`确定要批量删除 ${selectedIds.size} 部剧吗？`)) return;
                            for (const id of selectedIds) {
                                await deleteMutation.mutateAsync(id).catch(() => undefined);
                            }
                            toast.success("批量删除成功");
                            setSelectedIds(new Set());
                            refetch();
                        }}
                    >
                        <Trash />
                        批量删除 ({selectedIds.size})
                    </Button>
                    <Button onClick={() => navigate(`edit`)}>
                        <Plus />
                        新建剧目
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="mb-4 flex flex-1 items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="mb-4 overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead className="w-12" />
                                <TableHead>剧目</TableHead>
                                <TableHead>分类</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>集数</TableHead>
                                <TableHead>整剧价格</TableHead>
                                <TableHead>热度/播放</TableHead>
                                <TableHead>操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dramas.length > 0 ? (
                                dramas.map((drama) => {
                                    const badge = statusBadgeMap[drama.status] ?? {
                                        label: drama.status,
                                        variant: "outline" as const,
                                    };
                                    return (
                                        <TableRow key={drama.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(drama.id)}
                                                    onCheckedChange={() =>
                                                        handleToggleRow(drama.id)
                                                    }
                                                    aria-label="Select row"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {drama.coverVertical && (
                                                        <img
                                                            src={drama.coverVertical}
                                                            alt=""
                                                            className="h-16 w-11 rounded object-cover"
                                                        />
                                                    )}
                                                    <div>
                                                        <p className="flex items-center gap-1 font-medium">
                                                            {drama.title}
                                                            {drama.featured && (
                                                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                                            )}
                                                            {drama.complete && (
                                                                <Badge variant="outline">
                                                                    完结
                                                                </Badge>
                                                            )}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
                                                            {drama.language}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {drama.categories?.map((cat) => (
                                                        <Badge
                                                            key={cat.id}
                                                            variant="secondary"
                                                        >
                                                            {cat.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={badge.variant}>
                                                    {badge.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>共 {drama.episodeCount} 集</TableCell>
                                            <TableCell>{drama.wholePrice} 金币</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <span className="flex items-center gap-1">
                                                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                                                        {drama.heat}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="h-3.5 w-3.5" />
                                                        {drama.viewCount}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `edit?id=${drama.id}`,
                                                                    )
                                                                }
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>编辑</TooltipContent>
                                                    </Tooltip>

                                                    {drama.status !== "published" ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    onClick={async () => {
                                                                        await publishMutation.mutateAsync(
                                                                            drama.id,
                                                                        );
                                                                        toast.success("上线成功");
                                                                        refetch();
                                                                    }}
                                                                >
                                                                    <Rocket className="h-4 w-4 text-green-600" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>上线</TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    onClick={async () => {
                                                                        await offlineMutation.mutateAsync(
                                                                            drama.id,
                                                                        );
                                                                        toast.success("下线成功");
                                                                        refetch();
                                                                    }}
                                                                >
                                                                    <Rocket className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>下线</TooltipContent>
                                                        </Tooltip>
                                                    )}

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                onClick={async () => {
                                                                    await featuredMutation.mutateAsync(
                                                                        {
                                                                            id: drama.id,
                                                                            featured:
                                                                                !drama.featured,
                                                                        },
                                                                    );
                                                                    toast.success("设置成功");
                                                                    refetch();
                                                                }}
                                                            >
                                                                <Star
                                                                    className={`h-4 w-4 ${
                                                                        drama.featured
                                                                            ? "fill-yellow-400 text-yellow-400"
                                                                            : ""
                                                                    }`}
                                                                />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {drama.featured
                                                                ? "取消精选"
                                                                : "设为精选"}
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => handleDelete(drama.id)}
                                                    >
                                                        <Trash className="text-destructive h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        暂无数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                    共 {total} 部剧 · 第 {page}/{totalPages} 页
                </div>
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
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        下一页
                    </Button>
                </div>
            </div>
        </>
    );
}
