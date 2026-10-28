import { Card, CardContent } from "@buildingai/ui/components/ui/card";
import { cn } from "@buildingai/ui/lib/utils";

function ChangeRatio({ value }: { value: number }) {
  const up = value > 0;
  const down = value < 0;
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-[13px] whitespace-nowrap",
        up && "text-[#67c23a]",
        down && "text-[#f56c6c]",
        !up && !down && "text-muted-foreground",
      )}
    >
      {up ? "▲" : down ? "▼" : null}
      <span>{value === 0 ? "0%" : `${up ? "+" : ""}${value.toFixed(1)}%`}</span>
      <span className="text-muted-foreground ml-1 text-xs">较昨日</span>
    </span>
  );
}

export function SummaryCard({
  title,
  value,
  change,
}: {
  title: string;
  value: React.ReactNode;
  change?: number;
}) {
  return (
    <Card className="gap-0 rounded-[4px] py-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-5">
        <div className="text-muted-foreground text-sm">{title}</div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-[28px] leading-none font-bold">{value}</span>
          {change !== undefined && <ChangeRatio value={change} />}
        </div>
      </CardContent>
    </Card>
  );
}
