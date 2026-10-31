import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useCategoryListQuery,
    useCreateDramaMutation,
    useDramaDetailQuery,
    useLanguageListQuery,
    useUpdateDramaMutation,
} from "../../../services";
import type { CreateDramaParams, Drama } from "../../../services/types";

const defaultForm: CreateDramaParams = {
    title: "",
    subtitle: "",
    description: "",
    language: "en",
    status: "draft",
    contentType: 1,
    complete: false,
    featured: false,
    hot: false,
    isNew: false,
    rising: false,
    vipOnly: false,
    exclusive: false,
    episodeCount: 0,
    wholePrice: 0,
    heat: 0,
    viewCount: 0,
    likeCount: 0,
    sort: 0,
    categoryIds: [],
};

const fallbackLanguages = [
    { code: "en", name: "English" },
    { code: "zh", name: "中文" },
    { code: "ja", name: "日本語" },
];

const contentTypeOptions = [
    { value: "1", label: "真人短剧" },
    { value: "2", label: "动漫番剧" },
    { value: "3", label: "AI生成" },
];

const statusOptions = [
    { value: "published", label: "正式上线" },
    { value: "offline", label: "下架隐藏" },
    { value: "draft", label: "预告发布" },
];

const flagOptions: Array<{
    key: Extract<keyof CreateDramaParams, "complete" | "featured" | "hot" | "isNew" | "rising" | "vipOnly" | "exclusive">;
    label: string;
    color: string;
}> = [
    { key: "complete", label: "已完结", color: "text-emerald-600" },
    { key: "featured", label: "精选推荐", color: "text-amber-600" },
    { key: "hot", label: "热门榜单", color: "text-red-500" },
    { key: "isNew", label: "新剧首发", color: "text-sky-600" },
    { key: "rising", label: "飙升榜", color: "text-orange-500" },
    { key: "vipOnly", label: "VIP专属", color: "text-violet-600" },
    { key: "exclusive", label: "独家版权", color: "text-rose-500" },
];

function SectionTitle({ children }: { children: ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <span className="bg-primary h-4 w-1 rounded-sm" />
            <h4 className="text-sm font-semibold">{children}</h4>
        </div>
    );
}

interface DramaFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dramaId?: string;
    onSaved?: () => void;
}

