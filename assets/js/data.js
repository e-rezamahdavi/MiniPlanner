export const START_HOUR = 0;
export const END_HOUR = 24;

export const HALF_HOUR_STEP = 30;
export const DEFAULT_EMPTY_START_HOUR = 8;
export const DEFAULT_EMPTY_END_HOUR = 20;

export const LEGACY_KEYS = {
  events: "miniPlannerEvents_v1",
  categories: "miniPlannerCategories_v1",
  language: "miniPlannerLang_v1"
};

export const V2_KEYS = {
  events: "mini_planner.v2.events",
  categories: "mini_planner.v2.categories",
  language: "mini_planner.v2.lang",
  theme: "mini_planner.v2.theme",
  printMode: "mini_planner.v2.printMode",
  migrated: "mini_planner.v2.migrated"
};

export const V3_KEYS = {
  state: "mini_planner.v3.state",
  migrated: "mini_planner.v3.migrated"
};

export const APP_VERSION = "3.0.0";

export const SUPPORTED_LANGUAGES = ["fa", "en", "az", "tr"];
export const SUPPORTED_THEMES = ["light", "dark", "system"];
export const SUPPORTED_PRINT_MODES = ["table-only", "list-only", "table-and-list"];

export const TABS = ["week"];
export const APP_PAGES = ["dashboard", "planner", "project", "settings"];

export const GOAL_STATUS = ["active", "completed", "paused"];
export const HABIT_FREQUENCY = ["daily", "weekly", "custom"];
export const FOCUS_MODES = ["pomodoro", "free"];

export const BASE_CATEGORIES = [
  { id: "class", label: "Class", icon: "🎓", color: "#2dd4bf", locked: true },
  { id: "other", label: "Other", icon: "📁", color: "#64748b", locked: true }
];

export const CLASS_DEFAULT_EVENTS = [
  { day: 0, start: "09:30", end: "11:00", title: "Signals and Systems (Class)", type: "class" },
  { day: 1, start: "09:30", end: "11:00", title: "Signals and Systems (Class)", type: "class" },
  { day: 2, start: "08:00", end: "09:30", title: "Electric Circuits 2 (Class)", type: "class" },
  { day: 2, start: "11:00", end: "12:30", title: "Electric Circuits 2 (Class)", type: "class" },
  { day: 2, start: "16:00", end: "19:00", title: "Electronics 1 (Class)", type: "class" },
  { day: 3, start: "09:30", end: "11:00", title: "Circuits Lab & Measurement (Class)", type: "class" },
  { day: 3, start: "11:00", end: "12:30", title: "Technical English (Class)", type: "class" },
  { day: 3, start: "16:00", end: "19:00", title: "Digital Logic (Class)", type: "class" },
  { day: 4, start: "08:00", end: "10:00", title: "Islamic Thought 1 (Class)", type: "class" },
  { day: 4, start: "11:00", end: "12:30", title: "Electrical Machines 1 (Class)", type: "class" },
  { day: 5, start: "11:00", end: "12:00", title: "Emergency Preparedness (Class)", type: "class" }
];

export function nowIso() {
  return new Date().toISOString();
}

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function createId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function createCategoryId(label) {
  const slug = String(label || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06ff\u00C0-\u024F-]/g, "")
    .slice(0, 24);

  return `cat_${slug || "custom"}_${Math.random().toString(16).slice(2, 6)}`;
}

export function normalizeColor(rawColor, fallback = "#64748b") {
  const value = String(rawColor || "").trim();

  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return (
      "#" + value[1] + value[1] + value[2] + value[2] + value[3] + value[3]
    ).toLowerCase();
  }

  return fallback;
}

export function isValidTimeFormat(time) {
  return /^\d{2}:\d{2}$/.test(String(time || ""));
}

export function isStepTime(time) {
  if (!isValidTimeFormat(time)) return false;
  const minutes = String(time).split(":")[1];
  return minutes === "00" || minutes === "30";
}

export function timeToMinutes(time) {
  const [h, m] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes) {
  const mins = Math.max(0, Math.min(24 * 60, Math.round(Number(totalMinutes) || 0)));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDurationMinutes(totalMinutes) {
  const mins = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function isTimeInRange(time) {
  const minutes = timeToMinutes(time);
  return minutes >= START_HOUR * 60 && minutes <= END_HOUR * 60;
}

export function sortEvents(events) {
  return [...events].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });
}

