import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@buildingai/ui/components/ui/chart";
import { cn } from "@buildingai/ui/lib/utils";
import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";

import { CHART_COLORS } from "./chart-utils";

export interface CompositionItem {
  name: string;
  value: number;
}

function pieCells(data: CompositionItem[]) {
  return data.map((entry, index) => (
    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
  ));
}

export function RevenueCompositionChart({
  byType,
  byChannel,
  className,
}: {
  byType: CompositionItem[];
  byChannel: CompositionItem[];
  className?: string;
}) {
  const legendPayload = [
    ...byType.map((item, index) => ({
      value: item.name,
      color: CHART_COLORS[index % CHART_COLORS.length],
    })),
    ...byChannel.map((item, index) => ({
      value: item.name,
      color: CHART_COLORS[index % CHART_COLORS.length],
    })),
  ] as React.ComponentProps<typeof ChartLegend>["payload"];

  const config = React.useMemo(() => {
    const chartConfig: React.ComponentProps<typeof ChartContainer>["config"] = {};
    [...byType, ...byChannel].forEach((item, index) => {
      chartConfig[item.name] = {
        label: item.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
    return chartConfig;
  }, [byType, byChannel]);

  const empty = !byType.length && !byChannel.length;

  return (
    <Card className={cn("gap-0 rounded-[4px] py-0 shadow-sm", className)}>
      <CardHeader className="border-b px-5 py-[18px] [.border-b]:pb-[18px]">
        <CardTitle className="text-sm font-medium">充值构成</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {empty ? (
          <div className="text-muted-foreground flex h-[400px] items-center justify-center text-sm">
            暂无数据
          </div>
        ) : (
          <div className="relative">
            <ChartContainer config={config} className="h-[400px] w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      hideLabel
                      formatter={(value, name, item) => {
                        const percent = (item as { percent?: number } | undefined)?.percent;
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">{name}</span>
                            <span className="font-mono font-medium tabular-nums">
                              {typeof percent === "number"
                                ? `${(percent * 100).toFixed(0)}%`
                                : Number(value).toFixed(2)}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Pie
                  data={byType}
                  dataKey="value"
                  nameKey="name"
                  cx="25%"
                  cy="52%"
                  innerRadius="25%"
                  outerRadius="55%"
                  isAnimationActive={false}
                  label={false}
                >
                  {pieCells(byType)}
                </Pie>
                <Pie
                  data={byChannel}
                  dataKey="value"
                  nameKey="name"
                  cx="75%"
                  cy="52%"
                  innerRadius="25%"
                  outerRadius="55%"
                  isAnimationActive={false}
                  label={false}
                >
                  {pieCells(byChannel)}
                </Pie>
                <ChartLegend content={<ChartLegendContent />} payload={legendPayload} />
              </PieChart>
            </ChartContainer>
            <div className="text-muted-foreground pointer-events-none absolute inset-x-0 top-0 grid grid-cols-2 text-center text-[13px]">
              <span>按收入类型</span>
              <span>按支付渠道</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
