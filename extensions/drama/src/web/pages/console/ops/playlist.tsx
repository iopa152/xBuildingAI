import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
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
    useDeletePlaylistMutation,
    usePlaylistListQuery,
    useSavePlaylistMutation,
} from "../../../services";
import PlaylistEditDialog from "./edit";

export default function PlaylistPage() {
    useDocumentHead({ title: "剧单管理" });
    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: playlists = [], isLoading, refetch } = usePlaylistListQuery();
    const remove = useDeletePlaylistMutation();

    return (
        <>
            <div className="mb-4 flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                    剧单 = 有序剧目合集，H5 剧场页按剧单组织内容
                </p>
                <Button
                    onClick={() => {
                        setEditingId(null);
                        setEditOpen(true);
                    }}
                >
                    <Plus />
                    新建剧单
                </Button>
            </div>

            {isLoading ? (
                <Spinner />
            ) : (
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead>名称</TableHead>
                                <TableHead>描述</TableHead>
                                <TableHead>剧目数</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead className="w-24">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {playlists.length > 0 ? (
                                playlists.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell className="text-muted-foreground max-w-md truncate text-sm">
                                            {p.description || "-"}
                                        </TableCell>
                                        <TableCell>{p.dramaIds?.length ?? 0}</TableCell>
                                        <TableCell>
                                            <Badge variant={p.status ? "default" : "secondary"}>
                                                {p.status ? "启用" : "停用"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingId(p.id);
                                                        setEditOpen(true);
                                                    }}
                                                >
                                                    编辑
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={async () => {
                                                        if (!confirm(`删除剧单「${p.name}」？`)) return;
                                                        await remove.mutateAsync(p.id);
                                                        refetch();
                                                    }}
                                                >
                                                    <Trash className="text-destructive h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        暂无剧单
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <PlaylistEditDialog
                open={editOpen}
                id={editingId}
                onClose={(refresh) => {
                    setEditOpen(false);
                    setEditingId(null);
                    if (refresh) refetch();
                }}
            />
        </>
    );
}
