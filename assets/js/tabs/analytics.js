import { computeAnalytics } from "../analytics.js";
import { renderBarChart, renderLineChart } from "../charts.js";
import { createNode, setSelectOptions } from "../ui.js";

export function createAnalyticsTab({ refs, state, actions }) {
  const localState = {
    initialized: false,
    rangeDays: 30
  };

  function t(key, params = {}) {
    return actions.t(key, params);
  }

  function syncLabels() {
    refs.analyticsHeading.textContent = t("analytics.heading");
    refs.analyticsRangeLabel.textContent = t("analytics.label.range");
    refs.analyticsRefreshBtn.textContent = `↻ ${t("btn.refresh")}`;

    setSelectOptions(
      refs.analyticsRangeSelect,
      [
        { value: "7", label: t("option.range7") },
        { value: "30", label: t("option.range30") },
        { value: "90", label: t("option.range90") }
      ],
      String(localState.rangeDays)
    );
  }

  function renderKpis(snapshot) {
    refs.analyticsKpiWrap.innerHTML = "";

    const kpis = [
      { label: t("analytics.kpi.plannedHours"), value: snapshot.kpis.plannedHours },
      { label: t("analytics.kpi.focusMinutes"), value: snapshot.kpis.focusMinutes },
      { label: t("analytics.kpi.goalsProgress"), value: `${snapshot.kpis.goalsProgress}%` },
      { label: t("analytics.kpi.habitsConsistency"), value: `${snapshot.kpis.habitsConsistency}%` }
    ];

    kpis.forEach((item) => {
      const card = createNode("article", "kpi-card");
      const title = createNode("p", "kpi-label");
      title.textContent = item.label;

      const value = createNode("strong", "kpi-value");
      value.textContent = String(item.value);

      card.appendChild(title);
      card.appendChild(value);
      refs.analyticsKpiWrap.appendChild(card);
    });
  }

  function renderCharts(snapshot) {
    refs.analyticsChartsWrap.innerHTML = "";

    const focusCard = createNode("article", "chart-card");
    const focusTitle = createNode("h3", "chart-title");
    focusTitle.textContent = t("analytics.chart.focusTrend");
    const focusBody = createNode("div", "chart-body");

    renderLineChart(
      focusBody,
      snapshot.focusStats.byDay.map((item) => ({ label: item.date.slice(5), value: item.minutes })),
      {
        emptyText: t("msg.noResults"),
        color: "#22c55e"
      }
    );

    focusCard.appendChild(focusTitle);
    focusCard.appendChild(focusBody);

    const habitCard = createNode("article", "chart-card");
    const habitTitle = createNode("h3", "chart-title");
    habitTitle.textContent = t("analytics.chart.habitTrend");
    const habitBody = createNode("div", "chart-body");

    renderLineChart(
      habitBody,
      snapshot.habitTrend.map((item) => ({ label: item.date.slice(5), value: item.value })),
      {
        emptyText: t("msg.noResults"),
        color: "#0ea5e9"
      }
    );

    habitCard.appendChild(habitTitle);
    habitCard.appendChild(habitBody);

    const categoryCard = createNode("article", "chart-card");
    const categoryTitle = createNode("h3", "chart-title");
    categoryTitle.textContent = t("analytics.chart.categoryHours");
    const categoryBody = createNode("div", "chart-body");

    renderBarChart(categoryBody, snapshot.categoryHours, {
      emptyText: t("msg.noResults"),
      color: "#f59e0b"
    });

    categoryCard.appendChild(categoryTitle);
    categoryCard.appendChild(categoryBody);

    const goalsCard = createNode("article", "chart-card");
    const goalsTitle = createNode("h3", "chart-title");
    goalsTitle.textContent = t("analytics.chart.goalProgress");
    const goalsBody = createNode("div", "chart-body");

    renderBarChart(goalsBody, snapshot.goalProgress, {
      emptyText: t("msg.noResults"),
      color: "#8b5cf6"
    });

    goalsCard.appendChild(goalsTitle);
    goalsCard.appendChild(goalsBody);

    refs.analyticsChartsWrap.appendChild(focusCard);
    refs.analyticsChartsWrap.appendChild(habitCard);
    refs.analyticsChartsWrap.appendChild(categoryCard);
    refs.analyticsChartsWrap.appendChild(goalsCard);
  }

  function renderBreakdown(snapshot) {
    refs.analyticsBreakdownWrap.innerHTML = "";

    const list = createNode("ul", "analytics-breakdown-list");

    const goalItem = createNode("li", "analytics-breakdown-item");
    goalItem.textContent = `${t("tab.goals")}: ${snapshot.goalVelocity.completed}/${state.goals.length} ${t("option.goalStatusCompleted")}`;

    const habitItem = createNode("li", "analytics-breakdown-item");
    habitItem.textContent = `${t("tab.habits")}: ${snapshot.habitConsistency.habitsCount} ${t("analytics.label.items")}`;

    const focusItem = createNode("li", "analytics-breakdown-item");
    focusItem.textContent = `${t("tab.focus")}: ${snapshot.focusStats.sessionsCount} ${t("analytics.label.sessions")}`;

    list.appendChild(goalItem);
    list.appendChild(habitItem);
    list.appendChild(focusItem);

    refs.analyticsBreakdownWrap.appendChild(list);
  }

  function refreshRangeFromSelect() {
    const next = Number(refs.analyticsRangeSelect.value);
    if (Number.isFinite(next) && next > 0) {
      localState.rangeDays = next;
    }
  }

  function render() {
    syncLabels();

    const snapshot = computeAnalytics(state, localState.rangeDays);
    renderKpis(snapshot);
    renderCharts(snapshot);
    renderBreakdown(snapshot);
  }

  function bindEvents() {
    if (localState.initialized) return;
    localState.initialized = true;

    refs.analyticsRangeSelect.addEventListener("change", () => {
      refreshRangeFromSelect();
      render();
    });

    refs.analyticsRefreshBtn.addEventListener("click", render);
  }

  function init() {
    bindEvents();
    render();
  }

  return {
    init,
    render
  };
}
