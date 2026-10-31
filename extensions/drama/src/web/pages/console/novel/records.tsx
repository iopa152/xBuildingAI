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
import { RotateCw, Search, Star } from "lucide-react";
import { useState } from "react";

import { useNovelRecordListQuery } from "../../../services";
import type { NovelRecordType } from "../../../services";

function NovelRecordsPage({
    type,
    title,
}: {
    type: NovelRecordType;
    title: string;
}) {
    useDocumentHead({ title });
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading, isFetching, refetch } = useNovelRecordListQuery(type, {
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
    });
    const items = data?.items ?? [];
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

    const columns =
        type === "rating"
            ? ["用户", "小说", "评分", "评分时间"]
            : type === "bookshelf"
              ? ["用户", "小说", "加入时间"]
              : type === "history"
                ? ["用户", "小说", "阅读章节", "更新时间"]
                : ["用户", "小说", "花费金币", "购买时间"];

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
                        placeholder="搜索小说标题/用户..."
                        className="pl-9"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-1 items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col}>{col}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <p className="text-sm font-medium">
                                                {row.nickname || row.username || "-"}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {row.username || "-"}
                                            </p>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {row.novelTitle || "-"}
                                        </TableCell>
                                        {type === "rating" && (
                                            <>
                                                <TableCell>
                                                    <div className="flex items-center gap-0.5">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={
                                                                    i < (row.score ?? 0)
                                                                        ? "size-4 fill-amber-400 text-amber-400"
                                                                        : "text-muted-foreground/30 size-4"
                                                                }
                                                            />
                                                        ))}
                                                        <span className="text-muted-foreground ml-1 text-xs">
                                                            {row.score ?? 0}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <TimeText
                                                        value={row.createdAt}
                                                        format="YYYY-MM-DD HH:mm:ss"
                                                    />
                                                </TableCell>
                                            </>
                                        )}
                                        {type === "bookshelf" && (
                                            <TableCell>
                                                <TimeText
                                                    value={row.createdAt}
                                                    format="YYYY-MM-DD HH:mm:ss"
                                                />
                                            </TableCell>
                                        )}
                                        {type === "history" && (
                                            <>
                                                <TableCell>{row.chapter || "-"}</TableCell>
                                                <TableCell>
                                                    <TimeText
                                                        value={row.updatedAt ?? row.createdAt}
                                                        format="YYYY-MM-DD HH:mm:ss"
                                                    />
                                                </TableCell>
                                            </>
                                        )}
                                        {type === "purchase" && (
                                            <>
                                                <TableCell className="tabular-nums">
                                                    {row.coins ?? 0}
                                                </TableCell>
                                                <TableCell>
                                                    <TimeText
                                                        value={row.createdAt}
                                                        format="YYYY-MM-DD HH:mm:ss"
                                                    />
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        暂无记录
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

export function NovelRatingPage() {
    return <NovelRecordsPage type="rating" title="评分管理" />;
}

export function NovelBookshelfPage() {
    return <NovelRecordsPage type="bookshelf" title="书架管理" />;
}

export function NovelHistoryPage() {
    return <NovelRecordsPage type="history" title="阅读历史" />;
}

export function NovelPurchasePage() {
    return <NovelRecordsPage type="purchase" title="购买记录" />;
}
