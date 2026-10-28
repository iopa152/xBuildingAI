import { cn } from "@buildingai/ui/lib/utils";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Check, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const PAGE_SIZES = [10, 20, 50, 100];

type Tone = "green" | "amber" | "gray" | "red" | "blue";

const TONE_CLASS: Record<Tone, string> = {
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    gray: "bg-muted text-muted-foreground",
    red: "bg-destructive/10 text-destructive",
    blue: "bg-primary/10 text-primary",
};

const DOT_CLASS: Record<Tone, string> = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    gray: "bg-muted-foreground/60",
    red: "bg-destructive",
    blue: "bg-primary",
};

export function Pill({
    tone,
    children,
    dot = true,
}: {
    tone: Tone;
    children: React.ReactNode;
    dot?: boolean;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
                TONE_CLASS[tone],
            )}
        >
            {dot && <span className={cn("size-1.5 rounded-full", DOT_CLASS[tone])} />}
            {children}
        </span>
    );
}

export function CopyValue({ value, label }: { value: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="flex min-w-0 items-center gap-1">
            <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs" title={value}>
                {value}
            </span>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={label ?? "复制"}
                className="shrink-0"
                onClick={async () => {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                    toast.success("已复制");
                    window.setTimeout(() => setCopied(false), 1500);
                }}
            >
                {copied ? <Check /> : <Copy />}
            </Button>
        </div>
    );
}

export function Pager({
    page,
    pageSize,
    total,
    onPage,
    onPageSize,
}: {
    page: number;
    pageSize: number;
    total: number;
    onPage: (page: number) => void;
    onPageSize: (size: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, totalPages);
    const [jump, setJump] = useState(String(current));

    useEffect(() => {
        setJump(String(current));
    }, [current]);

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
        if (totalPages <= 7) return true;
        if (p === 1 || p === totalPages) return true;
        return Math.abs(p - current) <= 1;
    });

    const submitJump = () => {
        const target = Number(jump);
        if (!Number.isFinite(target)) {
            setJump(String(current));
            return;
        }
        const next = Math.min(Math.max(1, Math.floor(target)), totalPages);
        onPage(next);
        setJump(String(next));
    };

    return (
        <div className="mt-4 flex flex-wrap items-center gap-3">
            <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                    onPageSize(Number(value));
                    onPage(1);
                }}
            >
                <SelectTrigger size="sm" className="w-28">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {PAGE_SIZES.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                            {size}条/页
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <span className="text-muted-foreground text-sm">共 {total} 条</span>

            <div className="ml-auto flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="上一页"
                    disabled={current <= 1}
                    onClick={() => onPage(current - 1)}
                >
                    <ChevronLeft />
                </Button>
                {pages.map((p, index) => {
                    const prev = pages[index - 1];
                    const gap = prev && p - prev > 1;
                    return (
                        <span key={p} className="flex items-center gap-1">
                            {gap && <span className="text-muted-foreground px-1 text-sm">…</span>}
                            <Button
                                variant={p === current ? "default" : "ghost"}
                                size="icon-sm"
                                className="min-w-8 px-2 tabular-nums"
                                onClick={() => onPage(p)}
                            >
                                {p}
                            </Button>
                        </span>
                    );
                })}
                <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="下一页"
                    disabled={current >= totalPages}
                    onClick={() => onPage(current + 1)}
                >
                    <ChevronRight />
                </Button>
                <span className="text-muted-foreground ml-2 text-sm">前往</span>
                <Input
                    value={jump}
                    onChange={(e) => setJump(e.target.value)}
                    onBlur={submitJump}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") submitJump();
                    }}
                    className="h-8 w-14 text-center"
                    inputMode="numeric"
                    aria-label="页码"
                />
                <span className="text-muted-foreground text-sm">页</span>
            </div>
        </div>
    );
}

export function formatMoney(value?: number | null) {
    return `$${Number(value ?? 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function centsToMoney(cents?: number | null) {
    return formatMoney(Number(cents ?? 0) / 100);
}

export function formatPercent(ratio?: number | null, digits = 2) {
    return `${((Number(ratio ?? 0)) * 100).toFixed(digits)}%`;
}

export function isoDay(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function lastDays(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    return { from: isoDay(from), to: isoDay(to) };
}
