'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Zap, DollarSign, Activity, Clock, Server, PieChart, CheckCircle, AlertTriangle, AlertCircle, TrendingUp, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/analytics?range=${timeRange}`);
      
      if (res.status === 403) {
        // Redirect non-admins
        router.push('/');
        return;
      }

      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      } else {
        setError('Failed to load data');
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const getMaxValue = (arr: any[], key: string) => {
    if (!arr || arr.length === 0) return 0;
    return Math.max(...arr.map(item => item[key]));
  };

  if (error) {
     return (
        <div className="flex items-center justify-center h-screen bg-[#09090b] text-white">
           <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold">Access Error</h2>
              <p className="text-gray-400 mt-2">{error}</p>
              <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-[#27272a] rounded-lg hover:bg-[#3f3f46]">Go Back</button>
           </div>
        </div>
     )
  }

  return (
    <div className="flex-1 h-screen overflow-hidden bg-[#09090b] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Admin Analytics
            </h1>
            <p className="text-xs text-gray-400">AI Health, Performance & Cost Tracking</p>
          </div>
        </div>

        <div className="flex bg-[#18181b] rounded-lg p-1 border border-[#27272a]">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                timeRange === range
                  ? 'bg-[#27272a] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* AI Health Metrics (New Section) */}
          <div>
             <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">AI Quality & Health</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Success Rate */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <CheckCircle className="w-24 h-24 text-green-500" />
                   </div>
                   <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2 text-green-400">
                         <CheckCircle className="w-4 h-4" />
                         <span className="text-xs font-medium uppercase">Success Rate</span>
                      </div>
                      <div className="text-3xl font-bold text-white mb-1">
                         {loading ? '...' : `${data?.summary.successRate}%`}
                      </div>
                      <p className="text-xs text-gray-400">Requests completed successfully</p>
                   </div>
                </div>

                {/* Accuracy / User Rating */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <UserCheck className="w-24 h-24 text-blue-500" />
                   </div>
                   <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2 text-blue-400">
                         <UserCheck className="w-4 h-4" />
                         <span className="text-xs font-medium uppercase">User Satisfaction</span>
                      </div>
                      <div className="text-3xl font-bold text-white mb-1">
                         {loading ? '...' : `${data?.summary.avgAccuracy}%`}
                      </div>
                      <p className="text-xs text-gray-400">Positive feedback from users</p>
                   </div>
                </div>

                {/* Error Rate */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 relative overflow-hidden hover:border-red-500/30 transition-colors">
                   <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2 text-red-400">
                         <AlertCircle className="w-4 h-4" />
                         <span className="text-xs font-medium uppercase">Error Count</span>
                      </div>
                      <div className="text-3xl font-bold text-white mb-1">
                         {loading ? '...' : data?.summary.errorCount}
                      </div>
                      <p className="text-xs text-gray-400">Failures in selected period</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Operational Metrics */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Operational Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Tokens */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Activity className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium uppercase">Volume</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                    {loading ? '...' : data?.summary.totalTokens.toLocaleString()}
                </div>
                <p className="text-xs text-gray-400">Total Tokens</p>
                </div>

                {/* Cache Rate */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                    <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium uppercase">Efficiency</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                    {loading ? '...' : `${data?.summary.cacheRate}%`}
                </div>
                <p className="text-xs text-gray-400">Cache Hit Rate</p>
                </div>

                {/* Latency */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                    <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium uppercase">Speed</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                    {loading ? '...' : `${data?.summary.avgLatency}ms`}
                </div>
                <p className="text-xs text-gray-400">Avg Response Time</p>
                </div>

                {/* Cost */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium uppercase">Est. Cost</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                    {loading ? '...' : `$${data?.summary.estimatedCost}`}
                </div>
                <p className="text-xs text-emerald-400/80">
                    Saved ~${data?.summary.estimatedSavings}
                </p>
                </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Usage Trend (Bar Chart CSS) */}
            <div className="lg:col-span-2 bg-[#18181b] border border-[#27272a] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Requests & Errors Trend
              </h3>
              
              <div className="h-64 flex items-end gap-2 relative">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">Loading chart...</div>
                ) : data?.chartData?.length > 0 ? (
                  data.chartData.map((day: any, i: number) => {
                    const max = getMaxValue(data.chartData, 'requests');
                    const height = max > 0 ? (day.requests / max) * 100 : 0;
                    // Error height relative to bar
                    const errorHeight = day.requests > 0 ? (day.errors / day.requests) * 100 : 0;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                         {/* Tooltip */}
                         <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-black border border-gray-800 text-xs text-white p-2 rounded pointer-events-none transition-opacity z-10 whitespace-nowrap">
                           {day.date}<br/>
                           Reqs: {day.requests}<br/>
                           Errs: {day.errors}
                         </div>
                         {/* Bar Container */}
                         <div 
                           className="w-full bg-[#27272a] rounded-t-sm relative overflow-hidden transition-all duration-300 hover:bg-[#3f3f46]"
                           style={{ height: `${Math.max(height, 5)}%` }}
                         >
                            {/* Error portion (Red) */}
                            <div 
                                className="absolute bottom-0 left-0 w-full bg-red-500/50"
                                style={{ height: `${errorHeight}%` }}
                            ></div>
                            {/* Success portion (Indigo) */}
                            <div 
                                className="absolute bottom-0 left-0 w-full bg-indigo-500/50"
                                style={{ height: `${100 - errorHeight}%`, bottom: `${errorHeight}%` }}
                            ></div>
                         </div>

                         {/* X Axis Label */}
                         {i % Math.ceil(data.chartData.length / 5) === 0 && (
                           <span className="text-[10px] text-gray-500 mt-2 absolute -bottom-6 w-20 text-center">
                             {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                           </span>
                         )}
                      </div>
                    )
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">No data available</div>
                )}
              </div>
            </div>

            {/* Query Distribution */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6">
               <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" />
                Query Types
              </h3>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center text-gray-500 py-10">Loading...</div>
                ) : data?.typeDistribution && Object.keys(data.typeDistribution).length > 0 ? (
                   Object.entries(data.typeDistribution).map(([type, count]: any, i) => {
                     const total = data.summary.totalRequests || 1;
                     const percent = Math.round((count / total) * 100);
                     return (
                       <div key={i} className="space-y-1">
                         <div className="flex justify-between text-sm">
                           <span className="text-gray-300 capitalize">{type.replace('_', ' ')}</span>
                           <span className="text-gray-500">{count} ({percent}%)</span>
                         </div>
                         <div className="h-2 w-full bg-[#27272a] rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                             style={{ width: `${percent}%` }}
                           ></div>
                         </div>
                       </div>
                     )
                   })
                ) : (
                   <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                     <p>No usage data yet</p>
                   </div>
                )}
              </div>
            </div>

          </div>

          <div className="text-center text-xs text-gray-600 pb-4">
             Confidential Admin Data. Do not share outside organization.
          </div>

        </div>
      </main>
    </div>
  );
}
