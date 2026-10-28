import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@buildingai/ui/components/ui/chart";
import { cn } from "@buildingai/ui/lib/utils";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";

import { CHART_COLORS, formatDateLabel, formatMoney } from "./chart-utils";

export interface RevenueTrendPoint {
  date: string;
  coin_recharge_amount: number;
  vip_purchase_amount: number;
  order_count: number;
}

const config = {
  coin_recharge_amount: { label: "金币充值", color: CHART_COLORS[0] },
  vip_purchase_amount: { label: "VIP购买", color: CHART_COLORS[1] },
  order_count: { label: "订单数", color: CHART_COLORS[2] },
} satisfies ChartConfig;

export function RevenueTrendChart({
  data,
  className,
}: {
  data: RevenueTrendPoint[];
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 rounded-[4px] py-0 shadow-sm", className)}>
      <CardHeader className="border-b px-5 py-[18px] [.border-b]:pb-[18px]">
        <CardTitle className="text-sm font-medium">充值趋势</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {data.length ? (
          <ChartContainer config={config} className="h-[350px] w-full">
            <ComposedChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={20}
                tickFormatter={formatDateLabel}
              />
              <YAxis
                yAxisId="amount"
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value: number) => `$${value}`}
                label={{
                  value: "USD",
                  position: "insideTopLeft",
                  style: { fontSize: 12 },
                }}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={44}
                allowDecimals={false}
                label={{
                  value: "订单数",
                  position: "insideTopRight",
                  style: { fontSize: 12 },
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono font-medium tabular-nums">
                          {name === "订单数"
                            ? Number(value).toLocaleString()
                            : formatMoney(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                yAxisId="amount"
                dataKey="coin_recharge_amount"
                type="monotone"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                fill={CHART_COLORS[0]}
                fillOpacity={0.25}
              />
              <Area
                yAxisId="amount"
                dataKey="vip_purchase_amount"
                type="monotone"
                stroke={CHART_COLORS[1]}
                strokeWidth={2}
                fill={CHART_COLORS[1]}
                fillOpacity={0.25}
              />
              <Area
                yAxisId="count"
                dataKey="order_count"
                type="monotone"
                stroke={CHART_COLORS[2]}
                strokeWidth={2}
                fill={CHART_COLORS[2]}
                fillOpacity={0.25}
              />
            </ComposedChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground flex h-[350px] items-center justify-center text-sm">
            暂无数据
          </div>
        )}
      </CardContent>
    </Card>
  );
}
