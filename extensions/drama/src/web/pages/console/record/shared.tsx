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
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { cn } from "@buildingai/ui/lib/utils";
import type { ReactNode } from "react";

import { resolveAssetUrl } from "../../../services";

export function StatCards({
    items,
    columns = 4,
}: {
    items: { label: string; value: ReactNode }[];
    columns?: 2 | 4 | 5 | 6;
}) {
    const grid =
        columns === 6
            ? "md:grid-cols-3 xl:grid-cols-6"
            : columns === 5
              ? "md:grid-cols-3 xl:grid-cols-5"
              : columns === 4
                ? "md:grid-cols-4"
                : "md:grid-cols-2";
    return (
        <div className={cn("mb-4 grid grid-cols-2 gap-4", grid)}>
            {items.map((item) => (
                <Card key={item.label}>
                    <CardContent className="pt-6">
                        <p className="text-muted-foreground text-xs">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{item.value}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function RankingDialog({
    open,
    onOpenChange,
    title,
    items,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    items: { dramaId: string; title: string; count: number }[];
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                {items.length > 0 ? (
                    <div className="divide-y rounded-md border">
                        {items.map((item, index) => (
                            <div
                                key={item.dramaId}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm"
                            >
                                <span
                                    className={cn(
                                        "w-6 text-center text-xs font-semibold tabular-nums",
                                        index < 3 ? "text-primary" : "text-muted-foreground",
                                    )}
                                >
                                    {index + 1}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                                <span className="text-muted-foreground tabular-nums">
                                    {item.count}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-muted-foreground py-10 text-center text-sm">暂无数据</div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export function DeleteConfirmDialog({
    open,
    count,
    onOpenChange,
    onConfirm,
}: {
    open: boolean;
    count: number;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>确定删除选中记录?</AlertDialogTitle>
                    <AlertDialogDescription>
                        即将删除选中的 {count} 条记录，删除后不可恢复。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={onConfirm}
                    >
                        确定
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function DramaCell({
    cover,
    title,
    id,
}: {
    cover?: string | null;
    title?: string | null;
    id?: string;
}) {
    return (
        <div className="flex items-center gap-2">
            {cover ? (
                <img
                    src={resolveAssetUrl(cover)}
                    alt=""
                    className="h-12 w-8 shrink-0 rounded object-cover"
                />
            ) : (
                <div className="bg-muted h-12 w-8 shrink-0 rounded" />
            )}
            <div className="min-w-0">
                <p className="max-w-40 truncate font-medium">{title ?? "-"}</p>
                {id && <p className="text-muted-foreground font-mono text-xs">{id.slice(0, 8)}</p>}
            </div>
        </div>
    );
}

export function UserCell({
    nickname,
    avatar,
    userId,
}: {
    nickname?: string | null;
    avatar?: string | null;
    userId: string;
}) {
    return (
        <div className="flex items-center gap-2">
            {avatar ? (
                <img
                    src={resolveAssetUrl(avatar)}
                    alt=""
                    className="size-7 shrink-0 rounded-full object-cover"
                />
            ) : (
                <div className="bg-muted size-7 shrink-0 rounded-full" />
            )}
            <div className="min-w-0">
                <p className="max-w-32 truncate text-sm font-medium">
                    {nickname || userId.slice(0, 8)}
                </p>
                <p className="text-muted-foreground font-mono text-xs">{userId.slice(0, 8)}</p>
            </div>
        </div>
    );
}

export function formatClock(seconds: number) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
