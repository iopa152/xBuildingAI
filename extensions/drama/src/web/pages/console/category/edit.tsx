import { Button } from "@buildingai/ui/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useCategoryDetailQuery,
    useCreateCategoryMutation,
    useLanguageListQuery,
    useUpdateCategoryMutation,
} from "../../../services";
import type { CreateCategoryParams } from "../../../services/types";

interface CategoryEditDialogProps {
    open: boolean;
    id: string | null;
    onClose: (shouldRefresh?: boolean) => void;
}

function Stepper({
    value,
    onChange,
}: {
    value: number;
    onChange: (value: number) => void;
}) {
    const button =
        "text-foreground flex h-full w-9 shrink-0 cursor-pointer items-center justify-center transition-colors hover:bg-muted active:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-40";
    return (
        <div className="flex h-9 w-full items-stretch overflow-hidden rounded-md border">
            <button
                type="button"
                className={button}
                onClick={() => onChange(Math.max(0, value - 1))}
                disabled={value <= 0}
                aria-label="减少"
            >
                <Minus className="h-4 w-4" />
            </button>
            <input
                type="number"
                className="h-full w-full min-w-0 border-x bg-transparent text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={value}
                min={0}
                onChange={(e) => {
                    const next = Number(e.target.value);
                    onChange(Number.isFinite(next) ? Math.max(0, next) : 0);
                }}
            />
            <button
                type="button"
                className={button}
                onClick={() => onChange(value + 1)}
                aria-label="增加"
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function CategoryEditDialog({ open, id, onClose }: CategoryEditDialogProps) {
    const [formData, setFormData] = useState<CreateCategoryParams>({
        code: "",
        name: "",
        icon: "",
        language: "en",
        sort: 0,
        status: true,
    });

    const { data: category, isLoading } = useCategoryDetailQuery(id!, {
        enabled: !!id && open,
    });
    const { data: languages = [] } = useLanguageListQuery();
    const createMutation = useCreateCategoryMutation();
    const updateMutation = useUpdateCategoryMutation();

    useEffect(() => {
        if (!open) return;
        if (category && id) {
            setFormData({
                code: category.code,
                name: category.name,
                icon: category.icon ?? "",
                language: category.language,
                sort: category.sort || 0,
                status: category.status,
            });
        } else {
            setFormData({
                code: "",
                name: "",
                icon: "",
                language: "en",
                sort: 0,
                status: true,
            });
        }
    }, [category, id, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.code?.trim()) {
            toast.error("请输入URL标识");
            return;
        }
        if (!formData.name?.trim()) {
            toast.error("请输入分类名称");
            return;
        }

        const payload: CreateCategoryParams = {
            code: formData.code.trim(),
            name: formData.name.trim(),
            icon: formData.icon?.trim() || undefined,
            language: formData.language || "en",
            sort: formData.sort || 0,
            status: formData.status ?? true,
        };

        try {
            if (id) {
                await updateMutation.mutateAsync({ id, data: payload });
                toast.success("更新成功");
            } else {
                await createMutation.mutateAsync(payload);
                toast.success("添加成功");
            }
            onClose(true);
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;
    const languageOptions = Array.from(
        new Set(["en", ...languages.map((l) => l.code), formData.language || "en"]),
    );
    const languageLabel = (code: string) =>
        languages.find((l) => l.code === code)?.name ?? code;

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle>{id ? "编辑分类" : "添加分类"}</DialogTitle>
                </DialogHeader>

                {isLoading && id ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner className="size-8" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="code">
                                    URL标识 <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({ ...formData, code: e.target.value })
                                    }
                                    placeholder="如：romance"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    分类名称 <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    placeholder="如：都市爱情"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="icon">图标</Label>
                                <Input
                                    id="icon"
                                    value={formData.icon ?? ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, icon: e.target.value })
                                    }
                                    placeholder="请输入emoji图标，如：💙"
                                    className="text-base"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>语言</Label>
                                <Select
                                    value={formData.language || "en"}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, language: value })
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="选择语言" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {languageOptions.map((code) => (
                                            <SelectItem key={code} value={code}>
                                                {languageLabel(code)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>排序</Label>
                                <Stepper
                                    value={formData.sort ?? 0}
                                    onChange={(value) =>
                                        setFormData({ ...formData, sort: value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>状态</Label>
                                <RadioGroup
                                    className="flex h-9 items-center gap-6"
                                    value={formData.status === false ? "hidden" : "visible"}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, status: value === "visible" })
                                    }
                                >
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="visible" id="status-visible" />
                                        <Label htmlFor="status-visible" className="font-normal">
                                            显示
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="hidden" id="status-hidden" />
                                        <Label htmlFor="status-hidden" className="font-normal">
                                            隐藏
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onClose()}
                                disabled={isSubmitting}
                            >
                                取消
                            </Button>
                            <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
                                保存
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
