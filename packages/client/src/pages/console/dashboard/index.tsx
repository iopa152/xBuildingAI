import { useQuery } from "@tanstack/react-query";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { cn } from "@buildingai/ui/lib/utils";
import { useAuthStore } from "@buildingai/stores";
import { RefreshCw } from "lucide-react";
import * as React from "react";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { RankingTable, type RankingColumn } from "./_components/ranking-table";
import {
  RevenueCompositionChart,
  type CompositionItem,
} from "./_components/revenue-composition-chart";
import { RevenueTrendChart, type RevenueTrendPoint } from "./_components/revenue-trend-chart";
import { SummaryCard } from "./_components/summary-card";
import { UserTrendChart, type UserTrendPoint } from "./_components/user-trend-chart";

interface StatsOverview {
  range: { start_date: string; end_date: string };
  today: {
    pay_amount: number;
    pay_amount_change: number;
    order_count: number;
    order_count_change: number;
    new_users: number;
    new_users_change: number;
    active_users: number;
    active_users_change: number;
  };
  summary: {
    total_pay_amount: number;
    total_pay_users: number;
    total_new_users: number;
    total_coin_consume: number;
  };
  revenue_trend: RevenueTrendPoint[];
  revenue_composition: { by_type: CompositionItem[]; by_channel: CompositionItem[] };
  user_trend: UserTrendPoint[];
  rankings: {
    top_recharge_users: {
      userId: string;
      nickname: string;
      total_amount: number;
      order_count: number;
    }[];
    top_dramas: {
      dramaId: string;
      title: string;
      purchase_count: number;
      total_coins: number;
    }[];
  };
}

type RechargeUser = StatsOverview["rankings"]["top_recharge_users"][number];
type DramaRank = StatsOverview["rankings"]["top_dramas"][number];

// drama extension controllers live under /drama/consoleapi/* (extension-level
// prefix), outside the platform consoleHttpClient's automatic /consoleapi
// prefix — call them with plain fetch and the session token.
const API_BASE = import.meta.env.DEV ? "http://localhost:4090" : "";

function dramaFetch<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().auth.token || "";
  return fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((res) => res.json() as Promise<{ code: number; message: string; data: T }>)
    .then((body) => {
      if (body.code !== 20000) throw new Error(body.message);
      return body.data;
    });
}

function toDateInput(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return { start: toDateInput(start), end: toDateInput(end) };
}

const rechargeColumns: RankingColumn<RechargeUser>[] = [
  {
    key: "rank",
    title: "排名",
    className: "w-[70px]",
    render: (_row, index) => <span className="font-bold">{index + 1}</span>,
  },
  {
    key: "nickname",
    title: "昵称",
    render: (row) => <span className="block max-w-[260px] truncate">{row.nickname}</span>,
  },
  {
    key: "amount",
    title: "充值总金额",
    render: (row) => <span className="font-semibold">{row.total_amount}</span>,
  },
  {
    key: "orders",
    title: "订单数",
    render: (row) => row.order_count,
  },
];

const dramaColumns: RankingColumn<DramaRank>[] = [
  {
    key: "rank",
    title: "排名",
    className: "w-[70px]",
    render: (_row, index) => <span className="font-bold">{index + 1}</span>,
  },
  {
    key: "title",
    title: "短剧标题",
    render: (row) => <span className="block max-w-[300px] truncate">{row.title}</span>,
  },
  {
    key: "purchases",
    title: "购买次数",
    render: (row) => row.purchase_count,
  },
  {
    key: "coins",
    title: "金币总额",
    render: (row) => <span className="font-semibold">{row.total_coins}</span>,
  },
];

const DashboardIndexPage = () => {
  const [initialRange] = React.useState(defaultRange);
  const [startDate, setStartDate] = React.useState(initialRange.start);
  const [endDate, setEndDate] = React.useState(initialRange.end);
  const [appliedRange, setAppliedRange] = React.useState(initialRange);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["drama-dashboard", "overview", appliedRange.start, appliedRange.end],
    queryFn: () =>
      dramaFetch<StatsOverview>(
        `/drama/consoleapi/stats/overview?start_date=${appliedRange.start}&end_date=${appliedRange.end}`,
      ),
    refetchInterval: 60_000,
  });

  const apply = () => {
    if (startDate === appliedRange.start && endDate === appliedRange.end) {
      void refetch();
    } else {
      setAppliedRange({ start: startDate, end: endDate });
    }
  };

  const today = data?.today;
  const summary = data?.summary;

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="bg-card flex flex-wrap items-center gap-3 rounded-md border px-[15px] py-[15px]">
          <Input
            type="date"
            aria-label="开始日期"
            className="w-[160px]"
            value={startDate}
            max={endDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <span className="text-muted-foreground text-sm">至</span>
          <Input
            type="date"
            aria-label="结束日期"
            className="w-[160px]"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
          <Button onClick={apply}>查询</Button>
          <Button variant="outline" onClick={apply} disabled={isFetching}>
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
            刷新
          </Button>
        </div>

        {isError ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-24 text-sm">
            <span>数据加载失败：{(error as Error)?.message ?? "未知错误"}</span>
            <Button variant="outline" onClick={() => void refetch()}>
              重试
            </Button>
          </div>
        ) : isLoading || !today || !summary || !data ? (
          <div className="flex items-center justify-center py-40">
            <Spinner className="size-8" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 min-[1200px]:grid-cols-4">
              <SummaryCard
                title="今日充值金额"
                value={today.pay_amount.toFixed(2)}
                change={today.pay_amount_change}
              />
              <SummaryCard
                title="今日订单数"
                value={today.order_count.toLocaleString()}
                change={today.order_count_change}
              />
              <SummaryCard
                title="今日新增用户"
                value={today.new_users.toLocaleString()}
                change={today.new_users_change}
              />
              <SummaryCard
                title="今日活跃用户"
                value={today.active_users.toLocaleString()}
                change={today.active_users_change}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 min-[1200px]:grid-cols-4">
              <SummaryCard title="区间充值金额" value={summary.total_pay_amount.toFixed(2)} />
              <SummaryCard
                title="区间付费用户"
                value={summary.total_pay_users.toLocaleString()}
              />
              <SummaryCard title="区间注册用户" value={summary.total_new_users.toLocaleString()} />
              <SummaryCard
                title="区间金币消耗"
                value={summary.total_coin_consume.toLocaleString()}
              />
            </div>

            <RevenueTrendChart data={data.revenue_trend} />

            <RevenueCompositionChart
              byType={data.revenue_composition.by_type}
              byChannel={data.revenue_composition.by_channel}
            />

            <UserTrendChart data={data.user_trend} />

            <div className="grid gap-4 min-[1200px]:grid-cols-2">
              <RankingTable
                title="充值排行"
                columns={rechargeColumns}
                rows={data.rankings.top_recharge_users}
                getRowKey={(row) => row.userId}
              />
              <RankingTable
                title="热门短剧排行"
                columns={dramaColumns}
                rows={data.rankings.top_dramas}
                getRowKey={(row) => row.dramaId}
              />
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default DashboardIndexPage;
