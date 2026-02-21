import {
  APP_PAGES,
  SUPPORTED_PRINT_MODES,
  SUPPORTED_THEMES,
  calculateEventDurationMinutes,
  sortEvents
} from "./data.js";
import { createI18n } from "./i18n.js";
import {
  buildFallbackStateV3,
  loadStateV3,
  saveStateV3
} from "./storage.js";
import {
  applyPrintMode,
  applyTheme,
  clearMessage,
  createNode,
  getRefs,
  setActivePage,
  setActiveProjectTab,
  setDocumentMeta,
  setMessage,
  setSelectOptions
} from "./ui.js";
import {
  exportPlannerStateJson,
  parsePlannerImport
} from "./exporters.js";
import { createWeekTab } from "./tabs/week.js";

const refs = getRefs();

let state;
try {
  state = loadStateV3();
} catch {
  state = buildFallbackStateV3();
  saveStateV3(state);
}

const i18n = createI18n(state.settings.lang);

let currentPage = APP_PAGES.includes(state.settings.activePage)
  ? state.settings.activePage
  : "planner";
if (currentPage === "dashboard") currentPage = "planner";
let currentProjectTab = "overview";
let openMenuName = null;

const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");

function t(key, params = {}) {
  return i18n.t(key, params);
}

function resolveMessage(messageOrKey, params = {}) {
  if (typeof messageOrKey !== "string") return "";

  const maybe = t(messageOrKey, params);
  if (maybe !== messageOrKey) return maybe;

  if (Object.keys(params).length > 0) {
    return messageOrKey.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
  }

  return messageOrKey;
}

function notify(type, messageOrKey, params = {}) {
  setMessage(refs, resolveMessage(messageOrKey, params), type);
}

function notifySuccess(messageOrKey, params = {}) {
  notify("success", messageOrKey, params);
}

function notifyError(messageOrKey, params = {}) {
  notify("error", messageOrKey, params);
}

function notifyInfo(messageOrKey, params = {}) {
  notify("info", messageOrKey, params);
}

function persist() {
  saveStateV3(state);
}

function getCategoryById(categoryId) {
  return state.categories.find((item) => item.id === categoryId) || state.categories.find((item) => item.id === "other") || null;
}

function getCategoryLabel(categoryId) {
  if (categoryId === "class") return t("type.class");
  if (categoryId === "other") return t("type.other");
  return getCategoryById(categoryId)?.label || t("type.other");
}

function getCategoryIcon(categoryId) {
  return getCategoryById(categoryId)?.icon || "•";
}

function formatHours(minutes) {
  return `${(Number(minutes || 0) / 60).toFixed(1)} ${t("unit.hours")}`;
}

function setTheme(themePreference) {
  state.settings.theme = SUPPORTED_THEMES.includes(themePreference) ? themePreference : "system";
  persist();
  applyTheme(state.settings.theme);
  syncThemeSelection();
}

function applyUiState() {
  applyTheme(state.settings.theme);
  applyPrintMode(state.settings.printMode);
}

function syncThemeSelection() {
  const current = state.settings.theme;
  const map = {
    light: refs.themeLightBtn,
    dark: refs.themeDarkBtn,
    system: refs.themeSystemBtn
  };

  Object.entries(map).forEach(([key, button]) => {
    if (!button) return;
    button.setAttribute("aria-checked", key === current ? "true" : "false");
  });
}

function updateNotificationBadge() {
  if (!refs.notifyBadge) return;
  const count = Math.max(0, state.events.length);
  refs.notifyBadge.textContent = String(count > 99 ? "99+" : count);
}

function renderDocumentMeta() {
  const localeDir = i18n.getDirection();
  setDocumentMeta({
    lang: state.settings.lang,
    dir: "ltr",
    title: t("app.title")
  });
  document.body.dataset.localeDir = localeDir;
}