export function sortByCreatedAt(items) {
  return [...items].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export function normalizeCategory(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = String(raw.id || "").trim();
  const label = String(raw.label || "").trim();
  if (!id || !label) return null;

  return {
    id,
    label,
    icon: String(raw.icon || "🧩").trim() || "🧩",
    color: normalizeColor(raw.color),
    locked: Boolean(raw.locked)
  };
}

export function normalizeEvent(raw, options = {}) {
  if (!raw || typeof raw !== "object") return null;

  const allowedTypes = options.allowedTypes instanceof Set ? options.allowedTypes : null;

  const day = Number(raw.day);
  const start = String(raw.start || "");
  const end = String(raw.end || "");
  const title = String(raw.title || "").trim();
  const originalType = String(raw.type || "other").trim() || "other";

  if (!(day >= 0 && day <= 6)) return null;
  if (!isValidTimeFormat(start) || !isValidTimeFormat(end)) return null;
  if (!isStepTime(start) || !isStepTime(end)) return null;

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return null;
  if (endMin <= startMin) return null;
  if (!isTimeInRange(start) || !isTimeInRange(end)) return null;
  if (!title) return null;

  let type = originalType;
  if (allowedTypes && !allowedTypes.has(type)) {
    type = allowedTypes.has("other") ? "other" : [...allowedTypes][0] || "other";
  }

  const goalId = String(raw.goalId || "").trim() || null;
  const goalLabel = String(raw.goalLabel || "").trim() || null;
  const note = String(raw.note || "").trim() || null;
  const location = String(raw.location || "").trim() || null;

  return {
    id: String(raw.id || createId("ev")),
    day,
    start,
    end,
    title,
    type,
    goalId,
    goalLabel,
    note,
    location
  };
}

export function normalizeGoal(raw) {
  if (!raw || typeof raw !== "object") return null;

  const title = String(raw.title || "").trim();
  if (!title) return null;

  const targetValue = Number(raw.targetValue);
  const currentValue = Number(raw.currentValue);
  const status = String(raw.status || "active");

  return {
    id: String(raw.id || createId("goal")),
    title,
    targetValue: Number.isFinite(targetValue) && targetValue >= 0 ? targetValue : 100,
    currentValue: Number.isFinite(currentValue) && currentValue >= 0 ? currentValue : 0,
    unit: String(raw.unit || "%").trim() || "%",
    deadline: String(raw.deadline || "").trim() || null,
    status: GOAL_STATUS.includes(status) ? status : "active",
    color: normalizeColor(raw.color, "#16a34a"),
    createdAt: String(raw.createdAt || nowIso()),
    updatedAt: String(raw.updatedAt || nowIso())
  };
}

export function normalizeHabit(raw) {
  if (!raw || typeof raw !== "object") return null;

  const title = String(raw.title || "").trim();
  if (!title) return null;

  const frequency = String(raw.frequency || "daily");
  const targetPerPeriod = Number(raw.targetPerPeriod);

  return {
    id: String(raw.id || createId("habit")),
    title,
    frequency: HABIT_FREQUENCY.includes(frequency) ? frequency : "daily",
    targetPerPeriod: Number.isFinite(targetPerPeriod) && targetPerPeriod > 0 ? targetPerPeriod : 1,
    color: normalizeColor(raw.color, "#0ea5e9"),
    icon: String(raw.icon || "✅").trim() || "✅",
    archived: Boolean(raw.archived),
    createdAt: String(raw.createdAt || nowIso()),
    updatedAt: String(raw.updatedAt || nowIso())
  };
}

export function normalizeHabitLog(raw, allowedHabitIds = null) {
  if (!raw || typeof raw !== "object") return null;

  const habitId = String(raw.habitId || "").trim();
  if (!habitId) return null;
  if (allowedHabitIds && !allowedHabitIds.has(habitId)) return null;

  const date = String(raw.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const value = Number(raw.value);
  if (!Number.isFinite(value) || value < 0) return null;

  return {
    id: String(raw.id || createId("hlog")),
    habitId,
    date,
    value,
    note: String(raw.note || "").trim() || null
  };
}

export function normalizeFocusSession(raw, options = {}) {
  if (!raw || typeof raw !== "object") return null;

  const mode = String(raw.mode || "pomodoro");
  const plannedMinutes = Number(raw.plannedMinutes);
  const actualMinutes = Number(raw.actualMinutes);
  const startedAt = String(raw.startedAt || "").trim();
  const endedAt = String(raw.endedAt || "").trim();

  if (!FOCUS_MODES.includes(mode)) return null;
  if (!startedAt || !endedAt) return null;

  return {
    id: String(raw.id || createId("fs")),
    mode,
    plannedMinutes: Number.isFinite(plannedMinutes) && plannedMinutes >= 0 ? plannedMinutes : 0,
    actualMinutes: Number.isFinite(actualMinutes) && actualMinutes >= 0 ? actualMinutes : 0,
    startedAt,
    endedAt,
    linkedGoalId: String(raw.linkedGoalId || "").trim() || null,
    linkedEventId: String(raw.linkedEventId || "").trim() || null,
    note: String(raw.note || "").trim() || null
  };
}

export function cloneBaseCategories() {
  return BASE_CATEGORIES.map((item) => ({ ...item }));
}

export function createDefaultClassEvents() {
  return CLASS_DEFAULT_EVENTS.map((item) => ({
    ...item,
    id: createId("ev"),
    goalId: null,
    goalLabel: null,
    note: null,
    location: null
  }));
}

export function createDefaultPlannerSettings(raw = {}) {
  return {
    lang: SUPPORTED_LANGUAGES.includes(raw.lang) ? raw.lang : "fa",
    theme: SUPPORTED_THEMES.includes(raw.theme) ? raw.theme : "system",
    printMode: SUPPORTED_PRINT_MODES.includes(raw.printMode) ? raw.printMode : "table-only",
    weekStart: Number.isFinite(Number(raw.weekStart)) ? Math.max(0, Math.min(6, Number(raw.weekStart))) : 0,
    activeTab: TABS.includes(raw.activeTab) ? raw.activeTab : "week",
    activePage: APP_PAGES.includes(raw.activePage) ? raw.activePage : "planner",
    widgets: typeof raw.widgets === "object" && raw.widgets ? raw.widgets : {
      goals: true,
      habits: true,
      focus: true,
      analytics: true
    },
    focusRuntime: raw.focusRuntime && typeof raw.focusRuntime === "object" ? raw.focusRuntime : null
  };
}

export function createDefaultPlannerStateV3() {
  return {
    version: APP_VERSION,
    events: createDefaultClassEvents(),
    categories: cloneBaseCategories(),
    goals: [],
    habits: [],
    habitLogs: [],
    focusSessions: [],
    settings: createDefaultPlannerSettings()
  };
}

export function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

export function calculateEventDurationMinutes(eventItem) {
  return Math.max(0, timeToMinutes(eventItem.end) - timeToMinutes(eventItem.start));
}

export function calculateEventDurationHours(eventItem) {
  return calculateEventDurationMinutes(eventItem) / 60;
}
