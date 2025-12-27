
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  SAVING = 'SAVING'
}

export enum SpendFrequency {
  ONCE = 'ONCE',
  WEEKLY = 'WEEKLY'
}

export enum WeeklyBehavior {
  SMOOTH = 'SMOOTH',
  LUMP_SUM = 'LUMP_SUM'
}

export enum AppTab {
  SIMULATION = 'SIMULATION',
  SCHEDULE = 'SCHEDULE',
  INSIGHTS = 'INSIGHTS'
}

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  dayOfMonth: number;
  dayOfWeek?: number; 
  frequency: SpendFrequency;
  weeklyBehavior?: WeeklyBehavior;
  category: string;
}

export interface SimulationPoint {
  date: string;
  dayNumber: number;
  balance: number;
  actualBalance?: number; // The "Reality" trajectory
  dailyDelta: number;
  cumulativeIncome: number;
  cumulativeExpenses: number;
}

export interface WeeklySimulationPoint {
  weekLabel: string;
  balance: number;
  actualBalance?: number;
  income: number;
  expenses: number;
}

export enum ViewMode {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY'
}

export interface ActualEntry {
  day: number;
  value: number;
}
