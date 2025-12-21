'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error('Chart components must be used within <ChartContainer />');
  return ctx;
}

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  // Set CSS variables so Recharts elements can reference them
  const style = React.useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, val] of Object.entries(config)) {
      if (val.color) vars[`--color-${key}`] = val.color;
    }
    return vars as React.CSSProperties;
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn('h-[280px] w-full', className)} style={style}>
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip(props: React.ComponentProps<typeof RechartsTooltip>) {
  return <RechartsTooltip {...props} />;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: any;
  valueFormatter?: (value: any) => string;
  labelFormatter?: (label: any) => string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  const formatValue = valueFormatter ?? ((v) => (typeof v === 'number' ? v.toLocaleString('id-ID') : String(v)));
  const formatLabel = labelFormatter ?? ((l) => String(l ?? ''));

  return (
    <div className="rounded-xl border border-blue-500/30 bg-black/85 px-4 py-3 text-xs text-white backdrop-blur-xl shadow-[0_8px_32px_rgba(37, 99, 235, 0.25),0_0_0_1px_rgba(37, 99, 235, 0.15)]">
      <div className="mb-2 text-blue-400 font-semibold text-xs">{formatLabel(label)}</div>
      <div className="space-y-2">
        {payload
          .filter((p) => p && p.dataKey && p.value !== undefined && p.value !== null)
          .map((p, idx) => {
            const key = String(p.dataKey);
            const conf = config[key] || {};
            const color = conf.color || p.color || '#3b82f6';
            return (
              <div key={`${key}-${idx}`} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span 
                    className="h-3 w-3 rounded-full shadow-[0_0_6px_currentColor]" 
                    style={{ backgroundColor: color, color: color }}
                  />
                  <span className="text-white/90 font-medium">{conf.label || key}</span>
                </div>
                <span className="font-bold text-white">{formatValue(p.value)}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function ChartLegend(props: React.ComponentProps<typeof RechartsLegend>) {
  return <RechartsLegend {...props} />;
}

export function ChartLegendContent({
  payload,
}: {
  payload?: Array<{ value?: string; dataKey?: string; color?: string }>;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-300">
      {payload.map((p, idx) => {
        const key = String(p.dataKey || p.value || idx);
        const conf = config[key] || {};
        const color = conf.color || p.color || '#3b82f6';
        return (
          <div key={key} className="flex items-center gap-2.5">
            <span 
              className="h-3 w-3 rounded-full shadow-[0_0_4px_currentColor]" 
              style={{ backgroundColor: color, color: color }}
            />
            <span className="font-medium text-gray-300">{conf.label || p.value || key}</span>
          </div>
        );
      })}
    </div>
  );
}


