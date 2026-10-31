import { BarChart3, Crown, FolderOpen, Gift, Lightbulb, Minus, Plus, Star, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@buildingai/ui/components/ui/alert-dialog";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Label } from "@buildingai/ui/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { cn } from "@buildingai/ui/lib/utils";

import type { Drama, EpisodeRangeRule, EpisodeSettingsPayload } from "../../../services/types";
import { useBatchEpisodeSettingsMutation } from "../../../services";

type BatchDrama = Pick<Drama, "id" | "title" | "episodeCount">;

interface BatchSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    drama?: BatchDrama | null;
    onApplied?: () => void;
}

interface RuleState extends EpisodeSettingsPayload {
    min: number;
    max?: number;
    isFree: boolean;
    coinPrice: number;
    vipFree: boolean;
    status: string;
}

const createRule = (min = 1): RuleState => ({
    min,
    max: min + 9,
    isFree: false,
    coinPrice: 5,
    vipFree: false,
    status: "published",
});

const FILTER_OPTIONS = [
    { value: "noPrice", label: "未设置价格的剧集（金币=0且非免费）" },
    { value: "free", label: "当前免费的剧集" },
    { value: "paid", label: "当前付费的剧集" },
    { value: "draft", label: "待上线的剧集" },
    { value: "published", label: "已上线的剧集" },
];

const TEMPLATES = [
    { id: "freeFirst", name: "前几集免费", icon: Star, color: "text-emerald-500", button: "bg-emerald-500 hover:bg-emerald-600" },
    { id: "tiered", name: "阶梯定价", icon: BarChart3, color: "text-amber-500", button: "bg-amber-500 hover:bg-amber-600" },
    { id: "vipOnly", name: "VIP专享", icon: Crown, color: "text-rose-500", button: "bg-rose-500 hover:bg-rose-600" },
    { id: "allFree", name: "全部免费", icon: Gift, color: "text-sky-500", button: "bg-sky-500 hover:bg-sky-600" },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

interface StepperProps {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    min?: number;
    max?: number;
    allowEmpty?: boolean;
    placeholder?: string;
    className?: string;
}

function Stepper({ value, onChange, min = 0, max = 99999, allowEmpty = false, placeholder, className }: StepperProps) {
    const step = (delta: number) => {
        if (value === undefined) {
            onChange(min);
            return;
        }
        const next = value + delta;
        if (next < min) {
            onChange(allowEmpty ? undefined : min);
            return;
        }
        onChange(Math.min(next, max));
    };

    return (
        <div className={cn("flex h-8 items-center overflow-hidden rounded-md border", className)}>
            <button
                type="button"
                onClick={() => step(-1)}
                className="flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
            >
                <Minus className="size-3.5" />
            </button>
            <input
                type="number"
                value={value ?? ""}
                placeholder={placeholder}
                onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                        onChange(allowEmpty ? undefined : min);
                        return;
                    }
                    const parsed = Math.floor(Number(raw));
                    if (Number.isNaN(parsed) || parsed < 0) return;
                    onChange(parsed);
                }}
                className="h-full w-14 border-x bg-transparent text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
                type="button"
                onClick={() => step(1)}
                className="flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
            >
                <Plus className="size-3.5" />
            </button>
        </div>
    );
}

function StatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-8 w-28">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="published">已上线</SelectItem>
                <SelectItem value="draft">待上线</SelectItem>
            </SelectContent>
        </Select>
    );
}

function ToggleLabel({ checked, onLabel, offLabel }: { checked: boolean; onLabel: string; offLabel: string }) {
    return (
        <span className={cn("text-sm", checked ? "text-primary" : "text-muted-foreground")}>
            {checked ? onLabel : offLabel}
        </span>
    );
}

