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

import { useRedeemRecordListQuery } from "../../../services";
import { Pager, Pill } from "../promo/shared";

export default function RedeemRecordPage() {
    useDocumentHead({ title: "兑换记录" });

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const { data, isLoading, isFetching, refetch } = useRedeemRecordListQuery({
        keyword: keyword.trim() || undefined,
        page,
        pageSize,
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
                        placeholder="通过兑换码/用户名/昵称/活动搜索"
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
                                <TableHead className="min-w-32">兑换码</TableHead>
                                <TableHead className="min-w-32">活动名称</TableHead>
                                <TableHead className="min-w-36">用户ID</TableHead>
                                <TableHead className="min-w-24">用户名</TableHead>
                                <TableHead className="min-w-24">昵称</TableHead>
                                <TableHead className="min-w-20">奖励类型</TableHead>
                                <TableHead className="min-w-28">奖励内容</TableHead>
                                <TableHead className="min-w-24">兑换前金币</TableHead>
                                <TableHead className="min-w-24">兑换后金币</TableHead>
                                <TableHead className="min-w-40">兑换前VIP到期</TableHead>
                                <TableHead className="min-w-40">兑换后VIP到期</TableHead>
                                <TableHead className="min-w-40">兑换时间</TableHead>
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
                                            <span className="font-mono text-xs">{row.code}</span>
                                        </TableCell>
                                        <TableCell>{row.activityName || "-"}</TableCell>
                                        <TableCell>
                                            <span
                                                className="text-muted-foreground font-mono text-xs"
                                                title={row.userId}
                                            >
                                                {row.userId.slice(0, 8)}
                                            </span>
                                        </TableCell>
                                        <TableCell>{row.username || "-"}</TableCell>
                                        <TableCell>{row.nickname || "-"}</TableCell>
                                        <TableCell>
                                            <Pill tone={row.rewardType === "vip" ? "blue" : "green"}>
                                                {row.rewardType === "vip" ? "VIP会员" : "金币"}
                                            </Pill>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {row.rewardContent}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.coinsBefore ?? "-"}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {row.coinsAfter ?? "-"}
                                        </TableCell>
                                        <TableCell>
                                            {row.vipExpireBefore ? (
                                                <TimeText
                                                    value={row.vipExpireBefore}
                                                    format="YYYY-MM-DD HH:mm:ss"
                                                />
                                            ) : (
                                                "-"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {row.vipExpireAfter ? (
                                                <TimeText
                                                    value={row.vipExpireAfter}
                                                    format="YYYY-MM-DD HH:mm:ss"
                                                />
                                            ) : (
                                                "-"
                                            )}
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
                                    <TableCell colSpan={13} className="h-24 text-center">
                                        {keyword.trim() ? "未找到匹配的记录" : "暂无数据"}
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
                onPageSize={(size) => {
                    setPageSize(size);
                    setPage(1);
                }}
            />
        </>
    );
}
