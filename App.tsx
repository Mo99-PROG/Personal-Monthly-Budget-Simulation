
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Transaction, 
  TransactionType, 
  ViewMode, 
  SpendFrequency,
  WeeklyBehavior,
  AppTab
} from './types';
import { calculateDailySimulation, aggregateToWeekly, countWeekdayOccurrences } from './services/simulationEngine';
import TransactionForm from './components/TransactionForm';
import BudgetChart from './components/BudgetChart';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const STORAGE_KEY_TX = 'flowbudget_transactions';
const STORAGE_KEY_BAL = 'flowbudget_initial_balance';

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#475569'];

const App: React.FC = () => {
  const [initialBalance, setInitialBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BAL);
      return saved ? parseFloat(saved) : 2500;
    } catch { return 2500; }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TX);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.SIMULATION);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DAILY);
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BAL, initialBalance.toString());
  }, [initialBalance]);

  const simulationData = useMemo(() => {
    return calculateDailySimulation(initialBalance, selectedYear, selectedMonth, transactions);
  }, [initialBalance, selectedYear, selectedMonth, transactions]);

  const weeklySimulationData = useMemo(() => {
    return aggregateToWeekly(simulationData);
  }, [simulationData]);

  const totals = useMemo(() => {
    const lastPoint = simulationData[simulationData.length - 1];
    const endBalance = lastPoint?.balance || 0;
    const totalIncome = lastPoint?.cumulativeIncome || 0;
    const totalExpense = lastPoint?.cumulativeExpenses || 0;
    return { endBalance, totalIncome, totalExpense };
  }, [simulationData]);

  const categoryAnalysis = useMemo(() => {
    const split: Record<string, number> = {};
    const daysInMonth = simulationData.length;

    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) return;
      
      let actualMonthlyAmount = 0;
      if (t.frequency === SpendFrequency.ONCE) {
        actualMonthlyAmount = t.amount;
      } else {
        if (t.weeklyBehavior === WeeklyBehavior.SMOOTH) {
          actualMonthlyAmount = (t.amount / 7) * daysInMonth;
        } else {
          const occurrences = countWeekdayOccurrences(selectedYear, selectedMonth, t.dayOfWeek ?? 0);
          actualMonthlyAmount = t.amount * occurrences;
        }
      }

      const key = t.type === TransactionType.SAVING ? `Saving: ${t.category}` : t.category;
      split[key] = (split[key] || 0) + actualMonthlyAmount;
    });

    const data = Object.entries(split).map(([name, value]) => ({ name, value }));
    const totalAllocation = Object.values(split).reduce((a, b) => a + b, 0);

    return { data, totalAllocation };
  }, [transactions, simulationData, selectedYear, selectedMonth]);

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleEdit = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (window.confirm('Delete this item from your plan?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  }, []);

  // Simplified and more robust print handler
  const handlePrint = useCallback(() => {
    window.focus();
    window.print();
  }, []);

  const openAddForm = useCallback(() => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  }, []);

  const NavItem = ({ tab }: { tab: { id: AppTab, icon: string, label: string } }) => (
    <button
      onClick={() => setActiveTab(tab.id)}
      className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-4 px-4 py-3 md:py-4 rounded-2xl font-bold transition-all flex-1 md:flex-none ${
        activeTab === tab.id 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
      }`}
    >
      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={tab.icon} />
      </svg>
      <span className="text-[10px] md:text-sm uppercase md:capitalize tracking-tighter md:tracking-normal">{tab.label}</span>
    </button>
  );

  const TABS_CONFIG = [
    { id: AppTab.SIMULATION, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Dashboard' },
    { id: AppTab.SCHEDULE, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Payments' },
    { id: AppTab.INSIGHTS, icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z', label: 'Analysis' }
  ];

  const actualDaysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col h-screen sticky top-0 no-print z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter">FlowBudget</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {TABS_CONFIG.map(tab => <NavItem key={tab.id} tab={tab} />)}
        </nav>
        <div className="p-6 space-y-3">
          <button onClick={openAddForm} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add Movement
          </button>
          <button onClick={handlePrint} className="w-full py-4 border border-slate-200 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 flex items-center justify-center gap-2 transition-all text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Summary
          </button>
        </div>
      </aside>

      <header className="md:hidden glass border-b border-slate-200 px-6 h-16 flex items-center justify-between sticky top-0 z-[100] no-print safe-top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
             <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <span className="font-black text-slate-900">FlowBudget</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="p-2 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
          <button onClick={openAddForm} className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 p-5 md:p-12 max-w-7xl mx-auto w-full relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-10">
           <div className="flex flex-col">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-none mb-1 tracking-tight">
                {MONTHS[selectedMonth]} {selectedYear}
              </h2>
              <p className="text-slate-400 font-semibold text-xs md:text-sm uppercase tracking-widest">Financial Trajectory Simulation</p>
           </div>
           <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 no-print">
              <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-50 border-none rounded-xl px-4 py-2.5 font-bold text-xs md:text-sm text-slate-700 outline-none appearance-none cursor-pointer">
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-50 border-none rounded-xl px-4 py-2.5 font-bold text-xs md:text-sm text-slate-700 outline-none appearance-none cursor-pointer">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
           </div>
        </div>

        {activeTab === AppTab.SIMULATION && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-white p-8 rounded-[2rem] border-2 border-indigo-100 shadow-sm transition-all hover:shadow-lg group relative overflow-hidden">
                <div className="relative z-10">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-4">Initial Bank Balance</label>
                  <div className="flex items-center gap-3">
                    <div className="text-4xl font-black text-indigo-600">€</div>
                    <input type="number" value={initialBalance} onChange={e => setInitialBalance(parseFloat(e.target.value) || 0)} className="w-full text-4xl font-black text-slate-900 border-none focus:ring-0 p-0 bg-transparent" placeholder="0.00" />
                  </div>
                </div>
              </div>
              <div className={`p-8 rounded-[2rem] shadow-xl transition-all relative overflow-hidden group ${totals.endBalance >= 0 ? 'bg-indigo-600 shadow-indigo-100' : 'bg-rose-600 shadow-rose-100'}`}>
                <div className="relative z-10">
                  <label className="text-[10px] font-black text-white/70 uppercase tracking-widest block mb-2">Projected Monthly End</label>
                  <p className="text-4xl md:text-5xl font-black text-white tracking-tighter">€{totals.endBalance.toLocaleString()}</p>
                  <div className="flex items-center gap-1.5 mt-5 bg-white/20 w-fit px-4 py-1.5 rounded-full backdrop-blur-sm">
                    <p className="text-[10px] font-black text-white uppercase">
                      {totals.endBalance >= 0 ? `Limit: €${(totals.endBalance / actualDaysInMonth).toFixed(2)} / Daily Flex` : 'Deficit Projected'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col justify-between shadow-2xl relative group">
                 <div className="flex justify-between items-center mb-8 relative z-10">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Volume</span>
                    <div className="flex bg-slate-800 p-1 rounded-xl no-print">
                      <button onClick={() => setViewMode(ViewMode.DAILY)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.DAILY ? 'bg-white text-indigo-600' : 'text-slate-500'}`}>Day</button>
                      <button onClick={() => setViewMode(ViewMode.WEEKLY)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === ViewMode.WEEKLY ? 'bg-white text-indigo-600' : 'text-slate-500'}`}>Week</button>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div className="flex flex-col">
                       <span className="text-[9px] text-slate-500 font-bold uppercase mb-1">Incoming</span>
                       <span className="text-2xl font-black text-emerald-400">€{totals.totalIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-800 pl-6">
                       <span className="text-[9px] text-slate-500 font-bold uppercase mb-1">Outgoing</span>
                       <span className="text-2xl font-black text-rose-400">€{totals.totalExpense.toLocaleString()}</span>
                    </div>
                 </div>
              </div>
            </div>
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[400px]">
               <BudgetChart data={simulationData} weeklyData={weeklySimulationData} viewMode={viewMode} />
            </div>
          </div>
        )}

        {activeTab === AppTab.SCHEDULE && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900">Planned Schedule</h3>
                  {transactions.length > 0 && (
                    <button onClick={() => { if(confirm('Erase all planned items?')) setTransactions([]); }} className="text-[10px] font-black text-rose-500 px-5 py-2.5 rounded-xl bg-rose-50 no-print">Clear Plan</button>
                  )}
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-100">
                        <th className="px-8 py-6">Timing</th>
                        <th className="px-8 py-6">Description</th>
                        <th className="px-8 py-6 text-right">Amount</th>
                        <th className="px-8 py-6 text-center no-print">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.sort((a, b) => (a.dayOfMonth || 0) - (b.dayOfMonth || 0)).map(t => (
                        <tr key={t.id} className="group hover:bg-slate-50 cursor-pointer" onClick={() => handleEdit(t)}>
                          <td className="px-8 py-6">
                             <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black text-[10px] ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-700' : t.type === TransactionType.SAVING ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                               <span className="opacity-50 text-[8px]">{t.frequency === SpendFrequency.WEEKLY ? 'Every' : 'Day'}</span>
                               <span className="text-base">{t.frequency === SpendFrequency.WEEKLY ? WEEKDAYS_SHORT[t.dayOfWeek ?? 1] : t.dayOfMonth}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-base font-black text-slate-900 leading-none mb-1.5">{t.name}</p>
                            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full uppercase">{t.category}</span>
                          </td>
                          <td className={`px-8 py-6 text-right font-black text-lg ${t.type === TransactionType.INCOME ? 'text-emerald-500' : t.type === TransactionType.SAVING ? 'text-indigo-600' : 'text-slate-900'}`}>
                            {t.type === TransactionType.EXPENSE ? '-' : '+'}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}€
                          </td>
                          <td className="px-8 py-6 text-center no-print" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleDelete(t.id)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {activeTab === AppTab.INSIGHTS && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center overflow-hidden">
                <div className="flex justify-between items-center w-full mb-10">
                   <h3 className="text-xl md:text-2xl font-black text-slate-900">Allocation Breakdown</h3>
                   <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Monthly Allocation</span>
                </div>
                <div className="h-72 w-full relative">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryAnalysis.data} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={8} dataKey="value">
                          {categoryAnalysis.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={4} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outflow</span>
                      <span className="text-2xl font-black text-slate-900 tracking-tighter">€{categoryAnalysis.totalAllocation.toFixed(0)}</span>
                   </div>
                </div>
             </div>
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-10">Real Projected Costs</h3>
                <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-4">
                   {categoryAnalysis.data.length > 0 ? categoryAnalysis.data.map((cat, i) => (
                     <div key={cat.name} className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase">
                           <span className="text-slate-500 flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                              {cat.name}
                           </span>
                           <span className="text-slate-900 font-bold">€{cat.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden">
                           <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(cat.value / categoryAnalysis.totalAllocation) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                        </div>
                     </div>
                   )) : <div className="py-20 text-center text-slate-400">Add movements to view analysis.</div>}
                </div>
             </div>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-200 px-2 h-20 flex items-center justify-around z-[100] no-print safe-bottom">
        {TABS_CONFIG.map(tab => <NavItem key={tab.id} tab={tab} />)}
      </nav>

      {isFormOpen && (
        <TransactionForm onSubmit={(t) => {
            if (editingTransaction) { setTransactions(prev => prev.map(item => item.id === t.id ? t : item)); }
            else { setTransactions(prev => [...prev, t]); }
            setIsFormOpen(false); setEditingTransaction(null);
          }} onCancel={() => { setIsFormOpen(false); setEditingTransaction(null); }} editingTransaction={editingTransaction} />
      )}
    </div>
  );
};

export default App;
