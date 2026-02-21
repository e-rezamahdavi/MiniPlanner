import { END_HOUR, SUPPORTED_THEMES } from "./data.js";

function byId(id) {
  return document.getElementById(id);
}

function queryAll(selector) {
  return [...document.querySelectorAll(selector)];
}

function resolveTheme(theme) {
  const preference = SUPPORTED_THEMES.includes(theme) ? theme : "system";
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return preference;
}

export function getRefs() {
  return {
    body: document.body,

    logoLink: byId("logoLink"),
    appTitle: byId("appTitle"),
    appSubtitle: byId("appSubtitle"),

    mobileNavToggle: byId("mobileNavToggle"),
    sidebarBackdrop: byId("sidebarBackdrop"),
    appSidebar: byId("appSidebar"),

    globalSearchInput: byId("globalSearchInput"),
    searchLabel: byId("searchLabel"),

    notificationsBtn: byId("notificationsBtn"),
    notifyBadge: byId("notifyBadge"),

    createMenuBtn: byId("createMenuBtn"),
    createMenu: byId("createMenu"),
    createNewTaskBtn: byId("createNewTaskBtn"),
    createNewProjectBtn: byId("createNewProjectBtn"),
    createNewNoteBtn: byId("createNewNoteBtn"),
    createImportBtn: byId("createImportBtn"),

    userMenuBtn: byId("userMenuBtn"),
    userMenu: byId("userMenu"),
    userSignedInLabel: byId("userSignedInLabel"),
    userIdentityLabel: byId("userIdentityLabel"),
    menuThemeLabel: byId("menuThemeLabel"),
    userProfileBtn: byId("userProfileBtn"),
    userSettingsBtn: byId("userSettingsBtn"),
    themeLightBtn: byId("themeLightBtn"),
    themeDarkBtn: byId("themeDarkBtn"),
    themeSystemBtn: byId("themeSystemBtn"),
    userHelpBtn: byId("userHelpBtn"),
    userSignOutBtn: byId("userSignOutBtn"),

    topNavDashboard: byId("topNavDashboard"),
    topNavPlanner: byId("topNavPlanner"),
    topNavProject: byId("topNavProject"),
    topNavSettings: byId("topNavSettings"),

    sideNavDashboard: byId("sideNavDashboard"),
    sideNavPlanner: byId("sideNavPlanner"),
    sideNavProject: byId("sideNavProject"),
    sideNavSettings: byId("sideNavSettings"),

    pageDashboard: byId("pageDashboard"),
    pagePlanner: byId("pagePlanner"),
    pageProject: byId("pageProject"),
    pageSettings: byId("pageSettings"),
    pageLinks: queryAll("[data-page-link]"),
    pages: queryAll("[data-page]"),

    message: byId("message"),

    dashboardHeading: byId("dashboardHeading"),
    dashboardTotalEventsLabel: byId("dashboardTotalEventsLabel"),
    dashboardTotalEventsValue: byId("dashboardTotalEventsValue"),
    dashboardTotalHoursLabel: byId("dashboardTotalHoursLabel"),
    dashboardTotalHoursValue: byId("dashboardTotalHoursValue"),
    dashboardTotalCategoriesLabel: byId("dashboardTotalCategoriesLabel"),
    dashboardTotalCategoriesValue: byId("dashboardTotalCategoriesValue"),
    dashboardUpcomingHeading: byId("dashboardUpcomingHeading"),
    dashboardUpcomingWrap: byId("dashboardUpcomingWrap"),

    projectHeading: byId("projectHeading"),
    projectSubtitle: byId("projectSubtitle"),
    projectTabOverview: byId("projectTabOverview"),
    projectTabActivity: byId("projectTabActivity"),
    projectTabSettings: byId("projectTabSettings"),
    projectPanelOverview: byId("projectPanelOverview"),
    projectPanelActivity: byId("projectPanelActivity"),
    projectPanelSettings: byId("projectPanelSettings"),
    projectOverviewHeading: byId("projectOverviewHeading"),
    projectOverviewSummary: byId("projectOverviewSummary"),
    projectCategoryBars: byId("projectCategoryBars"),
    projectActivityHeading: byId("projectActivityHeading"),
    projectActivityWrap: byId("projectActivityWrap"),
    projectSettingsHeading: byId("projectSettingsHeading"),
    projectOpenPlannerBtn: byId("projectOpenPlannerBtn"),
    projectOpenSettingsBtn: byId("projectOpenSettingsBtn"),

    settingsHeading: byId("settingsHeading"),
    settingsSubtitle: byId("settingsSubtitle"),

    languageLabel: byId("languageLabel"),
    themeLabel: byId("themeLabel"),
    printModeLabel: byId("printModeLabel"),
    backupHeading: byId("backupHeading"),

    langSelect: byId("langSelect"),
    themeSelect: byId("themeSelect"),
    printModeSelect: byId("printModeSelect"),

    globalExportJsonBtn: byId("globalExportJsonBtn"),
    globalImportJsonBtn: byId("globalImportJsonBtn"),
    globalImportFileInput: byId("globalImportFileInput"),
    globalImportFromBoxBtn: byId("globalImportFromBoxBtn"),
    globalCopyJsonBtn: byId("globalCopyJsonBtn"),
    globalJsonBox: byId("globalJsonBox"),
    clearMessageBtn: byId("clearMessageBtn"),

    weekHeading: byId("weekHeading"),
    weekFormHeading: byId("weekFormHeading"),
    weekFiltersHeading: byId("weekFiltersHeading"),
    weekTableHeading: byId("weekTableHeading"),
    weekListHeading: byId("weekListHeading"),
    weekCategoryHeading: byId("weekCategoryHeading"),

    weekTitleLabel: byId("weekTitleLabel"),
    weekTypeLabel: byId("weekTypeLabel"),
    weekGoalLabel: byId("weekGoalLabel"),
    weekDayLabel: byId("weekDayLabel"),
    weekStartLabel: byId("weekStartLabel"),
    weekEndLabel: byId("weekEndLabel"),
    weekLocationLabel: byId("weekLocationLabel"),
    weekNoteLabel: byId("weekNoteLabel"),

    weekTitleInput: byId("weekTitleInput"),
    weekTitleSuggestions: byId("weekTitleSuggestions"),
    weekTypeSelect: byId("weekTypeSelect"),
    weekGoalSelect: byId("weekGoalSelect"),
    weekDaySelect: byId("weekDaySelect"),
    weekStartSelect: byId("weekStartSelect"),
    weekEndSelect: byId("weekEndSelect"),
    weekLocationInput: byId("weekLocationInput"),
    weekNoteInput: byId("weekNoteInput"),

    weekAddBtn: byId("weekAddBtn"),
    weekCancelBtn: byId("weekCancelBtn"),
    weekPrintBtn: byId("weekPrintBtn"),
    weekExportCsvBtn: byId("weekExportCsvBtn"),
    weekExportTxtBtn: byId("weekExportTxtBtn"),
    weekExportReportBtn: byId("weekExportReportBtn"),
    weekDeleteAllBtn: byId("weekDeleteAllBtn"),

    weekSearchLabel: byId("weekSearchLabel"),
    weekSearchInput: byId("weekSearchInput"),
    weekFilterTypeLabel: byId("weekFilterTypeLabel"),
    weekFilterTypeSelect: byId("weekFilterTypeSelect"),
    weekFilterDayLabel: byId("weekFilterDayLabel"),
    weekFilterDaySelect: byId("weekFilterDaySelect"),
    weekClearFiltersBtn: byId("weekClearFiltersBtn"),

    weekCategoryLabel: byId("weekCategoryLabel"),
    weekCategoryInput: byId("weekCategoryInput"),
    weekCategoryIconLabel: byId("weekCategoryIconLabel"),
    weekCategoryIconInput: byId("weekCategoryIconInput"),
    weekCategoryColorLabel: byId("weekCategoryColorLabel"),
    weekCategoryColorInput: byId("weekCategoryColorInput"),
    weekAddCategoryBtn: byId("weekAddCategoryBtn"),
    weekRemoveCategoryBtn: byId("weekRemoveCategoryBtn"),
    weekCategoryHint: byId("weekCategoryHint"),

    weekStatsBar: byId("weekStatsBar"),
    weekTimetableWrap: byId("weekTimetableWrap"),
    weekReportHeading: byId("weekReportHeading"),
    weekReportTotals: byId("weekReportTotals"),
    weekCategoryChartHeading: byId("weekCategoryChartHeading"),
    weekCategorySummary: byId("weekCategorySummary"),
    weekCategoryChartWrap: byId("weekCategoryChartWrap"),
    weekCategoryDetailsWrap: byId("weekCategoryDetailsWrap"),
    weekTopicHeading: byId("weekTopicHeading"),
    weekTopicQueryLabel: byId("weekTopicQueryLabel"),
    weekTopicQueryInput: byId("weekTopicQueryInput"),
    weekTopicSummary: byId("weekTopicSummary"),
    weekTopicChartWrap: byId("weekTopicChartWrap"),
    weekTopicDetailsWrap: byId("weekTopicDetailsWrap"),
    weekEventsListWrap: byId("weekEventsListWrap"),
    weekPrintListSection: byId("weekPrintListSection")
  };
}

