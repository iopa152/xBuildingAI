import { uploadFile } from "@buildingai/services/shared";
import { Button } from "@buildingai/ui/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@buildingai/ui/components/ui/radio-group";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Film, FolderOpen, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useSaveEpisodeMutation } from "../../../services";
import type { Episode } from "../../../services/types";
import { FilePickerDialog } from "./FilePickerDialog";

interface EpisodeFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dramaId: string;
    episode?: Episode | null;
    defaultEpisodeNo?: number;
    onSaved: () => void;
}

interface FormState {
    episodeNo: number;
    status: "draft" | "published";
    title: string;
    description: string;
    videoUrl: string;
    thumbnail: string;
    duration: number;
    playCount: number;
    isFree: boolean;
    vipFree: boolean;
    coinPrice: number;
    publishTime: string;
}

function toLocalInput(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(episodeNo: number): FormState {
    return {
        episodeNo,
        status: "published",
        title: "",
        description: "",
        videoUrl: "",
        thumbnail: "",
        duration: 0,
        playCount: 0,
        isFree: false,
        vipFree: false,
        coinPrice: 0,
        publishTime: "",
    };
}

export function EpisodeFormDialog({
    open,
    onOpenChange,
    dramaId,
    episode,
    defaultEpisodeNo = 1,
    onSaved,
}: EpisodeFormDialogProps) {
    const [form, setForm] = useState<FormState>(emptyForm(defaultEpisodeNo));
    const [pickerOpen, setPickerOpen] = useState(false);
    const [thumbPickerOpen, setThumbPickerOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveMutation = useSaveEpisodeMutation();

    useEffect(() => {
        if (!open) return;
        if (episode) {
            setForm({
                episodeNo: episode.episodeNo,
                status: episode.status === "draft" ? "draft" : "published",
                title: episode.title ?? "",
                description: episode.description ?? "",
                videoUrl: episode.videoUrl ?? "",
                thumbnail: episode.thumbnail ?? "",
                duration: episode.duration ?? 0,
                playCount: episode.playCount ?? 0,
                isFree: episode.isFree,
                vipFree: episode.vipFree,
                coinPrice: episode.coinPrice ?? 0,
                publishTime: toLocalInput(episode.publishTime),
            });
        } else {
            setForm(emptyForm(defaultEpisodeNo));
        }
    }, [open, episode, defaultEpisodeNo]);

    const patch = (next: Partial<FormState>) => setForm((prev) => ({ ...prev, ...next }));

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const result = await uploadFile(file);
            patch({ videoUrl: result.url });
            toast.success("视频上传成功");
        } catch (error) {
            console.error(error);
            toast.error("视频上传失败");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!form.episodeNo || form.episodeNo < 1) {
            toast.error("请输入正确的集数");
            return;
        }
        if (!form.videoUrl.trim()) {
            toast.error("请上传或选择视频文件");
            return;
        }
        try {
            await saveMutation.mutateAsync({
                dramaId,
                episodeNo: Number(form.episodeNo),
                title: form.title || undefined,
                description: form.description || undefined,
                videoUrl: form.videoUrl.trim(),
                thumbnail: form.thumbnail || undefined,
                duration: Number(form.duration) || 0,
                playCount: Number(form.playCount) || 0,
                isFree: form.isFree,
                vipFree: form.vipFree,
                coinPrice: form.isFree ? 0 : Number(form.coinPrice) || 0,
                status: form.status,
                publishTime: form.publishTime
                    ? new Date(form.publishTime).toISOString()
                    : null,
            });
            toast.success(episode ? "剧集已更新" : "剧集已添加");
            onOpenChange(false);
            onSaved();
        } catch (error) {
            console.error(error);
        }
    };

    const videoName = form.videoUrl
        ? decodeURIComponent(form.videoUrl.split("/").pop() || form.videoUrl)
        : "";

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(next) => {
                    if (!saveMutation.isPending) onOpenChange(next);
                }}
            >
                <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[820px]">
                    <DialogHeader className="border-b px-6 py-4">
                        <DialogTitle className="text-base">
                            {episode ? "编辑剧集" : "添加剧集"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="max-h-[68vh] space-y-5 overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="episode-no">
                                    集数 <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="episode-no"
                                    type="number"
                                    min={1}
                                    value={form.episodeNo}
                                    onChange={(e) =>
                                        patch({ episodeNo: Number(e.target.value) || 0 })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>状态</Label>
                                <RadioGroup
                                    value={form.status}
                                    onValueChange={(v) =>
                                        patch({ status: v as FormState["status"] })
                                    }
                                    className="flex h-9 items-center gap-6"
                                >
                                    <label className="flex items-center gap-2 text-sm">
                                        <RadioGroupItem value="draft" id="episode-status-draft" />
                                        待上线
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <RadioGroupItem
                                            value="published"
                                            id="episode-status-published"
                                        />
                                        已上线
                                    </label>
                                </RadioGroup>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="episode-title">标题</Label>
                                <Input
                                    id="episode-title"
                                    value={form.title}
                                    maxLength={255}
                                    placeholder="选填，默认显示为第 N 集"
                                    onChange={(e) => patch({ title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="episode-duration">时长（秒）</Label>
                                <Input
                                    id="episode-duration"
                                    type="number"
                                    min={0}
                                    value={form.duration}
                                    onChange={(e) =>
                                        patch({ duration: Number(e.target.value) || 0 })
                                    }
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="episode-description">简介</Label>
                                <Textarea
                                    id="episode-description"
                                    value={form.description}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="请输入本集简介"
                                    onChange={(e) => patch({ description: e.target.value })}
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label>
                                    视频文件 <span className="text-destructive">*</span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    <div className="bg-muted/40 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border px-3">
                                        <Film className="text-muted-foreground h-4 w-4 shrink-0" />
                                        <span
                                            className="truncate text-sm"
                                            title={form.videoUrl}
                                        >
                                            {uploading
                                                ? "上传中..."
                                                : videoName || "未选择视频文件"}
                                        </span>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUpload(file);
                                            e.target.value = "";
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                    >
                                        {uploading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : null}
                                        上传
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setPickerOpen(true)}
                                    >
                                        <FolderOpen className="h-4 w-4" />
                                        选择
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>缩略图</Label>
                                    <button
                                        type="button"
                                        className="text-primary text-xs hover:underline"
                                        onClick={() => setThumbPickerOpen(true)}
                                    >
                                        从媒体库选择
                                    </button>
                                </div>
                                <ImageUpload
                                    value={form.thumbnail}
                                    size="lg"
                                    onChange={(url) => patch({ thumbnail: url ?? "" })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="episode-play-count">播放次数</Label>
                                <Input
                                    id="episode-play-count"
                                    type="number"
                                    min={0}
                                    value={form.playCount}
                                    onChange={(e) =>
                                        patch({ playCount: Number(e.target.value) || 0 })
                                    }
                                />
                            </div>

                            <div className="col-span-2 space-y-3 rounded-md border p-4">
                                <p className="text-sm font-medium">价格设置</p>
                                <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
                                    <label className="flex items-center gap-2 text-sm">
                                        <Switch
                                            checked={form.isFree}
                                            onCheckedChange={(checked) =>
                                                patch({
                                                    isFree: checked,
                                                    ...(checked ? { coinPrice: 0 } : {}),
                                                })
                                            }
                                        />
                                        是否免费
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <Switch
                                            checked={form.vipFree}
                                            onCheckedChange={(checked) =>
                                                patch({ vipFree: checked })
                                            }
                                        />
                                        VIP免费
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Label
                                            htmlFor="episode-coin-price"
                                            className="text-muted-foreground text-sm font-normal"
                                        >
                                            金币价格
                                        </Label>
                                        <Input
                                            id="episode-coin-price"
                                            type="number"
                                            min={0}
                                            className="w-28"
                                            disabled={form.isFree}
                                            value={form.coinPrice}
                                            onChange={(e) =>
                                                patch({
                                                    coinPrice: Number(e.target.value) || 0,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="episode-publish-time">上线时间</Label>
                                <Input
                                    id="episode-publish-time"
                                    type="datetime-local"
                                    value={form.publishTime}
                                    onChange={(e) => patch({ publishTime: e.target.value })}
                                />
                                <p className="text-muted-foreground text-xs">
                                    留空表示立即上线
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t px-6 py-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={saveMutation.isPending}
                        >
                            取消
                        </Button>
                        <Button
                            onClick={handleSave}
                            loading={saveMutation.isPending}
                            disabled={uploading}
                        >
                            {episode ? "更新" : "保存"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <FilePickerDialog
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                accept="video"
                onSelect={(file) => patch({ videoUrl: file.url })}
            />

            <FilePickerDialog
                open={thumbPickerOpen}
                onOpenChange={setThumbPickerOpen}
                accept="image"
                onSelect={(file) => patch({ thumbnail: file.url })}
            />
        </>
    );
}
