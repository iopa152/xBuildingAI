import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
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
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { RotateCw, Search, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { resolveAssetUrl, useAttachmentListQuery, useDeleteAttachmentMutation } from "../../../services";

function formatSize(size: number) {
    if (!size) return "-";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export default function AttachmentPage() {
    useDocumentHead({ title: "附件管理" });

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading, isFetching, refetch } = useAttachmentListQuery({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
    });
    const remove = useDeleteAttachmentMutation();

    const items = data?.items ?? [];
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

    const askDelete = async (id: string, name: string) => {
        if (!confirm(`确定删除附件「${name}」吗？`)) return;
        try {
            await remove.mutateAsync(id);
            toast.success("删除成功");
            refetch();
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
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索文件名/类型..."
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
                                <TableHead>预览</TableHead>
                                <TableHead>原始名称</TableHead>
                                <TableHead>存储名称</TableHead>
                                <TableHead>类型</TableHead>
                                <TableHead>大小</TableHead>
                                <TableHead>上传者</TableHead>
                                <TableHead>上传时间</TableHead>
                                <TableHead className="w-20">操作</TableHead>
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
                                            {row.mimeType?.startsWith("image/") && row.url ? (
                                                <img
                                                    src={resolveAssetUrl(row.url)}
                                                    alt=""
                                                    className="size-10 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="bg-muted size-10 rounded" />
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-56 truncate font-medium">
                                            {row.originalName}
                                        </TableCell>
                                        <TableCell className="max-w-40 truncate text-xs">
                                            {row.storageName || "-"}
                                        </TableCell>
                                        <TableCell>{row.mimeType || "-"}</TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatSize(row.size)}
                                        </TableCell>
                                        <TableCell>{row.uploaderName || "-"}</TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={row.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="icon-sm"
                                                variant="destructive"
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                                                aria-label={`删除 ${row.originalName}`}
                                                onClick={() =>
                                                    askDelete(row.id, row.originalName)
                                                }
                                            >
                                                <Trash />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        暂无附件
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
        </>
    );
}