export function setDocumentMeta({ lang, dir, title }) {
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.title = title;
}

export function applyTheme(themePreference) {
  const preference = SUPPORTED_THEMES.includes(themePreference) ? themePreference : "system";
  const resolved = resolveTheme(preference);

  document.body.dataset.themePreference = preference;
  document.body.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;

  return resolved;
}

export function applyPrintMode(mode) {
  document.body.dataset.printMode = mode;
}

export function setSelectOptions(select, options, selectedValue) {
  if (!select) return;

  const previous = typeof selectedValue === "undefined" ? select.value : selectedValue;
  select.innerHTML = "";

  options.forEach((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    select.appendChild(node);
  });

  const candidate = String(previous ?? "");
  const exists = [...select.options].some((opt) => opt.value === candidate);
  if (exists) select.value = candidate;
}

export function populateTimeSelects(startSelect, endSelect, startHour, endHour, values = {}) {
  const startOptions = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    startOptions.push({ value: `${String(hour).padStart(2, "0")}:00`, label: `${String(hour).padStart(2, "0")}:00` });
    startOptions.push({ value: `${String(hour).padStart(2, "0")}:30`, label: `${String(hour).padStart(2, "0")}:30` });
  }

  const endOptions = [...startOptions, { value: `${String(END_HOUR).padStart(2, "0")}:00`, label: `${String(END_HOUR).padStart(2, "0")}:00` }];
  setSelectOptions(startSelect, startOptions, values.start);
  setSelectOptions(endSelect, endOptions, values.end);
}

