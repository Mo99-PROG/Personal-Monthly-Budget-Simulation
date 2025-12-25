
import { 
  Transaction, 
  TransactionType, 
  SpendFrequency, 
  WeeklyBehavior, 
  SimulationPoint,
  WeeklySimulationPoint
} from '../types';

/**
 * Counts how many times a specific weekday occurs in a given month.
 */
export const countWeekdayOccurrences = (year: number, month: number, dayOfWeek: number): number => {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() === dayOfWeek) {
      count++;
    }
  }
  return count;
};

export const calculateDailySimulation = (
  initialBalance: number,
  year: number,
  month: number,
  transactions: Transaction[]
): SimulationPoint[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const points: SimulationPoint[] = [];
  let currentBalance = initialBalance;
  let cumulativeIncome = 0;
  let cumulativeExpenses = 0;

  // Pre-calculate daily smooth rates: (Weekly Amount / 7)
  const smoothRates = transactions.map(t => {
    if (t.frequency === SpendFrequency.WEEKLY && t.weeklyBehavior === WeeklyBehavior.SMOOTH) {
      return t.amount / 7;
    }
    return 0;
  });

  for (let day = 1; day <= daysInMonth; day++) {
    let dailyDelta = 0;
    const currentDate = new Date(year, month, day);
    const currentDayOfWeek = currentDate.getDay();

    transactions.forEach((t, idx) => {
      const isIncome = t.type === TransactionType.INCOME;
      
      if (t.frequency === SpendFrequency.ONCE) {
        if (t.dayOfMonth === day) {
          const val = isIncome ? t.amount : -t.amount;
          dailyDelta += val;
          if (isIncome) cumulativeIncome += t.amount;
          else cumulativeExpenses += t.amount;
        }
      } else if (t.frequency === SpendFrequency.WEEKLY) {
        if (t.weeklyBehavior === WeeklyBehavior.SMOOTH) {
          const rate = smoothRates[idx];
          const val = isIncome ? rate : -rate;
          dailyDelta += val;
          if (isIncome) cumulativeIncome += rate;
          else cumulativeExpenses += rate;
        } else {
          // LUMP_SUM - happens on specific day of week
          const targetDow = t.dayOfWeek ?? 1;
          if (currentDayOfWeek === targetDow) {
            const val = isIncome ? t.amount : -t.amount;
            dailyDelta += val;
            if (isIncome) cumulativeIncome += t.amount;
            else cumulativeExpenses += t.amount;
          }
        }
      }
    });

    currentBalance += dailyDelta;
    points.push({
      date: `${day}`,
      dayNumber: day,
      balance: Math.round(currentBalance * 100) / 100,
      dailyDelta: Math.round(dailyDelta * 100) / 100,
      cumulativeIncome: Math.round(cumulativeIncome * 100) / 100,
      cumulativeExpenses: Math.round(cumulativeExpenses * 100) / 100,
    });
  }

  return points;
};

export const aggregateToWeekly = (dailyPoints: SimulationPoint[]): WeeklySimulationPoint[] => {
  const weeklyPoints: WeeklySimulationPoint[] = [];
  let currentWeekIndex = 1;
  
  for (let i = 0; i < dailyPoints.length; i += 7) {
    const chunk = dailyPoints.slice(i, i + 7);
    const lastPoint = chunk[chunk.length - 1];
    
    const weekIncome = chunk.reduce((sum, p) => sum + (p.dailyDelta > 0 ? p.dailyDelta : 0), 0);
    const weekExpense = chunk.reduce((sum, p) => sum + (p.dailyDelta < 0 ? Math.abs(p.dailyDelta) : 0), 0);

    weeklyPoints.push({
      weekLabel: `Week ${currentWeekIndex}`,
      balance: lastPoint.balance,
      income: Math.round(weekIncome * 100) / 100,
      expenses: Math.round(weekExpense * 100) / 100
    });
    currentWeekIndex++;
  }

  return weeklyPoints;
};
