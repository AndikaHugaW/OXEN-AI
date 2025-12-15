'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface TableData {
  title: string;
  data: Array<Record<string, any>>;
  columns?: string[];
}

interface DataTableProps {
  table: TableData;
}

export default function DataTable({ table }: DataTableProps) {
  // Auto-detect columns if not provided
  const columns = table.columns || (table.data.length > 0 ? Object.keys(table.data[0]) : []);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      // Format large numbers
      if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
      return value.toLocaleString('id-ID');
    }
    return String(value);
  };

  return (
    <Card className={cn("my-3 border-[hsl(var(--border))]/50 shadow-lg max-w-full overflow-x-auto bg-[hsl(var(--card))]/50 backdrop-blur-md")}>
      {table.title && (
        <CardHeader className="pb-3 pt-4 px-4 border-b border-[hsl(var(--border))]/50">
          <CardTitle className="text-center text-[hsl(var(--primary))] text-lg font-semibold">
            {table.title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="px-4 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className="px-4 py-2 text-left font-semibold text-muted-foreground bg-muted/50"
                  >
                    {col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    "border-b border-border/50 hover:bg-muted/30 transition-colors",
                    rowIndex % 2 === 0 ? "bg-card" : "bg-muted/10"
                  )}
                >
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-4 py-2 text-foreground">
                      {formatValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
