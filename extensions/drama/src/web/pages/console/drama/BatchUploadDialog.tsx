import { uploadFile } from "@buildingai/services/shared";
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
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Progress } from "@buildingai/ui/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
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
    AlertCircle,
    CheckCircle2,
    CloudUpload,
    FileVideo,
    Minus,
    Plus,
    RotateCw,
    Trash,
} from "lucide-react";
import { type DragEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { useSaveEpisodeMutation } from "../../../services";

interface BatchUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dramaId: string;
    nextEpisodeNo: number;
    existingNos: number[];
    onUploaded: () => void;
}

type UploadState = "pending" | "uploading" | "success" | "failed";

interface UploadRow {
    key: string;
    file: File;
    episodeNo: number;
    title: string;
    isFree: boolean;
    coinPrice: number;
    vipFree: boolean;
    status: "draft" | "published";
    selected: boolean;
    state: UploadState;
    progress: number;
    message?: string;
}

const VIDEO_EXTS = ["mp4", "avi", "mov", "mkv", "webm", "flv", "m4v", "wmv"];

function isVideoFile(file: File) {
    if (file.type.startsWith("video/")) return true;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    return VIDEO_EXTS.includes(ext);
}

function Stepper({
    value,
    min = 0,
    max = 999999,
    onChange,
    disabled,
}: {
    value: number;
    min?: number;
    max?: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}) {
    const clamp = (next: number) => Math.min(max, Math.max(min, next));
    const stepButton =
        "text-foreground flex h-full w-8 shrink-0 cursor-pointer items-center justify-center transition-colors hover:bg-muted active:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-40";
    return (
        <div
            className={`flex h-8 w-full min-w-[92px] items-stretch overflow-hidden rounded-md border ${
                disabled ? "opacity-50" : ""
            }`}
        >
            <button
                type="button"
                className={stepButton}
                onClick={(e) => {
                    e.stopPropagation();
                    onChange(clamp(value - 1));
                }}
                disabled={disabled || value <= min}
                aria-label="减少"
            >
                <Minus className="h-3.5 w-3.5" />
            </button>
            <input
                type="number"
                className="h-full w-full min-w-0 border-x bg-transparent text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={value}
                min={min}
                max={max}
                disabled={disabled}
                onChange={(e) => {
                    const next = Number(e.target.value);
                    onChange(Number.isFinite(next) ? clamp(next) : min);
                }}
            />
            <button
                type="button"
                className={stepButton}
                onClick={(e) => {
                    e.stopPropagation();
                    onChange(clamp(value + 1));
                }}
                disabled={disabled || value >= max}
                aria-label="增加"
            >
                <Plus className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

export function BatchUploadDialog({
    open,
    onOpenChange,
    dramaId,
    nextEpisodeNo,
    existingNos,
    onUploaded,
}: BatchUploadDialogProps) {
    const saveEpisode = useSaveEpisodeMutation();

    const [rows, setRows] = useState<UploadRow[]>([]);
    const [uploading, setUploading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [allSelected, setAllSelected] = useState(false);

    // batch settings defaults applied to newly added rows / selected rows
    const [batchFree, setBatchFree] = useState(false);
    const [batchVipFree, setBatchVipFree] = useState(false);
    const [batchCoinPrice, setBatchCoinPrice] = useState(0);
    const [batchStatus, setBatchStatus] = useState<"draft" | "published">("draft");
    const [applyingSettings, setApplyingSettings] = useState(false);

    useEffect(() => {
        if (!open) {
            setRows([]);
            setUploading(false);
            setConfirmOpen(false);
            setDragging(false);
            setAllSelected(false);
            setBatchFree(false);
            setBatchVipFree(false);
            setBatchCoinPrice(0);
            setBatchStatus("draft");
        }
    }, [open]);

    useEffect(() => {
        setAllSelected(rows.length > 0 && rows.every((row) => row.selected));
    }, [rows]);

    const patchRow = (key: string, patch: Partial<UploadRow>) => {
        setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    };

    const addFiles = (files: FileList | File[]) => {
        const list = Array.from(files).filter(isVideoFile);
        if (list.length === 0) {
            toast.error("请选择视频文件（mp4 / avi / mov 等）");
            return;
        }
        setRows((prev) => {
            const used = new Set<number>([
                ...existingNos,
                ...prev.map((row) => row.episodeNo),
            ]);
            let nextNo = nextEpisodeNo;
            const additions = list.map((file, index) => {
                while (used.has(nextNo)) nextNo += 1;
                const no = nextNo;
                used.add(no);
                nextNo += 1;
                return {
                    key: `${Date.now()}-${index}-${file.name}`,
                    file,
                    episodeNo: no,
                    title: `第${no}集`,
                    isFree: batchFree,
                    coinPrice: batchFree ? 0 : batchCoinPrice,
                    vipFree: batchVipFree,
                    status: batchStatus,
                    selected: true,
                    state: "pending" as UploadState,
                    progress: 0,
                };
            });
            return [...prev, ...additions];
        });
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    };

    const removeRow = (key: string) => {
        setRows((prev) => prev.filter((row) => row.key !== key));
    };

    const applyToSelected = () => {
        const selected = rows.filter((row) => row.selected && row.state !== "success");
        if (selected.length === 0) {
            toast.warning("请先勾选要应用设置的剧集");
            return;
        }
        setApplyingSettings(true);
        setRows((prev) =>
            prev.map((row) =>
                row.selected && row.state !== "success"
                    ? {
                          ...row,
                          isFree: batchFree,
                          vipFree: batchVipFree,
                          coinPrice: batchFree ? 0 : batchCoinPrice,
                          status: batchStatus,
                      }
                    : row,
            ),
        );
        setTimeout(() => setApplyingSettings(false), 200);
        toast.success(`已应用到 ${selected.length} 个剧集`);
    };

    const pendingRows = rows.filter((row) => row.state === "pending" || row.state === "failed");
    const successCount = rows.filter((row) => row.state === "success").length;
    const failedCount = rows.filter((row) => row.state === "failed").length;

    const handleStartUpload = () => {
        if (pendingRows.length === 0) {
            toast.warning("没有待上传的文件");
            return;
        }
        const nos = pendingRows.map((row) => row.episodeNo);
        if (new Set(nos).size !== nos.length) {
            toast.error("存在重复的集数，请调整后再上传");
            return;
        }
        setConfirmOpen(true);
    };

    const runUpload = async () => {
        setUploading(true);
        for (const row of pendingRows) {
            patchRow(row.key, { state: "uploading", message: undefined, progress: 0 });
            try {
                const uploaded = await uploadFile(row.file, undefined, {
                    onUploadProgress: (event) => {
                        if (!event.total) return;
                        const percent = Math.min(
                            100,
                            Math.round((event.loaded / event.total) * 100),
                        );
                        patchRow(row.key, { progress: percent });
                    },
                });
                patchRow(row.key, { progress: 100 });
                await saveEpisode.mutateAsync({
                    dramaId,
                    episodeNo: row.episodeNo,
                    title: row.title || undefined,
                    videoUrl: uploaded.url,
                    duration: 0,
                    playCount: 0,
                    isFree: row.isFree,
                    vipFree: row.vipFree,
                    coinPrice: row.isFree ? 0 : row.coinPrice,
                    status: row.status,
                });
                patchRow(row.key, { state: "success", progress: 100 });
            } catch (error) {
                console.error(error);
                patchRow(row.key, {
                    state: "failed",
                    message: error instanceof Error ? error.message : "上传失败",
                });
            }
        }
        setUploading(false);
        onUploaded();
    };

    return (
        <>
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!uploading) onOpenChange(next);
            }}
        >
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[1120px]">
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="text-base">批量上传剧集</DialogTitle>
                </DialogHeader>

                <div className="max-h-[76vh] space-y-4 overflow-y-auto px-6 py-4">
                    <div className="bg-muted/40 space-y-2 rounded-md border p-4 text-sm">
                        <p className="font-medium">批量上传说明</p>
                        <Badge className="bg-emerald-500 text-white">当前使用：本地存储</Badge>
                        <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-xs">
                            <li>支持批量选择或拖拽多个视频文件</li>
                            <li>上传后可以编辑每个剧集的信息（集数、标题、价格等）</li>
                            <li>集数必须唯一，重复的集数将无法提交</li>
                            <li>点击"批量设置"可以快速设置选中剧集的价格和VIP设置</li>
                            <li>上传失败的文件可以点击"重试"按钮重新上传</li>
                        </ol>
                    </div>

                    <div className="rounded-md border">
                        <div className="flex items-center justify-between border-b px-4 py-2.5">
                            <p className="text-sm font-medium">批量设置</p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const target = !allSelected;
                                        setRows((prev) =>
                                            prev.map((row) =>
                                                row.state === "success"
                                                    ? row
                                                    : { ...row, selected: target },
                                            ),
                                        );
                                    }}
                                    disabled={rows.length === 0}
                                >
                                    全选
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={applyToSelected}
                                    disabled={
                                        rows.filter(
                                            (row) => row.selected && row.state !== "success",
                                        ).length === 0 || applyingSettings
                                    }
                                >
                                    应用到选中（
                                    {
                                        rows.filter(
                                            (row) => row.selected && row.state !== "success",
                                        ).length
                                    }
                                    个）
                                </Button>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
                            <label className="flex items-center gap-2 text-sm">
                                <Switch checked={batchFree} onCheckedChange={setBatchFree} />
                                是否免费
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <Switch checked={batchVipFree} onCheckedChange={setBatchVipFree} />
                                VIP免费
                            </label>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">金币价格</span>
                                <Stepper value={batchCoinPrice} onChange={setBatchCoinPrice} />
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="text-muted-foreground">状态</span>
                                <label className="flex items-center gap-1.5">
                                    <input
                                        type="radio"
                                        name="batch-upload-status"
                                        className="accent-primary"
                                        checked={batchStatus === "draft"}
                                        onChange={() => setBatchStatus("draft")}
                                    />
                                    待上线
                                </label>
                                <label className="flex items-center gap-1.5">
                                    <input
                                        type="radio"
                                        name="batch-upload-status"
                                        className="accent-primary"
                                        checked={batchStatus === "published"}
                                        onChange={() => setBatchStatus("published")}
                                    />
                                    已上线
                                </label>
                            </div>
                        </div>
                    </div>

                    <div
                        role="button"
                        tabIndex={0}
                        className={`hover:border-primary/60 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed py-10 transition-colors ${
                            dragging ? "border-primary bg-primary/5" : ""
                        }`}
                        onClick={() => document.getElementById("batch-upload-input")?.click()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                document.getElementById("batch-upload-input")?.click();
                            }
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                    >
                        <CloudUpload className="text-muted-foreground h-10 w-10" />
                        <p className="text-sm">
                            拖拽视频文件到此处或
                            <span className="text-primary">点击上传</span>
                        </p>
                        <input
                            id="batch-upload-input"
                            type="file"
                            accept="video/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files) addFiles(e.target.files);
                                e.target.value = "";
                            }}
                        />
                    </div>
                    <p className="text-muted-foreground text-xs">支持 mp4、avi、mov 等视频格式</p>

                    {rows.length > 0 && (
                        <div className="overflow-hidden rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead className="w-10" />
                                        <TableHead className="w-14">序号</TableHead>
                                        <TableHead className="min-w-[160px]">文件名</TableHead>
                                        <TableHead className="w-28">集数</TableHead>
                                        <TableHead className="w-32">标题</TableHead>
                                        <TableHead className="w-20">免费</TableHead>
                                        <TableHead className="w-28">金币</TableHead>
                                        <TableHead className="w-20">VIP</TableHead>
                                        <TableHead className="w-28">状态</TableHead>
                                        <TableHead className="w-32">上传状态</TableHead>
                                        <TableHead className="w-16">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row, index) => {
                                        const locked = row.state === "uploading" || uploading;
                                        return (
                                            <TableRow key={row.key}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={row.selected}
                                                        disabled={row.state === "success"}
                                                        onCheckedChange={(checked) =>
                                                            patchRow(row.key, {
                                                                selected: !!checked,
                                                            })
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <span
                                                        className="flex items-center gap-1.5"
                                                        title={row.file.name}
                                                    >
                                                        <FileVideo className="text-muted-foreground h-4 w-4 shrink-0" />
                                                        <span className="max-w-[200px] truncate text-sm">
                                                            {row.file.name}
                                                        </span>
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Stepper
                                                        value={row.episodeNo}
                                                        min={1}
                                                        disabled={locked}
                                                        onChange={(value) =>
                                                            patchRow(row.key, {
                                                                episodeNo: value,
                                                            })
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="h-8"
                                                        value={row.title}
                                                        disabled={locked}
                                                        onChange={(e) =>
                                                            patchRow(row.key, {
                                                                title: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Switch
                                                        checked={row.isFree}
                                                        disabled={locked}
                                                        onCheckedChange={(checked) =>
                                                            patchRow(row.key, {
                                                                isFree: checked,
                                                                ...(checked
                                                                    ? { coinPrice: 0 }
                                                                    : {}),
                                                            })
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Stepper
                                                        value={row.coinPrice}
                                                        disabled={locked || row.isFree}
                                                        onChange={(value) =>
                                                            patchRow(row.key, {
                                                                coinPrice: value,
                                                            })
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Switch
                                                        checked={row.vipFree}
                                                        disabled={locked}
                                                        onCheckedChange={(checked) =>
                                                            patchRow(row.key, {
                                                                vipFree: checked,
                                                            })
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={row.status}
                                                        disabled={locked}
                                                        onValueChange={(value) =>
                                                            patchRow(row.key, {
                                                                status: value as UploadRow["status"],
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="draft">
                                                                待上线
                                                            </SelectItem>
                                                            <SelectItem value="published">
                                                                已上线
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <UploadStateCell
                                                        row={row}
                                                        onRetry={() => {
                                                            setRows((prev) =>
                                                                prev.map((item) =>
                                                                    item.key === row.key
                                                                        ? {
                                                                              ...item,
                                                                              state: "pending",
                                                                              progress: 0,
                                                                              message: undefined,
                                                                          }
                                                                        : item,
                                                                ),
                                                            );
                                                        }}
                                                        disabled={uploading}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        disabled={locked}
                                                        onClick={() => removeRow(row.key)}
                                                    >
                                                        <Trash className="text-destructive h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-row items-center justify-between border-t px-6 py-3 sm:justify-between">
                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                        <span>
                            待上传：<span className="text-foreground">{pendingRows.length}</span>
                        </span>
                        <span>
                            成功：<span className="text-emerald-600">{successCount}</span>
                        </span>
                        <span>
                            失败：<span className="text-destructive">{failedCount}</span>
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={uploading}
                        >
                            取消
                        </Button>
                        <Button
                            onClick={handleStartUpload}
                            disabled={uploading || pendingRows.length === 0}
                        >
                            {uploading && <Spinner className="size-4" />}
                            {uploading
                                ? "上传中..."
                                : `开始上传（${pendingRows.length} 个文件）`}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>确认上传</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>确定要上传 {pendingRows.length} 个剧集吗？</span>
                </div>
                <AlertDialogDescription className="sr-only">
                    确认后将依次上传选中的视频文件并创建剧集
                </AlertDialogDescription>
                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            setConfirmOpen(false);
                            void runUpload();
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

function UploadStateCell({
    row,
    onRetry,
    disabled,
}: {
    row: UploadRow;
    onRetry: () => void;
    disabled: boolean;
}) {
    if (row.state === "uploading") {
        return (
            <div className="space-y-1">
                <Progress value={row.progress} className="h-1.5" />
                <span className="text-muted-foreground block text-center text-[10px]">
                    {row.progress}%
                </span>
            </div>
        );
    }
    if (row.state === "success") {
        return (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                已成功
            </span>
        );
    }
    if (row.state === "failed") {
        return (
            <span className="text-destructive flex items-center gap-1 text-xs" title={row.message}>
                <AlertCircle className="h-3.5 w-3.5" />
                失败
                <button
                    type="button"
                    className="text-primary ml-1 inline-flex items-center gap-0.5 hover:underline"
                    onClick={onRetry}
                    disabled={disabled}
                >
                    <RotateCw className="h-3 w-3" />
                    重试
                </button>
            </span>
        );
    }
    return <span className="text-muted-foreground text-xs">等待上传</span>;
}
