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
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { CHART_COLORS, formatDateLabel } from "./chart-utils";

export interface UserTrendPoint {
  date: string;
  new_users: number;
  pay_users: number;
  pay_rate: number;
}

const config = {
  new_users: { label: "新增用户", color: CHART_COLORS[0] },
  pay_users: { label: "付费用户", color: CHART_COLORS[1] },
  pay_rate: { label: "付费率", color: CHART_COLORS[2] },
} satisfies ChartConfig;

export function UserTrendChart({
  data,
  className,
}: {
  data: UserTrendPoint[];
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 rounded-[4px] py-0 shadow-sm", className)}>
      <CardHeader className="border-b px-5 py-[18px] [.border-b]:pb-[18px]">
        <CardTitle className="text-sm font-medium">用户趋势</CardTitle>
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
                yAxisId="users"
                tickLine={false}
                axisLine={false}
                width={52}
                allowDecimals={false}
                label={{
                  value: "新增用户",
                  position: "insideTopLeft",
                  style: { fontSize: 12 },
                }}
              />
              <YAxis
                yAxisId="rate"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(value: number) => `${value}%`}
                label={{
                  value: "付费率",
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
                          {name === "付费率"
                            ? `${Number(value).toFixed(1)}%`
                            : Number(value).toLocaleString()}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend
                content={<ChartLegendContent />}
                payload={
                  [
                    { value: "新增用户", dataKey: "new_users", color: CHART_COLORS[0] },
                    { value: "付费用户", dataKey: "pay_users", color: CHART_COLORS[1] },
                    { value: "付费率", dataKey: "pay_rate", color: CHART_COLORS[2] },
                  ] as React.ComponentProps<typeof ChartLegend>["payload"]
                }
              />
              <Line
                yAxisId="users"
                dataKey="new_users"
                type="monotone"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="users"
                dataKey="pay_users"
                type="monotone"
                stroke={CHART_COLORS[1]}
                strokeWidth={2}
                dot={false}
              />
              <Bar
                yAxisId="rate"
                dataKey="pay_rate"
                fill={CHART_COLORS[2]}
                radius={[3, 3, 0, 0]}
                barSize={14}
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
