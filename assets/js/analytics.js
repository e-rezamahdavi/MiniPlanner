import { calculateEventDurationHours } from "./data.js";

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function getRangeDates(rangeDays) {
  const now = startOfDay(new Date());
  const start = new Date(now);
  start.setDate(start.getDate() - (rangeDays - 1));
  return { start, end: now };
}

function inRange(dateString, rangeDays) {
  if (!dateString) return false;
  const d = startOfDay(new Date(dateString));
  if (Number.isNaN(d.getTime())) return false;

  const { start, end } = getRangeDates(rangeDays);
  return d >= start && d <= end;
}

function percentage(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}

export function computeGoalVelocity(state, rangeDays = 30) {
  const goals = state.goals || [];

  let completed = 0;
  let active = 0;
  let nearDeadline = 0;
  let sumProgress = 0;

  const now = new Date();
  goals.forEach((goal) => {
    if (goal.status === "completed") completed += 1;
    if (goal.status === "active") active += 1;

    const progress = percentage(goal.currentValue, goal.targetValue || 1);
    sumProgress += progress;

    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      const diffDays = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 7 && goal.status !== "completed") {
        nearDeadline += 1;
      }
    }
  });

  return {
    completed,
    active,
    nearDeadline,
    averageProgress: goals.length ? sumProgress / goals.length : 0,
    rangeDays
  };
}

export function computeHabitConsistency(state, rangeDays = 30) {
  const habits = (state.habits || []).filter((item) => !item.archived);
  const logs = state.habitLogs || [];

  const logsByHabit = new Map(habits.map((habit) => [habit.id, []]));
  logs.forEach((log) => {
    if (!inRange(log.date, rangeDays)) return;
    if (!logsByHabit.has(log.habitId)) return;
    logsByHabit.get(log.habitId).push(log);
  });

  let scoreSum = 0;
  habits.forEach((habit) => {
    const values = logsByHabit.get(habit.id) || [];
    const achieved = values.reduce((acc, item) => acc + Number(item.value || 0), 0);

    let expected;
    if (habit.frequency === "daily") {
      expected = habit.targetPerPeriod * rangeDays;
    } else if (habit.frequency === "weekly") {
      expected = habit.targetPerPeriod * Math.ceil(rangeDays / 7);
    } else {
      expected = habit.targetPerPeriod;
    }

    scoreSum += percentage(achieved, expected || 1);
  });

  return {
    score: habits.length ? scoreSum / habits.length : 0,
    habitsCount: habits.length,
    rangeDays
  };
}

export function computeFocusStats(state, rangeDays = 30) {
  const sessions = (state.focusSessions || []).filter((session) => inRange(session.startedAt, rangeDays));

  let totalMinutes = 0;
  let pomodoroCount = 0;
  let freeCount = 0;

  const byDayMap = new Map();

  sessions.forEach((session) => {
    const minutes = Number(session.actualMinutes || 0);
    totalMinutes += minutes;

    if (session.mode === "pomodoro") pomodoroCount += 1;
    else freeCount += 1;

    const key = dayKey(session.startedAt);
    byDayMap.set(key, (byDayMap.get(key) || 0) + minutes);
  });

  const byDay = [...byDayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({ date, minutes }));

  return {
    sessionsCount: sessions.length,
    totalMinutes,
    averageMinutes: sessions.length ? totalMinutes / sessions.length : 0,
    pomodoroCount,
    freeCount,
    byDay,
    rangeDays
  };
}

export function computeAnalytics(state, rangeDays = 30) {
  const goalVelocity = computeGoalVelocity(state, rangeDays);
  const habitConsistency = computeHabitConsistency(state, rangeDays);
  const focusStats = computeFocusStats(state, rangeDays);

  const plannedHours = (state.events || []).reduce((sum, eventItem) => sum + calculateEventDurationHours(eventItem), 0);

  const categoryHoursMap = new Map();
  const categoryLabelMap = new Map((state.categories || []).map((item) => [item.id, item.label]));

  (state.events || []).forEach((eventItem) => {
    const label = categoryLabelMap.get(eventItem.type) || eventItem.type;
    categoryHoursMap.set(label, (categoryHoursMap.get(label) || 0) + calculateEventDurationHours(eventItem));
  });

  const categoryHours = [...categoryHoursMap.entries()].map(([label, value]) => ({
    label,
    value: Number(value.toFixed(2))
  }));

  const goalProgress = (state.goals || []).map((goal) => ({
    label: goal.title,
    value: Number(percentage(goal.currentValue, goal.targetValue || 1).toFixed(2))
  }));

  const habitTrendMap = new Map();
  (state.habitLogs || []).forEach((log) => {
    if (!inRange(log.date, rangeDays)) return;
    habitTrendMap.set(log.date, (habitTrendMap.get(log.date) || 0) + Number(log.value || 0));
  });

  const habitTrend = [...habitTrendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  return {
    kpis: {
      plannedHours: Number(plannedHours.toFixed(2)),
      focusMinutes: Math.round(focusStats.totalMinutes),
      goalsProgress: Number(goalVelocity.averageProgress.toFixed(1)),
      habitsConsistency: Number(habitConsistency.score.toFixed(1))
    },
    goalVelocity,
    habitConsistency,
    focusStats,
    categoryHours,
    goalProgress,
    habitTrend,
    rangeDays
  };
}
