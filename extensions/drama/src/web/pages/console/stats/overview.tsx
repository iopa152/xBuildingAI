import { useDocumentHead } from "@buildingai/hooks";
import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@buildingai/ui/components/ui/table";
import { useStatsOverviewQuery } from "../../../services";

export default function StatsOverviewPage() {
    useDocumentHead({ title: "短剧看板" });
    const { data, isLoading } = useStatsOverviewQuery();

    if (isLoading || !data) {
        return (
            <div className="flex flex-1 items-center justify-center py-20">
                <Spinner className="size-8" />
            </div>
        );
    }

    const kpis = [
        { label: "今日充值金额", value: `$${data.today.rechargeAmount.toFixed(2)}` },
        { label: "今日充值订单", value: data.today.rechargeOrders },
        { label: "今日新增用户", value: data.today.newUsers },
        { label: "今日活跃用户", value: data.today.activeUsers },
        { label: "今日解锁次数", value: data.today.unlocks },
        { label: "今日金币消耗", value: data.today.coinSpent },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                {kpis.map((k) => (
                    <Card key={k.label}>
                        <CardContent className="pt-6">
                            <p className="text-muted-foreground text-xs">{k.label}</p>
                            <p className="mt-1 text-xl font-bold">{k.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div>
                <div className="mb-2 font-semibold">近 7 天趋势</div>
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted">
                            <TableRow>
                                <TableHead>日期</TableHead>
                                <TableHead>新增用户</TableHead>
                                <TableHead>充值金额</TableHead>
                                <TableHead>解锁次数</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.trend.map((t) => (
                                <TableRow key={t.date}>
                                    <TableCell>{t.date}</TableCell>
                                    <TableCell>{t.newUsers}</TableCell>
                                    <TableCell>${t.recharge.toFixed(2)}</TableCell>
                                    <TableCell>{t.unlocks}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <div className="mb-2 font-semibold">热门短剧排行（按解锁）</div>
                    <div className="overflow-hidden rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="w-12">排名</TableHead>
                                    <TableHead>剧目</TableHead>
                                    <TableHead>解锁</TableHead>
                                    <TableHead>金币</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.topDramas.length > 0 ? (
                                    data.topDramas.map((d, i) => (
                                        <TableRow key={d.dramaId}>
                                            <TableCell className="font-bold">{i + 1}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{d.title}</TableCell>
                                            <TableCell>{d.unlocks}</TableCell>
                                            <TableCell>{d.coins}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-20 text-center">
                                            暂无数据
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div>
                    <div className="mb-2 font-semibold">用户充值排行（按金币消耗）</div>
                    <div className="overflow-hidden rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="w-12">排名</TableHead>
                                    <TableHead>用户</TableHead>
                                    <TableHead>解锁</TableHead>
                                    <TableHead>金币</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.topUsers.length > 0 ? (
                                    data.topUsers.map((u, i) => (
                                        <TableRow key={u.userId}>
                                            <TableCell className="font-bold">{i + 1}</TableCell>
                                            <TableCell className="max-w-[180px] truncate">{u.nickname}</TableCell>
                                            <TableCell>{u.unlocks}</TableCell>
                                            <TableCell>{u.coins}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-20 text-center">
                                            暂无数据
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
