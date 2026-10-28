import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { Ban, CirclePlus, CircleMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    useAdjustCoinsMutation,
    useMemberListQuery,
    useMemberStatusMutation,
} from "../../../services";

export default function MemberListPage() {
    useDocumentHead({ title: "会员管理" });
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [adjustTarget, setAdjustTarget] = useState<{ id: string; name: string } | null>(null);
    const [delta, setDelta] = useState("");
    const [remark, setRemark] = useState("");

    const { data, isLoading, refetch } = useMemberListQuery({
        keyword: keyword || undefined,
        page,
        pageSize: 20,
    });
    const adjust = useAdjustCoinsMutation();
    const setStatus = useMemberStatusMutation();

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    const submitAdjust = async () => {
        if (!adjustTarget) return;
        const n = Number(delta);
        if (!Number.isInteger(n) || n === 0) {
            toast.error("请输入非零整数（正数加币，负数扣币）");
            return;
        }
        try {
            await adjust.mutateAsync({ id: adjustTarget.id, delta: n, remark: remark || undefined });
            toast.success("调整成功");
            setAdjustTarget(null);
            setDelta("");
            setRemark("");
            refetch();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <>
            <div className="mb-4 flex items-center gap-3">
                <Input
                    placeholder="搜索用户名/昵称..."
                    value={keyword}
                    onChange={(e) => {
                        setKeyword(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-xs"
                />
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
                                <TableHead>会员</TableHead>
                                <TableHead>金币</TableHead>
                                <TableHead>VIP</TableHead>
                                <TableHead>解锁/消耗</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>注册时间</TableHead>
                                <TableHead className="w-40">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {m.avatar && (
                                                    <img src={m.avatar} alt="" className="h-7 w-7 rounded-full" />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium">{m.nickname}</p>
                                                    <p className="text-muted-foreground text-xs">{m.username}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold">{m.power}</TableCell>
                                        <TableCell>
                                            <Badge variant={m.isVip ? "default" : "secondary"}>
                                                {m.isVip ? "VIP" : "普通"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {m.unlocks} 次 / {m.coinsSpent} 币
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={m.status === 1 ? "default" : "destructive"}>
                                                {m.status === 1 ? "正常" : "禁用"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <TimeText value={m.createdAt} format="YYYY/MM/DD" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="加币"
                                                    onClick={() => {
                                                        setAdjustTarget({ id: m.id, name: m.nickname });
                                                        setDelta("");
                                                        setRemark("");
                                                    }}
                                                >
                                                    <CirclePlus className="h-4 w-4 text-green-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title="扣币"
                                                    onClick={() => {
                                                        setAdjustTarget({ id: m.id, name: m.nickname });
                                                        setDelta("-");
                                                        setRemark("");
                                                    }}
                                                >
                                                    <CircleMinus className="h-4 w-4 text-orange-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title={m.status === 1 ? "禁用" : "启用"}
                                                    onClick={async () => {
                                                        await setStatus.mutateAsync({
                                                            id: m.id,
                                                            status: m.status === 1 ? 0 : 1,
                                                        });
                                                        toast.success("已更新");
                                                        refetch();
                                                    }}
                                                >
                                                    <Ban
                                                        className={`h-4 w-4 ${
                                                            m.status === 1 ? "text-destructive" : "text-green-600"
                                                        }`}
                                                    />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        暂无数据
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                    共 {total} 人 · 第 {page} 页
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        上一页
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page * 20 >= total}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        下一页
                    </Button>
                </div>
            </div>

            <Dialog open={!!adjustTarget} onOpenChange={() => setAdjustTarget(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>调整金币</DialogTitle>
                        <DialogDescription>
                            {adjustTarget?.name} · 正数加币，负数扣币（带账变流水）
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>数量</Label>
                            <Input
                                type="number"
                                value={delta}
                                onChange={(e) => setDelta(e.target.value)}
                                placeholder="如 100 或 -50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>备注（可选）</Label>
                            <Input value={remark} onChange={(e) => setRemark(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdjustTarget(null)}>
                            取消
                        </Button>
                        <Button onClick={submitAdjust} loading={adjust.isPending}>
                            确认
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
