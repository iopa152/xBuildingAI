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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@buildingai/ui/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useTaskConfigListQuery, useUpdateTaskConfigMutation } from "../../../services";
import type { TaskConfig } from "../../../services/types";

interface TaskEditDialogProps {
    open: boolean;
    onClose: (shouldRefresh?: boolean) => void;
}

export default function TaskEditDialog({ open, onClose }: TaskEditDialogProps) {
    const { data: tasks = [], refetch } = useTaskConfigListQuery();
    const update = useUpdateTaskConfigMutation();
    const [selectedId, setSelectedId] = useState<string>("");
    const [draft, setDraft] = useState<{ name: string; target: number; reward: number }>({
        name: "",
        target: 1,
        reward: 0,
    });

    const selected: TaskConfig | undefined = tasks.find((t) => t.id === selectedId);

    useEffect(() => {
        if (selected) {
            setDraft({ name: selected.name, target: selected.target, reward: selected.reward });
        }
    }, [selectedId, selected]);

    const handleSave = async () => {
        if (!selected) return;
        await update.mutateAsync({ id: selected.id, data: draft });
        toast.success("保存成功");
        refetch();
        onClose(true);
    };

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>编辑任务</DialogTitle>
                    <DialogDescription>选择任务后修改名称/目标/奖励</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>任务</Label>
                        <Select value={selectedId || undefined} onValueChange={setSelectedId}>
                            <SelectTrigger>
                                <SelectValue placeholder="选择任务" />
                            </SelectTrigger>
                            <SelectContent>
                                {tasks.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name}（{t.code}）
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selected && (
                        <>
                            <div className="space-y-2">
                                <Label>名称</Label>
                                <Input
                                    value={draft.name}
                                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>目标次数</Label>
                                    <Input
                                        type="number"
                                        value={draft.target}
                                        onChange={(e) =>
                                            setDraft({ ...draft, target: Number(e.target.value) || 1 })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>奖励金币</Label>
                                    <Input
                                        type="number"
                                        value={draft.reward}
                                        onChange={(e) =>
                                            setDraft({ ...draft, reward: Number(e.target.value) || 0 })
                                        }
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onClose()}>
                        取消
                    </Button>
                    <Button disabled={!selected} onClick={handleSave}>
                        保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
