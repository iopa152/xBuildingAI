import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { cn } from "@buildingai/ui/lib/utils";

export interface RankingColumn<T> {
  key: string;
  title: string;
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
}

export function RankingTable<T>({
  title,
  columns,
  rows,
  getRowKey,
  className,
}: {
  title: string;
  columns: RankingColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 rounded-[4px] py-0 shadow-sm", className)}>
      <CardHeader className="border-b px-5 py-[18px] [.border-b]:pb-[18px]">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row, index) => (
                <TableRow key={getRowKey(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render(row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