export function DramaFormDialog({ open, onOpenChange, dramaId, onSaved }: DramaFormDialogProps) {
    const [form, setForm] = useState<CreateDramaParams>(defaultForm);
    const [tab, setTab] = useState("basic");
    const [saving, setSaving] = useState(false);

    const { data: categories = [] } = useCategoryListQuery();
    const { data: languages = [] } = useLanguageListQuery();
    const { data: drama, isLoading } = useDramaDetailQuery(dramaId || "", {
        enabled: open && !!dramaId,
    });

    const createMutation = useCreateDramaMutation();
    const updateMutation = useUpdateDramaMutation();

    useEffect(() => {
        if (!open) return;
        setTab("basic");
        if (!dramaId) {
            setForm(defaultForm);
            return;
        }
        if (drama) {
            setForm({
                title: drama.title,
                subtitle: drama.subtitle || "",
                description: drama.description || "",
                language: drama.language || "en",
                coverVertical: drama.coverVertical,
                coverHorizontal: drama.coverHorizontal,
                status: drama.status as Drama["status"] as CreateDramaParams["status"],
                contentType: drama.contentType ?? 1,
                complete: drama.complete,
                featured: drama.featured,
                hot: drama.hot ?? false,
                isNew: drama.isNew ?? false,
                rising: drama.rising ?? false,
                vipOnly: drama.vipOnly ?? false,
                exclusive: drama.exclusive ?? false,
                episodeCount: drama.episodeCount ?? 0,
                wholePrice: drama.wholePrice ?? 0,
                heat: drama.heat ?? 0,
                viewCount: drama.viewCount ?? 0,
                likeCount: drama.likeCount ?? 0,
                sort: drama.sort ?? 0,
                categoryIds: drama.categories?.map((c) => c.id) ?? [],
            });
        }
    }, [open, dramaId, drama]);

    const languageOptions = languages.length
        ? languages.filter((l) => l.status !== false).map((l) => ({ code: l.code, name: l.name }))
        : fallbackLanguages;

    const matchedCategories = categories.filter(
        (cat) => !cat.language || cat.language === form.language,
    );
    const selectedCategories = categories.filter((cat) =>
        form.categoryIds?.includes(cat.id),
    );
    const categoryOptions = [
        ...(matchedCategories.length > 0 ? matchedCategories : categories),
        ...selectedCategories.filter(
            (cat) => !matchedCategories.some((matched) => matched.id === cat.id),
        ),
    ].filter(
        (cat, index, list) => list.findIndex((item) => item.id === cat.id) === index,
    );

    const toggleCategory = (id: string, checked: boolean) => {
        const current = form.categoryIds ?? [];
        setForm({
            ...form,
            categoryIds: checked ? [...current, id] : current.filter((c) => c !== id),
        });
    };

    const handleLanguageChange = (code: string) => {
        setForm({ ...form, language: code, categoryIds: [] });
    };

    const handleSave = async () => {
        if (!form.title?.trim()) {
            toast.error("请输入剧名");
            setTab("basic");
            return;
        }
        if (!form.coverVertical) {
            toast.error("请上传竖版封面");
            setTab("basic");
            return;
        }
        if (!form.language) {
            toast.error("请选择语言地区");
            setTab("basic");
            return;
        }
        if (!form.contentType) {
            toast.error("请选择内容类型");
            setTab("basic");
            return;
        }
        if (!form.categoryIds?.length) {
            toast.error("请至少选择一个分类");
            setTab("basic");
            return;
        }
        setSaving(true);
        try {
            const payload: CreateDramaParams = {
                ...form,
                title: form.title.trim(),
                subtitle: (form.subtitle ?? "").trim(),
            };
            if (dramaId) {
                await updateMutation.mutateAsync({ id: dramaId, data: payload });
                toast.success("保存成功");
            } else {
                await createMutation.mutateAsync(payload);
                toast.success("创建成功");
            }
            onSaved?.();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!saving) onOpenChange(next);
            }}
        >
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[800px]">
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="text-base">
                        {dramaId ? "编辑" : "新建剧目"}
                    </DialogTitle>
                </DialogHeader>

                {dramaId && isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Spinner className="size-7" />
                    </div>
                ) : (
                    <>
                        <Tabs value={tab} onValueChange={setTab} className="gap-0">
                            <div className="border-b px-6">
                                <TabsList variant="line" className="h-11">
                                    <TabsTrigger value="basic">基础配置</TabsTrigger>
                                    <TabsTrigger value="ops">运营设置</TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
                                <TabsContent value="basic" className="mt-0 space-y-6">
                                    <div className="space-y-4">
                                        <SectionTitle>基本信息</SectionTitle>
                                        <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                                            <div className="col-span-2 space-y-2">
                                                <Label htmlFor="drama-title">
                                                    剧名 <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    id="drama-title"
                                                    value={form.title}
                                                    maxLength={255}
                                                    placeholder="请输入剧名"
                                                    onChange={(e) =>
                                                        setForm({ ...form, title: e.target.value })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="drama-subtitle">副标题</Label>
                                                <Input
                                                    id="drama-subtitle"
                                                    value={form.subtitle || ""}
                                                    maxLength={255}
                                                    placeholder="选填"
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            subtitle: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="col-span-3 space-y-2">
                                                <Label htmlFor="drama-description">剧情简介</Label>
                                                <Textarea
                                                    id="drama-description"
                                                    value={form.description || ""}
                                                    rows={3}
                                                    placeholder="请输入剧情简介"
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            description: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>
                                                    竖版封面{" "}
                                                    <span className="text-destructive">*</span>
                                                </Label>
                                                <ImageUpload
                                                    value={form.coverVertical}
                                                    size="xl"
                                                    onChange={(url) =>
                                                        setForm({
                                                            ...form,
                                                            coverVertical: url,
                                                        })
                                                    }
                                                />
                                                <p className="text-muted-foreground text-xs">
                                                    建议尺寸 9:16 (720x1280)
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>横版封面</Label>
                                                <ImageUpload
                                                    value={form.coverHorizontal}
                                                    size="xl"
                                                    onChange={(url) =>
                                                        setForm({
                                                            ...form,
                                                            coverHorizontal: url,
                                                        })
                                                    }
                                                />
                                                <p className="text-muted-foreground text-xs">
                                                    建议尺寸 16:9 (1920x1080)
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <SectionTitle>分类与属性</SectionTitle>
                                        <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                                            <div className="space-y-2">
                                                <Label>
                                                    语言地区{" "}
                                                    <span className="text-destructive">*</span>
                                                </Label>
                                                <Select
                                                    value={form.language}
                                                    onValueChange={handleLanguageChange}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="请选择语言" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {languageOptions.map((lang) => (
                                                            <SelectItem
                                                                key={lang.code}
                                                                value={lang.code}
                                                            >
                                                                {lang.name} ({lang.code})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>
                                                    内容类型{" "}
                                                    <span className="text-destructive">*</span>
                                                </Label>
                                                <Select
                                                    value={String(form.contentType ?? 1)}
                                                    onValueChange={(v) =>
                                                        setForm({
                                                            ...form,
                                                            contentType: Number(v),
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="请选择内容类型" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {contentTypeOptions.map((opt) => (
                                                            <SelectItem
                                                                key={opt.value}
                                                                value={opt.value}
                                                            >
                                                                {opt.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>
                                                    当前状态{" "}
                                                    <span className="text-destructive">*</span>
                                                </Label>
                                                <Select
                                                    value={String(form.status ?? "draft")}
                                                    onValueChange={(v) =>
                                                        setForm({
                                                            ...form,
                                                            status: v as CreateDramaParams["status"],
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="请选择状态" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {statusOptions.map((opt) => (
                                                            <SelectItem
                                                                key={opt.value}
                                                                value={opt.value}
                                                            >
                                                                {opt.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-3 space-y-2">
                                                <Label>
                                                    所属分类{" "}
                                                    <span className="text-destructive">*</span>
                                                </Label>
                                                <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-2 rounded-md border px-3 py-2">
                                                    {categoryOptions.map((cat) => (
                                                        <label
                                                            key={cat.id}
                                                            className="flex items-center gap-2 text-sm"
                                                        >
                                                            <Checkbox
                                                                checked={form.categoryIds?.includes(
                                                                    cat.id,
                                                                )}
                                                                onCheckedChange={(checked) =>
                                                                    toggleCategory(
                                                                        cat.id,
                                                                        !!checked,
                                                                    )
                                                                }
                                                            />
                                                            {cat.name}
                                                        </label>
                                                    ))}
                                                    {categoryOptions.length === 0 && (
                                                        <span className="text-muted-foreground text-sm">
                                                            暂无分类，请先到「短剧分类管理」创建
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="drama-episode-count">总集数</Label>
                                                <Input
                                                    id="drama-episode-count"
                                                    type="number"
                                                    min={0}
                                                    value={form.episodeCount ?? 0}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            episodeCount: Number(e.target.value) || 0,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="drama-whole-price">
                                                    整剧价格（金币）
                                                </Label>
                                                <Input
                                                    id="drama-whole-price"
                                                    type="number"
                                                    min={0}
                                                    value={form.wholePrice ?? 0}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            wholePrice: Number(e.target.value) || 0,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="drama-sort">排序</Label>
                                                <Input
                                                    id="drama-sort"
                                                    type="number"
                                                    value={form.sort ?? 0}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            sort: Number(e.target.value) || 0,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="ops" className="mt-0 space-y-6">
                                    <div className="space-y-4">
                                        <SectionTitle>运营标记</SectionTitle>
                                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                                            {flagOptions.map((flag) => (
                                                <label
                                                    key={flag.key}
                                                    className="flex items-center gap-2 text-sm"
                                                >
                                                    <Checkbox
                                                        checked={!!form[flag.key]}
                                                        onCheckedChange={(checked) =>
                                                            setForm({
                                                                ...form,
                                                                [flag.key]: !!checked,
                                                            })
                                                        }
                                                    />
                                                    <span className={flag.color}>{flag.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <SectionTitle>初始数据（运营干预）</SectionTitle>
                                        <p className="text-muted-foreground text-xs">
                                            用于展示层数据干预，不改变真实统计
                                        </p>
                                        <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="drama-view-count">初始播放</Label>
                                                <Input
                                                    id="drama-view-count"
                                                    type="number"
                                                    min={0}
                                                    value={form.viewCount ?? 0}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            viewCount: Number(e.target.value) || 0,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="drama-like-count">初始点赞</Label>
                                                <Input
                                                    id="drama-like-count"
                                                    type="number"
                                                    min={0}
                                                    value={form.likeCount ?? 0}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            likeCount: Number(e.target.value) || 0,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="drama-heat">初始热度</Label>
                                                <Input
                                                    id="drama-heat"
                                                    type="number"
                                                    min={0}
                                                    step={100}
                                                    value={form.heat ?? 0}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            heat: Number(e.target.value) || 0,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>

                        <div className="flex justify-end gap-2 border-t px-6 py-3">
                            <Button
                                variant="outline"
                                disabled={saving}
                                onClick={() => onOpenChange(false)}
                            >
                                关闭
                            </Button>
                            <Button onClick={handleSave} loading={saving}>
                                保存配置
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
