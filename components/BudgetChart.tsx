
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
    const planned = payload.find((p: any) => p.dataKey === 'balance');
    const reality = payload.find((p: any) => p.dataKey === 'actualBalance');

    return (
      <div className="bg-white p-5 shadow-2xl rounded-[1.5rem] border border-slate-100 min-w-[180px]">
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-3 border-b border-slate-50 pb-2">
          {viewMode === ViewMode.DAILY ? `Day ${label}` : label}
        </p>
        
        <div className="space-y-4">
          <div>
            <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Projected Plan</span>
            <p className="text-indigo-600 font-black text-xl leading-none">
              €{planned?.value?.toLocaleString() || '0'}
            </p>
          </div>

          {reality && (
            <div className="pt-2 border-t border-slate-50">
              <span className="text-[8px] font-black text-emerald-500 uppercase block mb-1">Current Reality</span>
              <p className="text-emerald-600 font-black text-xl leading-none">
                €{reality?.value?.toLocaleString()}
              </p>
              <p className={`text-[9px] font-bold mt-1 ${reality.value >= planned.value ? 'text-emerald-500' : 'text-rose-500'}`}>
                {reality.value >= planned.value ? '↑ Above Plan' : '↓ Below Plan'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const BudgetChart: React.FC<Props> = ({ data, weeklyData, viewMode }) => {
  if (viewMode === ViewMode.WEEKLY) {
    return (
      <div className="h-[300px] md:h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="weekLabel" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
            <Tooltip content={<CustomTooltip viewMode={ViewMode.WEEKLY} />} cursor={{fill: '#f8fafc', radius: 12}} />
            <Bar dataKey="balance" fill="#e2e8f0" radius={[10, 10, 10, 10]} barSize={40} />
            <Bar dataKey="actualBalance" fill="#10b981" radius={[10, 10, 10, 10]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[300px] md:h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
            interval={window.innerWidth < 768 ? 5 : 2}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip content={<CustomTooltip viewMode={ViewMode.DAILY} />} />
          <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="5 5" />
          
          {/* Planned Line */}
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#6366f1"
            strokeWidth={4}
            fillOpacity={1}
            fill="url(#colorBalance)"
            animationDuration={1000}
          />

          {/* Reality Line */}
          <Area
            type="monotone"
            dataKey="actualBalance"
            stroke="#10b981"
            strokeWidth={3}
            strokeDasharray="8 8"
            fillOpacity={1}
            fill="url(#colorActual)"
            animationDuration={1500}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BudgetChart;
