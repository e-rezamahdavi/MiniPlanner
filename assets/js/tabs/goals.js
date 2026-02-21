import { GOAL_STATUS, createId, normalizeColor, normalizeGoal, nowIso } from "../data.js";
import { createNode, setSelectOptions } from "../ui.js";
import { exportGoalsCsv } from "../exporters.js";

function toPercent(goal) {
  const target = Number(goal.targetValue || 0);
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, (Number(goal.currentValue || 0) / target) * 100));
}

export function createGoalsTab({ refs, state, actions }) {
  const localState = {
    initialized: false,
    editingId: null
  };

  function t(key, params = {}) {
    return actions.t(key, params);
  }

  function resetForm() {
    refs.goalTitleInput.value = "";
    refs.goalTargetInput.value = "100";
    refs.goalCurrentInput.value = "0";
    refs.goalUnitInput.value = "%";
    refs.goalDeadlineInput.value = "";
    refs.goalStatusSelect.value = "active";
    refs.goalColorInput.value = "#16a34a";
  }

  function syncLabels() {
    refs.goalsHeading.textContent = t("goal.heading");

    refs.goalTitleLabel.textContent = t("goal.label.title");
    refs.goalTargetLabel.textContent = t("goal.label.target");
    refs.goalCurrentLabel.textContent = t("goal.label.current");
    refs.goalUnitLabel.textContent = t("goal.label.unit");
    refs.goalDeadlineLabel.textContent = t("goal.label.deadline");
    refs.goalStatusLabel.textContent = t("goal.label.status");
    refs.goalColorLabel.textContent = t("goal.label.color");

    refs.goalTitleInput.placeholder = t("placeholder.goalTitle");

    refs.goalAddBtn.textContent = localState.editingId ? `💾 ${t("btn.save")}` : `➕ ${t("btn.add")}`;
    refs.goalCancelBtn.textContent = `✖ ${t("btn.cancel")}`;
    refs.goalsExportCsvBtn.textContent = `📄 ${t("btn.exportCsv")}`;

    const options = [
      { value: "active", label: t("option.goalStatusActive") },
      { value: "completed", label: t("option.goalStatusCompleted") },
      { value: "paused", label: t("option.goalStatusPaused") }
    ];
    setSelectOptions(refs.goalStatusSelect, options, refs.goalStatusSelect.value || "active");

    refs.goalCancelBtn.hidden = !localState.editingId;
  }

  function validateDraft(draft) {
    if (!draft.title) return t("err.goalTitleRequired");
    if (!GOAL_STATUS.includes(draft.status)) return t("err.invalidJson");
    if (!Number.isFinite(draft.targetValue) || draft.targetValue < 0) return t("err.invalidJson");
    if (!Number.isFinite(draft.currentValue) || draft.currentValue < 0) return t("err.invalidJson");
    return null;
  }

  function createDraft() {
    return {
      title: refs.goalTitleInput.value.trim(),
      targetValue: Number(refs.goalTargetInput.value),
      currentValue: Number(refs.goalCurrentInput.value),
      unit: refs.goalUnitInput.value.trim() || "%",
      deadline: refs.goalDeadlineInput.value || null,
      status: refs.goalStatusSelect.value,
      color: normalizeColor(refs.goalColorInput.value, "#16a34a")
    };
  }

  function addOrUpdateGoal() {
    const draft = createDraft();
    const error = validateDraft(draft);
    if (error) {
      actions.notifyError(error);
      return;
    }

    if (localState.editingId) {
      const index = state.goals.findIndex((item) => item.id === localState.editingId);
      if (index >= 0) {
        const prev = state.goals[index];
        state.goals[index] = normalizeGoal({
          ...prev,
          ...draft,
          id: prev.id,
          createdAt: prev.createdAt,
          updatedAt: nowIso()
        });

        state.events = state.events.map((eventItem) => {
          if (eventItem.goalId !== prev.id) return eventItem;
          return {
            ...eventItem,
            goalLabel: state.goals[index]?.title || eventItem.goalLabel
          };
        });
      }

      localState.editingId = null;
      syncLabels();
      resetForm();
      actions.saveAndRender("msg.goalUpdated");
      return;
    }

    const goal = normalizeGoal({
      ...draft,
      id: createId("goal"),
      createdAt: nowIso(),
      updatedAt: nowIso()
    });

    state.goals.push(goal);
    resetForm();
    actions.saveAndRender("msg.goalAdded");
  }

  function startEditGoal(goalId) {
    const target = state.goals.find((item) => item.id === goalId);
    if (!target) return;

    localState.editingId = goalId;

    refs.goalTitleInput.value = target.title;
    refs.goalTargetInput.value = String(target.targetValue);
    refs.goalCurrentInput.value = String(target.currentValue);
    refs.goalUnitInput.value = target.unit;
    refs.goalDeadlineInput.value = target.deadline || "";
    refs.goalStatusSelect.value = target.status;
    refs.goalColorInput.value = normalizeColor(target.color, "#16a34a");

    syncLabels();
  }

  function cancelEditGoal() {
    localState.editingId = null;
    resetForm();
    syncLabels();
  }

  function removeGoal(goalId) {
    const goal = state.goals.find((item) => item.id === goalId);
    if (!goal) return;

    const approved = window.confirm(t("confirm.deleteGoal"));
    if (!approved) return;

    state.goals = state.goals.filter((item) => item.id !== goalId);

    state.events = state.events.map((eventItem) => {
      if (eventItem.goalId !== goalId) return eventItem;
      return {
        ...eventItem,
        goalId: null,
        goalLabel: null
      };
    });

    state.focusSessions = state.focusSessions.map((session) => {
      if (session.linkedGoalId !== goalId) return session;
      return {
        ...session,
        linkedGoalId: null
      };
    });

    if (localState.editingId === goalId) {
      cancelEditGoal();
    }

    actions.saveAndRender("msg.goalDeleted");
  }

  function renderSummary() {
    refs.goalsSummary.innerHTML = "";

    const activeCount = state.goals.filter((item) => item.status === "active").length;
    const completedCount = state.goals.filter((item) => item.status === "completed").length;

    const chipAll = createNode("span", "chip");
    chipAll.textContent = `${t("tab.goals")}: ${state.goals.length}`;

    const chipActive = createNode("span", "chip");
    chipActive.textContent = `${t("option.goalStatusActive")}: ${activeCount}`;

    const chipCompleted = createNode("span", "chip");
    chipCompleted.textContent = `${t("option.goalStatusCompleted")}: ${completedCount}`;

    refs.goalsSummary.appendChild(chipAll);
    refs.goalsSummary.appendChild(chipActive);
    refs.goalsSummary.appendChild(chipCompleted);
  }

  function renderGoals() {
    refs.goalsListWrap.innerHTML = "";

    if (!state.goals.length) {
      const empty = createNode("div", "empty-state");
      empty.textContent = t("msg.noResults");
      refs.goalsListWrap.appendChild(empty);
      return;
    }

    const grid = createNode("div", "goal-grid");

    state.goals.forEach((goal) => {
      const card = createNode("article", "goal-card");
      card.style.borderColor = goal.color;

      const title = createNode("h3", "goal-title");
      title.textContent = goal.title;

      const status = createNode("span", "goal-status");
      status.textContent =
        goal.status === "active"
          ? t("option.goalStatusActive")
          : goal.status === "completed"
            ? t("option.goalStatusCompleted")
            : t("option.goalStatusPaused");

      const progress = toPercent(goal);
      const progressWrap = createNode("div", "goal-progress");
      const progressTrack = createNode("div", "goal-progress-track");
      const progressFill = createNode("div", "goal-progress-fill");
      progressFill.style.width = `${progress}%`;
      progressFill.style.background = goal.color;
      progressTrack.appendChild(progressFill);
      progressWrap.appendChild(progressTrack);

      const details = createNode("p", "goal-details");
      details.textContent = `${goal.currentValue}/${goal.targetValue} ${goal.unit} (${progress.toFixed(1)}%)`;

      const deadline = createNode("p", "goal-deadline");
      deadline.textContent = goal.deadline ? `${t("goal.label.deadline")}: ${goal.deadline}` : "";

      const actionsWrap = createNode("div", "goal-actions");
      const editBtn = createNode("button", "inline-btn");
      editBtn.type = "button";
      editBtn.textContent = `✎ ${t("btn.edit")}`;
      editBtn.addEventListener("click", () => startEditGoal(goal.id));

      const deleteBtn = createNode("button", "inline-btn danger");
      deleteBtn.type = "button";
      deleteBtn.textContent = `🗑 ${t("btn.delete")}`;
      deleteBtn.addEventListener("click", () => removeGoal(goal.id));

      actionsWrap.appendChild(editBtn);
      actionsWrap.appendChild(deleteBtn);

      card.appendChild(title);
      card.appendChild(status);
      card.appendChild(progressWrap);
      card.appendChild(details);
      if (goal.deadline) card.appendChild(deadline);
      card.appendChild(actionsWrap);

      grid.appendChild(card);
    });

    refs.goalsListWrap.appendChild(grid);
  }

  function render() {
    syncLabels();
    renderSummary();
    renderGoals();
  }

  function bindEvents() {
    if (localState.initialized) return;
    localState.initialized = true;

    refs.goalAddBtn.addEventListener("click", addOrUpdateGoal);
    refs.goalCancelBtn.addEventListener("click", cancelEditGoal);

    refs.goalsExportCsvBtn.addEventListener("click", () => {
      exportGoalsCsv({
        goals: state.goals,
        language: state.settings.lang
      });
      actions.notifySuccess(t("msg.exportDone"));
    });
  }

  function init() {
    resetForm();
    bindEvents();
    render();
  }

  return {
    init,
    render
  };
}
