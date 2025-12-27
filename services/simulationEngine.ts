
import { 
  Transaction, 
  TransactionType, 
  SpendFrequency, 
  WeeklyBehavior, 
  SimulationPoint,
  WeeklySimulationPoint,
  ActualEntry
} from '../types';

export const calculateDailySimulation = (
  initialBalance: number,
  year: number,
  month: number,
  transactions: Transaction[],
  actualEntries: ActualEntry[] = []
): SimulationPoint[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const points: SimulationPoint[] = [];
  let plannedBalance = initialBalance;
  let cumulativeIncome = 0;
  let cumulativeExpenses = 0;

  // Find the latest actual entry to project the "Reality" line
  const latestActual = actualEntries.length > 0 
    ? actualEntries.reduce((prev, current) => (prev.day > current.day) ? prev : current)
    : null;

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

    plannedBalance += dailyDelta;
    
    // Reality Trajectory Logic:
    // 1. If there's an actual entry for today, use it.
    // 2. If we are BEFORE the latest actual entry, show nothing or trend? (User wants to see their progress).
    // 3. If we are AFTER the latest actual entry, project based on the planned delta from the actual starting point.
    let actualValue: number | undefined = undefined;
    const matchingActual = actualEntries.find(e => e.day === day);
    
    if (matchingActual) {
      actualValue = matchingActual.value;
    } else if (latestActual && day > latestActual.day) {
      // Calculate projected delta from the latest real point
      let projectedDeltaSinceReal = 0;
      for (let d = latestActual.day + 1; d <= day; d++) {
        const dDate = new Date(year, month, d);
        const dDow = dDate.getDay();
        transactions.forEach((t, idx) => {
          const isInc = t.type === TransactionType.INCOME;
          if (t.frequency === SpendFrequency.ONCE && t.dayOfMonth === d) projectedDeltaSinceReal += isInc ? t.amount : -t.amount;
          else if (t.frequency === SpendFrequency.WEEKLY) {
            if (t.weeklyBehavior === WeeklyBehavior.SMOOTH) projectedDeltaSinceReal += isInc ? (t.amount/7) : -(t.amount/7);
            else if (dDow === (t.dayOfWeek ?? 1)) projectedDeltaSinceReal += isInc ? t.amount : -t.amount;
          }
        });
      }
      actualValue = latestActual.value + projectedDeltaSinceReal;
    } else if (latestActual && day < latestActual.day) {
        // Option: Show the "Reality" line leading to the first recorded point
        // For now, let's just show points where we have data or projections
    }

    points.push({
      date: `${day}`,
      dayNumber: day,
      balance: Math.round(plannedBalance * 100) / 100,
      actualBalance: actualValue !== undefined ? Math.round(actualValue * 100) / 100 : undefined,
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
      actualBalance: lastPoint.actualBalance,
      income: Math.round(weekIncome * 100) / 100,
      expenses: Math.round(weekExpense * 100) / 100
    });
    currentWeekIndex++;
  }

  return weeklyPoints;
};
