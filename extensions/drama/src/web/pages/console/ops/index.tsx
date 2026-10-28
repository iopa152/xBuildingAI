import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { TimeText } from "@buildingai/ui/components/ui/time-text";
import { Check, Trash, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
    useAgreementListQuery,
    useCheckinConfigQuery,
    useCreateFaqMutation,
    useDeleteFaqMutation,
    useFaqListQuery,
    useFeedbackListQuery,
    useResolveFeedbackMutation,
    useSaveAgreementMutation,
    useSaveCheckinConfigMutation,
    useWithdrawalActionMutation,
    useWithdrawalListQuery,
} from "../../../services";

export default function OpsPage() {
    useDocumentHead({ title: "运营审核" });

    return (
        <Tabs defaultValue="withdrawal">
            <TabsList className="mb-4 flex-wrap">
                <TabsTrigger value="withdrawal">提现审核</TabsTrigger>
                <TabsTrigger value="feedback">用户反馈</TabsTrigger>
                <TabsTrigger value="faq">FAQ 管理</TabsTrigger>
                <TabsTrigger value="agreement">协议政策</TabsTrigger>
                <TabsTrigger value="checkin">签到奖励配置</TabsTrigger>
            </TabsList>
            <TabsContent value="withdrawal">
                <WithdrawalTab />
            </TabsContent>
            <TabsContent value="feedback">
                <FeedbackTab />
            </TabsContent>
            <TabsContent value="faq">
                <FaqTab />
            </TabsContent>
            <TabsContent value="agreement">
                <AgreementTab />
            </TabsContent>
            <TabsContent value="checkin">
                <CheckinConfigTab />
            </TabsContent>
        </Tabs>
    );
}

