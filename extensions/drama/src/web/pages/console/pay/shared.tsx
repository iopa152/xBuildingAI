import { cn } from "@buildingai/ui/lib/utils";
import { Minus, Plus } from "lucide-react";

export function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <span className="bg-border h-px w-4" />
            <span className="text-sm font-medium">{children}</span>
            <div className="bg-border h-px flex-1" />
        </div>
    );
}

export function Stepper({
    value,
    onChange,
    min = 0,
}: {
    value: string;
    onChange: (value: string) => void;
    min?: number;
}) {
    const step = (delta: number) => {
        const parsed = Math.floor(Number(value));
        const base = Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : min;
        onChange(String(Math.max(min, base + delta)));
    };
    return (
        <div className="border-input flex h-9 w-full items-center overflow-hidden rounded-md border">
            <button
                type="button"
                onClick={() => step(-1)}
                className="flex h-full w-9 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
            >
                <Minus className="size-3.5" />
            </button>
            <input
                type="number"
                value={value}
                onChange={(e) => {
                    const parsed = Math.floor(Number(e.target.value));
                    if (Number.isNaN(parsed) || parsed < min) return;
                    onChange(String(parsed));
                }}
                className="h-full flex-1 border-x bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
                type="button"
                onClick={() => step(1)}
                className="flex h-full w-9 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
            >
                <Plus className="size-3.5" />
            </button>
        </div>
    );
}

export function StatePill({ active, activeText, inactiveText }: {
    active: boolean;
    activeText: string;
    inactiveText: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
                active
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
            )}
        >
            <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-muted-foreground/60")} />
            {active ? activeText : inactiveText}
        </span>
    );
}

export const TAG_BADGE_STYLES: Record<string, string> = {
    超值: "bg-emerald-500 text-white",
    热门: "bg-red-500 text-white",
    推荐: "bg-blue-500 text-white",
    HOT: "bg-red-500 text-white",
    BEST: "bg-emerald-500 text-white",
};

export function DurationBadge({ type }: { type: string }) {
    const meta: Record<string, { label: string; className: string }> = {
        year: { label: "年卡", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
        quarter: { label: "季卡", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
        month: { label: "月卡", className: "bg-muted text-muted-foreground" },
        week: { label: "周卡", className: "bg-primary/10 text-primary" },
    };
    const m = meta[type] ?? { label: type, className: "bg-muted text-muted-foreground" };
    return (
        <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium", m.className)}>
            {m.label}
        </span>
    );
}

export function MoneyInput({
    value,
    onChange,
    symbol,
    placeholder,
    id,
}: {
    value: string;
    onChange: (value: string) => void;
    symbol: string;
    placeholder?: string;
    id?: string;
}) {
    return (
        <div className="relative">
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                {symbol}
            </span>
            <input
                id={id}
                value={value}
                inputMode="decimal"
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="border-input bg-background placeholder:text-muted-foreground flex h-9 w-full rounded-md border pl-7 pr-3 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
        </div>
    );
}
