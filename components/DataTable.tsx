'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

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

  // Determine if value is positive/negative for color coding
  const getValueType = (value: any, column: string): 'positive' | 'negative' | 'neutral' => {
    const lowerCol = column.toLowerCase();
    
    // Check for trend-related columns
    if (lowerCol.includes('trend')) {
      const val = String(value).toLowerCase();
      if (val.includes('bullish') || val.includes('up') || val.includes('naik')) return 'positive';
      if (val.includes('bearish') || val.includes('down') || val.includes('turun')) return 'negative';
      return 'neutral';
    }
    
    // Check for percentage or change columns
    if (lowerCol.includes('perubahan') || lowerCol.includes('change') || lowerCol.includes('return')) {
      if (typeof value === 'number') {
        if (value > 0) return 'positive';
        if (value < 0) return 'negative';
        return 'neutral';
      }
      const strVal = String(value);
      if (strVal.startsWith('+') || strVal.includes('+')) return 'positive';
      if (strVal.startsWith('-') || (parseFloat(strVal) < 0)) return 'negative';
      return 'neutral';
    }
    
    // Check for RSI (overbought > 70, oversold < 30)
    if (lowerCol === 'rsi' && typeof value === 'number') {
      if (value >= 70) return 'negative'; // Overbought
      if (value <= 30) return 'positive'; // Oversold (potential buy)
      return 'neutral';
    }
    
    return 'neutral';
  };

  const formatValue = (value: any, column: string): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      const lowerCol = column.toLowerCase();
      
      // Format large numbers
      if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
      if (value >= 1000) return value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
      
      // Format percentages
      if (lowerCol.includes('perubahan') || lowerCol.includes('change') || lowerCol.includes('return')) {
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
      }
      
      // Format RSI (no decimal)
      if (lowerCol === 'rsi') {
        return value.toFixed(2);
      }
      
      // Format prices
      if (lowerCol.includes('harga') || lowerCol.includes('price') || lowerCol.includes('support') || lowerCol.includes('ma')) {
        return value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
      }
      
      return value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
    }
    return String(value);
  };



  const formatColumnHeader = (col: string): string => {
    // Default: capitalize and add spaces
    return col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
  };

  const getTrendIcon = (value: any, column: string) => {
    const type = getValueType(value, column);
    const lowerCol = column.toLowerCase();
    
    if (lowerCol.includes('trend')) {
      if (type === 'positive') return <TrendingUp className="w-4 h-4 text-green-400" />;
      if (type === 'negative') return <TrendingDown className="w-4 h-4 text-red-400" />;
      return <Minus className="w-4 h-4 text-gray-400" />;
    }
    
    if (lowerCol.includes('perubahan') || lowerCol.includes('change') || lowerCol.includes('return')) {
      if (type === 'positive') return <TrendingUp className="w-3.5 h-3.5" />;
      if (type === 'negative') return <TrendingDown className="w-3.5 h-3.5" />;
    }
    
    return null;
  };

  return (
    <Card className={cn(
      "my-4 max-w-full overflow-hidden",
      "bg-gradient-to-br from-black/80 via-black/60 to-black/80",
      "backdrop-blur-xl border border-cyan-500/30",
      "shadow-[0_8px_32px_rgba(6,182,212,0.15)]",
      "rounded-xl"
    )}>
      {/* Header with gradient */}
      {table.title && (
        <CardHeader className="pb-0 pt-4 px-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5">
          <CardTitle className="text-center text-cyan-400 text-lg font-bold flex items-center justify-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {table.title}
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-cyan-500/30">
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={cn(
                      "px-4 py-3 text-center font-semibold text-gray-400 text-xs uppercase tracking-wider",
                      "bg-gradient-to-b from-cyan-500/10 to-transparent",
                      "first:rounded-tl-lg last:rounded-tr-lg"
                    )}
                  >
                    {formatColumnHeader(col)}
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody>
              {table.data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    "border-b border-cyan-500/10 transition-all duration-200",
                    "hover:bg-cyan-500/5 hover:border-cyan-500/20",
                    rowIndex % 2 === 0 ? "bg-black/30" : "bg-black/10"
                  )}
                >
                  {columns.map((col, colIndex) => {
                    const value = row[col];
                    const valueType = getValueType(value, col);
                    const icon = getTrendIcon(value, col);
                    const isSymbol = col.toLowerCase() === 'symbol';
                    const lowerCol = col.toLowerCase();
                    
                    return (
                      <td 
                        key={colIndex} 
                        className={cn(
                          "px-4 py-3 text-center",
                          "transition-colors duration-200",
                          // Symbol column styling
                          isSymbol && "font-bold text-cyan-400 text-base",
                          // Value-based coloring
                          !isSymbol && valueType === 'positive' && "text-green-400 font-medium",
                          !isSymbol && valueType === 'negative' && "text-red-400 font-medium",
                          !isSymbol && valueType === 'neutral' && "text-gray-200",
                          // Special styling for trend column
                          lowerCol.includes('trend') && valueType === 'positive' && "bg-green-500/10",
                          lowerCol.includes('trend') && valueType === 'negative' && "bg-red-500/10",
                          lowerCol.includes('trend') && valueType === 'neutral' && "bg-gray-500/10"
                        )}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {icon}
                          <span className={cn(
                            lowerCol.includes('trend') && "px-2 py-0.5 rounded-full text-xs font-semibold",
                            lowerCol.includes('trend') && valueType === 'positive' && "bg-green-500/20 text-green-400",
                            lowerCol.includes('trend') && valueType === 'negative' && "bg-red-500/20 text-red-400",
                            lowerCol.includes('trend') && valueType === 'neutral' && "bg-gray-500/20 text-gray-400"
                          )}>
                            {formatValue(value, col)}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer with gradient line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </CardContent>
    </Card>
  );
}
