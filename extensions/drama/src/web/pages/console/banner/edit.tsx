import { Button } from "@buildingai/ui/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { Switch } from "@buildingai/ui/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
    useBannerListQuery,
    useCreateBannerMutation,
    useDramaListQuery,
    useUpdateBannerMutation,
} from "../../../services";
import type { CreateBannerParams, UpdateBannerParams } from "../../../services/types";

interface BannerEditDialogProps {
    open: boolean;
    id: string | null;
    onClose: (shouldRefresh?: boolean) => void;
}

export default function BannerEditDialog({ open, id, onClose }: BannerEditDialogProps) {
    const [formData, setFormData] = useState<CreateBannerParams>({
        title: "",
        image: "",
        linkType: "drama",
        dramaId: "",
        url: "",
        sort: 0,
        status: true,
    });

    const { data: banners } = useBannerListQuery(undefined, { enabled: open });
    const { data: dramaPage } = useDramaListQuery({ pageSize: 100 });
    const createMutation = useCreateBannerMutation();
    const updateMutation = useUpdateBannerMutation();

    useEffect(() => {
        if (open) {
            const banner = banners?.find((b) => b.id === id);
            if (banner) {
                setFormData({
                    title: banner.title,
                    image: banner.image,
                    linkType: banner.linkType as CreateBannerParams["linkType"],
                    dramaId: banner.dramaId,
                    url: banner.url,
                    sort: banner.sort,
                    status: banner.status,
                    startTime: banner.startTime,
                    endTime: banner.endTime,
                });
            } else {
                setFormData({
                    title: "",
                    image: "",
                    linkType: "drama",
                    dramaId: "",
                    url: "",
                    sort: 0,
                    status: true,
                });
            }
        }
    }, [banners, id, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title?.trim()) {
            toast.error("请输入标题");
            return;
        }
        if (!formData.image) {
            toast.error("请上传轮播图图片");
            return;
        }
        try {
            if (id) {
                const data: UpdateBannerParams = { ...formData };
                await updateMutation.mutateAsync({ id, data });
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
    const dramas = dramaPage?.items ?? [];

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{id ? "编辑轮播图" : "新建轮播图"}</DialogTitle>
                    <DialogDescription>首页轮播图，支持剧目跳转与外部链接</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="banner-title">
                            标题 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="banner-title"
                            value={formData.title}
                            onChange={(e) =>
                                setFormData({ ...formData, title: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>
                            图片 <span className="text-destructive">*</span>
                        </Label>
                        <ImageUpload
                            value={formData.image}
                            onChange={(url) => setFormData({ ...formData, image: url })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>跳转类型</Label>
                            <Select
                                value={formData.linkType}
                                onValueChange={(v) =>
                                    setFormData({
                                        ...formData,
                                        linkType: v as CreateBannerParams["linkType"],
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="drama">跳转剧目</SelectItem>
                                    <SelectItem value="external">外部链接</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>排序</Label>
                            <Input
                                type="number"
                                value={formData.sort ?? 0}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        sort: Number(e.target.value),
                                    })
                                }
                            />
                        </div>
                    </div>

                    {formData.linkType === "drama" ? (
                        <div className="space-y-2">
                            <Label>跳转剧目</Label>
                            <Select
                                value={formData.dramaId || undefined}
                                onValueChange={(v) => setFormData({ ...formData, dramaId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="选择剧目" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dramas.map((drama) => (
                                        <SelectItem key={drama.id} value={drama.id}>
                                            {drama.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>外部链接</Label>
                            <Input
                                value={formData.url || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, url: e.target.value })
                                }
                                placeholder="https://..."
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Switch
                            checked={formData.status ?? true}
                            onCheckedChange={(checked) =>
                                setFormData({ ...formData, status: checked })
                            }
                        />
                        <Label>启用</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onClose()}>
                            取消
                        </Button>
                        <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
                            {isSubmitting ? "保存中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
