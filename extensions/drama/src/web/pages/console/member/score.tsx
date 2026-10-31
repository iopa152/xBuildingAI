import { useDocumentHead } from "@buildingai/hooks";
import { Button } from "@buildingai/ui/components/ui/button";
import {
    Dialog,
    DialogContent,
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
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { cn } from "@buildingai/ui/lib/utils";
import { Plus, RotateCw, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    useAdjustMemberScoreMutation,
    useMemberInfoQuery,
    useMemberScoreListQuery,
} from "../../../services";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bizLabels: Record<string, string> = {
    admin_adjust: "管理员调整",
    sign_in: "签到奖励",
    task_reward: "任务奖励",
    withdraw: "提现申请",
    withdraw_refund: "提现驳回退款",
    redeem: "兑换消费",
    other: "其他",
};

export default function MemberScorePage() {
    useDocumentHead({ title: "会员积分管理" });

    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data, isLoading, isFetching, refetch } = useMemberScoreListQuery({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
    });
    const items = data?.items ?? [];
    const { PaginationComponent } = usePagination({
        total: data?.total ?? 0,
        pageSize,
        page,
        onPageChange: setPage,
    });

    const adjust = useAdjustMemberScoreMutation();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [userId, setUserId] = useState("");
    const [queriedId, setQueriedId] = useState<string | undefined>(undefined);
    const [delta, setDelta] = useState("");
    const [memo, setMemo] = useState("");

    const { data: member, isFetching: memberLoading } = useMemberInfoQuery(queriedId);

    const openDialog = () => {
        setUserId("");
        setQueriedId(undefined);
        setDelta("");
        setMemo("");
        setDialogOpen(true);
    };

    const queryMember = () => {
        const id = userId.trim();
        if (!id) {
            toast.error("请输入用户ID");
            return;
        }
        if (!UUID_PATTERN.test(id)) {
            toast.error("用户ID格式不正确");
            return;
        }
        setQueriedId(id);
    };

    const save = async () => {
        const value = Number(delta);
        if (!member) {
            toast.error("请先查询用户");
            return;
        }
        if (!Number.isInteger(value) || value === 0) {
            toast.error("请输入非零整数（正数增加，负数扣减）");
            return;
        }
        try {
            await adjust.mutateAsync({ id: member.id, delta: value, memo: memo.trim() });
            toast.success("调整成功");
            setDialogOpen(false);
            refetch();
        } catch {
            // 错误提示由 http client 统一处理
        }
    };

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="刷新"
                    disabled={isFetching}
                    onClick={() => refetch()}
                >
                    <RotateCw className={isFetching ? "animate-spin" : undefined} />
                </Button>
                <Button onClick={openDialog}>
                    <Plus />
                    调整积分
                </Button>
                <div className="relative ml-auto w-full max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜索用户名/昵称/备注..."
                        className="pl-9"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-1 items-center justify-center py-20">
                    <Spinner className="size-8" />
                </div>
            ) : (
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead className="w-16">ID</TableHead>
                                <TableHead>用户ID</TableHead>
                                <TableHead>用户名</TableHead>
                                <TableHead>昵称</TableHead>
                                <TableHead>变更积分</TableHead>
                                <TableHead>类型</TableHead>
                                <TableHead>业务类型</TableHead>
                                <TableHead>变更前</TableHead>
                                <TableHead>变更后</TableHead>
                                <TableHead>流水说明</TableHead>
                                <TableHead>备注</TableHead>
                                <TableHead>创建时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? (
                                items.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">
                                            {(page - 1) * pageSize + index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-muted-foreground text-xs">
                                                {row.userId?.slice(0, 8)}
                                            </code>
                                        </TableCell>
                                        <TableCell>{row.username || "-"}</TableCell>
                                        <TableCell>{row.nickname || "-"}</TableCell>
                                        <TableCell
                                            className={cn(
                                                "font-medium tabular-nums",
                                                row.type === 1
                                                    ? "text-emerald-600"
                                                    : "text-destructive",
                                            )}
                                        >
                                            {row.type === 1
                                                ? `+${Math.abs(row.score)}`
                                                : `-${Math.abs(row.score)}`}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={cn(
                                                    "inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium",
                                                    row.type === 1
                                                        ? "bg-emerald-500/10 text-emerald-600"
                                                        : "bg-rose-500/10 text-rose-600",
                                                )}
                                            >
                                                {row.type === 1 ? "收入" : "支出"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {bizLabels[row.bizType] ?? row.bizType}
                                        </TableCell>
                                        <TableCell className="tabular-nums">{row.before}</TableCell>
                                        <TableCell className="tabular-nums">{row.after}</TableCell>
                                        <TableCell className="max-w-40 truncate">
                                            {row.description || "-"}
                                        </TableCell>
                                        <TableCell className="max-w-40 truncate">
                                            {row.memo || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <TimeText
                                                value={row.createdAt}
                                                format="YYYY-MM-DD HH:mm:ss"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={12} className="h-24 text-center">
                                        暂无积分流水
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                    共 {data?.total ?? 0} 条
                </span>
                <PaginationComponent className="mx-0 w-fit" />
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[520px]" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>调整会员积分</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-[100px_1fr] items-center gap-x-3 gap-y-[18px]">
                        <Label htmlFor="score-user" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            用户ID
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="score-user"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="输入用户 UUID"
                            />
                            <Button
                                variant="outline"
                                onClick={queryMember}
                                disabled={memberLoading}
                            >
                                查询
                            </Button>
                        </div>

                        <Label className="justify-end font-normal">用户名</Label>
                        <Input value={member?.username ?? ""} disabled placeholder="-" />

                        <Label className="justify-end font-normal">昵称</Label>
                        <Input value={member?.nickname ?? ""} disabled placeholder="-" />

                        <Label className="justify-end font-normal">当前积分</Label>
                        <Input
                            value={member ? String(member.score) : ""}
                            disabled
                            placeholder="-"
                        />

                        <Label htmlFor="score-delta" className="justify-end gap-1 font-normal">
                            <span className="text-destructive">*</span>
                            变更数额
                        </Label>
                        <Input
                            id="score-delta"
                            value={delta}
                            inputMode="numeric"
                            onChange={(e) => setDelta(e.target.value)}
                            placeholder="正数增加，负数扣减"
                        />

                        <Label className="justify-end font-normal">变更后积分</Label>
                        <Input
                            value={
                                member && Number.isInteger(Number(delta)) && delta !== ""
                                    ? String(member.score + Number(delta))
                                    : ""
                            }
                            disabled
                            placeholder="-"
                        />

                        <Label htmlFor="score-memo" className="justify-end font-normal">
                            备注
                        </Label>
                        <Input
                            id="score-memo"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="调整说明"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={save} disabled={adjust.isPending || !member}>
                            确定
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
