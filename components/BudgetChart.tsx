
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { SimulationPoint, WeeklySimulationPoint, ViewMode } from '../types';

interface Props {
  data: SimulationPoint[];
  weeklyData: WeeklySimulationPoint[];
  viewMode: ViewMode;
}

const CustomTooltip = ({ active, payload, label, viewMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-2xl rounded-2xl border border-slate-50">
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">
          {viewMode === ViewMode.DAILY ? `Day ${label}` : label}
        </p>
        <p className="text-slate-900 font-black text-xl mb-3">
          €{payload[0].value.toLocaleString()}
        </p>
        {payload[1] && (
          <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl">
             <div className="flex justify-between items-center gap-6">
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Total In</span>
               <span className="text-xs font-black text-slate-700">€{(payload[1]?.payload.cumulativeIncome || payload[1]?.payload.income).toFixed(0)}</span>
             </div>
             <div className="flex justify-between items-center gap-6">
               <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Total Out</span>
               <span className="text-xs font-black text-slate-700">€{(payload[1]?.payload.cumulativeExpenses || payload[1]?.payload.expenses).toFixed(0)}</span>
             </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const BudgetChart: React.FC<Props> = ({ data, weeklyData, viewMode }) => {
  if (viewMode === ViewMode.WEEKLY) {
    return (
      <div className="h-[280px] md:h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
            <XAxis dataKey="weekLabel" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} />
            <Tooltip content={<CustomTooltip viewMode={ViewMode.WEEKLY} />} cursor={{fill: '#f8fafc', radius: 12}} />
            <Bar dataKey="balance" radius={[8, 8, 8, 8]}>
              {weeklyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.balance >= 0 ? '#4f46e5' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[280px] md:h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} 
            interval={window.innerWidth < 768 ? 4 : 2}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip content={<CustomTooltip viewMode={ViewMode.DAILY} />} />
          <ReferenceLine y={0} stroke="#f1f5f9" strokeWidth={2} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#4f46e5"
            strokeWidth={4}
            fillOpacity={1}
            fill="url(#colorBalance)"
            animationDuration={1500}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BudgetChart;
