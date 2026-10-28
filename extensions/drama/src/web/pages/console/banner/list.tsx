import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { Pencil, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useBannerListQuery, useDeleteBannerMutation } from "../../../services";
import BannerEditDialog from "./edit";

export default function BannerListPage() {
    useDocumentHead({ title: "轮播图管理" });

    const [searchTitle, setSearchTitle] = useState("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const {
        data: banners = [],
        isLoading,
        refetch,
    } = useBannerListQuery({ title: searchTitle || undefined });
    const deleteMutation = useDeleteBannerMutation();

    const handleDelete = async (id: string) => {
        if (!confirm("确定要删除这张轮播图吗？")) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success("删除成功");
            refetch();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <>
            <div className="mb-4 flex flex-wrap gap-4">
                <Input
                    placeholder="搜索轮播图标题..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    className="max-w-xs"
                />
                <div className="ml-auto">
                    <Button
                        onClick={() => {
                            setEditingId(null);
                            setEditDialogOpen(true);
                        }}
                    >
                        <Plus />
                        新建轮播图
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="mb-4 flex flex-1 items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="mb-4 overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead>图片</TableHead>
                                <TableHead>标题</TableHead>
                                <TableHead>跳转</TableHead>
                                <TableHead>排序</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead className="w-24">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {banners.length > 0 ? (
                                banners.map((banner) => (
                                    <TableRow key={banner.id}>
                                        <TableCell>
                                            <img
                                                src={banner.image}
                                                alt={banner.title}
                                                className="h-12 w-24 rounded object-cover"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {banner.title}
                                        </TableCell>
                                        <TableCell>
                                            {banner.linkType === "drama" ? (
                                                <Badge variant="secondary">
                                                    剧目 {banner.dramaId?.slice(0, 8)}
                                                </Badge>
                                            ) : (
                                                <span
                                                    className="block max-w-xs truncate text-sm"
                                                    title={banner.url}
                                                >
                                                    {banner.url}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>{banner.sort}</TableCell>
                                        <TableCell>
                                            {banner.status ? (
                                                <span className="text-green-600">启用</span>
                                            ) : (
                                                <span className="text-muted-foreground">禁用</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => {
                                                        setEditingId(banner.id);
                                                        setEditDialogOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleDelete(banner.id)}
                                                >
                                                    <Trash className="text-destructive h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        暂无数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <BannerEditDialog
                open={editDialogOpen}
                id={editingId}
                onClose={(refresh) => {
                    setEditDialogOpen(false);
                    setEditingId(null);
                    if (refresh) refetch();
                }}
            />
        </>
    );
}
