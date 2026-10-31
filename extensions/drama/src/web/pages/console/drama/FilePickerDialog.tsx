import { apiHttpClient } from "@buildingai/services";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
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
import { useQuery } from "@tanstack/react-query";
import { FileText, Film, ImageIcon, Search } from "lucide-react";
import { useState } from "react";

import { resolveAssetUrl } from "../../../services";

interface MediaFile {
    id: string;
    originalName?: string;
    storageName?: string;
    type?: string;
    mimeType?: string;
    size: number;
    url: string;
    createdAt: string;
}

interface MediaPage {
    items: MediaFile[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

interface FilePickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Restrict the selectable file type, "all" by default */
    accept?: "video" | "image" | "all";
    onSelect: (file: MediaFile) => void;
}

const PAGE_SIZE = 8;

function formatSize(size: number) {
    if (!size) return "-";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function formatTime(value: string) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fileTypeLabel(file: MediaFile) {
    if (file.type === "image") return "图片";
    if (file.type === "video") return "视频";
    if (file.type === "audio") return "音频";
    if (file.type === "archive") return "压缩包";
    return "文件";
}

function typeBadgeVariant(file: MediaFile): "default" | "secondary" | "outline" {
    if (file.type === "video") return "default";
    if (file.type === "image") return "secondary";
    return "outline";
}

export function FilePickerDialog({
    open,
    onOpenChange,
    accept = "all",
    onSelect,
}: FilePickerDialogProps) {
    const [keyword, setKeyword] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<MediaFile | null>(null);

    const { data, isLoading } = useQuery<MediaPage>({
        queryKey: ["media-library", page, search, accept],
        queryFn: () =>
            apiHttpClient.get<MediaPage>("/upload", {
                params: {
                    page,
                    pageSize: PAGE_SIZE,
                    ...(search ? { keyword: search } : {}),
                    ...(accept !== "all" ? { type: accept } : {}),
                },
            }),
        enabled: open,
    });

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, data?.totalPages ?? 1);

    const handleSelect = () => {
        if (!selected) return;
        onSelect(selected);
        onOpenChange(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) setSelected(null);
                onOpenChange(next);
            }}
        >
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[1080px]">
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="text-base">选择文件</DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-2 border-b px-6 py-3">
                    <Input
                        value={keyword}
                        placeholder="快速搜索文件名称"
                        className="h-9 w-64"
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                setSearch(keyword.trim());
                                setPage(1);
                            }
                        }}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSearch(keyword.trim());
                            setPage(1);
                        }}
                    >
                        <Search className="h-4 w-4" />
                        搜索
                    </Button>
                    <span className="text-muted-foreground ml-auto text-xs">
                        共 {total} 个文件
                    </span>
                </div>

                <div className="max-h-[56vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex h-56 items-center justify-center">
                            <Spinner className="size-7" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="w-24">ID</TableHead>
                                    <TableHead className="w-20">细目</TableHead>
                                    <TableHead className="w-20">预览</TableHead>
                                    <TableHead className="w-20">类型</TableHead>
                                    <TableHead className="w-24">大小</TableHead>
                                    <TableHead className="w-40">最后上传时间</TableHead>
                                    <TableHead>原始名称</TableHead>
                                    <TableHead className="w-24">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length > 0 ? (
                                    items.map((file) => {
                                        const active = selected?.id === file.id;
                                        const url = resolveAssetUrl(file.url);
                                        return (
                                            <TableRow
                                                key={file.id}
                                                data-state={active ? "selected" : undefined}
                                                className="cursor-pointer"
                                                onClick={() => setSelected(file)}
                                            >
                                                <TableCell
                                                    className="text-muted-foreground font-mono text-xs"
                                                    title={file.id}
                                                >
                                                    {file.id.slice(0, 8)}
                                                </TableCell>
                                                <TableCell>
                                                    {file.type === "image" && url ? (
                                                        <img
                                                            src={url}
                                                            alt=""
                                                            className="h-12 w-9 rounded object-cover"
                                                        />
                                                    ) : (
                                                        <div className="bg-muted flex h-12 w-9 items-center justify-center rounded">
                                                            {file.type === "video" ? (
                                                                <Film className="text-muted-foreground h-5 w-5" />
                                                            ) : (
                                                                <FileText className="text-muted-foreground h-5 w-5" />
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {file.type === "image" ? (
                                                            <ImageIcon className="h-4 w-4" />
                                                        ) : (
                                                            <Film className="h-4 w-4" />
                                                        )}
                                                        预览
                                                    </a>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={typeBadgeVariant(file)}>
                                                        {fileTypeLabel(file)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {formatSize(file.size)}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {formatTime(file.createdAt)}
                                                </TableCell>
                                                <TableCell
                                                    className="max-w-[220px] truncate"
                                                    title={file.originalName}
                                                >
                                                    {file.originalName || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant={
                                                            active ? "default" : "outline"
                                                        }
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelect(file);
                                                            onOpenChange(false);
                                                        }}
                                                    >
                                                        选择
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            暂无文件
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <DialogFooter className="flex-row items-center justify-between border-t px-6 py-3 sm:justify-between">
                    <div className="text-muted-foreground text-sm">
                        共 {total} 个文件 · 第 {page}/{totalPages} 页
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            上一页
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            下一页
                        </Button>
                        <Button size="sm" disabled={!selected} onClick={handleSelect}>
                            确定选择
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
