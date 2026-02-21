import {
  calculateEventDurationMinutes,
  DEFAULT_EMPTY_END_HOUR,
  DEFAULT_EMPTY_START_HOUR,
  END_HOUR,
  START_HOUR,
  createCategoryId,
  createId,
  isStepTime,
  isValidTimeFormat,
  normalizeColor,
  normalizeEvent,
  sortEvents,
  timeToMinutes
} from "../data.js";
import {
  createNode,
  populateCategorySelect,
  populateDaySelect,
  populateGoalSelect,
  populateTimeSelects
} from "../ui.js";
import { renderBarChart } from "../charts.js";
import { exportWeekEventsCsv, exportWeekEventsTxt, exportWeekReportHtml } from "../exporters.js";

function resolveTimelineRange(events) {
  if (!events.length) {
    return {
      startHour: DEFAULT_EMPTY_START_HOUR,
      endHour: DEFAULT_EMPTY_END_HOUR
    };
  }

  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;

  events.forEach((item) => {
    minStart = Math.min(minStart, timeToMinutes(item.start));
    maxEnd = Math.max(maxEnd, timeToMinutes(item.end));
  });

  let startHour = Math.floor(minStart / 60);
  let endHour = Math.ceil(maxEnd / 60);

  startHour = Math.max(START_HOUR, Math.min(END_HOUR - 1, startHour));
  endHour = Math.max(startHour + 1, Math.min(END_HOUR, endHour));

  return { startHour, endHour };
}

function sortByDayAndTime(list) {
  return [...list].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });
}

function normalizeTopicTitle(rawTitle) {
  const title = String(rawTitle || "").trim().replace(/\s+/g, " ");
  if (!title) return "";
  const withoutSuffix = title.replace(/\s*[\(\[][^\)\]]*[\)\]]\s*$/, "").trim();
  return withoutSuffix || title;
}