function renderGlobalLabels() {
  renderDocumentMeta();

  refs.appTitle.textContent = t("app.title");
  refs.appSubtitle.textContent = t("app.subtitle");

  refs.searchLabel.textContent = t("header.searchAria");
  refs.globalSearchInput.placeholder = t("header.searchPlaceholder");

  refs.topNavDashboard.textContent = t("nav.dashboard");
  refs.topNavPlanner.textContent = t("nav.planner");
  refs.topNavProject.textContent = t("nav.project");
  refs.topNavSettings.textContent = t("nav.settings");

  if (refs.sideNavDashboard) refs.sideNavDashboard.textContent = t("nav.dashboard");
  if (refs.sideNavPlanner) refs.sideNavPlanner.textContent = t("nav.planner");
  if (refs.sideNavProject) refs.sideNavProject.textContent = t("nav.project");
  if (refs.sideNavSettings) refs.sideNavSettings.textContent = t("nav.settings");

  refs.notificationsBtn.setAttribute("aria-label", t("header.notifications"));

  refs.createMenuBtn.textContent = t("header.create");
  refs.createMenuBtn.setAttribute("aria-label", t("header.create"));
  refs.createNewTaskBtn.textContent = t("create.newTask");
  refs.createNewProjectBtn.textContent = t("create.newProject");
  refs.createNewNoteBtn.textContent = t("create.newNote");
  refs.createImportBtn.textContent = t("create.import");

  refs.userMenuBtn.setAttribute("aria-label", t("menu.profile"));
  refs.userSignedInLabel.textContent = t("menu.signedInAs");
  refs.menuThemeLabel.textContent = t("menu.theme");
  refs.userProfileBtn.textContent = t("menu.profile");
  refs.userSettingsBtn.textContent = t("menu.settings");
  refs.themeLightBtn.textContent = t("option.themeLight");
  refs.themeDarkBtn.textContent = t("option.themeDark");
  refs.themeSystemBtn.textContent = t("option.themeSystem");
  refs.userHelpBtn.textContent = t("menu.help");
  refs.userSignOutBtn.textContent = t("menu.signOut");

  refs.dashboardHeading.textContent = t("dashboard.heading");
  refs.dashboardTotalEventsLabel.textContent = t("dashboard.totalEvents");
  refs.dashboardTotalHoursLabel.textContent = t("dashboard.totalHours");
  refs.dashboardTotalCategoriesLabel.textContent = t("dashboard.totalCategories");
  refs.dashboardUpcomingHeading.textContent = t("dashboard.upcoming");

  refs.projectHeading.textContent = t("project.heading");
  refs.projectSubtitle.textContent = t("project.subtitle");
  refs.projectTabOverview.textContent = t("project.tab.overview");
  refs.projectTabActivity.textContent = t("project.tab.activity");
  refs.projectTabSettings.textContent = t("project.tab.settings");
  refs.projectOverviewHeading.textContent = t("project.overviewSummary");
  refs.projectActivityHeading.textContent = t("project.activityTitle");
  refs.projectSettingsHeading.textContent = t("project.settingsTitle");
  refs.projectOpenPlannerBtn.textContent = t("nav.planner");
  refs.projectOpenSettingsBtn.textContent = t("nav.settings");

  refs.settingsHeading.textContent = t("settings.heading");
  refs.settingsSubtitle.textContent = t("settings.subtitle");

  refs.languageLabel.textContent = t("label.language");
  refs.themeLabel.textContent = t("label.theme");
  refs.printModeLabel.textContent = t("label.printMode");
  refs.backupHeading.textContent = t("label.backup");

  refs.globalExportJsonBtn.textContent = t("btn.exportJson");
  refs.globalImportJsonBtn.textContent = t("btn.importJson");
  refs.globalImportFromBoxBtn.textContent = t("btn.importFromBox");
  refs.globalCopyJsonBtn.textContent = t("btn.copyJson");
  refs.clearMessageBtn.textContent = t("btn.clearMessage");
}

