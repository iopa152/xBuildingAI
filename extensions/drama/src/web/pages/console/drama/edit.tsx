import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { ImageUpload } from "@buildingai/ui/components/ui/image-upload";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@buildingai/ui/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Plus, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
    useBatchCreateEpisodesMutation,
    useCategoryListQuery,
    useCreateDramaMutation,
    useDramaDetailQuery,
    useDeleteEpisodeMutation,
    useEpisodeListQuery,
    useUpdateDramaMutation,
} from "../../../services";
import type { CreateDramaParams } from "../../../services/types";

const defaultForm: CreateDramaParams = {
    title: "",
    language: "en",
    description: "",
    status: "draft",
    complete: false,
    featured: false,
    wholePrice: 0,
    heat: 0,
    sort: 0,
    categoryIds: [],
};

export default function DramaEditPage() {
    useDocumentHead({ title: "编辑剧目" });
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dramaId = searchParams.get("id") || "";

    const [formData, setFormData] = useState<CreateDramaParams>(defaultForm);
    const [saving, setSaving] = useState(false);

    // episode batch upload dialog
    const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
    const [episodeUrls, setEpisodeUrls] = useState("");
    const [episodeStartNo, setEpisodeStartNo] = useState(1);
    const [episodePrice, setEpisodePrice] = useState(0);
    const [episodeFree, setEpisodeFree] = useState(false);

    const { data: categories = [] } = useCategoryListQuery();
    const { data: drama, isLoading } = useDramaDetailQuery(dramaId, {
        enabled: !!dramaId,
    });
    const { data: episodes = [], refetch: refetchEpisodes } = useEpisodeListQuery(dramaId, {
        enabled: !!dramaId,
    });

    const createMutation = useCreateDramaMutation();
    const updateMutation = useUpdateDramaMutation();
    const batchCreateEpisodes = useBatchCreateEpisodesMutation();
    const deleteEpisode = useDeleteEpisodeMutation();

    useEffect(() => {
        if (drama && dramaId) {
            setFormData({
                title: drama.title,
                language: drama.language,
                description: drama.description || "",
                coverVertical: drama.coverVertical,
                coverHorizontal: drama.coverHorizontal,
                status: drama.status as CreateDramaParams["status"],
                complete: drama.complete,
                featured: drama.featured,
                wholePrice: drama.wholePrice,
                heat: drama.heat,
                sort: drama.sort,
                categoryIds: drama.categories?.map((c) => c.id) ?? [],
            });
        }
    }, [drama, dramaId]);

    const handleSave = async () => {
        if (!formData.title?.trim()) {
            toast.error("请输入剧目标题");
            return;
        }
        setSaving(true);
        try {
            if (dramaId) {
                await updateMutation.mutateAsync({ id: dramaId, data: formData });
                toast.success("保存成功");
            } else {
                const created = await createMutation.mutateAsync(formData);
                toast.success("创建成功，可继续上传剧集");
                navigate(`edit?id=${created.id}`, { replace: true });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleBatchUpload = async () => {
        const urls = episodeUrls
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && line.startsWith("http"));
        if (urls.length === 0) {
            toast.error("请输入至少一个视频地址（每行一个）");
            return;
        }
        try {
            await batchCreateEpisodes.mutateAsync({
                dramaId,
                startNo: episodeStartNo,
                defaultCoinPrice: episodePrice,
                defaultFree: episodeFree,
                items: urls.map((videoUrl) => ({ videoUrl })),
            });
            toast.success(`成功上传 ${urls.length} 集`);
            setEpisodeDialogOpen(false);
            setEpisodeUrls("");
            refetchEpisodes();
        } catch (error) {
            console.error(error);
        }
    };

    if (dramaId && isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <Spinner className="size-8" />
            </div>
        );
    }

    const toggleCategory = (id: string, checked: boolean) => {
        const current = formData.categoryIds ?? [];
        setFormData({
            ...formData,
            categoryIds: checked ? [...current, id] : current.filter((c) => c !== id),
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    {dramaId ? `编辑剧目${drama ? `：${drama.title}` : ""}` : "新建剧目"}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate("list")}>
                        返回列表
                    </Button>
                    <Button onClick={handleSave} disabled={saving} loading={saving}>
                        {saving ? "保存中..." : "保存"}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="basic">
                <TabsList>
                    <TabsTrigger value="basic">基本信息</TabsTrigger>
                    <TabsTrigger value="episodes" disabled={!dramaId}>
                        剧集管理 ({episodes.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="basic">
                    <Card>
                        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="title">
                                    剧名 <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    placeholder="如：Kiss Me, Kill Me"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="language">语言</Label>
                                <Input
                                    id="language"
                                    value={formData.language || "en"}
                                    onChange={(e) =>
                                        setFormData({ ...formData, language: e.target.value })
                                    }
                                    placeholder="en / zh / ja"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="description">简介</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={4}
                                    placeholder="剧情简介"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>竖版封面</Label>
                                <ImageUpload
                                    value={formData.coverVertical}
                                    onChange={(url) =>
                                        setFormData({ ...formData, coverVertical: url })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>横版封面</Label>
                                <ImageUpload
                                    value={formData.coverHorizontal}
                                    onChange={(url) =>
                                        setFormData({ ...formData, coverHorizontal: url })
                                    }
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>分类（可多选）</Label>
                                <div className="flex flex-wrap gap-4">
                                    {categories.map((cat) => (
                                        <label
                                            key={cat.id}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            <Checkbox
                                                checked={formData.categoryIds?.includes(cat.id)}
                                                onCheckedChange={(checked) =>
                                                    toggleCategory(cat.id, !!checked)
                                                }
                                            />
                                            {cat.name}
                                        </label>
                                    ))}
                                    {categories.length === 0 && (
                                        <p className="text-muted-foreground text-sm">
                                            暂无分类，请先到「短剧分类」创建
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>状态</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(v) =>
                                        setFormData({ ...formData, status: v as never })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">预告中</SelectItem>
                                        <SelectItem value="published">已上线</SelectItem>
                                        <SelectItem value="offline">已下线</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="wholePrice">整剧解锁价格（金币）</Label>
                                <Input
                                    id="wholePrice"
                                    type="number"
                                    value={formData.wholePrice ?? 0}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            wholePrice: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="heat">热度值</Label>
                                <Input
                                    id="heat"
                                    type="number"
                                    value={formData.heat ?? 0}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            heat: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sort">排序权重</Label>
                                <Input
                                    id="sort"
                                    type="number"
                                    value={formData.sort ?? 0}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            sort: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className="flex items-center gap-6 md:col-span-2">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={formData.complete}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, complete: checked })
                                        }
                                    />
                                    <Label>完结</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={formData.featured}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, featured: checked })
                                        }
                                    />
                                    <Label>精选（首页推荐）</Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="episodes">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>剧集列表</CardTitle>
                            <Button size="sm" onClick={() => setEpisodeDialogOpen(true)}>
                                <Plus />
                                批量上传剧集
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead className="w-20">集数</TableHead>
                                        <TableHead>标题</TableHead>
                                        <TableHead>视频地址</TableHead>
                                        <TableHead className="w-24">价格</TableHead>
                                        <TableHead className="w-20">免费</TableHead>
                                        <TableHead className="w-16">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {episodes.length > 0 ? (
                                        episodes.map((ep) => (
                                            <TableRow key={ep.id}>
                                                <TableCell className="font-medium">
                                                    EP.{ep.episodeNo}
                                                </TableCell>
                                                <TableCell>{ep.title || "-"}</TableCell>
                                                <TableCell>
                                                    <span
                                                        className="block max-w-md truncate text-sm"
                                                        title={ep.videoUrl}
                                                    >
                                                        {ep.videoUrl}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{ep.coinPrice} 金币</TableCell>
                                                <TableCell>
                                                    {ep.isFree ? (
                                                        <Badge variant="secondary">免费</Badge>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={async () => {
                                                            if (!confirm(
                                                                `确定删除 EP.${ep.episodeNo} 吗？`,
                                                            ))
                                                                return;
                                                            await deleteEpisode.mutateAsync(
                                                                ep.id,
                                                            );
                                                            refetchEpisodes();
                                                        }}
                                                    >
                                                        <Trash className="text-destructive h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                暂无剧集，点击右上角批量上传
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={episodeDialogOpen} onOpenChange={setEpisodeDialogOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>批量上传剧集</DialogTitle>
                        <DialogDescription>
                            每行一个视频地址（http 开头），系统按顺序自动编号
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            value={episodeUrls}
                            onChange={(e) => setEpisodeUrls(e.target.value)}
                            rows={8}
                            placeholder={"https://cdn.example.com/ep1.m3u8\nhttps://cdn.example.com/ep2.m3u8"}
                        />
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>起始集数</Label>
                                <Input
                                    type="number"
                                    value={episodeStartNo}
                                    onChange={(e) =>
                                        setEpisodeStartNo(Number(e.target.value) || 1)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>单集价格（金币）</Label>
                                <Input
                                    type="number"
                                    value={episodePrice}
                                    onChange={(e) => setEpisodePrice(Number(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>全部免费</Label>
                                <div className="flex h-9 items-center">
                                    <Switch
                                        checked={episodeFree}
                                        onCheckedChange={setEpisodeFree}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEpisodeDialogOpen(false)}>
                            取消
                        </Button>
                        <Button
                            onClick={handleBatchUpload}
                            loading={batchCreateEpisodes.isPending}
                        >
                            上传
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