function normalizeComparableText(rawText) {
  return String(rawText || "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toComparableTitle(rawTitle) {
  return normalizeComparableText(normalizeTopicTitle(rawTitle));
}

function hexToRgb(hexColor) {
  const value = String(hexColor || "").trim();
  const match = value.match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function softTintColor(hexColor, alpha = 0.2) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return "";
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function minutesToTime(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0);
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function createWeekTab({ refs, state, actions, i18n }) {
  const localState = {
    initialized: false,
    editingId: null,
    draggingEventId: null,
    dragSourceCell: null,
    dragPreviewCells: [],
    dragPreviewSignature: "",
    topicQuery: "",
    filters: {
      search: "",
      type: "all",
      day: "all"
    }
  };

  function t(key, params = {}) {
    return actions.t(key, params);
  }

  function themeColor(varName, fallback) {
    const value = getComputedStyle(document.body).getPropertyValue(varName).trim();
    return value || fallback;
  }

  function getDayNames() {
    return i18n.getDayNames();
  }

  function getCategoryById(categoryId) {
    return state.categories.find((item) => item.id === categoryId) || state.categories.find((item) => item.id === "other");
  }

  function getCategoryLabel(categoryId) {
    if (categoryId === "class") return t("type.class");
    if (categoryId === "other") return t("type.other");
    return getCategoryById(categoryId)?.label || t("type.other");
  }

  function getCategoryIcon(categoryId) {
    return getCategoryById(categoryId)?.icon || "🧩";
  }

  function getCategoryColor(categoryId) {
    return getCategoryById(categoryId)?.color || "#64748b";
  }

  function getGoalById(goalId) {
    return state.goals.find((item) => item.id === goalId) || null;
  }

  function getGoalLabel(eventItem) {
    if (eventItem.goalId) {
      return getGoalById(eventItem.goalId)?.title || eventItem.goalLabel || "";
    }
    return eventItem.goalLabel || "";
  }

  function isLockedCategory(categoryId) {
    const target = state.categories.find((item) => item.id === categoryId);
    return !target || Boolean(target.locked) || target.id === "class" || target.id === "other";
  }

  function buildTitleCatalog(ignoreEventId = null) {
    const map = new Map();

    state.events.forEach((eventItem) => {
      if (ignoreEventId && eventItem.id === ignoreEventId) return;

      const display = normalizeTopicTitle(eventItem.title);
      const key = toComparableTitle(display);
      if (!key || !display) return;

      const bucket = map.get(key) || { display, count: 0 };
      bucket.count += 1;
      map.set(key, bucket);
    });

    return map;
  }

  function resolveCanonicalTitle(rawTitle, ignoreEventId = null) {
    const clean = String(rawTitle || "").trim().replace(/\s+/g, " ");
    if (!clean) return "";

    const key = toComparableTitle(clean);
    const catalog = buildTitleCatalog(ignoreEventId);
    const hit = catalog.get(key);
    return hit?.display || clean;
  }

  function renderTitleSuggestions(queryText = "") {
    if (!refs.weekTitleSuggestions) return;

    const query = normalizeComparableText(queryText);
    const rows = [...buildTitleCatalog().entries()]
      .map(([key, value]) => ({ key, display: value.display, count: value.count }))
      .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, i18n.getLocale()));

    const filtered = query
      ? rows.filter((row) => row.key.includes(query))
      : rows;

    refs.weekTitleSuggestions.innerHTML = "";
    filtered.slice(0, 16).forEach((row) => {
      const option = document.createElement("option");
      option.value = row.display;
      refs.weekTitleSuggestions.appendChild(option);
    });
  }

  function clearForm() {
    refs.weekTitleInput.value = "";
    refs.weekLocationInput.value = "";
    refs.weekNoteInput.value = "";
    refs.weekGoalSelect.value = "";
    refs.weekTypeSelect.value = "class";
    refs.weekDaySelect.value = "0";
    refs.weekStartSelect.value = "08:00";
    refs.weekEndSelect.value = "09:00";
  }

  function getFormDraft() {
    return {
      title: refs.weekTitleInput.value.trim(),
      type: refs.weekTypeSelect.value,
      goalId: refs.weekGoalSelect.value || null,
      day: Number(refs.weekDaySelect.value),
      start: refs.weekStartSelect.value,
      end: refs.weekEndSelect.value,
      location: refs.weekLocationInput.value.trim() || null,
      note: refs.weekNoteInput.value.trim() || null
    };
  }

  function validateDraft(draft) {
    if (!draft.title) return t("err.titleRequired");
    if (!(draft.day >= 0 && draft.day <= 6)) return t("err.dayInvalid");
    if (!isValidTimeFormat(draft.start) || !isValidTimeFormat(draft.end)) return t("err.timeFormat");
    if (!isStepTime(draft.start) || !isStepTime(draft.end)) return t("err.timeStep");

    const start = timeToMinutes(draft.start);
    const end = timeToMinutes(draft.end);

    if (end <= start) return t("err.endAfterStart");
    if (start < START_HOUR * 60 || end > END_HOUR * 60) return t("err.timeRange");
    return null;
  }

  function findOverlap(candidate, ignoreId = null) {
    const start = timeToMinutes(candidate.start);
    const end = timeToMinutes(candidate.end);

    return state.events.find((eventItem) => {
      if (ignoreId && eventItem.id === ignoreId) return false;
      if (eventItem.day !== candidate.day) return false;

      const currentStart = timeToMinutes(eventItem.start);
      const currentEnd = timeToMinutes(eventItem.end);

      return start < currentEnd && end > currentStart;
    });
  }

  function updateControlsForEditMode() {
    const editing = Boolean(localState.editingId);
    refs.weekCancelBtn.hidden = !editing;
    refs.weekAddBtn.textContent = editing ? t("btn.save") : t("btn.add");
  }

  function focusEditPanel() {
    const panel = refs.weekTitleInput.closest(".card") || refs.weekTitleInput.closest("section");
    if (panel) {
      panel.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest"
      });
    }

    window.requestAnimationFrame(() => {
      refs.weekTitleInput.focus({ preventScroll: true });
    });
  }

  function clearDragPreview() {
    if (!localState.dragPreviewCells.length) return;

    localState.dragPreviewCells.forEach((cell) => {
      cell.classList.remove("drop-target");
      cell.classList.remove("drop-invalid");
      cell.classList.remove("drop-anchor");
    });

    localState.dragPreviewCells = [];
    localState.dragPreviewSignature = "";
  }

  function clearDragSourceCell() {
    if (!localState.dragSourceCell) return;
    localState.dragSourceCell.classList.remove("drag-source");
    localState.dragSourceCell = null;
  }

  function addOrUpdateEvent() {
    const draft = getFormDraft();
    draft.title = resolveCanonicalTitle(draft.title, localState.editingId);
    const validationError = validateDraft(draft);
    if (validationError) {
      actions.notifyError(validationError);
      return;
    }

    const allowedTypes = new Set(state.categories.map((item) => item.id));
    const normalized = normalizeEvent(
      {
        ...draft,
        id: localState.editingId || createId("ev"),
        goalLabel: draft.goalId ? getGoalById(draft.goalId)?.title || null : null
      },
      { allowedTypes }
    );

    if (!normalized) {
      actions.notifyError(t("err.invalidJson"));
      return;
    }

    const overlap = findOverlap(normalized, localState.editingId);
    if (overlap) {
      actions.notifyError(
        t("err.conflict", {
          title: overlap.title,
          day: getDayNames()[overlap.day] || "",
          start: overlap.start,
          end: overlap.end
        })
      );
      return;
    }

    if (localState.editingId) {
      const index = state.events.findIndex((item) => item.id === localState.editingId);
      if (index >= 0) {
        state.events[index] = normalized;
      }
      state.events = sortEvents(state.events);
      localState.editingId = null;
      updateControlsForEditMode();
      actions.saveAndRender("msg.eventUpdated");
      return;
    }

    state.events.push(normalized);
    state.events = sortEvents(state.events);
    clearForm();
    actions.saveAndRender("msg.eventAdded");
  }

  function startEditEvent(eventId) {
    const target = state.events.find((item) => item.id === eventId);
    if (!target) return;

    localState.editingId = eventId;
    refs.weekTitleInput.value = target.title;
    refs.weekTypeSelect.value = target.type;
    refs.weekGoalSelect.value = target.goalId || "";
    refs.weekDaySelect.value = String(target.day);
    refs.weekStartSelect.value = target.start;
    refs.weekEndSelect.value = target.end;
    refs.weekLocationInput.value = target.location || "";
    refs.weekNoteInput.value = target.note || "";

    updateControlsForEditMode();
    focusEditPanel();
    actions.notifySuccess(t("msg.saved"));
  }

  function cancelEditEvent() {
    localState.editingId = null;
    clearForm();
    updateControlsForEditMode();
  }

  function removeEvent(eventId) {
    const target = state.events.find((item) => item.id === eventId);
    if (!target) return;

    const approved = window.confirm(t("confirm.deleteEvent"));
    if (!approved) return;

    state.events = state.events.filter((item) => item.id !== eventId);

    if (localState.editingId === eventId) {
      cancelEditEvent();
    }

    actions.saveAndRender("msg.eventDeleted");
  }

  function moveEventByDrag(eventId, nextDay, nextStartSlot, rangeStartHour) {
    const sourceEvent = state.events.find((item) => item.id === eventId);
    if (!sourceEvent) return;

    const durationMinutes = calculateEventDurationMinutes(sourceEvent);
    const nextStartMinutes = rangeStartHour * 60 + (nextStartSlot * 30);
    const nextEndMinutes = nextStartMinutes + durationMinutes;

    if (nextStartMinutes < START_HOUR * 60 || nextEndMinutes > END_HOUR * 60) {
      actions.notifyError(t("err.timeRange"));
      return;
    }

    const nextStart = minutesToTime(nextStartMinutes);
    const nextEnd = minutesToTime(nextEndMinutes);

    if (sourceEvent.day === nextDay && sourceEvent.start === nextStart && sourceEvent.end === nextEnd) {
      return;
    }

    const candidate = {
      ...sourceEvent,
      day: nextDay,
      start: nextStart,
      end: nextEnd
    };

    const overlap = findOverlap(candidate, sourceEvent.id);
    if (overlap) {
      actions.notifyError(
        t("err.conflict", {
          title: overlap.title,
          day: getDayNames()[overlap.day] || "",
          start: overlap.start,
          end: overlap.end
        })
      );
      return;
    }

    const targetIndex = state.events.findIndex((item) => item.id === sourceEvent.id);
    if (targetIndex < 0) return;

    state.events[targetIndex] = candidate;
    state.events = sortEvents(state.events);

    if (localState.editingId === sourceEvent.id) {
      refs.weekDaySelect.value = String(candidate.day);
      refs.weekStartSelect.value = candidate.start;
      refs.weekEndSelect.value = candidate.end;
    }

    actions.saveAndRender("msg.eventUpdated");
  }

  function getDragDurationSlots(eventId) {
    const sourceEvent = state.events.find((item) => item.id === eventId);
    if (!sourceEvent) return 1;

    const minutes = calculateEventDurationMinutes(sourceEvent);
    return Math.max(1, Math.round(minutes / 30));
  }

  function collectDropPreviewCells(tbody, day, slotStart, slotEndExclusive) {
    const cells = [...tbody.querySelectorAll(`td[data-day="${day}"][data-slot-start]`)];
    return cells.filter((cell) => {
      const cellStart = Number(cell.dataset.slotStart);
      const cellSpan = Math.max(1, Number(cell.dataset.slotSpan || 1));
      const cellEnd = cellStart + cellSpan;
      return cellStart < slotEndExclusive && cellEnd > slotStart;
    });
  }

  function validateDragTarget(eventId, day, slotStart, rangeStartHour) {
    const sourceEvent = state.events.find((item) => item.id === eventId);
    if (!sourceEvent) {
      return { ok: false, reason: t("err.invalidJson"), candidate: null };
    }

    const durationMinutes = calculateEventDurationMinutes(sourceEvent);
    const nextStartMinutes = rangeStartHour * 60 + (slotStart * 30);
    const nextEndMinutes = nextStartMinutes + durationMinutes;

    if (nextStartMinutes < START_HOUR * 60 || nextEndMinutes > END_HOUR * 60) {
      return { ok: false, reason: t("err.timeRange"), candidate: null };
    }

    const candidate = {
      ...sourceEvent,
      day,
      start: minutesToTime(nextStartMinutes),
      end: minutesToTime(nextEndMinutes)
    };

    const overlap = findOverlap(candidate, sourceEvent.id);
    if (overlap) {
      return {
        ok: false,
        reason: t("err.conflict", {
          title: overlap.title,
          day: getDayNames()[overlap.day] || "",
          start: overlap.start,
          end: overlap.end
        }),
        candidate
      };
    }

    return { ok: true, reason: "", candidate };
  }

  function autoScrollTimetableDuringDrag(pointerEvent) {
    const wrap = refs.weekTimetableWrap;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const threshold = 52;
    const step = 18;

    if (pointerEvent.clientX <= rect.left + threshold) {
      wrap.scrollLeft -= step;
    } else if (pointerEvent.clientX >= rect.right - threshold) {
      wrap.scrollLeft += step;
    }

    if (pointerEvent.clientY <= rect.top + threshold) {
      wrap.scrollTop -= step;
    } else if (pointerEvent.clientY >= rect.bottom - threshold) {
      wrap.scrollTop += step;
    }
  }

  function clearAllEvents() {
    if (!state.events.length) {
      actions.notifyInfo(t("msg.noResults"));
      return;
    }

    const approved = window.confirm(t("confirm.deleteAllEvents"));
    if (!approved) return;

    state.events = [];
    cancelEditEvent();
    actions.saveAndRender("msg.saved");
  }

  function addCategory() {
    const label = refs.weekCategoryInput.value.trim();
    const icon = refs.weekCategoryIconInput.value.trim() || "🧩";
    const color = normalizeColor(refs.weekCategoryColorInput.value, "#64748b");

    if (!label) {
      actions.notifyError(t("err.categoryNameRequired"));
      return;
    }

    const duplicate = state.categories.some((item) => item.label.toLowerCase() === label.toLowerCase());
    if (duplicate) {
      actions.notifyError(t("err.categoryDuplicate"));
      return;
    }

    const category = {
      id: createCategoryId(label),
      label,
      icon,
      color,
      locked: false
    };

    state.categories.push(category);

    refs.weekCategoryInput.value = "";
    refs.weekCategoryIconInput.value = "";
    refs.weekCategoryColorInput.value = "#18c79c";

    actions.saveAndRender("msg.categoryAdded", { name: label });
  }

  function removeActiveCategory() {
    const activeCategoryId = refs.weekTypeSelect.value;
    if (isLockedCategory(activeCategoryId)) {
      actions.notifyError(t("err.categoryLocked"));
      return;
    }

    const target = state.categories.find((item) => item.id === activeCategoryId);
    if (!target) return;

    const approved = window.confirm(t("confirm.removeCategory", { name: target.label }));
    if (!approved) return;

    state.categories = state.categories.filter((item) => item.id !== activeCategoryId);
    state.events = state.events.map((eventItem) => {
      if (eventItem.type !== activeCategoryId) return eventItem;
      return { ...eventItem, type: "other" };
    });

    refs.weekTypeSelect.value = "class";
    actions.saveAndRender("msg.categoryRemoved", { name: target.label });
  }

  function updateFiltersFromInputs() {
    localState.filters.search = refs.weekSearchInput.value.trim().toLowerCase();
    localState.filters.type = refs.weekFilterTypeSelect.value || "all";
    localState.filters.day = refs.weekFilterDaySelect.value || "all";
  }

  function clearFilters() {
    localState.filters = { search: "", type: "all", day: "all" };
    refs.weekSearchInput.value = "";
    refs.weekFilterTypeSelect.value = "all";
    refs.weekFilterDaySelect.value = "all";
    render();
  }

  function getFilteredEvents() {
    const searchKey = normalizeComparableText(localState.filters.search);

    return sortByDayAndTime(
      state.events.filter((eventItem) => {
        if (localState.filters.type !== "all" && eventItem.type !== localState.filters.type) return false;
        if (localState.filters.day !== "all" && String(eventItem.day) !== localState.filters.day) return false;
        if (searchKey && !toComparableTitle(eventItem.title).includes(searchKey)) return false;
        return true;
      })
    );
  }

  function renderStats(events) {
    refs.weekStatsBar.innerHTML = "";

    const summary = createNode("span", "chip");
    summary.textContent = `${t("msg.showing")}: ${events.length} / ${state.events.length}`;
    refs.weekStatsBar.appendChild(summary);

    state.categories.forEach((category) => {
      const count = events.filter((item) => item.type === category.id).length;
      const chip = createNode("span", "chip");
      chip.textContent = `${category.icon} ${getCategoryLabel(category.id)}: ${count}`;
      refs.weekStatsBar.appendChild(chip);
    });
  }

  function formatHours(minutes) {
    const value = Number(minutes || 0) / 60;
    return `${value.toFixed(1)} ${t("unit.hours")}`;
  }

  function getPercentText(partMinutes, totalMinutes) {
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0%";
    const value = (Number(partMinutes || 0) / totalMinutes) * 100;
    return `${value.toFixed(1)}%`;
  }

  function buildTopicBreakdown(events) {
    const topicMap = new Map();

    events.forEach((eventItem) => {
      const topic = normalizeTopicTitle(eventItem.title);
      const topicKey = toComparableTitle(topic);
      if (!topic || !topicKey) return;

      const durationMinutes = calculateEventDurationMinutes(eventItem);
      const key = `${topicKey}__${eventItem.type}`;
      const current = topicMap.get(key) || {
        title: topic,
        titleKey: topicKey,
        categoryId: eventItem.type,
        label: `${topic} • ${getCategoryIcon(eventItem.type)} ${getCategoryLabel(eventItem.type)}`,
        minutes: 0
      };
      current.minutes += durationMinutes;
      topicMap.set(key, current);
    });

    return [...topicMap.values()]
      .sort((a, b) => b.minutes - a.minutes);
  }

  function buildCategoryBreakdown(events) {
    const categoryMap = new Map();

    events.forEach((eventItem) => {
      const label = `${getCategoryIcon(eventItem.type)} ${getCategoryLabel(eventItem.type)}`;
      const durationMinutes = calculateEventDurationMinutes(eventItem);
      categoryMap.set(label, (categoryMap.get(label) || 0) + durationMinutes);
    });

    return [...categoryMap.entries()]
      .map(([label, minutes]) => ({ label, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }

  function renderBreakdownDetails(container, rows, totalMinutes, firstColumnLabel, topLimit = 8) {
    if (!container) return;
    container.innerHTML = "";

    if (!rows.length) {
      const empty = createNode("p", "topic-summary");
      empty.textContent = t("msg.noResults");
      container.appendChild(empty);
      return;
    }

    const table = createNode("table", "week-breakdown-table");
    const thead = createNode("thead");
    const trh = createNode("tr");
    [firstColumnLabel, t("table.hours"), t("table.percent")].forEach((label) => {
      const th = createNode("th");
      th.textContent = label;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = createNode("tbody");
    rows.slice(0, topLimit).forEach((row) => {
      const tr = createNode("tr");

      const labelCell = createNode("td");
      labelCell.textContent = row.label;
      tr.appendChild(labelCell);

      const hourCell = createNode("td");
      hourCell.textContent = formatHours(row.minutes);
      tr.appendChild(hourCell);

      const percentCell = createNode("td");
      percentCell.textContent = getPercentText(row.minutes, totalMinutes);
      tr.appendChild(percentCell);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  function buildWeeklySnapshot(events) {
    const totalMinutes = events.reduce((sum, eventItem) => sum + calculateEventDurationMinutes(eventItem), 0);
    const categoryRows = buildCategoryBreakdown(events);
    const titleRows = buildTopicBreakdown(events);
    return { totalMinutes, categoryRows, titleRows };
  }

  function renderReportTotals(snapshot) {
    if (!refs.weekReportTotals) return;
    refs.weekReportTotals.innerHTML = "";

    const totalChip = createNode("span", "chip");
    totalChip.textContent = `${t("week.totalHours")}: ${formatHours(snapshot.totalMinutes)}`;
    refs.weekReportTotals.appendChild(totalChip);

    const categoryChip = createNode("span", "chip");
    categoryChip.textContent = `${t("week.totalCategories")}: ${snapshot.categoryRows.length}`;
    refs.weekReportTotals.appendChild(categoryChip);

    const titleChip = createNode("span", "chip");
    titleChip.textContent = `${t("week.totalTitles")}: ${snapshot.titleRows.length}`;
    refs.weekReportTotals.appendChild(titleChip);
  }

  function renderCategoryAnalytics(snapshot) {
    if (!refs.weekCategoryChartWrap || !refs.weekCategorySummary) return;

    const chartItems = snapshot.categoryRows
      .slice(0, 10)
      .map((item) => ({ label: item.label, value: Number((item.minutes / 60).toFixed(2)) }));

    renderBarChart(refs.weekCategoryChartWrap, chartItems, {
      emptyText: t("msg.noResults"),
      color: themeColor("--accent", "#0969da"),
      trackColor: themeColor("--event-hover", "rgba(9, 105, 218, 0.06)"),
      labelMaxLength: 28,
      maxItems: 10,
      totalValue: Number((snapshot.totalMinutes / 60).toFixed(2)),
      showPercent: true,
      showSummary: false,
      showScale: false,
      axisFormatter: (value) => `${Number(value || 0).toFixed(1)}h`,
      valueFormatter: (value) => `${Number(value || 0).toFixed(1)}h`
    });

    refs.weekCategorySummary.textContent = t("week.categorySummary", {
      duration: formatHours(snapshot.totalMinutes)
    });

    renderBreakdownDetails(
      refs.weekCategoryDetailsWrap,
      snapshot.categoryRows,
      snapshot.totalMinutes,
      t("table.category"),
      8
    );
  }

  function renderTopicAnalytics(snapshot) {
    if (!refs.weekTopicChartWrap || !refs.weekTopicSummary) return;

    const chartItems = snapshot.titleRows
      .slice(0, 12)
      .map((item) => ({ label: item.label, value: Number((item.minutes / 60).toFixed(2)) }));

    renderBarChart(refs.weekTopicChartWrap, chartItems, {
      emptyText: t("msg.noResults"),
      color: themeColor("--success", "#2da44e"),
      trackColor: themeColor("--event-hover", "rgba(9, 105, 218, 0.06)"),
      labelMaxLength: 30,
      maxItems: 12,
      totalValue: Number((snapshot.totalMinutes / 60).toFixed(2)),
      showPercent: true,
      showSummary: false,
      showScale: false,
      axisFormatter: (value) => `${Number(value || 0).toFixed(1)}h`,
      valueFormatter: (value) => `${Number(value || 0).toFixed(1)}h`
    });

    const query = localState.topicQuery.trim();
    const queryKey = toComparableTitle(query);
    if (!query) {
      refs.weekTopicSummary.textContent = t("week.topicSummaryAll", { duration: formatHours(snapshot.totalMinutes) });
    } else {
      const matchedMinutes = snapshot.titleRows
        .filter((item) => item.titleKey.includes(queryKey))
        .reduce((sum, item) => sum + item.minutes, 0);

      refs.weekTopicSummary.textContent =
        matchedMinutes > 0
          ? t("week.topicSummaryMatch", { query: localState.topicQuery, duration: formatHours(matchedMinutes) })
          : t("week.topicSummaryNoMatch", { query: localState.topicQuery });
    }

    renderBreakdownDetails(
      refs.weekTopicDetailsWrap,
      snapshot.titleRows,
      snapshot.totalMinutes,
      t("table.titleCategory"),
      10
    );
  }

  function downloadWeekReport(events) {
    const snapshot = buildWeeklySnapshot(events);

    const toRows = (rows) =>
      rows.map((row) => ({
        label: row.label,
        hours: formatHours(row.minutes),
        percent: getPercentText(row.minutes, snapshot.totalMinutes),
        value: Number((row.minutes / 60).toFixed(2))
      }));

    exportWeekReportHtml({
      language: state.settings.lang,
      locale: i18n.getLocale(),
      totalHours: formatHours(snapshot.totalMinutes),
      totalHoursValue: Number((snapshot.totalMinutes / 60).toFixed(2)),
      categoryRows: toRows(snapshot.categoryRows),
      titleRows: toRows(snapshot.titleRows),
      labels: {
        reportTitle: t("report.weekTitle"),
        generated: t("download.generated"),
        totalHours: t("week.totalHours"),
        categoryTitle: t("week.categoryChartHeading"),
        titleTitle: t("week.topicHeading"),
        category: t("table.category"),
        title: t("table.titleCategory"),
        hours: t("table.hours"),
        percent: t("table.percent"),
        noData: t("download.empty"),
        direction: i18n.getDirection()
      }
    });
  }

  function buildOccupancy(dayEvents, slotCount, toSlot) {
    const occupancy = new Array(slotCount).fill(null);
    dayEvents.forEach((eventItem) => {
      const startSlot = toSlot(eventItem.start);
      const endSlot = toSlot(eventItem.end);
      if (startSlot < 0 || endSlot > slotCount || endSlot <= startSlot) return;

      for (let index = startSlot; index < endSlot; index += 1) {
        occupancy[index] = eventItem.id;
      }
    });

    return occupancy;
  }

  function renderTimetable(events) {
    refs.weekTimetableWrap.innerHTML = "";

    const range = resolveTimelineRange(events.length ? events : state.events);
    const startHour = range.startHour;
    const endHour = range.endHour;

    const table = createNode("table", "tt week-tt");
    const slotCount = (endHour - startHour) * 2;

    const colgroup = createNode("colgroup");
    colgroup.appendChild(createNode("col", "tt-day-col-width"));
    for (let index = 0; index < slotCount; index += 1) {
      colgroup.appendChild(createNode("col", "tt-slot-col-width"));
    }
    table.appendChild(colgroup);

    const thead = createNode("thead");
    const headRow = createNode("tr");

    const corner = createNode("th", "day-col day-corner");
    corner.textContent = t("table.corner");
    headRow.appendChild(corner);

    for (let hour = startHour; hour < endHour; hour += 1) {
      const th = createNode("th", "hour-head hour-start");
      th.colSpan = 2;
      th.innerHTML = `${String(hour).padStart(2, "0")}:00<br>${String(hour + 1).padStart(2, "0")}:00`;
      headRow.appendChild(th);
    }

    thead.appendChild(headRow);
    table.appendChild(thead);

    const eventMap = new Map(events.map((item) => [item.id, item]));
    const tbody = createNode("tbody");

    const toSlot = (timeValue) => {
      const [hour, minute] = String(timeValue).split(":").map(Number);
      return (hour - startHour) * 2 + (minute === 30 ? 1 : 0);
    };

    const resolveDropContext = (pointerEvent) => {
      const cell = pointerEvent.target.closest("td[data-slot-start][data-day]");
      if (!cell) return null;

      const day = Number(cell.dataset.day);
      const slotStart = Number(cell.dataset.slotStart);
      const slotSpan = Math.max(1, Number(cell.dataset.slotSpan || 1));

      if (!Number.isInteger(day) || day < 0 || day > 6) return null;
      if (!Number.isInteger(slotStart) || slotStart < 0 || slotStart >= slotCount) return null;

      let slot = slotStart;

      if (slotSpan > 1 && Number.isFinite(pointerEvent.clientX)) {
        const rect = cell.getBoundingClientRect();
        if (rect.width > 0) {
          let ratio = (pointerEvent.clientX - rect.left) / rect.width;
          ratio = Math.max(0, Math.min(0.999, ratio));
          const offset = Math.floor(ratio * slotSpan);
          slot = Math.min(slotCount - 1, slotStart + Math.max(0, offset));
        }
      }

      return { cell, day, slot };
    };

    getDayNames().forEach((dayName, dayIndex) => {
      const tr = createNode("tr");
      const dayCell = createNode("th", "day-col");
      dayCell.textContent = dayName;
      tr.appendChild(dayCell);

      const dayEvents = events.filter((item) => item.day === dayIndex);
      const occupancy = buildOccupancy(dayEvents, slotCount, toSlot);

      let slot = 0;
      while (slot < slotCount) {
        const isHourStart = slot % 2 === 0;

        if (!occupancy[slot]) {
          const empty = createNode("td");
          if (isHourStart) empty.classList.add("hour-start");
          empty.dataset.day = String(dayIndex);
          empty.dataset.slotStart = String(slot);
          empty.dataset.slotSpan = "1";
          tr.appendChild(empty);
          slot += 1;
          continue;
        }

        const eventId = occupancy[slot];
        let end = slot;
        while (end < slotCount && occupancy[end] === eventId) {
          end += 1;
        }

        const eventItem = eventMap.get(eventId);
        const td = createNode("td", "event-cell");
        td.colSpan = end - slot;
        if (isHourStart) td.classList.add("hour-start");
        td.dataset.day = String(dayIndex);
        td.dataset.slotStart = String(slot);
        td.dataset.slotSpan = String(end - slot);

        if (eventItem) {
          td.style.background = softTintColor(getCategoryColor(eventItem.type), 0.24) || themeColor("--event-hover", "rgba(9, 105, 218, 0.06)");
          td.draggable = true;
          td.dataset.eventId = eventItem.id;

          const wrap = createNode("div", "event-cell-wrap");
          const title = createNode("div", "event-title-line");
          title.textContent = `${getCategoryIcon(eventItem.type)} ${eventItem.title}`;
          wrap.appendChild(title);

          const goalText = getGoalLabel(eventItem);
          if (goalText) {
            const goal = createNode("span", "goal-chip");
            goal.textContent = goalText;
            wrap.appendChild(goal);
          }

          const meta = createNode("div", "event-time-mini");
          meta.textContent = `${eventItem.start}-${eventItem.end}`;
          wrap.appendChild(meta);

          td.appendChild(wrap);
          td.title = `${eventItem.title} | ${dayName} ${eventItem.start}-${eventItem.end}`;
        }

        tr.appendChild(td);
        slot = end;
      }

      tbody.appendChild(tr);
    });

    tbody.addEventListener("dragstart", (event) => {
      const cell = event.target.closest("td.event-cell[data-event-id]");
      if (!cell) return;

      const eventId = cell.dataset.eventId;
      if (!eventId) return;

      localState.draggingEventId = eventId;
      localState.dragSourceCell = cell;
      localState.dragSourceCell.classList.add("drag-source");
      table.classList.add("is-dragging-event");

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", eventId);
      }
    });

    tbody.addEventListener("dragover", (event) => {
      if (!localState.draggingEventId) return;
      autoScrollTimetableDuringDrag(event);

      const context = resolveDropContext(event);
      if (!context) {
        clearDragPreview();
        return;
      }

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }

      const validation = validateDragTarget(localState.draggingEventId, context.day, context.slot, startHour);
      const durationSlots = getDragDurationSlots(localState.draggingEventId);
      const slotEndExclusive = context.slot + durationSlots;
      const signature = `${context.day}:${context.slot}:${slotEndExclusive}:${validation.ok ? "ok" : "invalid"}`;

      if (signature !== localState.dragPreviewSignature) {
        clearDragPreview();

        const previewCells = collectDropPreviewCells(tbody, context.day, context.slot, slotEndExclusive);
        localState.dragPreviewCells = previewCells.length ? previewCells : [context.cell];
        localState.dragPreviewSignature = signature;

        localState.dragPreviewCells.forEach((cell, index) => {
          cell.classList.add(validation.ok ? "drop-target" : "drop-invalid");
          if (index === 0) {
            cell.classList.add("drop-anchor");
          }
        });
      }
    });

    tbody.addEventListener("drop", (event) => {
      if (!localState.draggingEventId) return;

      const context = resolveDropContext(event);
      const draggingEventId = localState.draggingEventId;

      event.preventDefault();
      clearDragPreview();
      clearDragSourceCell();
      localState.draggingEventId = null;
      table.classList.remove("is-dragging-event");

      if (!context) return;
      const validation = validateDragTarget(draggingEventId, context.day, context.slot, startHour);
      if (!validation.ok) {
        actions.notifyError(validation.reason);
        return;
      }
      moveEventByDrag(draggingEventId, context.day, context.slot, startHour);
    });

    tbody.addEventListener("dragend", () => {
      clearDragPreview();
      clearDragSourceCell();
      localState.draggingEventId = null;
      table.classList.remove("is-dragging-event");
    });

    tbody.addEventListener("dragleave", (event) => {
      const related = event.relatedTarget;
      if (!related || !tbody.contains(related)) {
        clearDragPreview();
      }
    });

    table.appendChild(tbody);
    refs.weekTimetableWrap.appendChild(table);
  }

  function renderEventList(events) {
    refs.weekEventsListWrap.innerHTML = "";

    if (!events.length) {
      const empty = createNode("div", "empty-state");
      empty.textContent = t("msg.noResults");
      refs.weekEventsListWrap.appendChild(empty);
      return;
    }

    const table = createNode("table", "event-table");
    const thead = createNode("thead");
    const trh = createNode("tr");

    const columns = [
      t("table.day"),
      t("table.time"),
      t("table.title"),
      t("table.category"),
      t("table.goal"),
      t("table.location"),
      t("table.actions")
    ];

    columns.forEach((label) => {
      const th = createNode("th");
      th.textContent = label;
      trh.appendChild(th);
    });

    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = createNode("tbody");

    events.forEach((eventItem) => {
      const tr = createNode("tr");

      const dayCell = createNode("td");
      dayCell.dataset.label = t("table.day");
      dayCell.textContent = getDayNames()[eventItem.day] || "";
      tr.appendChild(dayCell);

      const timeCell = createNode("td");
      timeCell.dataset.label = t("table.time");
      timeCell.textContent = `${eventItem.start}-${eventItem.end}`;
      tr.appendChild(timeCell);

      const titleCell = createNode("td", "event-title");
      titleCell.dataset.label = t("table.title");
      titleCell.textContent = eventItem.title;
      tr.appendChild(titleCell);

      const typeCell = createNode("td");
      typeCell.dataset.label = t("table.category");
      typeCell.textContent = `${getCategoryIcon(eventItem.type)} ${getCategoryLabel(eventItem.type)}`;
      tr.appendChild(typeCell);

      const goalCell = createNode("td");
      goalCell.dataset.label = t("table.goal");
      goalCell.textContent = getGoalLabel(eventItem) || "-";
      tr.appendChild(goalCell);

      const locationCell = createNode("td");
      locationCell.dataset.label = t("table.location");
      locationCell.textContent = eventItem.location || "-";
      tr.appendChild(locationCell);

      const actionCell = createNode("td", "action-cell");
      actionCell.dataset.label = t("table.actions");

      const editBtn = createNode("button", "inline-btn");
      editBtn.type = "button";
      editBtn.textContent = t("btn.edit");
      editBtn.addEventListener("click", () => startEditEvent(eventItem.id));

      const deleteBtn = createNode("button", "inline-btn danger");
      deleteBtn.type = "button";
      deleteBtn.textContent = t("btn.delete");
      deleteBtn.addEventListener("click", () => removeEvent(eventItem.id));

      actionCell.appendChild(editBtn);
      actionCell.appendChild(deleteBtn);

      tr.appendChild(actionCell);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    refs.weekEventsListWrap.appendChild(table);
  }

  function renderPrintList(events) {
    refs.weekPrintListSection.innerHTML = "";

    const heading = createNode("h3", "print-list-heading");
    heading.textContent = t("download.weekTitle");
    refs.weekPrintListSection.appendChild(heading);

    if (!events.length) {
      const empty = createNode("p", "print-empty");
      empty.textContent = t("download.empty");
      refs.weekPrintListSection.appendChild(empty);
      return;
    }

    const table = createNode("table", "print-list-table");
    const thead = createNode("thead");
    const htr = createNode("tr");

    [t("table.day"), t("table.time"), t("table.category"), t("table.goal"), t("table.title")].forEach((label) => {
      const th = createNode("th");
      th.textContent = label;
      htr.appendChild(th);
    });

    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = createNode("tbody");
    events.forEach((eventItem) => {
      const tr = createNode("tr");

      const dayCell = createNode("td");
      dayCell.dataset.label = t("table.day");
      dayCell.textContent = getDayNames()[eventItem.day] || "";
      tr.appendChild(dayCell);

      const timeCell = createNode("td");
      timeCell.dataset.label = t("table.time");
      timeCell.textContent = `${eventItem.start}-${eventItem.end}`;
      tr.appendChild(timeCell);

      const typeCell = createNode("td");
      typeCell.dataset.label = t("table.category");
      typeCell.textContent = `${getCategoryIcon(eventItem.type)} ${getCategoryLabel(eventItem.type)}`;
      tr.appendChild(typeCell);

      const goalCell = createNode("td");
      goalCell.dataset.label = t("table.goal");
      goalCell.textContent = getGoalLabel(eventItem) || "-";
      tr.appendChild(goalCell);

      const titleCell = createNode("td");
      titleCell.dataset.label = t("table.title");
      titleCell.textContent = eventItem.title;
      tr.appendChild(titleCell);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    refs.weekPrintListSection.appendChild(table);
  }

  function syncLabels() {
    refs.weekHeading.textContent = t("week.heading");
    refs.weekFormHeading.textContent = t("week.formHeading");
    refs.weekFiltersHeading.textContent = t("week.filtersHeading");
    refs.weekTableHeading.textContent = t("week.tableHeading");
    refs.weekReportHeading.textContent = t("week.reportHeading");
    refs.weekCategoryChartHeading.textContent = t("week.categoryChartHeading");
    refs.weekTopicHeading.textContent = t("week.topicHeading");
    refs.weekListHeading.textContent = t("week.listHeading");
    refs.weekCategoryHeading.textContent = t("week.categoryHeading");

    refs.weekTitleLabel.textContent = t("week.label.title");
    refs.weekTypeLabel.textContent = t("week.label.type");
    refs.weekGoalLabel.textContent = t("week.label.goal");
    refs.weekDayLabel.textContent = t("week.label.day");
    refs.weekStartLabel.textContent = t("week.label.start");
    refs.weekEndLabel.textContent = t("week.label.end");
    refs.weekLocationLabel.textContent = t("week.label.location");
    refs.weekNoteLabel.textContent = t("week.label.note");

    refs.weekTitleInput.placeholder = t("placeholder.title");
    refs.weekLocationInput.placeholder = t("placeholder.location");
    refs.weekNoteInput.placeholder = t("placeholder.note");

    refs.weekAddBtn.textContent = localState.editingId ? t("btn.save") : t("btn.add");
    refs.weekCancelBtn.textContent = t("btn.cancel");
    refs.weekPrintBtn.textContent = t("btn.print");
    refs.weekExportCsvBtn.textContent = t("btn.exportCsv");
    refs.weekExportTxtBtn.textContent = t("btn.exportTxt");
    refs.weekExportReportBtn.textContent = t("btn.exportReport");
    refs.weekDeleteAllBtn.textContent = t("btn.deleteAll");

    refs.weekSearchLabel.textContent = t("week.label.search");
    refs.weekTopicQueryLabel.textContent = t("week.topicQueryLabel");
    refs.weekFilterTypeLabel.textContent = t("week.label.filterType");
    refs.weekFilterDayLabel.textContent = t("week.label.filterDay");
    refs.weekSearchInput.placeholder = t("placeholder.search");
    refs.weekTopicQueryInput.placeholder = t("placeholder.topicQuery");
    if (document.activeElement !== refs.weekTopicQueryInput) {
      refs.weekTopicQueryInput.value = localState.topicQuery;
    }
    refs.weekClearFiltersBtn.textContent = t("btn.clearFilters");

    refs.weekCategoryLabel.textContent = t("week.label.newCategory");
    refs.weekCategoryIconLabel.textContent = t("week.label.newCategoryIcon");
    refs.weekCategoryColorLabel.textContent = t("week.label.newCategoryColor");
    refs.weekAddCategoryBtn.textContent = t("btn.addCategory");
    refs.weekRemoveCategoryBtn.textContent = t("btn.removeCategory");
    refs.weekCategoryHint.textContent = t("week.hint.categoryLocked");
  }

  function syncSelects() {
    const dayCurrent = refs.weekDaySelect.value || "0";
    const startCurrent = refs.weekStartSelect.value || "08:00";
    const endCurrent = refs.weekEndSelect.value || "09:00";
    const typeCurrent = refs.weekTypeSelect.value || "class";
    const goalCurrent = refs.weekGoalSelect.value || "";

    populateDaySelect(refs.weekDaySelect, getDayNames(), {
      selectedValue: dayCurrent
    });

    populateTimeSelects(refs.weekStartSelect, refs.weekEndSelect, START_HOUR, END_HOUR, {
      start: startCurrent,
      end: endCurrent
    });

    populateCategorySelect(refs.weekTypeSelect, state.categories, {
      resolveLabel: (item) => getCategoryLabel(item.id),
      selectedValue: typeCurrent
    });

    populateGoalSelect(refs.weekGoalSelect, state.goals, {
      includeNone: true,
      noneLabel: t("option.noGoal"),
      selectedValue: goalCurrent
    });

    populateCategorySelect(refs.weekFilterTypeSelect, state.categories, {
      includeAll: true,
      allLabel: t("option.allCategories"),
      resolveLabel: (item) => getCategoryLabel(item.id),
      selectedValue: localState.filters.type
    });

    populateDaySelect(refs.weekFilterDaySelect, getDayNames(), {
      includeAll: true,
      allLabel: t("option.allDays"),
      selectedValue: localState.filters.day
    });

    refs.weekTypeSelect.value ||= "class";
    refs.weekDaySelect.value ||= "0";
    refs.weekStartSelect.value ||= "08:00";
    refs.weekEndSelect.value ||= "09:00";
  }

  function render() {
    syncLabels();
    syncSelects();
    updateControlsForEditMode();
    renderTitleSuggestions(refs.weekTitleInput.value);

    const filtered = getFilteredEvents();
    const snapshot = buildWeeklySnapshot(filtered);
    renderStats(filtered);
    renderTimetable(filtered);
    renderReportTotals(snapshot);
    renderCategoryAnalytics(snapshot);
    renderTopicAnalytics(snapshot);
    renderEventList(filtered);
    renderPrintList(filtered);
  }

  function bindEvents() {
    if (localState.initialized) return;
    localState.initialized = true;

    refs.weekAddBtn.addEventListener("click", addOrUpdateEvent);
    refs.weekCancelBtn.addEventListener("click", cancelEditEvent);

    refs.weekTitleInput.addEventListener("input", () => {
      renderTitleSuggestions(refs.weekTitleInput.value);
    });

    refs.weekTitleInput.addEventListener("blur", () => {
      const canonical = resolveCanonicalTitle(refs.weekTitleInput.value, localState.editingId);
      if (canonical) {
        refs.weekTitleInput.value = canonical;
      }
    });

    refs.weekSearchInput.addEventListener("input", () => {
      updateFiltersFromInputs();
      render();
    });

    refs.weekTopicQueryInput.addEventListener("input", () => {
      localState.topicQuery = refs.weekTopicQueryInput.value.trim();
      const snapshot = buildWeeklySnapshot(getFilteredEvents());
      renderTopicAnalytics(snapshot);
    });

    refs.weekFilterTypeSelect.addEventListener("change", () => {
      updateFiltersFromInputs();
      render();
    });

    refs.weekFilterDaySelect.addEventListener("change", () => {
      updateFiltersFromInputs();
      render();
    });

    refs.weekClearFiltersBtn.addEventListener("click", clearFilters);
    refs.weekDeleteAllBtn.addEventListener("click", clearAllEvents);

    refs.weekAddCategoryBtn.addEventListener("click", addCategory);
    refs.weekRemoveCategoryBtn.addEventListener("click", removeActiveCategory);

    refs.weekPrintBtn.addEventListener("click", () => window.print());

    refs.weekExportCsvBtn.addEventListener("click", () => {
      const filtered = getFilteredEvents();
      exportWeekEventsCsv({
        events: filtered,
        dayName: (dayIndex) => getDayNames()[dayIndex] || "",
        categoryLabel: getCategoryLabel,
        language: state.settings.lang
      });
      actions.notifySuccess(t("msg.exportDone"));
    });

    refs.weekExportTxtBtn.addEventListener("click", () => {
      const filtered = getFilteredEvents();
      exportWeekEventsTxt({
        events: filtered,
        dayName: (dayIndex) => getDayNames()[dayIndex] || "",
        categoryLabel: getCategoryLabel,
        locale: i18n.getLocale(),
        language: state.settings.lang,
        labels: {
          title: t("download.weekTitle"),
          generated: t("download.generated"),
          count: t("download.count"),
          empty: t("download.empty"),
          goal: t("table.goal")
        }
      });
      actions.notifySuccess(t("msg.exportDone"));
    });

    refs.weekExportReportBtn.addEventListener("click", () => {
      const filtered = getFilteredEvents();
      downloadWeekReport(filtered);
      actions.notifySuccess(t("msg.exportDone"));
    });
  }

  function init() {
    bindEvents();
    render();
  }

  return {
    init,
    render,
    refreshFilters() {
      updateFiltersFromInputs();
      render();
    }
  };
}
