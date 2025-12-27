
import React, { useState, useEffect } from 'react';
import { 
  Transaction, 
  TransactionType, 
  SpendFrequency, 
  WeeklyBehavior 
} from '../types';

interface Props {
  onSubmit: (t: Transaction) => void;
  onCancel: () => void;
  editingTransaction: Transaction | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CATEGORIES = ["Work", "Housing", "Food", "Transport", "Utilities", "Leisure", "Health", "Investment", "Subscription", "Other"];

const TransactionForm: React.FC<Props> = ({ onSubmit, onCancel, editingTransaction }) => {
  const [formData, setFormData] = useState<Omit<Transaction, 'id'>>({
    name: '',
    amount: 0,
    type: TransactionType.EXPENSE,
    dayOfMonth: 1,
    dayOfWeek: 1,
    frequency: SpendFrequency.ONCE,
    weeklyBehavior: WeeklyBehavior.SMOOTH,
    category: 'Other'
  });

  useEffect(() => {
    if (editingTransaction) {
      setFormData({ ...editingTransaction });
    }
  }, [editingTransaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.amount <= 0) return;
    onSubmit({
      ...formData,
      id: editingTransaction?.id || Math.random().toString(36).substr(2, 9)
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center z-[9999] p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="px-8 py-7 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {editingTransaction ? 'Edit Item' : 'Add to Plan'}
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5">Simulation Data Entry</p>
          </div>
          <button onClick={onCancel} className="p-3 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1 pb-safe">
          
          {/* Label and Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5">What is it?</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-900 text-lg placeholder-slate-300"
                  placeholder="e.g. Monthly Salary"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Category</label>
                <div className="relative">
                  <select
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none font-bold text-slate-700 appearance-none cursor-pointer text-lg"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
             </div>
          </div>

          {/* Amount and Type Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Amount (€)</label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-indigo-400 text-2xl">€</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none font-black text-2xl transition-all"
                  value={formData.amount || ''}
                  onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Classification</label>
              <div className="grid grid-cols-3 gap-2.5 p-2 bg-slate-100 rounded-2xl h-16">
                {[TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.SAVING].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    className={`rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                      formData.type === type 
                        ? 'bg-indigo-600 shadow-lg text-white' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timing Section */}
          <div className="space-y-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Timing Pattern</label>
               <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 shadow-inner">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, frequency: SpendFrequency.ONCE })}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.frequency === SpendFrequency.ONCE ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}
                  >Single Hit</button>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, frequency: SpendFrequency.WEEKLY })}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.frequency === SpendFrequency.WEEKLY ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}
                  >Recurring</button>
               </div>
            </div>

            {formData.frequency === SpendFrequency.ONCE ? (
              <div className="space-y-5 bg-indigo-50/50 p-7 rounded-[2.5rem] border border-indigo-100 shadow-inner">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Target Day of Month</p>
                  <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-lg font-black shadow-lg">Day {formData.dayOfMonth}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="31"
                  className="w-full h-3 bg-indigo-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  value={formData.dayOfMonth}
                  onChange={e => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                />
                <div className="flex justify-between text-[10px] font-black text-indigo-300 uppercase px-1 tracking-widest">
                  <span>Cycle Start</span>
                  <span>Cycle End</span>
                </div>
              </div>
            ) : (
              <div className="space-y-8 bg-slate-50 p-7 rounded-[2.5rem] border border-slate-100 shadow-inner">
                {/* Simulation Logic Picker */}
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-5 tracking-widest text-center">Cash Flow Modeling</label>
                   <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, weeklyBehavior: WeeklyBehavior.SMOOTH })}
                        className={`flex flex-col items-center p-5 rounded-[2rem] border-2 transition-all group ${
                          formData.weeklyBehavior === WeeklyBehavior.SMOOTH 
                            ? 'border-indigo-600 bg-white text-indigo-700 shadow-lg' 
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full mb-3 flex items-center justify-center transition-colors ${formData.weeklyBehavior === WeeklyBehavior.SMOOTH ? 'bg-indigo-100' : 'bg-slate-50'}`}>
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </div>
                        <span className="font-black text-xs uppercase tracking-tighter">Smooth</span>
                        <span className="text-[9px] mt-1.5 text-slate-400 font-bold leading-none uppercase tracking-widest opacity-60">Daily Weighted</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, weeklyBehavior: WeeklyBehavior.LUMP_SUM })}
                        className={`flex flex-col items-center p-5 rounded-[2rem] border-2 transition-all group ${
                          formData.weeklyBehavior === WeeklyBehavior.LUMP_SUM 
                            ? 'border-indigo-600 bg-white text-indigo-700 shadow-lg' 
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full mb-3 flex items-center justify-center transition-colors ${formData.weeklyBehavior === WeeklyBehavior.LUMP_SUM ? 'bg-indigo-100' : 'bg-slate-50'}`}>
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <span className="font-black text-xs uppercase tracking-tighter">Impact</span>
                        <span className="text-[9px] mt-1.5 text-slate-400 font-bold leading-none uppercase tracking-widest opacity-60">One Hit Day</span>
                      </button>
                   </div>
                   
                   <p className="mt-4 text-[10px] text-center text-slate-400 font-medium px-4 leading-relaxed">
                    {formData.weeklyBehavior === WeeklyBehavior.SMOOTH 
                      ? "Distribution: The cost is divided by 7 and applied every day. Specific weekday choice is hidden because it doesn't affect the math."
                      : "Realism: The full amount hits your balance only on the specific weekday you choose below."}
                   </p>
                </div>

                {/* Visual Weekday Picker - Only shown if LUMP_SUM is selected */}
                {formData.weeklyBehavior === WeeklyBehavior.LUMP_SUM && (
                  <div className="pt-6 border-t border-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-5 tracking-widest text-center">Repeat on every...</label>
                    <div className="flex justify-between gap-1.5 md:gap-3">
                      {WEEKDAYS.map((day, i) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setFormData({ ...formData, dayOfWeek: i })}
                          className={`flex-1 py-4 rounded-2xl text-[10px] md:text-xs font-black transition-all border-2 ${
                            formData.dayOfWeek === i
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 scale-105'
                              : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200 shadow-sm'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-indigo-600 font-black mt-5 text-center uppercase tracking-[0.2em]">{WEEKDAYS_FULL[formData.dayOfWeek ?? 0]}s in the month</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-8 flex gap-4 no-print sticky bottom-0 bg-white py-4 border-t border-slate-50">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-5 px-6 rounded-2xl bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-5 px-6 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all active:scale-[0.98]"
            >
              {editingTransaction ? 'Save Edits' : 'Commit Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