export function BatchSettingsDialog({ open, onOpenChange, drama, onApplied }: BatchSettingsDialogProps) {
    const [tab, setTab] = useState("range");
    const [rules, setRules] = useState<RuleState[]>([]);
    const [filters, setFilters] = useState<string[]>([]);
    const [filterSettings, setFilterSettings] = useState<RuleState>(createRule());
    const [allSettings, setAllSettings] = useState<RuleState>(createRule());
    const [templateId, setTemplateId] = useState<TemplateId>("freeFirst");
    const [freeCount, setFreeCount] = useState(3);
    const [restPrice, setRestPrice] = useState(5);
    const [applying, setApplying] = useState(false);
    const [lastDrama, setLastDrama] = useState<BatchDrama | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<{
        mode: "range" | "filter" | "all";
        rules?: EpisodeRangeRule[];
        filters?: string[];
        settings?: EpisodeSettingsPayload;
    } | null>(null);

    const batchSettings = useBatchEpisodeSettingsMutation();

    useEffect(() => {
        if (drama) setLastDrama(drama);
    }, [drama]);

    const current = drama ?? lastDrama;

    useEffect(() => {
        if (!open) return;
        setTab("range");
        setRules([]);
        setFilters([]);
        setFilterSettings({ ...createRule(), coinPrice: 0, vipFree: true, status: "draft" });
        setAllSettings({ ...createRule(), coinPrice: 0, status: "draft" });
        setTemplateId("freeFirst");
        setFreeCount(3);
        setRestPrice(5);
        setConfirmOpen(false);
        setPendingPayload(null);
    }, [open, drama?.id]);

    const apply = async (payload: {
        mode: "range" | "filter" | "all";
        rules?: EpisodeRangeRule[];
        filters?: string[];
        settings?: EpisodeSettingsPayload;
    }) => {
        if (!drama?.id) return;
        setApplying(true);
        try {
            const result = await batchSettings.mutateAsync({ dramaId: drama.id, ...payload });
            toast.success(result?.message || "设置成功");
            setConfirmOpen(false);
            setPendingPayload(null);
            onOpenChange(false);
            onApplied?.();
        } catch (error) {
            console.error(error);
            setConfirmOpen(false);
            setPendingPayload(null);
        } finally {
            setApplying(false);
        }
    };

    const requestApply = (payload: {
        mode: "range" | "filter" | "all";
        rules?: EpisodeRangeRule[];
        filters?: string[];
        settings?: EpisodeSettingsPayload;
    }) => {
        setPendingPayload(payload);
        setConfirmOpen(true);
    };

    const applyTemplate = (id: TemplateId) => {
        setTemplateId(id);
        if (id === "freeFirst") {
            return requestApply({
                mode: "range",
                rules: [
                    { min: 1, max: freeCount, isFree: true, coinPrice: 0 },
                    { min: freeCount + 1, isFree: false, coinPrice: restPrice },
                ],
            });
        }
        if (id === "tiered") {
            return requestApply({
                mode: "range",
                rules: [
                    { min: 1, max: 10, isFree: false, coinPrice: 5 },
                    { min: 11, max: 20, isFree: false, coinPrice: 8 },
                    { min: 21, isFree: false, coinPrice: 10 },
                ],
            });
        }
        if (id === "vipOnly") {
            return requestApply({
                mode: "all",
                settings: { isFree: false, coinPrice: 0, vipFree: true },
            });
        }
        return requestApply({
            mode: "all",
            settings: { isFree: true, coinPrice: 0, vipFree: false },
        });
    };

    const handleConfirm = () => {
        if (tab === "range") {
            if (rules.length === 0) {
                toast.error("请先添加规则");
                return;
            }
            const invalid = rules.find((rule) => rule.max !== undefined && rule.max < rule.min);
            if (invalid) {
                toast.error(`规则集数范围不正确：${invalid.min}-${invalid.max}`);
                return;
            }
            requestApply({
                mode: "range",
                rules: rules.map((rule) => ({
                    min: rule.min,
                    max: rule.max,
                    isFree: rule.isFree,
                    coinPrice: rule.coinPrice,
                    vipFree: rule.vipFree,
                    status: rule.status,
                })),
            });
            return;
        }
        if (tab === "filter") {
            if (filters.length === 0) {
                toast.error("请先选择筛选条件");
                return;
            }
            requestApply({
                mode: "filter",
                filters,
                settings: {
                    isFree: filterSettings.isFree,
                    coinPrice: filterSettings.coinPrice,
                    vipFree: filterSettings.vipFree,
                    status: filterSettings.status,
                },
            });
            return;
        }
        if (tab === "all") {
            requestApply({
                mode: "all",
                settings: {
                    isFree: allSettings.isFree,
                    coinPrice: allSettings.coinPrice,
                    vipFree: allSettings.vipFree,
                    status: allSettings.status,
                },
            });
            return;
        }
        void applyTemplate(templateId);
    };

    const updateRule = (index: number, patch: Partial<RuleState>) => {
        setRules((list) => list.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
    };

    const toggleFilter = (value: string, checked: boolean) => {
        setFilters((list) => (checked ? [...list, value] : list.filter((item) => item !== value)));
    };

    return (
        <>
        <Dialog open={open} onOpenChange={(next) => !applying && onOpenChange(next)}>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[1120px]" aria-describedby={undefined}>
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="text-base">批量设置工具</DialogTitle>
                </DialogHeader>

                <div className="bg-muted/50 mx-6 mt-4 rounded-md border px-4 py-2.5 text-sm">
                    当前短剧：{current?.title ?? "-"}（共 {current?.episodeCount ?? 0} 集）
                </div>

                <Tabs value={tab} onValueChange={setTab} className="gap-0">
                    <div className="mt-3 border-b px-6">
                        <TabsList variant="line" className="h-11">
                            <TabsTrigger value="range">按集数范围设置</TabsTrigger>
                            <TabsTrigger value="filter">按条件筛选设置</TabsTrigger>
                            <TabsTrigger value="all">全部统一设置</TabsTrigger>
                            <TabsTrigger value="template">模板设置</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
                        <TabsContent value="range" className="mt-0 space-y-4">
                            <Button
                                size="sm"
                                onClick={() =>
                                    setRules((list) => [
                                        ...list,
                                        createRule(
                                            list.length > 0
                                                ? Math.max(...list.map((rule) => rule.max ?? rule.min)) + 1
                                                : 1,
                                        ),
                                    ])
                                }
                            >
                                <Plus />
                                添加规则
                            </Button>

                            {rules.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
                                    <FolderOpen className="size-20 opacity-60" strokeWidth={1.2} />
                                    <p className="text-sm">暂无规则，请点击上方按钮添加</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {rules.map((rule, index) => (
                                        <div key={index} className="overflow-hidden rounded-md border">
                                            <div className="flex items-center justify-between border-b px-4 py-2.5">
                                                <span className="text-sm font-medium">规则 {index + 1}</span>
                                                <button
                                                    type="button"
                                                    className="text-destructive hover:text-destructive/80 flex items-center gap-1 text-sm"
                                                    onClick={() =>
                                                        setRules((list) => list.filter((_, i) => i !== index))
                                                    }
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    删除
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-sm">集数范围</span>
                                                    <Stepper
                                                        value={rule.min}
                                                        min={1}
                                                        onChange={(value) => updateRule(index, { min: value ?? 1 })}
                                                    />
                                                    <span className="text-muted-foreground text-sm">至</span>
                                                    <Stepper
                                                        value={rule.max}
                                                        min={1}
                                                        allowEmpty
                                                        placeholder="末集"
                                                        onChange={(value) => updateRule(index, { max: value })}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-sm">是否免费</span>
                                                    <span
                                                        className={cn(
                                                            "text-sm",
                                                            rule.isFree
                                                                ? "text-muted-foreground"
                                                                : "text-primary",
                                                        )}
                                                    >
                                                        付费
                                                    </span>
                                                    <Switch
                                                        checked={rule.isFree}
                                                        onCheckedChange={(checked) =>
                                                            updateRule(index, {
                                                                isFree: checked,
                                                                coinPrice: checked ? 0 : rule.coinPrice,
                                                            })
                                                        }
                                                    />
                                                    <span
                                                        className={cn(
                                                            "text-sm",
                                                            rule.isFree
                                                                ? "text-primary"
                                                                : "text-muted-foreground",
                                                        )}
                                                    >
                                                        免费
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-sm">金币价格</span>
                                                    <Stepper
                                                        value={rule.coinPrice}
                                                        min={0}
                                                        onChange={(value) =>
                                                            updateRule(index, { coinPrice: value ?? 0 })
                                                        }
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-sm">VIP免费</span>
                                                    <Switch
                                                        checked={rule.vipFree}
                                                        onCheckedChange={(checked) =>
                                                            updateRule(index, { vipFree: checked })
                                                        }
                                                    />
                                                    <span className="text-sm">
                                                        {rule.vipFree ? "是" : "否"}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-sm">状态</span>
                                                    <StatusSelect
                                                        value={rule.status}
                                                        onChange={(value) =>
                                                            updateRule(index, { status: value })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                                        <Lightbulb className="size-4 shrink-0" />
                                        示例：第1-3集免费，第4-10集5金币，第11集以后10金币
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="filter" className="mt-0">
                            <div className="rounded-md border">
                                <div className="flex gap-6 px-4 py-4">
                                    <span className="w-24 shrink-0 text-sm">筛选条件</span>
                                    <div className="space-y-3">
                                        {FILTER_OPTIONS.map((option) => (
                                            <label
                                                key={option.value}
                                                className="flex cursor-pointer items-center gap-2 text-sm"
                                            >
                                                <Checkbox
                                                    checked={filters.includes(option.value)}
                                                    onCheckedChange={(checked) =>
                                                        toggleFilter(option.value, !!checked)
                                                    }
                                                />
                                                {option.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="my-6 border-t" />

                            <div className="grid grid-cols-2 gap-x-12 gap-y-5">
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground w-28 text-right text-sm">是否免费：</span>
                                    <Switch
                                        checked={filterSettings.isFree}
                                        onCheckedChange={(checked) =>
                                            setFilterSettings((state) => ({
                                                ...state,
                                                isFree: checked,
                                                coinPrice: checked ? 0 : state.coinPrice,
                                            }))
                                        }
                                    />
                                    <ToggleLabel
                                        checked={filterSettings.isFree}
                                        onLabel="免费"
                                        offLabel="付费"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground w-28 text-right text-sm">金币价格：</span>
                                    <Stepper
                                        value={filterSettings.coinPrice}
                                        min={0}
                                        onChange={(value) =>
                                            setFilterSettings((state) => ({
                                                ...state,
                                                coinPrice: value ?? 0,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground w-28 text-right text-sm">VIP免费：</span>
                                    <Switch
                                        checked={filterSettings.vipFree}
                                        onCheckedChange={(checked) =>
                                            setFilterSettings((state) => ({
                                                ...state,
                                                vipFree: checked,
                                            }))
                                        }
                                    />
                                    <span className="text-sm">{filterSettings.vipFree ? "是" : "否"}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground w-28 text-right text-sm">状态：</span>
                                    <StatusSelect
                                        value={filterSettings.status}
                                        onChange={(value) =>
                                            setFilterSettings((state) => ({ ...state, status: value }))
                                        }
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="all" className="mt-0">
                            <div className="grid grid-cols-2 gap-x-12 gap-y-5">
                                <div className="col-span-2 flex items-center gap-3">
                                    <span className="text-muted-foreground w-28 text-right text-sm">价格设置</span>
                                    <span className="text-muted-foreground text-sm">是否免费：</span>
                                    <Switch
                                        checked={allSettings.isFree}
                                        onCheckedChange={(checked) =>
                                            setAllSettings((state) => ({
                                                ...state,
                                                isFree: checked,
                                                coinPrice: checked ? 0 : state.coinPrice,
                                            }))
                                        }
                                    />
                                    <ToggleLabel
                                        checked={allSettings.isFree}
                                        onLabel="全部免费"
                                        offLabel="全部付费"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground w-28 text-right text-sm">金币价格：</span>
                                    <Stepper
                                        value={allSettings.coinPrice}
                                        min={0}
                                        onChange={(value) =>
                                            setAllSettings((state) => ({ ...state, coinPrice: value ?? 0 }))
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground w-28 text-right text-sm">VIP免费：</span>
                                    <Switch
                                        checked={allSettings.vipFree}
                                        onCheckedChange={(checked) =>
                                            setAllSettings((state) => ({ ...state, vipFree: checked }))
                                        }
                                    />
                                    <ToggleLabel
                                        checked={allSettings.vipFree}
                                        onLabel="全部VIP"
                                        offLabel="全部非VIP"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground w-28 text-right text-sm">状态：</span>
                                    <StatusSelect
                                        value={allSettings.status}
                                        onChange={(value) => setAllSettings((state) => ({ ...state, status: value }))}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-2 rounded-md bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                                <TriangleAlert className="size-4 shrink-0" />
                                此操作将覆盖该短剧下所有剧集的设置，请谨慎操作
                            </div>
                        </TabsContent>

                        <TabsContent value="template" className="mt-0">
                            <div className="grid grid-cols-3 gap-4">
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setTemplateId("freeFirst")}
                                    className={cn(
                                        "flex flex-col gap-3 rounded-md border p-4",
                                        templateId === "freeFirst" && "ring-primary ring-1",
                                    )}
                                >
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Star className="size-4 text-emerald-500" />
                                        前几集免费
                                    </div>
                                    <div className="text-muted-foreground space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            前
                                            <Stepper
                                                value={freeCount}
                                                min={1}
                                                onChange={(value) => setFreeCount(value ?? 1)}
                                            />
                                            集免费
                                        </div>
                                        <div className="flex items-center gap-2">
                                            其余剧集
                                            <Stepper
                                                value={restPrice}
                                                min={0}
                                                onChange={(value) => setRestPrice(value ?? 0)}
                                            />
                                            金币
                                        </div>
                                    </div>
                                    <Button
                                        className="mt-auto w-full bg-emerald-500 text-white hover:bg-emerald-600"
                                        loading={applying}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void applyTemplate("freeFirst");
                                        }}
                                    >
                                        应用模板
                                    </Button>
                                </div>

                                {TEMPLATES.slice(1, 3).map((template) => {
                                    const Icon = template.icon;
                                    return (
                                        <div
                                            key={template.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setTemplateId(template.id)}
                                            className={cn(
                                                "flex flex-col gap-3 rounded-md border p-4",
                                                templateId === template.id && "ring-primary ring-1",
                                            )}
                                        >
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <Icon className={cn("size-4", template.color)} />
                                                {template.name}
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                {template.id === "tiered" ? (
                                                    <div className="space-y-1">
                                                        <p>1-10集：5金币</p>
                                                        <p>11-20集：8金币</p>
                                                        <p>21集以后：10金币</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <p>所有剧集设为VIP专享</p>
                                                        <p>非VIP无法观看</p>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                className={cn("mt-auto w-full text-white", template.button)}
                                                loading={applying}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void applyTemplate(template.id);
                                                }}
                                            >
                                                应用模板
                                            </Button>
                                        </div>
                                    );
                                })}

                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setTemplateId("allFree")}
                                    className={cn(
                                        "flex flex-col gap-3 rounded-md border p-4",
                                        templateId === "allFree" && "ring-primary ring-1",
                                    )}
                                >
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Gift className="size-4 text-sky-500" />
                                        全部免费
                                    </div>
                                    <div className="text-muted-foreground space-y-1 text-sm">
                                        <p>所有剧集免费观看</p>
                                        <p>适合宣传推广</p>
                                    </div>
                                    <Button
                                        className="mt-auto w-full bg-sky-500 text-white hover:bg-sky-600"
                                        loading={applying}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void applyTemplate("allFree");
                                        }}
                                    >
                                        应用模板
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <div className="flex justify-end gap-2 border-t px-6 py-3">
                    <Button variant="outline" disabled={applying} onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleConfirm} loading={applying}>
                        确认应用
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        <AlertDialog open={confirmOpen} onOpenChange={(next) => !applying && setConfirmOpen(next)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>确认操作</AlertDialogTitle>
                    <AlertDialogDescription>
                        确定要应用批量设置吗？此操作将覆盖现有设置。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={applying}>取消</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={applying}
                        onClick={(event) => {
                            event.preventDefault();
                            if (pendingPayload) void apply(pendingPayload);
                        }}
                    >
                        确定
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
