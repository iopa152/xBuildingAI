import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
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
import { cn } from "@buildingai/ui/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@buildingai/ui/components/ui/dialog";
import { Label } from "@buildingai/ui/components/ui/label";
import { CalendarPlus, Download, RotateCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { usePromoOverviewQuery, useSetSpendMutation } from "../../../services";
import type { PromoOverviewParams } from "../../../services";
import { formatMoney, formatPercent, lastDays } from "./shared";

type Dimension = "day" | "link" | "drama";

const DIMENSION_LABEL: Record<Dimension, string> = {
    day: "日期",
    link: "推广链接",
    drama: "短剧",
};

const DIMENSION_OPTIONS: { value: Dimension; label: string }[] = [
    { value: "day", label: "按天" },
    { value: "link", label: "按推广链接" },
    { value: "drama", label: "按短剧" },
];

export default function PromoOverviewPage() {
    useDocumentHead({ title: "投放概览" });

    const [draft, setDraft] = useState<PromoOverviewParams>({
        ...lastDays(7),
        dimension: "day",
    });
    const [applied, setApplied] = useState<PromoOverviewParams>(draft);
    const [spendOpen, setSpendOpen] = useState(false);
    const [spendForm, setSpendForm] = useState({ linkId: "", statDate: "", spend: "" });
    const setSpend = useSetSpendMutation();

    const { data, isLoading, isFetching, refetch } = usePromoOverviewQuery(applied);
    const items = data?.items ?? [];
    const totals = data?.totals;

    const dimension = (applied.dimension ?? "day") as Dimension;

    const exportCsv = () => {
        const header = [
            DIMENSION_LABEL[dimension],
            "点击数",
            "注册数",
            "注册率",
            "充值人数",
            "充值金额",
            "消耗",
            "ROI",
            "付费率",
            "客单价",
            "ARPU",
        ];
        const rows = items.map((item) => [
            item.label,
            item.clicks,
            item.registrations,
            formatPercent(item.registrationRate),
            item.payUsers,
            item.revenue.toFixed(2),
            item.spend.toFixed(2),
            item.roi.toFixed(2),
            formatPercent(item.payRate),
            item.avgOrder.toFixed(2),
            item.arpu.toFixed(2),
        ]);
        const csv = [header, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `投放概览_${applied.from}_${applied.to}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("已导出");
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
                    <RotateCw className={cn(isFetching && "animate-spin")} />
                </Button>

                <div className="border-input flex h-9 items-center gap-1 rounded-md border px-2">
                    <Input
                        type="date"
                        value={draft.from}
                        onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                        className="h-7 w-[130px] border-0 px-1 shadow-none focus-visible:ring-0"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                        type="date"
                        value={draft.to}
                        onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                        className="h-7 w-[130px] border-0 px-1 shadow-none focus-visible:ring-0"
                    />
                </div>

                <Select
                    value={draft.dimension ?? "day"}
                    onValueChange={(value) =>
                        setDraft({ ...draft, dimension: value as Dimension })
                    }
                >
                    <SelectTrigger className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {DIMENSION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={draft.creator ?? "__all"}
                    onValueChange={(value) =>
                        setDraft({
                            ...draft,
                            creator: value === "__all" ? undefined : value,
                        })
                    }
                >
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all">全部投手</SelectItem>
                        {(data?.creators ?? []).map((creator) => (
                            <SelectItem key={creator} value={creator}>
                                {creator}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={draft.linkId ?? "__all"}
                    onValueChange={(value) =>
                        setDraft({
                            ...draft,
                            linkId: value === "__all" ? undefined : value,
                        })
                    }
                >
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all">全部推广链接</SelectItem>
                        {(data?.links ?? []).map((link) => (
                            <SelectItem key={link.id} value={link.id}>
                                {link.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={draft.dramaId ?? "__all"}
                    onValueChange={(value) =>
                        setDraft({
                            ...draft,
                            dramaId: value === "__all" ? undefined : value,
                        })
                    }
                >
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                        <SelectItem value="__all">全部短剧</SelectItem>
                        {(data?.dramas ?? []).map((drama) => (
                            <SelectItem key={drama.id} value={drama.id}>
                                {drama.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => setSpendOpen(true)}>
                    <CalendarPlus />
                    录入消耗
                </Button>
                <Button onClick={() => setApplied({ ...draft })}>查询</Button>
                <Button variant="outline" onClick={exportCsv}>
                    <Download />
                    导出表格
                </Button>
            </div>

            <Dialog open={spendOpen} onOpenChange={setSpendOpen}>
                <DialogContent className="sm:max-w-[440px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>录入推广消耗</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-1.5">
                            <Label>推广链接</Label>
                            <Select
                                value={spendForm.linkId || "__none"}
                                onValueChange={(v) =>
                                    setSpendForm({ ...spendForm, linkId: v === "__none" ? "" : v })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="选择链接" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                    <SelectItem value="__none" disabled>
                                        选择链接
                                    </SelectItem>
                                    {(data?.links ?? []).map((l) => (
                                        <SelectItem key={l.id} value={l.id}>
                                            {l.name}（{l.code}）
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label>日期</Label>
                            <Input
                                type="date"
                                value={spendForm.statDate}
                                onChange={(e) =>
                                    setSpendForm({ ...spendForm, statDate: e.target.value })
                                }
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>消耗金额（USD）</Label>
                            <Input
                                inputMode="decimal"
                                placeholder="0.00"
                                value={spendForm.spend}
                                onChange={(e) =>
                                    setSpendForm({ ...spendForm, spend: e.target.value })
                                }
                            />
                        </div>
                        <p className="text-muted-foreground text-xs">
                            同一链接同日重复录入会覆盖；录入后本页消耗与 ROI 即时生效。
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSpendOpen(false)}>
                            取消
                        </Button>
                        <Button
                            disabled={setSpend.isPending}
                            onClick={async () => {
                                if (!spendForm.linkId || !spendForm.statDate) {
                                    toast.error("请选择链接和日期");
                                    return;
                                }
                                const n = Number(spendForm.spend);
                                if (!Number.isFinite(n) || n < 0) {
                                    toast.error("消耗金额不合法");
                                    return;
                                }
                                try {
                                    await setSpend.mutateAsync({
                                        linkId: spendForm.linkId,
                                        statDate: spendForm.statDate,
                                        spend: n,
                                    });
                                    toast.success("已录入");
                                    setSpendOpen(false);
                                    setApplied({ ...applied });
                                } catch {
                                    // http client shows the error
                                }
                            }}
                        >
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isLoading ? (
                <div className="flex flex-1 items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead className="min-w-32">
                                    {DIMENSION_LABEL[dimension]}
                                </TableHead>
                                <TableHead className="min-w-20">点击数</TableHead>
                                <TableHead className="min-w-20">注册数</TableHead>
                                <TableHead className="min-w-20">注册率</TableHead>
                                <TableHead className="min-w-20">充值人数</TableHead>
                                <TableHead className="min-w-24">充值金额</TableHead>
                                <TableHead className="min-w-20">消耗</TableHead>
                                <TableHead className="min-w-20">ROI</TableHead>
                                <TableHead className="min-w-20">付费率</TableHead>
                                <TableHead className="min-w-20">客单价</TableHead>
                                <TableHead className="min-w-20">ARPU</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((item) => (
                                    <TableRow key={item.key}>
                                        <TableCell className="font-medium">{item.label}</TableCell>
                                        <TableCell className="tabular-nums">
                                            {item.clicks.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {item.registrations.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatPercent(item.registrationRate)}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {item.payUsers.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatMoney(item.revenue)}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatMoney(item.spend)}
                                        </TableCell>
                                        <TableCell
                                            className={
                                                item.roi >= 1
                                                    ? "tabular-nums text-emerald-600 dark:text-emerald-400"
                                                    : "tabular-nums text-rose-600 dark:text-rose-400"
                                            }
                                        >
                                            {item.roi.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatPercent(item.payRate)}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatMoney(item.avgOrder)}
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {formatMoney(item.arpu)}
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
                        {totals && items.length > 0 ? (
                            <TableBody className="bg-muted/50 font-medium">
                                <TableRow>
                                    <TableCell>汇总</TableCell>
                                    <TableCell className="tabular-nums">
                                        {totals.clicks.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="tabular-nums">
                                        {totals.registrations.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="tabular-nums">
                                        {formatPercent(totals.registrationRate)}
                                    </TableCell>
                                    <TableCell className="tabular-nums">
                                        {totals.payUsers.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="tabular-nums">
                                        {formatMoney(totals.revenue)}
                                    </TableCell>
                                    <TableCell className="tabular-nums">
                                        {formatMoney(totals.spend)}
                                    </TableCell>
                                    <TableCell className="tabular-nums">
                                        {totals.roi.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="tabular-nums">
                                        {formatPercent(totals.payRate)}
                                    </TableCell>
                                    <TableCell className="tabular-nums">
                                        {formatMoney(totals.avgOrder)}
                                    </TableCell>
                                    <TableCell className="tabular-nums">
                                        {formatMoney(totals.arpu)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        ) : null}
                    </Table>
                </div>
            )}
        </>
    );
}
