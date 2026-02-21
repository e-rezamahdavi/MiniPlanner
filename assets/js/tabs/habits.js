import {
  HABIT_FREQUENCY,
  createId,
  normalizeColor,
  normalizeHabit,
  normalizeHabitLog,
  nowIso,
  todayDateString
} from "../data.js";
import { createNode, setSelectOptions } from "../ui.js";
import { exportHabitsCsv } from "../exporters.js";

function toDate(dateString) {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateDiffDays(a, b) {
  const diff = toDate(a).getTime() - toDate(b).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function calcStreak(logs, habitId) {
  const days = logs
    .filter((item) => item.habitId === habitId && Number(item.value) > 0)
    .map((item) => item.date)
    .sort((a, b) => b.localeCompare(a));

  if (!days.length) return 0;

  const today = todayDateString();
  let streak = 0;
  let pointer = today;

  for (let i = 0; i < days.length; i += 1) {
    const current = days[i];
    const diff = dateDiffDays(pointer, current);

    if (streak === 0 && diff > 1) {
      return 0;
    }

    if (diff === 0 || diff === 1) {
      streak += 1;
      const dateObj = new Date(pointer);
      dateObj.setDate(dateObj.getDate() - 1);
      pointer = dateObj.toISOString().slice(0, 10);
      continue;
    }

    break;
  }

  return streak;
}

export function createHabitsTab({ refs, state, actions }) {
  const localState = {
    initialized: false,
    editingId: null
  };

  function t(key, params = {}) {
    return actions.t(key, params);
  }

  function resetHabitForm() {
    refs.habitTitleInput.value = "";
    refs.habitFrequencySelect.value = "daily";
    refs.habitTargetInput.value = "1";
    refs.habitIconInput.value = "✅";
    refs.habitColorInput.value = "#0ea5e9";
  }

  function syncLabels() {
    refs.habitsHeading.textContent = t("habit.heading");

    refs.habitTitleLabel.textContent = t("habit.label.title");
    refs.habitFrequencyLabel.textContent = t("habit.label.frequency");
    refs.habitTargetLabel.textContent = t("habit.label.target");
    refs.habitIconLabel.textContent = t("habit.label.icon");
    refs.habitColorLabel.textContent = t("habit.label.color");

    refs.habitTitleInput.placeholder = t("placeholder.habitTitle");

    refs.habitAddBtn.textContent = localState.editingId ? `💾 ${t("btn.save")}` : `➕ ${t("btn.add")}`;
    refs.habitCancelBtn.textContent = `✖ ${t("btn.cancel")}`;
    refs.habitsExportCsvBtn.textContent = `📄 ${t("btn.exportCsv")}`;

    refs.habitLogHeading.textContent = t("habit.logHeading");
    refs.habitLogHabitLabel.textContent = t("habit.label.logHabit");
    refs.habitLogDateLabel.textContent = t("habit.label.logDate");
    refs.habitLogValueLabel.textContent = t("habit.label.logValue");
    refs.habitLogNoteLabel.textContent = t("habit.label.logNote");
    refs.habitLogAddBtn.textContent = `＋ ${t("btn.addLog")}`;

    const frequencyOptions = [
      { value: "daily", label: t("option.habitDaily") },
      { value: "weekly", label: t("option.habitWeekly") },
      { value: "custom", label: t("option.habitCustom") }
    ];

    setSelectOptions(refs.habitFrequencySelect, frequencyOptions, refs.habitFrequencySelect.value || "daily");

    refs.habitCancelBtn.hidden = !localState.editingId;
  }

  function syncHabitLogControls() {
    const options = state.habits
      .filter((item) => !item.archived)
      .map((item) => ({ value: item.id, label: `${item.icon} ${item.title}` }));

    setSelectOptions(refs.habitLogHabitSelect, options, refs.habitLogHabitSelect.value);

    if (!refs.habitLogDateInput.value) {
      refs.habitLogDateInput.value = todayDateString();
    }
    if (!refs.habitLogValueInput.value) {
      refs.habitLogValueInput.value = "1";
    }
  }

  function createHabitDraft() {
    return {
      title: refs.habitTitleInput.value.trim(),
      frequency: refs.habitFrequencySelect.value,
      targetPerPeriod: Number(refs.habitTargetInput.value),
      icon: refs.habitIconInput.value.trim() || "✅",
      color: normalizeColor(refs.habitColorInput.value, "#0ea5e9")
    };
  }

  function validateHabitDraft(draft) {
    if (!draft.title) return t("err.habitTitleRequired");
    if (!HABIT_FREQUENCY.includes(draft.frequency)) return t("err.invalidJson");
    if (!Number.isFinite(draft.targetPerPeriod) || draft.targetPerPeriod <= 0) return t("err.invalidJson");
    return null;
  }

  function addOrUpdateHabit() {
    const draft = createHabitDraft();
    const error = validateHabitDraft(draft);
    if (error) {
      actions.notifyError(error);
      return;
    }

    if (localState.editingId) {
      const index = state.habits.findIndex((item) => item.id === localState.editingId);
      if (index >= 0) {
        const previous = state.habits[index];
        state.habits[index] = normalizeHabit({
          ...previous,
          ...draft,
          id: previous.id,
          createdAt: previous.createdAt,
          updatedAt: nowIso()
        });
      }

      localState.editingId = null;
      resetHabitForm();
      actions.saveAndRender("msg.habitUpdated");
      return;
    }

    const habit = normalizeHabit({
      ...draft,
      id: createId("habit"),
      archived: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });

    state.habits.push(habit);
    resetHabitForm();
    actions.saveAndRender("msg.habitAdded");
  }

  function startEditHabit(habitId) {
    const habit = state.habits.find((item) => item.id === habitId);
    if (!habit) return;

    localState.editingId = habitId;
    refs.habitTitleInput.value = habit.title;
    refs.habitFrequencySelect.value = habit.frequency;
    refs.habitTargetInput.value = String(habit.targetPerPeriod);
    refs.habitIconInput.value = habit.icon;
    refs.habitColorInput.value = normalizeColor(habit.color, "#0ea5e9");

    syncLabels();
  }

  function cancelEditHabit() {
    localState.editingId = null;
    resetHabitForm();
    syncLabels();
  }

  function deleteHabit(habitId) {
    const habit = state.habits.find((item) => item.id === habitId);
    if (!habit) return;

    const approved = window.confirm(t("confirm.deleteHabit"));
    if (!approved) return;

    state.habits = state.habits.filter((item) => item.id !== habitId);
    state.habitLogs = state.habitLogs.filter((log) => log.habitId !== habitId);

    if (localState.editingId === habitId) {
      cancelEditHabit();
    }

    actions.saveAndRender("msg.habitDeleted");
  }

  function toggleArchiveHabit(habitId) {
    state.habits = state.habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      return {
        ...habit,
        archived: !habit.archived,
        updatedAt: nowIso()
      };
    });

    actions.saveAndRender("msg.saved");
  }

  function addHabitLog() {
    const habitId = refs.habitLogHabitSelect.value;
    const date = refs.habitLogDateInput.value;
    const value = Number(refs.habitLogValueInput.value);
    const note = refs.habitLogNoteInput.value.trim() || null;

    if (!habitId) {
      actions.notifyError(t("err.invalidJson"));
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      actions.notifyError(t("err.invalidJson"));
      return;
    }

    if (!Number.isFinite(value) || value < 0) {
      actions.notifyError(t("err.logValueInvalid"));
      return;
    }

    const existingIndex = state.habitLogs.findIndex((log) => log.habitId === habitId && log.date === date);

    if (existingIndex >= 0) {
      state.habitLogs[existingIndex] = normalizeHabitLog({
        ...state.habitLogs[existingIndex],
        value,
        note
      });
    } else {
      state.habitLogs.push(
        normalizeHabitLog({
          id: createId("hlog"),
          habitId,
          date,
          value,
          note
        })
      );
    }

    state.habitLogs = state.habitLogs.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
    refs.habitLogNoteInput.value = "";
    actions.saveAndRender("msg.habitLogAdded");
  }

  function logHabitToday(habitId) {
    const date = todayDateString();
    const existing = state.habitLogs.find((log) => log.habitId === habitId && log.date === date);
    const nextValue = existing ? Number(existing.value || 0) + 1 : 1;

    if (existing) {
      existing.value = nextValue;
    } else {
      state.habitLogs.push(
        normalizeHabitLog({
          id: createId("hlog"),
          habitId,
          date,
          value: 1,
          note: null
        })
      );
    }

    state.habitLogs = state.habitLogs.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
    actions.saveAndRender("msg.habitLogAdded");
  }

  function renderHabits() {
    refs.habitsListWrap.innerHTML = "";

    if (!state.habits.length) {
      const empty = createNode("div", "empty-state");
      empty.textContent = t("msg.noResults");
      refs.habitsListWrap.appendChild(empty);
      return;
    }

    const grid = createNode("div", "habit-grid");

    state.habits.forEach((habit) => {
      const card = createNode("article", `habit-card${habit.archived ? " is-archived" : ""}`);
      card.style.borderColor = habit.color;

      const title = createNode("h3", "habit-title");
      title.textContent = `${habit.icon} ${habit.title}`;

      const meta = createNode("p", "habit-meta");
      const frequencyLabel =
        habit.frequency === "daily"
          ? t("option.habitDaily")
          : habit.frequency === "weekly"
            ? t("option.habitWeekly")
            : t("option.habitCustom");
      meta.textContent = `${frequencyLabel} - ${habit.targetPerPeriod}`;

      const streak = createNode("p", "habit-streak");
      streak.textContent = t("habit.label.streak", { value: calcStreak(state.habitLogs, habit.id) });

      const actionsWrap = createNode("div", "habit-actions");

      const logBtn = createNode("button", "inline-btn");
      logBtn.type = "button";
      logBtn.textContent = `＋1 ${t("btn.addLog")}`;
      logBtn.addEventListener("click", () => logHabitToday(habit.id));

      const editBtn = createNode("button", "inline-btn");
      editBtn.type = "button";
      editBtn.textContent = `✎ ${t("btn.edit")}`;
      editBtn.addEventListener("click", () => startEditHabit(habit.id));

      const archiveBtn = createNode("button", "inline-btn");
      archiveBtn.type = "button";
      archiveBtn.textContent = habit.archived ? `↺ ${t("btn.unarchive")}` : `↺ ${t("btn.archive")}`;
      archiveBtn.addEventListener("click", () => toggleArchiveHabit(habit.id));

      const deleteBtn = createNode("button", "inline-btn danger");
      deleteBtn.type = "button";
      deleteBtn.textContent = `🗑 ${t("btn.delete")}`;
      deleteBtn.addEventListener("click", () => deleteHabit(habit.id));

      actionsWrap.appendChild(logBtn);
      actionsWrap.appendChild(editBtn);
      actionsWrap.appendChild(archiveBtn);
      actionsWrap.appendChild(deleteBtn);

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(streak);
      card.appendChild(actionsWrap);

      grid.appendChild(card);
    });

    refs.habitsListWrap.appendChild(grid);
  }

  function renderLogs() {
    refs.habitsLogsWrap.innerHTML = "";

    if (!state.habitLogs.length) {
      const empty = createNode("div", "empty-state");
      empty.textContent = t("msg.noResults");
      refs.habitsLogsWrap.appendChild(empty);
      return;
    }

    const table = createNode("table", "event-table");
    const thead = createNode("thead");
    const trh = createNode("tr");

    [t("table.title"), t("table.date"), t("table.value"), t("table.note")].forEach((label) => {
      const th = createNode("th");
      th.textContent = label;
      trh.appendChild(th);
    });

    thead.appendChild(trh);
    table.appendChild(thead);

    const habitMap = new Map(state.habits.map((item) => [item.id, item]));
    const tbody = createNode("tbody");

    state.habitLogs
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((log) => {
        const tr = createNode("tr");

        const habitCell = createNode("td");
        habitCell.dataset.label = t("table.title");
        habitCell.textContent = habitMap.get(log.habitId)?.title || log.habitId;
        tr.appendChild(habitCell);

        const dateCell = createNode("td");
        dateCell.dataset.label = t("table.date");
        dateCell.textContent = log.date;
        tr.appendChild(dateCell);

        const valueCell = createNode("td");
        valueCell.dataset.label = t("table.value");
        valueCell.textContent = String(log.value);
        tr.appendChild(valueCell);

        const noteCell = createNode("td");
        noteCell.dataset.label = t("table.note");
        noteCell.textContent = log.note || "-";
        tr.appendChild(noteCell);

        tbody.appendChild(tr);
      });

    table.appendChild(tbody);
    refs.habitsLogsWrap.appendChild(table);
  }

  function render() {
    syncLabels();
    syncHabitLogControls();
    renderHabits();
    renderLogs();
  }

  function bindEvents() {
    if (localState.initialized) return;
    localState.initialized = true;

    refs.habitAddBtn.addEventListener("click", addOrUpdateHabit);
    refs.habitCancelBtn.addEventListener("click", cancelEditHabit);
    refs.habitLogAddBtn.addEventListener("click", addHabitLog);

    refs.habitsExportCsvBtn.addEventListener("click", () => {
      exportHabitsCsv({
        habits: state.habits,
        logs: state.habitLogs,
        language: state.settings.lang
      });
      actions.notifySuccess(t("msg.exportDone"));
    });
  }

  function init() {
    resetHabitForm();
    refs.habitLogDateInput.value = todayDateString();
    bindEvents();
    render();
  }

  return {
    init,
    render
  };
}
