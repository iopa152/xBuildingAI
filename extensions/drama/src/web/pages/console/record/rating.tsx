import { useDocumentHead } from "@buildingai/hooks";
import { cn } from "@buildingai/ui/lib/utils";
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
import { RotateCw, Search, Star } from "lucide-react";
import { useState } from "react";

import { useRatingListQuery } from "../../../services";
import { Pager } from "../promo/shared";
import { DramaCell, UserCell } from "./shared";

export default function RatingManagePage() {
    useDocumentHead({ title: "评分记录" });

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const { data, isLoading, isFetching, refetch } = useRatingListQuery({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
    });

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

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
                    <RotateCw className={cn(isFetching && "animate-spin")} />
                </Button>
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索用户昵称或短剧标题"
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
                                <TableHead className="w-14">ID</TableHead>
                                <TableHead className="min-w-32">用户</TableHead>
                                <TableHead className="min-w-48">短剧</TableHead>
                                <TableHead className="min-w-36">评分</TableHead>
                                <TableHead className="min-w-36">评分时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((r, idx) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {total - (page - 1) * pageSize - idx}
                                        </TableCell>
                                        <TableCell>
                                            <UserCell
                                                nickname={r.userNickname}
                                                avatar={r.userAvatar}
                                                userId={r.userId}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <DramaCell
                                                cover={r.dramaCover}
                                                title={r.dramaTitle}
                                                id={r.dramaId}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-0.5">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={
                                                            i < r.stars
                                                                ? "size-4 fill-amber-400 text-amber-400"
                                                                : "text-muted-foreground/30 size-4"
                                                        }
                                                    />
                                                ))}
                                                <span className="text-muted-foreground ml-1 text-xs tabular-nums">
                                                    {r.stars}.0
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={r.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        暂无数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Pager
                page={page}
                pageSize={pageSize}
                total={total}
                onPage={setPage}
                onPageSize={setPageSize}
            />
        </>
    );
}
