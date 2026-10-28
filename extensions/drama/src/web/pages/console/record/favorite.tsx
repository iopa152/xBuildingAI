import { useDocumentHead } from "@buildingai/hooks";
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
import { Search } from "lucide-react";
import { useState } from "react";

import { resolveAssetUrl, useFavoriteRecordListQuery } from "../../../services";

export default function FavoriteRecordPage() {
    useDocumentHead({ title: "收藏记录" });
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading } = useFavoriteRecordListQuery({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
    });
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

    const items = data?.items ?? [];

    return (
        <>
            <div className="mb-4 flex items-center gap-3">
                <div className="relative max-w-xs flex-1">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索用户昵称或剧名..."
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
                                <TableHead>用户</TableHead>
                                <TableHead>收藏剧目</TableHead>
                                <TableHead>收藏时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {r.userAvatar && (
                                                    <img
                                                        src={resolveAssetUrl(r.userAvatar)}
                                                        alt=""
                                                        className="size-7 rounded-full object-cover"
                                                    />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {r.userNickname ?? r.userId.slice(0, 8)}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {r.userId.slice(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{r.dramaTitle}</span>
                                        </TableCell>
                                        <TableCell>
                                            <TimeText value={r.createdAt} format="YYYY/MM/DD HH:mm" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        暂无数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="mt-4">
                <PaginationComponent className="mx-0 w-fit" />
            </div>
        </>
    );
}
