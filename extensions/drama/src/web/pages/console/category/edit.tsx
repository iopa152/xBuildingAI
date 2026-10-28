import { Button } from "@buildingai/ui/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useCategoryDetailQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
} from "../../../services";
import type { CreateCategoryParams, UpdateCategoryParams } from "../../../services/types";

interface CategoryEditDialogProps {
    open: boolean;
    id: string | null;
    onClose: (shouldRefresh?: boolean) => void;
}

export default function CategoryEditDialog({ open, id, onClose }: CategoryEditDialogProps) {
    const [formData, setFormData] = useState<CreateCategoryParams>({
        name: "",
        code: "",
        language: "en",
        description: "",
        sort: 0,
        status: true,
    });

    const { data: category, isLoading } = useCategoryDetailQuery(id!, {
        enabled: !!id && open,
    });
    const createMutation = useCreateCategoryMutation();
    const updateMutation = useUpdateCategoryMutation();

    useEffect(() => {
        if (category && id) {
            setFormData({
                name: category.name,
                code: category.code,
                language: category.language,
                icon: category.icon,
                description: category.description || "",
                sort: category.sort || 0,
                status: category.status,
            });
        } else {
            setFormData({
                name: "",
                code: "",
                language: "en",
                description: "",
                sort: 0,
                status: true,
            });
        }
    }, [category, id, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name?.trim()) {
            toast.error("请输入分类名称");
            return;
        }
        if (!formData.code?.trim()) {
            toast.error("请输入分类标识");
            return;
        }

        try {
            if (id) {
                const updateData: UpdateCategoryParams = { ...formData };
                await updateMutation.mutateAsync({ id, data: updateData });
                toast.success("更新成功");
            } else {
                await createMutation.mutateAsync(formData);
                toast.success("创建成功");
            }
            onClose(true);
        } catch (error) {
            console.error(error);
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{id ? "编辑分类" : "新建分类"}</DialogTitle>
                    <DialogDescription>
                        {id ? "编辑短剧分类信息" : "创建新的短剧分类（如 Romance / CEO / Werewolf）"}
                    </DialogDescription>
                </DialogHeader>

                {isLoading && id ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner className="size-8" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    名称 <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    placeholder="如：Romance"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">
                                    标识 <span className="text-destructive">*</span>
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
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="language">语言</Label>
                                <Input
                                    id="language"
                                    value={formData.language || "en"}
                                    onChange={(e) =>
                                        setFormData({ ...formData, language: e.target.value })
                                    }
                                    placeholder="en / zh / ja"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sort">排序</Label>
                                <Input
                                    id="sort"
                                    type="number"
                                    value={formData.sort || 0}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            sort: Number(e.target.value),
                                        })
                                    }
                                    placeholder="数字越大越靠前"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">描述</Label>
                            <Textarea
                                id="description"
                                value={formData.description || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="分类描述（选填）"
                                rows={3}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                id="status"
                                checked={formData.status ?? true}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, status: checked })
                                }
                            />
                            <Label htmlFor="status">启用</Label>
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
                                {isSubmitting ? "保存中..." : "保存"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
