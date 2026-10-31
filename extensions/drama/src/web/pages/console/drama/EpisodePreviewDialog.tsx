import { Badge } from "@buildingai/ui/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@buildingai/ui/components/ui/dialog";
import { Clock } from "lucide-react";

import { resolveAssetUrl } from "../../../services";
import type { Episode } from "../../../services/types";

interface EpisodePreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    episode?: Episode | null;
    dramaTitle?: string;
}

function formatDuration(seconds: number) {
    if (!seconds) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function EpisodePreviewDialog({
    open,
    onOpenChange,
    episode,
    dramaTitle,
}: EpisodePreviewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[860px]">
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="text-base">
                        视频预览
                        {episode ? ` - 第 ${episode.episodeNo} 集` : ""}
                        {dramaTitle ? ` · ${dramaTitle}` : ""}
                    </DialogTitle>
                </DialogHeader>

                <div className="bg-black">
                    <div className="mx-auto flex h-[62vh] max-h-[640px] w-full items-center justify-center">
                        {episode?.videoUrl ? (
                            <video
                                key={episode.id}
                                src={resolveAssetUrl(episode.videoUrl)}
                                poster={resolveAssetUrl(episode.thumbnail)}
                                controls
                                autoPlay
                                playsInline
                                className="h-full max-w-[380px] object-contain"
                            />
                        ) : (
                            <p className="text-sm text-white/60">暂无视频</p>
                        )}
                    </div>
                </div>

                {episode && (
                    <div className="flex flex-wrap items-center gap-4 border-t px-6 py-3 text-sm">
                        <span className="font-medium">第 {episode.episodeNo} 集</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(episode.duration)}
                        </span>
                        {episode.isFree ? (
                            <Badge className="bg-emerald-500 text-white">免费</Badge>
                        ) : (
                            <span className="text-amber-600">{episode.coinPrice} 金币</span>
                        )}
                        {episode.vipFree && (
                            <Badge className="bg-rose-500 text-white">VIP免费</Badge>
                        )}
                        <span className="text-muted-foreground ml-auto">
                            {episode.status === "published" ? "已上线" : "待上线"}
                        </span>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
