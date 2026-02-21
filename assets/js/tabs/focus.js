import { FOCUS_MODES, createId, formatDurationMinutes, nowIso } from "../data.js";
import { createNode, formatTimer, populateGoalSelect, setSelectOptions } from "../ui.js";
import { exportFocusCsv } from "../exporters.js";

export function createFocusTab({ refs, state, actions }) {
  const localState = {
    initialized: false,
    timerHandle: null,
    nowSeconds: 0
  };

  function t(key, params = {}) {
    return actions.t(key, params);
  }

  function getRuntime() {
    return state.settings.focusRuntime && state.settings.focusRuntime.running
      ? state.settings.focusRuntime
      : null;
  }

  function clearRuntime() {
    state.settings.focusRuntime = null;
  }

  function stopTick() {
    if (localState.timerHandle) {
      clearInterval(localState.timerHandle);
      localState.timerHandle = null;
    }
  }

  function updateTimerDisplay() {
    const runtime = getRuntime();
    if (!runtime) {
      refs.focusTimerDisplay.textContent = t("focus.timer.idle");
      return;
    }

    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(runtime.startedAt).getTime()) / 1000));
    localState.nowSeconds = elapsed;

    if (runtime.mode === "pomodoro") {
      const total = Math.max(0, Number(runtime.plannedMinutes || 0) * 60);
      const remaining = Math.max(0, total - elapsed);
      refs.focusTimerDisplay.textContent = formatTimer(remaining);

      if (remaining <= 0) {
        stopFocus(true);
      }
      return;
    }

    refs.focusTimerDisplay.textContent = formatTimer(elapsed);
  }

  function startTick() {
    stopTick();
    updateTimerDisplay();
    localState.timerHandle = setInterval(updateTimerDisplay, 1000);
  }

  function syncLabels() {
    refs.focusHeading.textContent = t("focus.heading");

    refs.focusModeLabel.textContent = t("focus.label.mode");
    refs.focusPlannedLabel.textContent = t("focus.label.planned");
    refs.focusGoalLabel.textContent = t("focus.label.goal");
    refs.focusEventLabel.textContent = t("focus.label.event");
    refs.focusNoteLabel.textContent = t("focus.label.note");

    refs.focusStartBtn.textContent = `▶ ${t("btn.start")}`;
    refs.focusStopBtn.textContent = `■ ${t("btn.stop")}`;
    refs.focusResetBtn.textContent = `↺ ${t("btn.reset")}`;
    refs.focusExportCsvBtn.textContent = `📄 ${t("btn.exportCsv")}`;

    setSelectOptions(
      refs.focusModeSelect,
      [
        { value: "pomodoro", label: t("option.focusPomodoro") },
        { value: "free", label: t("option.focusFree") }
      ],
      refs.focusModeSelect.value || "pomodoro"
    );
  }

  function syncGoalAndEventSelects() {
    populateGoalSelect(refs.focusGoalSelect, state.goals, {
      includeNone: true,
      noneLabel: t("option.noGoal"),
      selectedValue: refs.focusGoalSelect.value
    });

    const eventOptions = [{ value: "", label: t("option.noGoal") }].concat(
      state.events.map((item) => ({ value: item.id, label: `${item.title} (${item.start}-${item.end})` }))
    );
    setSelectOptions(refs.focusEventSelect, eventOptions, refs.focusEventSelect.value);
  }

  function createRuntimeFromForm() {
    const mode = refs.focusModeSelect.value;
    if (!FOCUS_MODES.includes(mode)) return null;

    const plannedMinutes = Number(refs.focusPlannedInput.value || 0);

    return {
      running: true,
      mode,
      plannedMinutes: Number.isFinite(plannedMinutes) && plannedMinutes > 0 ? plannedMinutes : 25,
      startedAt: nowIso(),
      linkedGoalId: refs.focusGoalSelect.value || null,
      linkedEventId: refs.focusEventSelect.value || null,
      note: refs.focusNoteInput.value.trim() || null
    };
  }

  function startFocus() {
    if (getRuntime()) {
      actions.notifyError(t("err.focusRunning"));
      return;
    }

    const runtime = createRuntimeFromForm();
    if (!runtime) {
      actions.notifyError(t("err.invalidJson"));
      return;
    }

    state.settings.focusRuntime = runtime;
    actions.persist();
    startTick();
    render();
    actions.notifySuccess(t("msg.focusStarted"));
  }

  function stopFocus(autoCompleted = false) {
    const runtime = getRuntime();
    if (!runtime) {
      if (!autoCompleted) actions.notifyError(t("err.focusNoRuntime"));
      return;
    }

    const startedAt = new Date(runtime.startedAt).getTime();
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

    const session = {
      id: createId("fs"),
      mode: runtime.mode,
      plannedMinutes: runtime.plannedMinutes,
      actualMinutes: elapsedMinutes,
      startedAt: runtime.startedAt,
      endedAt: nowIso(),
      linkedGoalId: runtime.linkedGoalId || null,
      linkedEventId: runtime.linkedEventId || null,
      note: runtime.note || null
    };

    state.focusSessions.unshift(session);
    clearRuntime();

    stopTick();
    actions.saveAndRender(autoCompleted ? "msg.focusCompleted" : "msg.focusStopped");
  }

  function resetFocus() {
    clearRuntime();
    stopTick();
    render();
    actions.persist();
    actions.notifySuccess(t("msg.focusReset"));
  }

  function removeSession(sessionId) {
    const approved = window.confirm(t("confirm.deleteFocus"));
    if (!approved) return;

    state.focusSessions = state.focusSessions.filter((item) => item.id !== sessionId);
    actions.saveAndRender("msg.saved");
  }

  function renderSummary() {
    refs.focusSummary.innerHTML = "";

    const totalMinutes = state.focusSessions.reduce((sum, item) => sum + Number(item.actualMinutes || 0), 0);
    const total = createNode("span", "chip");
    total.textContent = `${t("table.duration")}: ${formatDurationMinutes(totalMinutes)}`;

    const sessions = createNode("span", "chip");
    sessions.textContent = `${t("analytics.label.sessions")}: ${state.focusSessions.length}`;

    refs.focusSummary.appendChild(total);
    refs.focusSummary.appendChild(sessions);
  }

  function renderSessions() {
    refs.focusSessionsWrap.innerHTML = "";

    if (!state.focusSessions.length) {
      const empty = createNode("div", "empty-state");
      empty.textContent = t("msg.noResults");
      refs.focusSessionsWrap.appendChild(empty);
      return;
    }

    const table = createNode("table", "event-table");
    const thead = createNode("thead");
    const trh = createNode("tr");

    [t("table.mode"), t("table.duration"), t("table.goal"), t("table.time"), t("table.actions")].forEach((label) => {
      const th = createNode("th");
      th.textContent = label;
      trh.appendChild(th);
    });

    thead.appendChild(trh);
    table.appendChild(thead);

    const goalMap = new Map(state.goals.map((item) => [item.id, item.title]));
    const tbody = createNode("tbody");

    state.focusSessions.forEach((session) => {
      const tr = createNode("tr");

      const modeCell = createNode("td");
      modeCell.dataset.label = t("table.mode");
      modeCell.textContent = session.mode === "pomodoro" ? t("option.focusPomodoro") : t("option.focusFree");
      tr.appendChild(modeCell);

      const durationCell = createNode("td");
      durationCell.dataset.label = t("table.duration");
      durationCell.textContent = `${session.actualMinutes}m`;
      tr.appendChild(durationCell);

      const goalCell = createNode("td");
      goalCell.dataset.label = t("table.goal");
      goalCell.textContent = session.linkedGoalId ? goalMap.get(session.linkedGoalId) || session.linkedGoalId : "-";
      tr.appendChild(goalCell);

      const timeCell = createNode("td");
      timeCell.dataset.label = t("table.time");
      timeCell.textContent = `${new Date(session.startedAt).toLocaleDateString()} ${new Date(session.startedAt).toLocaleTimeString()}`;
      tr.appendChild(timeCell);

      const actionCell = createNode("td", "action-cell");
      actionCell.dataset.label = t("table.actions");

      const deleteBtn = createNode("button", "inline-btn danger");
      deleteBtn.type = "button";
      deleteBtn.textContent = `🗑 ${t("btn.delete")}`;
      deleteBtn.addEventListener("click", () => removeSession(session.id));

      actionCell.appendChild(deleteBtn);
      tr.appendChild(actionCell);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    refs.focusSessionsWrap.appendChild(table);
  }

  function render() {
    syncLabels();
    syncGoalAndEventSelects();
    renderSummary();
    renderSessions();

    const runtime = getRuntime();
    refs.focusStartBtn.disabled = Boolean(runtime);
    refs.focusStopBtn.disabled = !runtime;

    if (runtime) {
      startTick();
    } else {
      stopTick();
      refs.focusTimerDisplay.textContent = t("focus.timer.idle");
    }
  }

  function bindEvents() {
    if (localState.initialized) return;
    localState.initialized = true;

    refs.focusStartBtn.addEventListener("click", startFocus);
    refs.focusStopBtn.addEventListener("click", () => stopFocus(false));
    refs.focusResetBtn.addEventListener("click", resetFocus);

    refs.focusExportCsvBtn.addEventListener("click", () => {
      exportFocusCsv({
        sessions: state.focusSessions,
        language: state.settings.lang
      });
      actions.notifySuccess(t("msg.exportDone"));
    });
  }

  function init() {
    if (!refs.focusPlannedInput.value) {
      refs.focusPlannedInput.value = "25";
    }
    bindEvents();
    render();
  }

  return {
    init,
    render,
    teardown() {
      stopTick();
    }
  };
}