export function populateDaySelect(select, dayNames, options = {}) {
  const includeAll = Boolean(options.includeAll);
  const allLabel = options.allLabel || "All";

  const items = [];
  if (includeAll) items.push({ value: "all", label: allLabel });

  dayNames.forEach((day, index) => {
    items.push({ value: String(index), label: day });
  });

  setSelectOptions(select, items, options.selectedValue);
}

export function populateCategorySelect(select, categories, options = {}) {
  const includeAll = Boolean(options.includeAll);
  const allLabel = options.allLabel || "All";
  const resolveLabel = options.resolveLabel || ((item) => item.label);

  const items = [];
  if (includeAll) items.push({ value: "all", label: allLabel });

  categories.forEach((category) => {
    items.push({
      value: category.id,
      label: `${category.icon} ${resolveLabel(category)}`
    });
  });

  setSelectOptions(select, items, options.selectedValue);
}

export function populateGoalSelect(select, goals, options = {}) {
  const includeNone = Boolean(options.includeNone);
  const noneLabel = options.noneLabel || "No goal";

  const items = [];
  if (includeNone) items.push({ value: "", label: noneLabel });

  goals.forEach((goal) => {
    items.push({ value: goal.id, label: goal.title });
  });

  setSelectOptions(select, items, options.selectedValue);
}

export function setMessage(refs, text, type = "error") {
  if (!refs.message) return;

  refs.message.textContent = text;
  refs.message.classList.remove("is-error", "is-success", "is-muted", "is-info");

  if (!text) {
    refs.message.classList.add("is-muted");
    return;
  }

  if (type === "success") {
    refs.message.classList.add("is-success");
    return;
  }

  if (type === "info") {
    refs.message.classList.add("is-info");
    return;
  }

  refs.message.classList.add("is-error");
}

export function clearMessage(refs) {
  setMessage(refs, "", "error");
}

export function setActivePage(refs, activePage) {
  refs.pages.forEach((page) => {
    const isActive = page.dataset.page === activePage;
    page.hidden = !isActive;
    page.classList.toggle("is-active", isActive);
  });

  refs.pageLinks.forEach((link) => {
    const isActive = link.dataset.pageLink === activePage;
    link.classList.toggle("is-active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

export function setActiveProjectTab(refs, activeTab) {
  const tabs = [
    { button: refs.projectTabOverview, panel: refs.projectPanelOverview, id: "overview" },
    { button: refs.projectTabActivity, panel: refs.projectPanelActivity, id: "activity" },
    { button: refs.projectTabSettings, panel: refs.projectPanelSettings, id: "settings" }
  ];

  tabs.forEach((tab) => {
    const isActive = tab.id === activeTab;
    tab.button?.classList.toggle("is-active", isActive);
    tab.button?.setAttribute("aria-selected", isActive ? "true" : "false");
    if (tab.panel) tab.panel.hidden = !isActive;
  });
}

export function createNode(tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (typeof text === "string" && text.length > 0) {
    node.textContent = text;
  }
  return node;
}