function syncGlobalSelects() {
  setSelectOptions(
    refs.langSelect,
    i18n.getSupportedLanguages().map((langCode) => ({
      value: langCode,
      label: t(`lang.${langCode}`)
    })),
    state.settings.lang
  );

  setSelectOptions(
    refs.themeSelect,
    [
      { value: "light", label: t("option.themeLight") },
      { value: "dark", label: t("option.themeDark") },
      { value: "system", label: t("option.themeSystem") }
    ],
    state.settings.theme
  );

  setSelectOptions(
    refs.printModeSelect,
    [
      { value: "table-only", label: t("option.printTableOnly") },
      { value: "list-only", label: t("option.printListOnly") },
      { value: "table-and-list", label: t("option.printTableAndList") }
    ],
    state.settings.printMode
  );

  syncThemeSelection();
}

function renderDashboardUpcoming() {
  refs.dashboardUpcomingWrap.innerHTML = "";

  const events = sortEvents(state.events).slice(0, 10);
  if (!events.length) {
    const empty = createNode("div", "empty-state", t("dashboard.emptyUpcoming"));
    refs.dashboardUpcomingWrap.appendChild(empty);
    return;
  }

  const table = createNode("table", "event-table");
  const thead = createNode("thead");
  const trh = createNode("tr");

  [t("table.day"), t("table.time"), t("table.title"), t("table.category"), t("table.hours")].forEach((label) => {
    const th = createNode("th", "", label);
    trh.appendChild(th);
  });

  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = createNode("tbody");
  const dayNames = i18n.getDayNames();

  events.forEach((eventItem) => {
    const tr = createNode("tr");

    const dayCell = createNode("td");
    dayCell.dataset.label = t("table.day");
    dayCell.textContent = dayNames[eventItem.day] || "";
    tr.appendChild(dayCell);

    const timeCell = createNode("td");
    timeCell.dataset.label = t("table.time");
    timeCell.textContent = `${eventItem.start}-${eventItem.end}`;
    tr.appendChild(timeCell);

    const titleCell = createNode("td");
    titleCell.dataset.label = t("table.title");
    titleCell.textContent = eventItem.title;
    tr.appendChild(titleCell);

    const categoryCell = createNode("td");
    categoryCell.dataset.label = t("table.category");
    categoryCell.textContent = `${getCategoryIcon(eventItem.type)} ${getCategoryLabel(eventItem.type)}`;
    tr.appendChild(categoryCell);

    const hourCell = createNode("td");
    hourCell.dataset.label = t("table.hours");
    hourCell.textContent = formatHours(calculateEventDurationMinutes(eventItem));
    tr.appendChild(hourCell);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  refs.dashboardUpcomingWrap.appendChild(table);
}

function renderDashboard() {
  const totalMinutes = state.events.reduce((sum, eventItem) => sum + calculateEventDurationMinutes(eventItem), 0);

  refs.dashboardTotalEventsValue.textContent = String(state.events.length);
  refs.dashboardTotalHoursValue.textContent = formatHours(totalMinutes);
  refs.dashboardTotalCategoriesValue.textContent = String(state.categories.length);

  renderDashboardUpcoming();
}

function renderProjectOverview() {
  refs.projectCategoryBars.innerHTML = "";

  const totalMinutes = state.events.reduce((sum, eventItem) => sum + calculateEventDurationMinutes(eventItem), 0);
  refs.projectOverviewSummary.textContent = t("project.overviewText", {
    count: state.events.length,
    duration: formatHours(totalMinutes)
  });

  const categoryMap = new Map();
  state.events.forEach((eventItem) => {
    const key = eventItem.type;
    const minutes = calculateEventDurationMinutes(eventItem);
    categoryMap.set(key, (categoryMap.get(key) || 0) + minutes);
  });

  const rows = [...categoryMap.entries()]
    .map(([categoryId, minutes]) => ({
      label: `${getCategoryIcon(categoryId)} ${getCategoryLabel(categoryId)}`,
      minutes
    }))
    .sort((a, b) => b.minutes - a.minutes);

  if (!rows.length) {
    refs.projectCategoryBars.appendChild(createNode("div", "empty-state", t("msg.noResults")));
    return;
  }

  const maxMinutes = Math.max(...rows.map((row) => row.minutes), 1);

  rows.forEach((row) => {
    const wrapper = createNode("div", "stack-row");

    const head = createNode("div", "stack-head");
    const label = createNode("strong", "", row.label);
    const value = createNode("span", "", formatHours(row.minutes));
    head.appendChild(label);
    head.appendChild(value);

    const track = createNode("div", "stack-track");
    const bar = createNode("span", "stack-bar");
    bar.style.width = `${Math.max(4, (row.minutes / maxMinutes) * 100)}%`;
    track.appendChild(bar);

    wrapper.appendChild(head);
    wrapper.appendChild(track);

    refs.projectCategoryBars.appendChild(wrapper);
  });
}

function renderProjectActivity() {
  refs.projectActivityWrap.innerHTML = "";

  const list = sortEvents(state.events).slice(-20).reverse();
  if (!list.length) {
    refs.projectActivityWrap.appendChild(createNode("div", "empty-state", t("project.emptyActivity")));
    return;
  }

  const ul = createNode("ul", "stack-list");
  const dayNames = i18n.getDayNames();

  list.forEach((eventItem) => {
    const li = createNode("li", "stack-row");

    const head = createNode("div", "stack-head");
    const title = createNode("strong", "", eventItem.title);
    const time = createNode("span", "", `${dayNames[eventItem.day] || ""} · ${eventItem.start}-${eventItem.end}`);
    head.appendChild(title);
    head.appendChild(time);

    const meta = createNode(
      "p",
      "topic-summary",
      `${getCategoryIcon(eventItem.type)} ${getCategoryLabel(eventItem.type)} · ${formatHours(calculateEventDurationMinutes(eventItem))}`
    );

    li.appendChild(head);
    li.appendChild(meta);
    ul.appendChild(li);
  });

  refs.projectActivityWrap.appendChild(ul);
}

function renderProject() {
  renderProjectOverview();
  renderProjectActivity();
}

function renderAll() {
  renderGlobalLabels();
  syncGlobalSelects();
  applyUiState();
  updateNotificationBadge();
  renderDashboard();
  renderProject();
  weekTab.render();
  setActivePage(refs, currentPage);
  setActiveProjectTab(refs, currentProjectTab);
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  if (refs.sidebarBackdrop) refs.sidebarBackdrop.hidden = true;
  refs.mobileNavToggle?.setAttribute("aria-expanded", "false");
}

function openSidebar() {
  document.body.classList.add("sidebar-open");
  if (refs.sidebarBackdrop) refs.sidebarBackdrop.hidden = false;
  refs.mobileNavToggle?.setAttribute("aria-expanded", "true");
}

function toggleSidebar() {
  if (document.body.classList.contains("sidebar-open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function getMenuMeta(menuName) {
  if (menuName === "create") {
    return { button: refs.createMenuBtn, menu: refs.createMenu };
  }

  if (menuName === "user") {
    return { button: refs.userMenuBtn, menu: refs.userMenu };
  }

  return null;
}

function closeOpenMenu() {
  if (!openMenuName) return;
  const meta = getMenuMeta(openMenuName);
  if (meta) {
    meta.menu.style.removeProperty("transform");
    meta.menu.hidden = true;
    meta.button.setAttribute("aria-expanded", "false");
  }
  openMenuName = null;
}

function clampMenuToViewport(menu) {
  if (!menu || menu.hidden) return;

  menu.style.removeProperty("transform");

  const margin = 8;
  const rect = menu.getBoundingClientRect();
  let offsetX = 0;

  if (rect.right > window.innerWidth - margin) {
    offsetX -= rect.right - (window.innerWidth - margin);
  }

  if (rect.left < margin) {
    offsetX += margin - rect.left;
  }

  if (offsetX !== 0) {
    menu.style.transform = `translateX(${Math.round(offsetX)}px)`;
  }
}

function openMenu(menuName) {
  const meta = getMenuMeta(menuName);
  if (!meta) return;

  if (openMenuName && openMenuName !== menuName) {
    closeOpenMenu();
  }

  meta.menu.hidden = false;
  meta.button.setAttribute("aria-expanded", "true");
  openMenuName = menuName;

  window.requestAnimationFrame(() => clampMenuToViewport(meta.menu));
}

function toggleMenu(menuName) {
  if (openMenuName === menuName) {
    closeOpenMenu();
  } else {
    openMenu(menuName);
  }
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function switchPage(nextPage, persistSelection = true) {
  const mergedPage = nextPage === "dashboard" ? "planner" : nextPage;
  const page = APP_PAGES.includes(mergedPage) ? mergedPage : "planner";
  currentPage = page;

  setActivePage(refs, currentPage);

  if (persistSelection) {
    state.settings.activePage = page;
    persist();
  }

  closeSidebar();
  closeOpenMenu();
}

function switchProjectTab(nextTab) {
  const allowed = new Set(["overview", "activity", "settings"]);
  currentProjectTab = allowed.has(nextTab) ? nextTab : "overview";
  setActiveProjectTab(refs, currentProjectTab);
}

function handleCreateAction(action) {
  if (action === "new-task") {
    switchPage("planner", true);
    refs.weekTitleInput.focus();
    return;
  }

  if (action === "new-project") {
    switchPage("project", true);
    switchProjectTab("overview");
    return;
  }

  if (action === "new-note") {
    switchPage("planner", true);
    notifyInfo("msg.saved");
    return;
  }

  if (action === "import") {
    refs.globalImportFileInput.click();
  }
}

function handleUserAction(action) {
  if (action === "profile") {
    switchPage("planner", true);
    return;
  }

  if (action === "settings") {
    switchPage("settings", true);
    return;
  }

  if (action === "help") {
    notifyInfo("msg.helpInfo");
    return;
  }

  if (action === "signout") {
    notifyInfo("msg.signoutInfo");
  }
}

function importIntoState(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error(t("err.invalidJson"));
  }

  let nextState;

  if (Array.isArray(payload)) {
    nextState = {
      ...state,
      events: payload,
      version: state.version
    };
  } else if (payload.state && typeof payload.state === "object") {
    nextState = payload.state;
  } else {
    nextState = {
      ...state,
      ...payload
    };
  }

  saveStateV3(nextState);
  state = loadStateV3();

  actions.state = state;
  weekTab = createWeekTab({ refs, state, actions, i18n });
  weekTab.init();

  renderAll();
}

function bindMenuKeyboard(menuName, menuElement) {
  menuElement.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeOpenMenu();
      getMenuMeta(menuName)?.button.focus();
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const items = [...menuElement.querySelectorAll("button[role^='menuitem']")].filter((item) => !item.disabled);
    if (!items.length) return;

    const currentIndex = items.findIndex((item) => item === document.activeElement);
    if (currentIndex === -1) {
      items[0].focus();
      event.preventDefault();
      return;
    }

    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + delta + items.length) % items.length;
    items[nextIndex].focus();
    event.preventDefault();
  });
}

function bindGlobalEvents() {
  refs.mobileNavToggle?.addEventListener("click", toggleSidebar);
  refs.sidebarBackdrop?.addEventListener("click", closeSidebar);

  refs.pageLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const page = link.dataset.pageLink;
      if (page) switchPage(page, true);
    });
  });

  refs.projectTabOverview.addEventListener("click", () => switchProjectTab("overview"));
  refs.projectTabActivity.addEventListener("click", () => switchProjectTab("activity"));
  refs.projectTabSettings.addEventListener("click", () => switchProjectTab("settings"));

  refs.projectOpenPlannerBtn.addEventListener("click", () => switchPage("planner", true));
  refs.projectOpenSettingsBtn.addEventListener("click", () => switchPage("settings", true));

  refs.createMenuBtn.addEventListener("click", () => toggleMenu("create"));
  refs.userMenuBtn.addEventListener("click", () => toggleMenu("user"));

  bindMenuKeyboard("create", refs.createMenu);
  bindMenuKeyboard("user", refs.userMenu);

  refs.createMenu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-create-action]");
    if (!button) return;
    handleCreateAction(button.dataset.createAction);
    closeOpenMenu();
  });

  refs.userMenu.addEventListener("click", (event) => {
    const themeButton = event.target.closest("button[data-theme-choice]");
    if (themeButton) {
      setTheme(themeButton.dataset.themeChoice);
      closeOpenMenu();
      return;
    }

    const actionButton = event.target.closest("button[data-user-action]");
    if (!actionButton) return;
    handleUserAction(actionButton.dataset.userAction);
    closeOpenMenu();
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;

    const insideCreate = refs.createMenuBtn.contains(target) || refs.createMenu.contains(target);
    const insideUser = refs.userMenuBtn.contains(target) || refs.userMenu.contains(target);

    if (!insideCreate && openMenuName === "create") {
      closeOpenMenu();
    }

    if (!insideUser && openMenuName === "user") {
      closeOpenMenu();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeOpenMenu();
      closeSidebar();
      return;
    }

    if (
      event.key === "/" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !isTypingTarget(event.target)
    ) {
      event.preventDefault();
      refs.globalSearchInput.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 1021px)").matches) {
      closeSidebar();
    }

    if (openMenuName) {
      const meta = getMenuMeta(openMenuName);
      if (meta) clampMenuToViewport(meta.menu);
    }
  });

  themeMedia.addEventListener("change", () => {
    if (state.settings.theme === "system") {
      applyTheme("system");
    }
  });

  refs.globalSearchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    const query = refs.globalSearchInput.value.trim();
    if (!query) return;

    switchPage("planner", true);
    refs.weekSearchInput.value = query;
    weekTab.refreshFilters();
    notifyInfo("msg.searchApplied", { query });
  });

  refs.langSelect.addEventListener("change", () => {
    state.settings.lang = i18n.setLanguage(refs.langSelect.value);
    persist();
    renderAll();
  });

  refs.themeSelect.addEventListener("change", () => {
    setTheme(refs.themeSelect.value);
    syncGlobalSelects();
  });

  refs.printModeSelect.addEventListener("change", () => {
    const selected = refs.printModeSelect.value;
    state.settings.printMode = SUPPORTED_PRINT_MODES.includes(selected) ? selected : "table-only";
    persist();
    applyPrintMode(state.settings.printMode);
  });

  refs.globalExportJsonBtn.addEventListener("click", () => {
    const text = exportPlannerStateJson(state);
    refs.globalJsonBox.value = text;
    notifySuccess("msg.exportDone");
  });

  refs.globalImportJsonBtn.addEventListener("click", () => {
    refs.globalImportFileInput.click();
  });

  refs.globalImportFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parsePlannerImport(text);
      importIntoState(parsed);
      notifySuccess("msg.importDone");
    } catch (error) {
      notifyError("err.importFailed", { reason: error.message || String(error) });
    } finally {
      event.target.value = "";
    }
  });

  refs.globalImportFromBoxBtn.addEventListener("click", () => {
    const text = refs.globalJsonBox.value.trim();
    if (!text) {
      notifyError("err.jsonEmpty");
      return;
    }

    try {
      const parsed = parsePlannerImport(text);
      importIntoState(parsed);
      notifySuccess("msg.importDone");
    } catch (error) {
      notifyError("err.importFailed", { reason: error.message || String(error) });
    }
  });

  refs.globalCopyJsonBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(refs.globalJsonBox.value || "");
      notifySuccess("msg.copyDone");
    } catch {
      notifyError("err.copyFailed");
    }
  });

  refs.clearMessageBtn.addEventListener("click", () => clearMessage(refs));
}

const actions = {
  t,
  i18n,
  state,
  persist,
  notifySuccess,
  notifyError,
  notifyInfo,
  saveAndRender(messageOrKey, params = {}, type = "success") {
    persist();
    renderAll();
    if (messageOrKey) {
      if (type === "error") notifyError(messageOrKey, params);
      else if (type === "info") notifyInfo(messageOrKey, params);
      else notifySuccess(messageOrKey, params);
    }
  }
};

let weekTab = createWeekTab({ refs, state, actions, i18n });

function init() {
  i18n.setLanguage(state.settings.lang);
  applyUiState();
  if (state.settings.activePage !== currentPage) {
    state.settings.activePage = currentPage;
    persist();
  }
  bindGlobalEvents();
  weekTab.init();
  renderAll();
  switchPage(currentPage, false);
  clearMessage(refs);
  window.requestAnimationFrame(() => {
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  });
}

init();
