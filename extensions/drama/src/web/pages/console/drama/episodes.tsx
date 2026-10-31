import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card } from "@buildingai/ui/components/ui/card";
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@buildingai/ui/components/ui/tooltip";
import {
    ArrowUpDown,
    Clock,
    Eye,
    Heart,
    MessageSquare,
    Pencil,
    Play,
    PlayCircle,
    Plus,
    RefreshCw,
    Search,
    Settings,
    Share2,
    Trash,
    UploadCloud,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
    resolveAssetUrl,
    useDeleteEpisodeMutation,
    useDramaDetailQuery,
    useEpisodeListQuery,
} from "../../../services";
import type { Episode } from "../../../services/types";
import { BatchSettingsDialog } from "./BatchSettingsDialog";
import { BatchUploadDialog } from "./BatchUploadDialog";
import { EpisodeFormDialog } from "./EpisodeFormDialog";
import { EpisodePreviewDialog } from "./EpisodePreviewDialog";

const PAGE_SIZE = 10;

function formatTime(value?: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(seconds: number) {
    if (!seconds) return "-";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DramaEpisodesPage() {
    useDocumentHead({ title: "剧集管理" });
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dramaId = searchParams.get("id") || "";

    const { data: drama } = useDramaDetailQuery(dramaId, { enabled: !!dramaId });
    const {
        data: episodes = [],
        isLoading,
        refetch,
    } = useEpisodeListQuery(dramaId, { enabled: !!dramaId });

    const deleteMutation = useDeleteEpisodeMutation();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [keyword, setKeyword] = useState("");
    const [sortAsc, setSortAsc] = useState(true);
    const [page, setPage] = useState(1);

    const [formOpen, setFormOpen] = useState(false);
    const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
    const [previewEpisode, setPreviewEpisode] = useState<Episode | null>(null);

    // batch upload dialog
    const [uploadOpen, setUploadOpen] = useState(false);
    const [batchSettingsOpen, setBatchSettingsOpen] = useState(false);

    const list = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        return episodes
            .filter(
                (ep) =>
                    !kw ||
                    String(ep.episodeNo).includes(kw) ||
                    (ep.title ?? "").toLowerCase().includes(kw),
            )
            .sort((a, b) => (sortAsc ? a.episodeNo - b.episodeNo : b.episodeNo - a.episodeNo));
    }, [episodes, keyword, sortAsc]);

    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageItems = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const pageIds = pageItems.map((ep) => ep.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

    const toggleRow = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAllPage = () => {
        const next = new Set(selectedIds);
        if (allPageSelected) pageIds.forEach((id) => next.delete(id));
        else pageIds.forEach((id) => next.add(id));
        setSelectedIds(next);
    };

    const selectedEpisodes = episodes.filter((ep) => selectedIds.has(ep.id));
    const nextEpisodeNo = episodes.reduce((max, ep) => Math.max(max, ep.episodeNo), 0) + 1;

    const handleEdit = () => {
        if (selectedEpisodes.length !== 1) {
            toast.warning("请选择一条剧集进行编辑");
            return;
        }
        setEditingEpisode(selectedEpisodes[0]);
        setFormOpen(true);
    };

    const handleDelete = async () => {
        if (selectedEpisodes.length === 0) {
            toast.warning("请先选择要删除的剧集");
            return;
        }
        if (!confirm(`确定删除选中的 ${selectedEpisodes.length} 集吗？`)) return;
        try {
            for (const ep of selectedEpisodes) {
                await deleteMutation.mutateAsync(ep.id);
            }
            toast.success("删除成功");
            setSelectedIds(new Set());
            refetch();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteOne = async (episode: Episode) => {
        if (!confirm(`确定删除第 ${episode.episodeNo} 集吗？`)) return;
        try {
            await deleteMutation.mutateAsync(episode.id);
            toast.success("删除成功");
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(episode.id);
                return next;
            });
            refetch();
        } catch (error) {
            console.error(error);
        }
    };

    if (!dramaId) {
        return (
            <Card className="flex flex-col items-center justify-center gap-3 py-16">
                <p className="text-muted-foreground">缺少剧目 ID，请从短剧列表进入</p>
                <Button variant="outline" onClick={() => navigate("/console/drama/list")}>
                    返回短剧列表
                </Button>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="flex flex-wrap items-center gap-5 p-4">
                {drama?.coverVertical && (
                    <img
                        src={resolveAssetUrl(drama.coverVertical)}
                        alt={drama.title}
                        className="h-24 w-16 rounded-md object-cover"
                    />
                )}
                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{drama?.title ?? "-"}</h2>
                        <Badge variant="outline" className="font-mono text-[11px]">
                            ID: {drama?.id ?? dramaId}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        总集数：{episodes.length} 集
                        <span className="mx-3">|</span>
                        全集价格：{drama?.wholePrice ?? 0} 金币
                    </p>
                </div>
                <Button
                    variant="destructive"
                    size="sm"
                    className="ml-auto"
                    onClick={() => navigate("/console/drama/list")}
                >
                    关闭
                </Button>
            </Card>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        refetch();
                        toast.success("已刷新");
                    }}
                >
                    <RefreshCw className="h-4 w-4" />
                    刷新
                </Button>
                <Button
                    size="sm"
                    onClick={() => {
                        setEditingEpisode(null);
                        setFormOpen(true);
                    }}
                >
                    <Plus className="h-4 w-4" />
                    添加
                </Button>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Pencil className="h-4 w-4" />
                    编辑
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete}>
                    <Trash className="text-destructive h-4 w-4" />
                    删除
                </Button>
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                    <UploadCloud className="h-4 w-4" />
                    批量上传
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBatchSettingsOpen(true)}
                >
                    <Settings className="h-4 w-4" />
                    批量设置
                </Button>

                <div className="relative ml-auto w-64">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        placeholder="快速搜索集数或标题"
                        className="h-9 pl-8"
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={allPageSelected}
                                        onCheckedChange={toggleAllPage}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead className="w-20">ID</TableHead>
                                <TableHead className="min-w-[220px]">视频信息</TableHead>
                                <TableHead className="w-28">
                                    <button
                                        type="button"
                                        className="hover:text-foreground inline-flex items-center gap-1"
                                        onClick={() => setSortAsc((v) => !v)}
                                    >
                                        集数
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-36">付费策略</TableHead>
                                <TableHead className="w-44">数据统计</TableHead>
                                <TableHead className="w-40">状态 / 发布</TableHead>
                                <TableHead className="w-28">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pageItems.length > 0 ? (
                                pageItems.map((episode, index) => {
                                    const ordinal =
                                        episodes.length -
                                        ((currentPage - 1) * PAGE_SIZE + index);
                                    return (
                                        <TableRow key={episode.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(episode.id)}
                                                    onCheckedChange={() =>
                                                        toggleRow(episode.id)
                                                    }
                                                    aria-label="Select row"
                                                />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-xs">
                                                {ordinal}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-muted relative h-14 w-10 shrink-0 overflow-hidden rounded">
                                                        {episode.thumbnail ||
                                                        drama?.coverVertical ? (
                                                            <img
                                                                src={resolveAssetUrl(
                                                                    episode.thumbnail ||
                                                                        drama?.coverVertical,
                                                                )}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                <PlayCircle className="text-muted-foreground h-5 w-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium">
                                                            第 {episode.episodeNo} 集
                                                        </p>
                                                        <p
                                                            className="text-muted-foreground max-w-[220px] truncate text-xs"
                                                            title={episode.title}
                                                        >
                                                            {episode.title || "-"}
                                                        </p>
                                                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                                            <Clock className="h-3 w-3" />
                                                            {formatDuration(episode.duration)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>第 {episode.episodeNo} 集</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {episode.vipFree && (
                                                        <Badge className="bg-rose-500 text-white">
                                                            VIP免费
                                                        </Badge>
                                                    )}
                                                    {episode.isFree ? (
                                                        <Badge className="bg-emerald-500 text-white">
                                                            免费
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">
                                                            {episode.coinPrice} 金币
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="flex items-center gap-1">
                                                                <Play className="h-3.5 w-3.5 text-sky-500" />
                                                                {episode.playCount ?? 0}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>播放次数</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="flex items-center gap-1">
                                                                <Heart className="h-3.5 w-3.5 text-rose-500" />
                                                                {episode.likeCount ?? 0}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>点赞数</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="flex items-center gap-1">
                                                                <MessageSquare className="text-muted-foreground h-3.5 w-3.5" />
                                                                -
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>评论数</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="flex items-center gap-1">
                                                                <Share2 className="text-muted-foreground h-3.5 w-3.5" />
                                                                -
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>分享数</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span
                                                        className={`h-2 w-2 rounded-full ${
                                                            episode.status === "published"
                                                                ? "bg-emerald-500"
                                                                : "bg-muted-foreground/50"
                                                        }`}
                                                    />
                                                    <div>
                                                        <p>
                                                            {episode.status === "published"
                                                                ? "已上线"
                                                                : "待上线"}
                                                        </p>
                                                        <p className="text-muted-foreground">
                                                            {formatTime(
                                                                episode.publishTime ||
                                                                    episode.createdAt,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                onClick={() => {
                                                                    setEditingEpisode(episode);
                                                                    setFormOpen(true);
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4 text-sky-500" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>编辑</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                onClick={() =>
                                                                    handleDeleteOne(episode)
                                                                }
                                                            >
                                                                <Trash className="text-destructive h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>删除</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                onClick={() =>
                                                                    setPreviewEpisode(episode)
                                                                }
                                                            >
                                                                <Eye className="h-4 w-4 text-emerald-500" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>预览</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        暂无剧集，点击「添加」或「批量上传」创建
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                    共 {list.length} 集 · 已选 {selectedIds.size} 集 · 第 {currentPage}/
                    {totalPages} 页
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        上一页
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        下一页
                    </Button>
                </div>
            </div>

            <EpisodeFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                dramaId={dramaId}
                episode={editingEpisode}
                defaultEpisodeNo={nextEpisodeNo}
                onSaved={() => {
                    setEditingEpisode(null);
                    refetch();
                }}
            />

            <EpisodePreviewDialog
                open={!!previewEpisode}
                onOpenChange={(next) => {
                    if (!next) setPreviewEpisode(null);
                }}
                episode={previewEpisode}
                dramaTitle={drama?.title}
            />

            <BatchSettingsDialog
                open={batchSettingsOpen}
                onOpenChange={setBatchSettingsOpen}
                drama={
                    drama
                        ? {
                              id: drama.id,
                              title: drama.title,
                              episodeCount: episodes.length,
                          }
                        : null
                }
                onApplied={() => refetch()}
            />

            <BatchUploadDialog
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                dramaId={dramaId}
                nextEpisodeNo={nextEpisodeNo}
                existingNos={episodes.map((ep) => ep.episodeNo)}
                onUploaded={() => refetch()}
            />
        </div>
    );
}
