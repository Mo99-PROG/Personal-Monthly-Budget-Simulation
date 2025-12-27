
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Transaction, 
  TransactionType, 
  ViewMode, 
  SpendFrequency,
  AppTab,
  ActualEntry
} from './types';
import { calculateDailySimulation, aggregateToWeekly } from './services/simulationEngine';
import TransactionForm from './components/TransactionForm';
import BudgetChart from './components/BudgetChart';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const STORAGE_KEY_TX_MAP = 'flowbudget_v10_tx_map';
const STORAGE_KEY_BAL_MAP = 'flowbudget_v10_bal_map';
const STORAGE_KEY_ACTUALS = 'flowbudget_v10_actuals';

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#475569'];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const App: React.FC = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIdx = today.getMonth();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx);
  const monthKey = `${selectedYear}_${selectedMonth}`;

  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonthIdx;

  // Persistent State
  const [transactionsMap, setTransactionsMap] = useState<Record<string, Transaction[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TX_MAP);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [initialBalancesMap, setInitialBalancesMap] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BAL_MAP);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [actualEntries, setActualEntries] = useState<Record<string, ActualEntry[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTUALS);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.SIMULATION);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DAILY);
  
  const currentActuals = useMemo(() => actualEntries[monthKey] || [], [actualEntries, monthKey]);
  const [todayActualInput, setTodayActualInput] = useState<string>('');

  // Dynamic Window: Current Year + Next Year
  const availableYears = [currentYear, currentYear + 1];
  const availableMonths = useMemo(() => {
    return MONTHS_FULL.map((m, i) => ({
      name: m,
      index: i,
      disabled: selectedYear === currentYear && i < currentMonthIdx
    }));
  }, [selectedYear, currentYear, currentMonthIdx]);

  // Sync to LocalStorage
  useEffect(() => localStorage.setItem(STORAGE_KEY_TX_MAP, JSON.stringify(transactionsMap)), [transactionsMap]);
  useEffect(() => localStorage.setItem(STORAGE_KEY_BAL_MAP, JSON.stringify(initialBalancesMap)), [initialBalancesMap]);
  useEffect(() => localStorage.setItem(STORAGE_KEY_ACTUALS, JSON.stringify(actualEntries)), [actualEntries]);

  // PROPAGATION ENGINE: The "Simple Sense" Logic
  // When a change is made, it forces the update on ALL future months until end of next year.
  const propagateChanges = (action: 'add' | 'edit' | 'delete', tx: Transaction) => {
    setTransactionsMap(prev => {
      const nextMap = { ...prev };
      const endYear = currentYear + 1;

      // Iterate from the selected month to the end of next year
      for (let y = selectedYear; y <= endYear; y++) {
        const startM = (y === selectedYear) ? selectedMonth : 0;
        for (let m = startM; m <= 11; m++) {
          const key = `${y}_${m}`;
          const currentList = nextMap[key] || [];

          if (action === 'delete') {
            nextMap[key] = currentList.filter(item => item.id !== tx.id);
          } else {
            const index = currentList.findIndex(item => item.id === tx.id);
            if (index > -1) {
              currentList[index] = { ...tx };
              nextMap[key] = [...currentList];
            } else {
              nextMap[key] = [...currentList, { ...tx }];
            }
          }
        }
      }
      return nextMap;
    });
  };

  // INITIAL BALANCE INHERITANCE
  // If a month has no balance, it looks at the previous month's end projection.
  const transactions = useMemo(() => transactionsMap[monthKey] || [], [transactionsMap, monthKey]);
  
  const initialBalance = useMemo(() => {
    if (initialBalancesMap[monthKey] !== undefined) return initialBalancesMap[monthKey];
    
    // Look back for the nearest previous balance
    const allKeys = Object.keys(transactionsMap).sort();
    const prevKey = allKeys.filter(k => k < monthKey).pop();
    if (prevKey) {
        // We don't have the simulation for the prev month here easily, 
        // but we can at least inherit the starting balance of the previous month as a fallback.
        return initialBalancesMap[prevKey] || 0;
    }
    return 0;
  }, [initialBalancesMap, monthKey, transactionsMap]);

  const simulationData = useMemo(() => calculateDailySimulation(initialBalance, selectedYear, selectedMonth, transactions, currentActuals), [initialBalance, selectedYear, selectedMonth, transactions, currentActuals]);
  const weeklySimulationData = useMemo(() => aggregateToWeekly(simulationData), [simulationData]);

  const totals = useMemo(() => {
    const lastPoint = simulationData[simulationData.length - 1];
    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const totalSavings = transactions.filter(t => t.type === TransactionType.SAVING).reduce((sum, t) => sum + t.amount, 0);
    const wealthGrowth = totalIncome - totalExpenses;
    const surplus = totalIncome - totalExpenses - totalSavings;

    return {
      plannedEndBalance: lastPoint?.balance || 0,
      realityEndBalance: lastPoint?.actualBalance ?? lastPoint?.balance ?? 0,
      wealthGrowth,
      totalIncome,
      surplus,
      dailyFlex: surplus / (simulationData.length || 30),
      daysInMonth: simulationData.length
    };
  }, [simulationData, transactions]);

  const handleUpdateActual = () => {
    const val = parseFloat(todayActualInput);
    if (isNaN(val) || !isCurrentMonth) return;
    setActualEntries(prev => {
      const existing = prev[monthKey] || [];
      const updated = [...existing.filter(e => e.day !== today.getDate()), { day: today.getDate(), value: val }];
      return { ...prev, [monthKey]: updated };
    });
  };

  const handleClearActuals = () => {
    if(confirm('Clear reality logs for this month?')) {
        setActualEntries(prev => { 
          const newState = { ...prev };
          delete newState[monthKey];
          return newState; 
        });
        setTodayActualInput('');
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Delete this movement from current and all future months?')) {
      propagateChanges('delete', { id } as Transaction);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const categoryAnalysis = useMemo(() => {
    const split: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) return;
      split[t.category] = (split[t.category] || 0) + t.amount;
    });
    const data = Object.entries(split).map(([name, value]) => ({ name, value }));
    return { data, total: data.reduce((a, b) => a + b.value, 0) };
  }, [transactions]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col h-screen sticky top-0 no-print z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">FlowBudget</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: AppTab.SIMULATION, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Dashboard' },
            { id: AppTab.SCHEDULE, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Plan' },
            { id: AppTab.INSIGHTS, icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', label: 'Vision' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as AppTab)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 space-y-3">
          <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Add Movement</button>
          <button onClick={handlePrint} className="w-full py-4 border border-slate-200 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 transition-all text-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print Summary
          </button>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-12 max-w-7xl mx-auto w-full relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-none mb-1 tracking-tighter">
                {MONTHS_FULL[selectedMonth]} {selectedYear}
                {isCurrentMonth && <span className="ml-3 text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest align-middle shadow-lg">Live</span>}
            </h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Forward Trajectory Monitoring</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 no-print">
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(parseInt(e.target.value))} 
              className="bg-slate-50 border-none rounded-xl px-4 py-2.5 font-bold text-xs cursor-pointer focus:ring-2 focus:ring-indigo-500 transition-all"
            >
                {availableMonths.map(m => (
                  <option key={m.index} value={m.index} disabled={m.disabled}>{m.name}</option>
                ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(parseInt(e.target.value))} 
              className="bg-slate-50 border-none rounded-xl px-4 py-2.5 font-bold text-xs cursor-pointer focus:ring-2 focus:ring-indigo-500 transition-all"
            >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
            </select>
          </div>
        </div>

        {activeTab === AppTab.SIMULATION && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              <div className="bg-white p-8 rounded-[2rem] border-2 border-indigo-100 shadow-sm transition-all hover:shadow-lg">
                <label className="text-[10px] font-black text-indigo-500 uppercase block mb-4 tracking-widest">Initial Balance</label>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-black text-indigo-600">€</div>
                  <input 
                    type="number" 
                    value={initialBalance} 
                    onChange={e => setInitialBalancesMap(p => ({...p, [monthKey]: parseFloat(e.target.value) || 0}))} 
                    className="w-full text-3xl font-black text-slate-900 border-none focus:ring-0 p-0 bg-transparent outline-none" 
                  />
                </div>
              </div>

              <div className={`bg-white p-8 rounded-[2rem] border-2 shadow-sm transition-all ${isCurrentMonth ? 'border-emerald-100' : 'border-slate-100 opacity-60'}`}>
                <label className="text-[10px] font-black text-emerald-500 uppercase block mb-4 tracking-widest">Reality Check</label>
                {isCurrentMonth ? (
                  <>
                    <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-100 p-2 focus-within:border-emerald-500">
                      <span className="pl-3 pr-2 text-emerald-500 font-black text-xl">€</span>
                      <input 
                        type="number" 
                        value={todayActualInput} 
                        onChange={e => setTodayActualInput(e.target.value)} 
                        placeholder="Real Balance" 
                        className="w-full py-2 bg-transparent text-xl font-bold text-slate-900 outline-none border-none focus:ring-0 placeholder-slate-300" 
                      />
                      <button 
                        onClick={handleUpdateActual} 
                        className="bg-emerald-500 text-white p-2.5 rounded-xl hover:bg-emerald-600 transition-all active:scale-90 shadow-md ml-2 flex-shrink-0"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </button>
                    </div>
                    {currentActuals.length > 0 && (
                      <button onClick={handleClearActuals} className="mt-3 text-[9px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors">Reset Reality History</button>
                    )}
                  </>
                ) : <p className="text-slate-400 font-bold text-[10px] uppercase opacity-60">History preserved.</p>}
              </div>

              <div className={`p-8 rounded-[2rem] shadow-xl text-white ${totals.realityEndBalance >= 0 ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'}`}>
                <label className="text-[10px] font-black text-white/70 uppercase block mb-2 tracking-widest">Projection</label>
                <p className="text-3xl font-black tracking-tighter">€{totals.realityEndBalance.toLocaleString()}</p>
                <div className="mt-4 bg-white/10 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest">Target: €{totals.plannedEndBalance.toLocaleString()}</div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-10 z-10">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Controls</span>
                   <div className="flex bg-slate-800/80 p-1 rounded-2xl no-print border border-slate-700/50">
                      <button onClick={() => setViewMode(ViewMode.DAILY)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.DAILY ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500'}`}>Day</button>
                      <button onClick={() => setViewMode(ViewMode.WEEKLY)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.WEEKLY ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500'}`}>Week</button>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 z-10">
                   <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Monthly Surplus</span>
                      <p className="text-2xl font-black text-emerald-400 tracking-tight">€{totals.surplus.toLocaleString()}</p>
                   </div>
                   <div className="space-y-1 border-l border-slate-800 pl-4">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">Daily Flex</span>
                      <p className="text-2xl font-black text-indigo-300 tracking-tight">€{totals.dailyFlex.toFixed(2)}</p>
                   </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[450px]">
              <BudgetChart data={simulationData} weeklyData={weeklySimulationData} viewMode={viewMode} />
            </div>
          </div>
        )}

        {activeTab === AppTab.SCHEDULE && (
          <div className="animate-in fade-in duration-300">
             <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Financial Allocation</h3>
                    <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="text-[10px] font-black text-indigo-600 px-5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-all">+ Add Movement</button>
                </div>
                {transactions.length === 0 ? (
                  <div className="p-20 text-center"><p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Plan is empty.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100">
                          <th className="px-8 py-6 w-32">Timing</th>
                          <th className="px-8 py-6">Description</th>
                          <th className="px-8 py-6 text-right">Amount</th>
                          <th className="px-8 py-6 text-center no-print">Manage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.sort((a,b)=>a.dayOfMonth-b.dayOfMonth).map(t => (
                          <tr key={t.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-6">
                              <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black text-[10px] ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-700' : t.type === TransactionType.SAVING ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                <span className="text-base">{t.frequency === SpendFrequency.WEEKLY ? WEEKDAYS_SHORT[t.dayOfWeek ?? 1] : t.dayOfMonth}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6"><p className="text-base font-black text-slate-900 mb-1">{t.name}</p><span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">{t.category}</span></td>
                            <td className={`px-8 py-6 text-right font-black text-lg ${t.type === TransactionType.INCOME ? 'text-emerald-500' : t.type === TransactionType.SAVING ? 'text-indigo-600' : 'text-slate-900'}`}>
                              {t.type === TransactionType.EXPENSE ? '-' : '+'}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}€
                            </td>
                            <td className="px-8 py-6 no-print">
                                <div className="flex gap-2 justify-center">
                                    <button onClick={() => {setEditingTransaction(t); setIsFormOpen(true);}} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                    <button onClick={(e) => handleDelete(t.id, e)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === AppTab.INSIGHTS && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
                   <div className="flex-1">
                       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-4">Capital Vision</span>
                       <h3 className="text-3xl font-black mb-2 tracking-tight">Vision Board</h3>
                       <p className="text-slate-400 text-sm">Monthly velocity: €{totals.wealthGrowth.toLocaleString()}.</p>
                    </div>
                   <div className="grid grid-cols-2 gap-8 w-full md:w-auto">
                       <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-inner"><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">In 1 Year</span><span className="text-2xl font-black text-emerald-400">€{(totals.wealthGrowth * 12).toLocaleString()}</span></div>
                       <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-inner"><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">In 5 Years</span><span className="text-2xl font-black text-indigo-400">€{(totals.wealthGrowth * 60).toLocaleString()}</span></div>
                    </div>
                </div>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center">
                   <div className="flex justify-between items-center w-full mb-10"><h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Allocation</h3><span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">€{categoryAnalysis.total.toLocaleString()} total</span></div>
                   <div className="h-72 w-full relative">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie data={categoryAnalysis.data} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={8} dataKey="value">
                           {categoryAnalysis.data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={4} />))}
                         </Pie>
                         <RechartsTooltip />
                       </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-2xl font-black text-slate-900 tracking-tighter">€{categoryAnalysis.total.toLocaleString()}</span>
                     </div>
                   </div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center space-y-6">
                   <div className="p-7 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                     <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Velocity</span>
                     <p className="text-2xl font-black text-slate-900">€{(totals.wealthGrowth / (totals.daysInMonth || 30)).toFixed(2)} / Day</p>
                   </div>
                   <div className="p-7 bg-indigo-50 rounded-[1.5rem] border border-indigo-100">
                       <span className="text-[10px] font-black uppercase text-indigo-400 block mb-2 tracking-widest">Retention Rate</span>
                       <p className="text-2xl font-black text-indigo-600">
                           {totals.totalIncome > 0 ? Math.min(100, Math.max(0, (totals.wealthGrowth / totals.totalIncome) * 100)).toFixed(0) : '0'}% 
                           <span className="text-[10px] font-bold text-indigo-400 ml-1">preserved</span>
                        </p>
                    </div>
                </div>
             </div>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-200 px-4 h-20 flex items-center justify-around z-[100] no-print safe-bottom">
        {[
          { id: AppTab.SIMULATION, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Dash' },
          { id: AppTab.SCHEDULE, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Plan' },
          { id: AppTab.INSIGHTS, icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', label: 'Vision' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as AppTab)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={tab.icon} /></svg>
            <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

      {isFormOpen && (
        <TransactionForm 
          onSubmit={(t) => {
            propagateChanges(editingTransaction ? 'edit' : 'add', t);
            setIsFormOpen(false); setEditingTransaction(null);
          }} 
          onCancel={() => { setIsFormOpen(false); setEditingTransaction(null); }} 
          editingTransaction={editingTransaction} 
        />
      )}
    </div>
  );
};

export default App;
