import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    useCreateTaskConfigMutation,
    useDeleteTaskConfigMutation,
    useTaskConfigListQuery,
    useUpdateTaskConfigMutation,
} from "../../../services";
import TaskEditDialog from "./edit";

export default function TaskConfigPage() {
    useDocumentHead({ title: "任务配置" });
    const [dialogOpen, setDialogOpen] = useState(false);

    const { data: tasks = [], isLoading, refetch } = useTaskConfigListQuery();
    const update = useUpdateTaskConfigMutation();
    const remove = useDeleteTaskConfigMutation();
    const create = useCreateTaskConfigMutation();

    const handleQuickCreate = async () => {
        try {
            await create.mutateAsync({
                code: `daily_${Date.now().toString(36)}`,
                name: "新每日任务",
                type: "daily",
                target: 1,
                reward: 10,
            });
            toast.success("已创建，请编辑详情");
            refetch();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <>
            <div className="mb-4 flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                    签到奖励为固定 7 天循环（10/15/20/25/30/40/60 金币）；此处配置每日/一次性任务
                </p>
                <div className="flex gap-2">
                    <Button size="sm" onClick={handleQuickCreate} loading={create.isPending}>
                        <Plus />
                        快速新建
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                        编辑器
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-1 items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="mb-4 overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead>编码</TableHead>
                                <TableHead>名称</TableHead>
                                <TableHead>类型</TableHead>
                                <TableHead>目标次数</TableHead>
                                <TableHead>奖励金币</TableHead>
                                <TableHead>启用</TableHead>
                                <TableHead className="w-16">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.length > 0 ? (
                                tasks.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>
                                            <code className="bg-muted rounded px-1 text-sm">
                                                {t.code}
                                            </code>
                                        </TableCell>
                                        <TableCell>{t.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={t.type === "daily" ? "default" : "secondary"}>
                                                {t.type === "daily" ? "每日" : "一次性"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{t.target}</TableCell>
                                        <TableCell>{t.reward}</TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={t.status}
                                                onCheckedChange={async (checked) => {
                                                    await update.mutateAsync({
                                                        id: t.id,
                                                        data: { status: checked },
                                                    });
                                                    refetch();
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={async () => {
                                                    if (!confirm(`删除任务 ${t.name}？`)) return;
                                                    await remove.mutateAsync(t.id);
                                                    refetch();
                                                }}
                                            >
                                                <Trash className="text-destructive h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        暂无任务，点击右上角创建
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <TaskEditDialog open={dialogOpen} onClose={(r) => { setDialogOpen(false); if (r) refetch(); }} />
        </>
    );
}
