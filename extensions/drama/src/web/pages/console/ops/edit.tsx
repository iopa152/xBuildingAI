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
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useDramaListQuery, usePlaylistListQuery, useSavePlaylistMutation } from "../../../services";

interface PlaylistEditDialogProps {
    open: boolean;
    id: string | null;
    onClose: (shouldRefresh?: boolean) => void;
}

export default function PlaylistEditDialog({ open, id, onClose }: PlaylistEditDialogProps) {
    const { data: playlists = [] } = usePlaylistListQuery();
    const { data: dramaPage } = useDramaListQuery({ pageSize: 100 });
    const save = useSavePlaylistMutation();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState(true);
    const [dramaIds, setDramaIds] = useState<string[]>([]);

    const editing = playlists.find((p) => p.id === id);
    const dramas = dramaPage?.items ?? [];

    useEffect(() => {
        if (open) {
            if (editing) {
                setName(editing.name);
                setDescription(editing.description || "");
                setStatus(editing.status);
                setDramaIds(editing.dramaIds || []);
            } else {
                setName("");
                setDescription("");
                setStatus(true);
                setDramaIds([]);
            }
        }
    }, [open, id, editing]);

    const toggle = (dramaId: string, checked: boolean) => {
        setDramaIds((prev) =>
            checked ? [...prev, dramaId] : prev.filter((x) => x !== dramaId),
        );
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("请输入剧单名称");
            return;
        }
        await save.mutateAsync({
            id: id ?? undefined,
            data: { name: name.trim(), description: description.trim(), dramaIds, status },
        });
        toast.success("保存成功");
        onClose(true);
    };

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{id ? "编辑剧单" : "新建剧单"}</DialogTitle>
                    <DialogDescription>勾选剧目并按勾选顺序组织剧单</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>
                            名称 <span className="text-destructive">*</span>
                        </Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：本周精选" />
                    </div>
                    <div className="space-y-2">
                        <Label>描述</Label>
                        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>
                            选择剧目（已选 {dramaIds.length}）<span className="text-destructive">*</span>
                        </Label>
                        <ScrollArea className="h-56 rounded-md border p-2">
                            {dramas.map((d) => (
                                <label key={d.id} className="flex items-center gap-2 px-1 py-1.5 text-sm">
                                    <Checkbox
                                        checked={dramaIds.includes(d.id)}
                                        onCheckedChange={(checked) => toggle(d.id, !!checked)}
                                    />
                                    <span className="truncate">{d.title}</span>
                                </label>
                            ))}
                            {dramas.length === 0 && (
                                <p className="text-muted-foreground p-2 text-sm">暂无剧目</p>
                            )}
                        </ScrollArea>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch checked={status} onCheckedChange={setStatus} />
                        <Label>启用</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onClose()}>
                        取消
                    </Button>
                    <Button onClick={handleSave} loading={save.isPending}>
                        保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
