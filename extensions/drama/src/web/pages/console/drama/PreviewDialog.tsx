import { Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { cn } from "@buildingai/ui/lib/utils";

import { useEpisodeListQuery } from "../../../services";

interface PreviewDrama {
    id: string;
    title: string;
    coverVertical?: string;
}

interface PreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    drama?: PreviewDrama | null;
}

const formatDuration = (seconds?: number) => {
    const total = Math.max(0, Math.floor(seconds ?? 0));
    const minutes = String(Math.floor(total / 60)).padStart(2, "0");
    const rest = String(total % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
};

export function PreviewDialog({ open, onOpenChange, drama }: PreviewDialogProps) {
    const [selectedId, setSelectedId] = useState("");
    const [lastDrama, setLastDrama] = useState<PreviewDrama | null>(null);

    useEffect(() => {
        if (drama) setLastDrama(drama);
    }, [drama]);

    const info = drama ?? lastDrama;
    const dramaId = info?.id ?? "";

    const { data: episodes = [], isLoading } = useEpisodeListQuery(dramaId, {
        enabled: open && !!dramaId,
    });

    useEffect(() => {
        if (!open) return;
        setSelectedId("");
    }, [open, dramaId]);

    useEffect(() => {
        if (episodes.length > 0 && !episodes.some((episode) => episode.id === selectedId)) {
            setSelectedId(episodes[0].id);
        }
    }, [episodes, selectedId]);

    const current = useMemo(
        () => episodes.find((episode) => episode.id === selectedId) ?? episodes[0],
        [episodes, selectedId],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[1280px]" aria-describedby={undefined}>
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="text-base">预览 - {info?.title ?? "-"}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-[minmax(0,1fr)_360px]">
                    <div className="flex flex-col gap-3 p-5">
                        <div className="flex h-[480px] items-center justify-center overflow-hidden rounded-md bg-black">
                            {isLoading ? (
                                <Spinner className="size-8 text-white" />
                            ) : current ? (
                                <video
                                    key={current.id}
                                    src={current.videoUrl}
                                    poster={info?.coverVertical}
                                    controls
                                    playsInline
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <p className="text-sm text-white/60">暂无剧集</p>
                            )}
                        </div>

                        {current && (
                            <div className="flex items-center gap-3 border-t pt-3 text-sm">
                                <span className="font-medium">第{current.episodeNo}集</span>
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <Clock className="size-3.5" />
                                    {formatDuration(current.duration)}
                                </span>
                                <span className="rounded-sm border border-amber-500/50 px-1.5 py-0.5 text-xs text-amber-600">
                                    {current.coinPrice}金币
                                </span>
                                {current.vipFree && (
                                    <span className="rounded-sm border border-rose-500/50 px-1.5 py-0.5 text-xs text-rose-500">
                                        VIP
                                    </span>
                                )}
                                {current.isFree && (
                                    <span className="rounded-sm border border-emerald-500/50 px-1.5 py-0.5 text-xs text-emerald-600">
                                        免费
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col border-l">
                        <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
                            <span className="font-medium">选集</span>
                            <span className="text-muted-foreground">
                                共{episodes.length}集
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-1 items-center justify-center py-10">
                                <Spinner className="size-6" />
                            </div>
                        ) : episodes.length === 0 ? (
                            <div className="text-muted-foreground flex flex-1 items-center justify-center py-10 text-sm">
                                暂无剧集
                            </div>
                        ) : (
                            <div className="grid max-h-[520px] grid-cols-2 gap-2 overflow-y-auto p-4">
                                {episodes.map((episode) => {
                                    const active = current?.id === episode.id;
                                    return (
                                        <button
                                            key={episode.id}
                                            type="button"
                                            onClick={() => setSelectedId(episode.id)}
                                            className={cn(
                                                "rounded-md border px-2.5 py-2 text-left transition-colors",
                                                active
                                                    ? "border-primary bg-primary/10"
                                                    : "hover:bg-accent/50",
                                            )}
                                        >
                                            <div className="text-sm font-medium">
                                                第{episode.episodeNo}集
                                            </div>
                                            <div className="mt-2 flex items-center justify-between gap-1">
                                                <span className="text-muted-foreground text-xs">
                                                    {formatDuration(episode.duration)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="rounded-sm border border-amber-500/50 px-1 text-[10px] leading-4 text-amber-600">
                                                        {episode.coinPrice}币
                                                    </span>
                                                    {episode.vipFree && (
                                                        <span className="rounded-sm border border-rose-500/50 px-1 text-[10px] leading-4 text-rose-500">
                                                            VIP
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
