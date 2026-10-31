import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
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
import { RotateCw } from "lucide-react";
import { useState } from "react";

import { useAdminLogListQuery } from "../../../services";

export default function AdminLogPage() {
    useDocumentHead({ title: "管理员日志管理" });

    const [page, setPage] = useState(1);
    const pageSize = 20;
    const { data, isLoading, isFetching, refetch } = useAdminLogListQuery({ page, pageSize });
    const items = data?.items ?? [];
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

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
                                <TableHead>管理员ID</TableHead>
                                <TableHead>用户名</TableHead>
                                <TableHead>操作动作</TableHead>
                                <TableHead>操作对象</TableHead>
                                <TableHead>详情</TableHead>
                                <TableHead>IP</TableHead>
                                <TableHead>操作时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {(page - 1) * pageSize + index + 1}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {row.adminId?.slice(0, 8) ?? "-"}
                                        </TableCell>
                                        <TableCell>{row.adminName || "-"}</TableCell>
                                        <TableCell className="font-medium">{row.action}</TableCell>
                                        <TableCell className="max-w-48 truncate">
                                            {row.target || "-"}
                                        </TableCell>
                                        <TableCell className="max-w-64 truncate">
                                            {row.detail || "-"}
                                        </TableCell>
                                        <TableCell>{row.ip || "-"}</TableCell>
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
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        暂无管理员日志
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
