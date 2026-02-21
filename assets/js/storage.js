import {
  LEGACY_KEYS,
  V2_KEYS,
  V3_KEYS,
  BASE_CATEGORIES,
  CLASS_DEFAULT_EVENTS,
  GOAL_STATUS,
  HABIT_FREQUENCY,
  SUPPORTED_PRINT_MODES,
  SUPPORTED_THEMES,
  SUPPORTED_LANGUAGES,
  cloneBaseCategories,
  createDefaultPlannerSettings,
  createDefaultPlannerStateV3,
  createDefaultClassEvents,
  normalizeCategory,
  normalizeEvent,
  normalizeGoal,
  normalizeHabit,
  normalizeHabitLog,
  normalizeFocusSession,
  sortEvents
} from "./data.js";
import { resolveLanguage } from "./i18n.js";

const LEGACY_BUILTIN_CATEGORY_IDS = new Set(["class", "study", "exam", "python", "other"]);

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function readJson(key, fallback) {
  const raw = safeGet(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  safeSet(key, JSON.stringify(value));
}

function coerceTheme(theme) {
  if (theme === "dark-clean") return "dark";
  if (theme === "light-minimal") return "light";
  return SUPPORTED_THEMES.includes(theme) ? theme : "system";
}

function coercePrintMode(mode) {
  return SUPPORTED_PRINT_MODES.includes(mode) ? mode : "table-only";
}

function sanitizeCategories(rawCategories) {
  const base = cloneBaseCategories();
  const byId = new Map(base.map((item) => [item.id, item]));

  if (Array.isArray(rawCategories)) {
    rawCategories.forEach((raw) => {
      const normalized = normalizeCategory(raw);
      if (!normalized) return;
      if (byId.has(normalized.id)) return;
      if (LEGACY_BUILTIN_CATEGORY_IDS.has(normalized.id)) return;

      byId.set(normalized.id, {
        ...normalized,
        locked: false
      });
    });
  }

  return [...byId.values()];
}

function sanitizeGoals(rawGoals) {
  if (!Array.isArray(rawGoals)) return [];
  const list = [];
  rawGoals.forEach((raw) => {
    const item = normalizeGoal(raw);
    if (item) list.push(item);
  });
  return list;
}

function sanitizeHabits(rawHabits) {
  if (!Array.isArray(rawHabits)) return [];
  const list = [];
  rawHabits.forEach((raw) => {
    const item = normalizeHabit(raw);
    if (item) list.push(item);
  });
  return list;
}

function sanitizeHabitLogs(rawLogs, habits) {
  if (!Array.isArray(rawLogs)) return [];
  const allowedHabitIds = new Set(habits.map((item) => item.id));
  const list = [];

  rawLogs.forEach((raw) => {
    const item = normalizeHabitLog(raw, allowedHabitIds);
    if (item) list.push(item);
  });

  return list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function sanitizeFocusSessions(rawSessions, state) {
  if (!Array.isArray(rawSessions)) return [];

  const goalIds = new Set(state.goals.map((item) => item.id));
  const eventIds = new Set(state.events.map((item) => item.id));
  const list = [];

  rawSessions.forEach((raw) => {
    const item = normalizeFocusSession(raw);
    if (!item) return;

    if (item.linkedGoalId && !goalIds.has(item.linkedGoalId)) {
      item.linkedGoalId = null;
    }
    if (item.linkedEventId && !eventIds.has(item.linkedEventId)) {
      item.linkedEventId = null;
    }

    list.push(item);
  });

  return list.sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

function sanitizeEvents(rawEvents, state) {
  if (!Array.isArray(rawEvents)) return [];

  const allowedTypes = new Set(state.categories.map((item) => item.id));
  const goalIds = new Set(state.goals.map((item) => item.id));
  const goalMap = new Map(state.goals.map((item) => [item.id, item]));
  const list = [];

  rawEvents.forEach((raw) => {
    const item = normalizeEvent(raw, { allowedTypes });
    if (!item) return;

    if (item.goalId && !goalIds.has(item.goalId)) {
      item.goalId = null;
      item.goalLabel = null;
    } else if (item.goalId) {
      item.goalLabel = goalMap.get(item.goalId)?.title || item.goalLabel;
    }

    list.push(item);
  });

  return sortEvents(list);
}

function normalizeSettings(rawSettings) {
  const settings = createDefaultPlannerSettings(rawSettings || {});
  settings.lang = resolveLanguage({ savedLanguage: settings.lang });
  settings.theme = coerceTheme(settings.theme);
  settings.printMode = coercePrintMode(settings.printMode);
  return settings;
}

function sanitizeStateV3(rawState) {
  const fallback = createDefaultPlannerStateV3();
  const source = rawState && typeof rawState === "object" ? rawState : fallback;
  const hasExplicitEvents = Array.isArray(source.events);

  const normalized = {
    version: String(source.version || fallback.version),
    categories: sanitizeCategories(source.categories || BASE_CATEGORIES),
    goals: sanitizeGoals(source.goals),
    habits: sanitizeHabits(source.habits),
    habitLogs: [],
    events: [],
    focusSessions: [],
    settings: normalizeSettings(source.settings)
  };

  normalized.events = sanitizeEvents(hasExplicitEvents ? source.events : CLASS_DEFAULT_EVENTS, normalized);
  if (!hasExplicitEvents && normalized.events.length === 0) {
    normalized.events = createDefaultClassEvents();
  }

  normalized.habitLogs = sanitizeHabitLogs(source.habitLogs, normalized.habits);
  normalized.focusSessions = sanitizeFocusSessions(source.focusSessions, normalized);

  return normalized;
}

function convertV2ToV3() {
  const categories = sanitizeCategories(readJson(V2_KEYS.categories, BASE_CATEGORIES));
  const goals = [];
  const habits = [];

  const stateLike = {
    categories,
    goals,
    habits
  };

  let events = sanitizeEvents(readJson(V2_KEYS.events, CLASS_DEFAULT_EVENTS), {
    ...stateLike,
    events: []
  });

  if (events.length === 0) {
    events = createDefaultClassEvents();
  }

  const language = resolveLanguage({
    savedLanguage: safeGet(V2_KEYS.language)
  });

  const settings = normalizeSettings({
    lang: language,
    theme: safeGet(V2_KEYS.theme),
    printMode: safeGet(V2_KEYS.printMode),
    activeTab: "week",
    activePage: "planner"
  });

  return sanitizeStateV3({
    version: "3.0.0",
    events,
    categories,
    goals,
    habits,
    habitLogs: [],
    focusSessions: [],
    settings
  });
}

function convertLegacyV1ToV3() {
  const categories = sanitizeCategories(readJson(LEGACY_KEYS.categories, BASE_CATEGORIES));

  const allowedTypes = new Set(categories.map((item) => item.id));
  let events = [];
  const rawEvents = readJson(LEGACY_KEYS.events, []);
  if (Array.isArray(rawEvents)) {
    rawEvents.forEach((raw) => {
      const item = normalizeEvent(raw, { allowedTypes });
      if (item && item.type === "class") {
        item.type = "class";
        events.push(item);
      }
    });
  }

  events = sortEvents(events);
  if (events.length === 0) {
    events = createDefaultClassEvents();
  }

  const settings = normalizeSettings({
    lang: resolveLanguage({
      savedLanguage: safeGet(LEGACY_KEYS.language)
    }),
    theme: "dark",
    printMode: "table-only",
    activeTab: "week",
    activePage: "planner"
  });

  return sanitizeStateV3({
    version: "3.0.0",
    events,
    categories,
    goals: [],
    habits: [],
    habitLogs: [],
    focusSessions: [],
    settings
  });
}

function hasV2Data() {
  return Boolean(safeGet(V2_KEYS.events) || safeGet(V2_KEYS.categories));
}

function hasLegacyData() {
  return Boolean(safeGet(LEGACY_KEYS.events) || safeGet(LEGACY_KEYS.categories));
}

export function migrateV2ToV3() {
  if (safeGet(V3_KEYS.migrated) === "1" && safeGet(V3_KEYS.state)) {
    return loadStateV3();
  }

  let nextState;
  if (hasV2Data()) {
    nextState = convertV2ToV3();
  } else if (hasLegacyData()) {
    nextState = convertLegacyV1ToV3();
  } else {
    nextState = sanitizeStateV3(createDefaultPlannerStateV3());
  }

  saveStateV3(nextState);
  safeSet(V3_KEYS.migrated, "1");
  return nextState;
}

export function loadStateV3() {
  const rawState = readJson(V3_KEYS.state, null);
  if (!rawState) {
    return migrateV2ToV3();
  }

  const normalized = sanitizeStateV3(rawState);
  writeJson(V3_KEYS.state, normalized);
  safeSet(V3_KEYS.migrated, "1");
  return normalized;
}

export function saveStateV3(state) {
  const normalized = sanitizeStateV3(state);
  writeJson(V3_KEYS.state, normalized);
  safeSet(V3_KEYS.migrated, "1");
}

export function buildFallbackStateV3() {
  return sanitizeStateV3(createDefaultPlannerStateV3());
}

export function createRecoverableState() {
  return {
    ...buildFallbackStateV3(),
    settings: {
      ...createDefaultPlannerSettings(),
      lang: SUPPORTED_LANGUAGES.includes("fa") ? "fa" : "en",
      theme: SUPPORTED_THEMES.includes("system") ? "system" : "light",
      printMode: SUPPORTED_PRINT_MODES.includes("table-only") ? "table-only" : "table-and-list",
      activeTab: "week",
      activePage: "planner"
    }
  };
}

export function sanitizeGoalStatus(value) {
  return GOAL_STATUS.includes(value) ? value : "active";
}

export function sanitizeHabitFrequency(value) {
  return HABIT_FREQUENCY.includes(value) ? value : "daily";
}
