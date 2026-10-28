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
import { cn } from "@buildingai/ui/lib/utils";
import { RotateCw, Search } from "lucide-react";
import { useState } from "react";

import { useClickListQuery } from "../../../services";
import { Pager, Pill } from "./shared";

export default function PromoClicksPage() {
    useDocumentHead({ title: "推广点击记录" });

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const { data, isLoading, isFetching, refetch } = useClickListQuery({
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

                <div className="relative ml-auto w-full sm:w-64">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="通过推广码、名称、fbclid、用户ID搜索"
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
                                <TableHead className="min-w-40">推广码</TableHead>
                                <TableHead className="min-w-32">推广名称</TableHead>
                                <TableHead className="min-w-32">广告系列ID</TableHead>
                                <TableHead className="min-w-28">广告ID</TableHead>
                                <TableHead className="min-w-44">FB Click ID</TableHead>
                                <TableHead className="min-w-36">用户ID</TableHead>
                                <TableHead className="min-w-32">IP地址</TableHead>
                                <TableHead className="min-w-24">平台来源</TableHead>
                                <TableHead className="min-w-20">真实广告</TableHead>
                                <TableHead className="min-w-40">点击时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row, idx) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {total - (page - 1) * pageSize - idx}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-xs">
                                                {row.linkCode ?? "-"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {row.linkName ?? "-"}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {row.campaignId || "-"}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {row.adId || "-"}
                                        </TableCell>
                                        <TableCell
                                            className="text-muted-foreground max-w-[180px] truncate font-mono text-xs"
                                            title={row.fbclid}
                                        >
                                            {row.fbclid || "-"}
                                        </TableCell>
                                        <TableCell
                                            className="text-muted-foreground max-w-[140px] truncate font-mono text-xs"
                                            title={row.userId}
                                        >
                                            {row.userId || "-"}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {row.ip || "-"}
                                        </TableCell>
                                        <TableCell>{row.platform || "-"}</TableCell>
                                        <TableCell>
                                            <Pill tone={row.isRealAd ? "green" : "gray"}>
                                                {row.isRealAd ? "是" : "否"}
                                            </Pill>
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={row.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center">
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