function WithdrawalTab() {
    const { data, isLoading, refetch } = useWithdrawalListQuery({ page: 1, pageSize: 30 });
    const action = useWithdrawalActionMutation();
    const items = data?.items ?? [];

    if (isLoading) return <Spinner />;

    return (
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted">
                    <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>金币</TableHead>
                        <TableHead>方式 / 账户</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>申请时间</TableHead>
                        <TableHead className="w-28">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length > 0 ? (
                        items.map((w) => (
                            <TableRow key={w.id}>
                                <TableCell>
                                    <code className="text-xs">{w.userId.slice(0, 8)}</code>
                                </TableCell>
                                <TableCell>{w.coins}</TableCell>
                                <TableCell>
                                    {w.method} · {w.account}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            w.status === "approved"
                                                ? "default"
                                                : w.status === "rejected"
                                                  ? "destructive"
                                                  : "secondary"
                                        }
                                    >
                                        {w.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <TimeText value={w.createdAt} format="MM/DD HH:mm" />
                                </TableCell>
                                <TableCell>
                                    {w.status === "pending" && (
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="打款通过"
                                                onClick={async () => {
                                                    await action.mutateAsync({
                                                        id: w.id,
                                                        action: "approve",
                                                        note: "线下已打款",
                                                    });
                                                    toast.success("已通过");
                                                    refetch();
                                                }}
                                            >
                                                <Check className="h-4 w-4 text-green-600" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                title="驳回并退回金币"
                                                onClick={async () => {
                                                    if (!confirm("驳回将退回金币，确定？")) return;
                                                    await action.mutateAsync({
                                                        id: w.id,
                                                        action: "reject",
                                                        note: "审核未通过",
                                                    });
                                                    toast.success("已驳回");
                                                    refetch();
                                                }}
                                            >
                                                <X className="h-4 w-4 text-orange-500" />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                暂无申请
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function FeedbackTab() {
    const { data, isLoading, refetch } = useFeedbackListQuery({ page: 1, pageSize: 30 });
    const resolve = useResolveFeedbackMutation();
    const items = data?.items ?? [];

    if (isLoading) return <Spinner />;

    return (
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted">
                    <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>内容</TableHead>
                        <TableHead>联系</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>时间</TableHead>
                        <TableHead className="w-20">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length > 0 ? (
                        items.map((f) => (
                            <TableRow key={f.id}>
                                <TableCell>
                                    <code className="text-xs">{f.userId.slice(0, 8)}</code>
                                </TableCell>
                                <TableCell className="max-w-md">{f.content}</TableCell>
                                <TableCell>{f.contact ?? "-"}</TableCell>
                                <TableCell>
                                    <Badge variant={f.status === "resolved" ? "default" : "secondary"}>
                                        {f.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <TimeText value={f.createdAt} format="MM/DD HH:mm" />
                                </TableCell>
                                <TableCell>
                                    {f.status === "open" && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                                await resolve.mutateAsync({ id: f.id });
                                                toast.success("已处理");
                                                refetch();
                                            }}
                                        >
                                            标记处理
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                暂无反馈
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function FaqTab() {
    const { data: faqs = [], isLoading, refetch } = useFaqListQuery();
    const create = useCreateFaqMutation();
    const remove = useDeleteFaqMutation();
    const [q, setQ] = useState("");
    const [a, setA] = useState("");

    if (isLoading) return <Spinner />;

    return (
        <>
            <div className="mb-4 flex gap-2">
                <input
                    className="border-input bg-background w-64 rounded-md border px-3 py-2 text-sm"
                    placeholder="问题"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <input
                    className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
                    placeholder="回答"
                    value={a}
                    onChange={(e) => setA(e.target.value)}
                />
                <Button
                    size="sm"
                    onClick={async () => {
                        if (!q.trim() || !a.trim()) return;
                        await create.mutateAsync({ question: q, answer: a });
                        setQ("");
                        setA("");
                        refetch();
                    }}
                >
                    新增
                </Button>
            </div>
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead>问题</TableHead>
                            <TableHead>回答</TableHead>
                            <TableHead className="w-16">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {faqs.length > 0 ? (
                            faqs.map((f) => (
                                <TableRow key={f.id}>
                                    <TableCell className="max-w-xs">{f.question}</TableCell>
                                    <TableCell className="max-w-md text-sm">{f.answer}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={async () => {
                                                if (!confirm("删除该 FAQ？")) return;
                                                await remove.mutateAsync(f.id);
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
                                <TableCell colSpan={3} className="h-24 text-center">
                                    暂无 FAQ
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}


function AgreementTab() {
    const { data: agreements = [], isLoading, refetch } = useAgreementListQuery();
    const save = useSaveAgreementMutation();
    const types = ["user", "privacy", "about"];
    const labels: Record<string, string> = { user: "用户协议", privacy: "隐私政策", about: "关于我们" };
    const [drafts, setDrafts] = useState<Record<string, { title: string; content: string }>>({});

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-4">
            {types.map((type) => {
                const existing = agreements.find((a) => a.type === type);
                const draft = drafts[type] ?? {
                    title: existing?.title ?? labels[type],
                    content: existing?.content ?? "",
                };
                return (
                    <div key={type} className="rounded-md border p-4">
                        <div className="mb-2 font-semibold">{labels[type]}</div>
                        <input
                            className="border-input bg-background mb-2 w-full rounded-md border px-3 py-2 text-sm"
                            value={draft.title}
                            placeholder="标题"
                            onChange={(e) => setDrafts({ ...drafts, [type]: { ...draft, title: e.target.value } })}
                        />
                        <textarea
                            className="border-input bg-background mb-2 h-28 w-full rounded-md border px-3 py-2 text-sm"
                            value={draft.content}
                            placeholder="协议内容（支持纯文本）"
                            onChange={(e) => setDrafts({ ...drafts, [type]: { ...draft, content: e.target.value } })}
                        />
                        <Button
                            size="sm"
                            onClick={async () => {
                                await save.mutateAsync({ type, title: draft.title, content: draft.content });
                                toast.success("已保存");
                                refetch();
                            }}
                        >
                            保存
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

function CheckinConfigTab() {
    const { data: rewards, isLoading, refetch } = useCheckinConfigQuery();
    const save = useSaveCheckinConfigMutation();
    const [values, setValues] = useState<number[] | null>(null);
    const current = values ?? rewards ?? [10, 20, 30, 40, 50, 80, 150];

    if (isLoading) return <Spinner />;

    return (
        <div className="max-w-lg space-y-4">
            <p className="text-muted-foreground text-sm">
                7 天循环签到奖励（金币），H5 Rewards 页与后端发放同步使用此配置
            </p>
            <div className="flex gap-2">
                {current.map((v, i) => (
                    <div key={i} className="flex-1 space-y-1">
                        <Label>Day{i + 1}</Label>
                        <Input
                            type="number"
                            value={v}
                            onChange={(e) => {
                                const next = [...current];
                                next[i] = Number(e.target.value) || 0;
                                setValues(next);
                            }}
                        />
                    </div>
                ))}
            </div>
            <Button
                onClick={async () => {
                    await save.mutateAsync(current);
                    toast.success("已保存，H5 立即生效");
                    setValues(null);
                    refetch();
                }}
                loading={save.isPending}
            >
                保存配置
            </Button>
        </div>
    );
}
