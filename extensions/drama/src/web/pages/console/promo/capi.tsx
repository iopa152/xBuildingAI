import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@buildingai/ui/components/ui/tabs";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { cn } from "@buildingai/ui/lib/utils";
import { RotateCw, Search } from "lucide-react";
import { useState } from "react";

import { useCapiListQuery } from "../../../services";
import type { CapiEventRow } from "../../../services";
import { Pager, Pill } from "./shared";

const STATUS_META: Record<
    string,
    { label: string; tone: "green" | "red" | "gray" | "blue" }
> = {
    sent: { label: "成功", tone: "green" },
    failed: { label: "失败", tone: "red" },
    pending: { label: "待回传", tone: "gray" },
    duplicate: { label: "重复", tone: "blue" },
};

export default function PromoCapiPage() {
    useDocumentHead({ title: "CAPI回传日志" });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("__all");
    const [detail, setDetail] = useState<CapiEventRow | null>(null);

    const { data, isLoading, isFetching, refetch } = useCapiListQuery({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        status: status === "__all" ? undefined : status,
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

                <Select
                    value={status}
                    onValueChange={(value) => {
                        setStatus(value);
                        setPage(1);
                    }}
                >
                    <SelectTrigger size="sm" className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all">全部状态</SelectItem>
                        <SelectItem value="sent">成功</SelectItem>
                        <SelectItem value="failed">失败</SelectItem>
                        <SelectItem value="pending">待回传</SelectItem>
                        <SelectItem value="duplicate">重复</SelectItem>
                    </SelectContent>
                </Select>

                <div className="relative ml-auto w-full sm:w-64">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="通过推广名称、事件名、用户ID搜索"
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
                                <TableHead className="min-w-32">推广名称</TableHead>
                                <TableHead className="min-w-44">事件名</TableHead>
                                <TableHead className="min-w-36">Pixel ID</TableHead>
                                <TableHead className="min-w-36">用户ID</TableHead>
                                <TableHead className="min-w-20">响应码</TableHead>
                                <TableHead className="min-w-24">接收事件数</TableHead>
                                <TableHead className="min-w-20">状态</TableHead>
                                <TableHead className="min-w-64">错误信息</TableHead>
                                <TableHead className="min-w-40">创建时间</TableHead>
                                <TableHead className="w-20">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row, idx) => {
                                    const status =
                                        STATUS_META[row.status] ?? {
                                            label: row.status,
                                            tone: "gray" as const,
                                        };
                                    return (
                                        <TableRow key={row.id}>
                                            <TableCell className="text-muted-foreground tabular-nums">
                                                {total - (page - 1) * pageSize - idx}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {row.linkName ?? "-"}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs">
                                                    {row.eventName}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {row.pixelBusinessId ?? "-"}
                                            </TableCell>
                                            <TableCell
                                                className="text-muted-foreground max-w-[160px] truncate font-mono text-xs"
                                                title={row.userId}
                                            >
                                                {row.userId || "-"}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {row.responseCode || "-"}
                                            </TableCell>
                                            <TableCell className="tabular-nums">
                                                {row.eventsReceived ?? "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Pill tone={status.tone}>{status.label}</Pill>
                                            </TableCell>
                                            <TableCell
                                                className="text-muted-foreground max-w-[320px] truncate text-xs"
                                                title={row.errorMessage ?? row.response}
                                            >
                                                {row.errorMessage || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <TimeText
                                                    value={row.createdAt}
                                                    format="YYYY-MM-DD HH:mm:ss"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="icon-sm"
                                                    aria-label="查看详情"
                                                    onClick={() => setDetail(row)}
                                                >
                                                    <Search />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
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

            <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
                <DialogContent className="sm:max-w-[720px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>CAPI 回传详情</DialogTitle>
                    </DialogHeader>

                    {detail ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                <DetailItem label="ID" value={detail.id} mono />
                                <DetailItem label="事件名" value={detail.eventName} mono />
                                <DetailItem label="事件ID" value={detail.eventId} mono />
                                <DetailItem
                                    label="Pixel ID"
                                    value={detail.pixelBusinessId ?? detail.pixelId}
                                    mono
                                />
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground w-20 shrink-0 text-right">
                                        状态
                                    </span>
                                    {(() => {
                                        const status = STATUS_META[detail.status] ?? {
                                            label: detail.status,
                                            tone: "gray" as const,
                                        };
                                        return <Pill tone={status.tone}>{status.label}</Pill>;
                                    })()}
                                </div>
                                <DetailItem label="响应码" value={detail.responseCode || "-"} />
                                <DetailItem
                                    label="接收事件数"
                                    value={String(detail.eventsReceived ?? "-")}
                                />
                                <DetailItem
                                    label="重试次数"
                                    value={String(detail.retryCount ?? 0)}
                                />
                                <div className="col-span-2 flex gap-3">
                                    <span className="text-muted-foreground w-20 shrink-0 text-right">
                                        错误信息
                                    </span>
                                    <span className="text-destructive min-w-0 flex-1 break-all">
                                        {detail.errorMessage || "-"}
                                    </span>
                                </div>
                            </div>

                            <Tabs defaultValue="request">
                                <TabsList>
                                    <TabsTrigger value="request">请求数据</TabsTrigger>
                                    <TabsTrigger value="response">响应内容</TabsTrigger>
                                </TabsList>
                                <TabsContent value="request">
                                    <RawText value={detail.requestBody} />
                                </TabsContent>
                                <TabsContent value="response">
                                    <RawText value={detail.response} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
}

function DetailItem({
    label,
    value,
    mono,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex min-w-0 gap-3">
            <span className="text-muted-foreground w-20 shrink-0 text-right">{label}</span>
            <span className={mono ? "min-w-0 flex-1 break-all font-mono text-xs" : "min-w-0 flex-1 break-all"}>
                {value}
            </span>
        </div>
    );
}

function RawText({ value }: { value?: string | null }) {
    return (
        <pre className="bg-muted/40 max-h-64 overflow-auto rounded-md border p-3 text-xs break-all whitespace-pre-wrap">
            {value || "暂无数据"}
        </pre>
    );
}
