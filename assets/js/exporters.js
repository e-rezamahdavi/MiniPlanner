function downloadBlob(blob, filename) {
  const anchor = document.createElement("a");
  const href = URL.createObjectURL(blob);

  anchor.href = href;
  anchor.download = filename;
  anchor.click();

  setTimeout(() => URL.revokeObjectURL(href), 0);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(rows, filename) {
  const csvText = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function exportPlannerStateJson(state, filename = "mini-planner-v3.json") {
  const text = JSON.stringify(state, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  downloadBlob(blob, filename);
  return text;
}

export function parsePlannerImport(text) {
  return JSON.parse(String(text || ""));
}

export function exportWeekEventsCsv({ events, dayName, categoryLabel, language }) {
  const rows = [
    ["day", "time", "title", "category", "goal", "location", "note"]
  ];

  events.forEach((eventItem) => {
    rows.push([
      dayName(eventItem.day),
      `${eventItem.start}-${eventItem.end}`,
      eventItem.title,
      categoryLabel(eventItem.type),
      eventItem.goalLabel || "",
      eventItem.location || "",
      eventItem.note || ""
    ]);
  });

  downloadCsv(rows, `week-events-${language}.csv`);
}

export function exportWeekEventsTxt({
  events,
  dayName,
  categoryLabel,
  locale,
  language,
  labels = {}
}) {
  const title = labels.title || "Weekly Events";
  const generated = labels.generated || "Generated";
  const countLabel = labels.count || "Count";
  const emptyLabel = labels.empty || "No events";
  const goalLabel = labels.goal || "Goal";

  const lines = [];
  lines.push(title);
  lines.push(`${generated}: ${new Date().toLocaleString(locale)}`);
  lines.push(`${countLabel}: ${events.length}`);
  lines.push("--------------------------------");

  if (events.length === 0) {
    lines.push(emptyLabel);
  } else {
    events.forEach((eventItem, index) => {
      lines.push(
        `${index + 1}. ${dayName(eventItem.day)} | ${eventItem.start}-${eventItem.end} | ${categoryLabel(
          eventItem.type
        )} | ${eventItem.title}${eventItem.goalLabel ? ` | ${goalLabel}: ${eventItem.goalLabel}` : ""}`
      );
    });
  }

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `week-events-${language}.txt`);
}

export function exportWeekReportHtml({
  language,
  locale,
  labels = {},
  totalHours,
  totalHoursValue,
  categoryRows,
  titleRows
}) {
  const reportTitle = labels.reportTitle || "Weekly Report";
  const generatedLabel = labels.generated || "Generated";
  const totalHoursLabel = labels.totalHours || "Total Hours";
  const hoursLabel = labels.hours || "Hours";
  const categoryTitle = labels.categoryTitle || "By Category";
  const titleTitle = labels.titleTitle || "By Title";
  const noData = labels.noData || "No data";
  const direction = labels.direction || "ltr";

  const categoryData = Array.isArray(categoryRows) ? categoryRows : [];
  const titleData = Array.isArray(titleRows) ? titleRows : [];
  const numericTotalHours = Number.isFinite(Number(totalHoursValue))
    ? Number(totalHoursValue)
    : categoryData.reduce((sum, row) => sum + Number(row?.value || 0), 0);

  const getNumericHours = (row) => {
    const direct = Number(row?.value);
    if (Number.isFinite(direct)) return Math.max(0, direct);

    const text = String(row?.hours || "");
    const matched = text.match(/-?\d+(?:[.,]\d+)?/);
    if (!matched) return 0;
    return Math.max(0, Number(matched[0].replace(",", ".")) || 0);
  };

  const maxCategoryHours = Math.max(...categoryData.map(getNumericHours), 0, 1);
  const maxTitleHours = Math.max(...titleData.map(getNumericHours), 0, 1);

  const renderRows = (rows, maxHours, accentClass) =>
    rows.length
      ? rows
          .map((row) => {
            const hours = getNumericHours(row);
            const width = Math.max(4, (hours / maxHours) * 100);
            return `
            <li class="rank-item">
              <div class="rank-head">
                <strong>${escapeHtml(row.label)}</strong>
                <span>${escapeHtml(row.hours)} · ${escapeHtml(row.percent)}</span>
              </div>
              <div class="rank-bar">
                <span class="${accentClass}" style="width:${width.toFixed(2)}%"></span>
              </div>
            </li>`;
          })
          .join("")
      : `<li class="rank-empty">${escapeHtml(noData)}</li>`;

  const html = `<!doctype html>
<html lang="${escapeHtml(language || "en")}" dir="${escapeHtml(direction)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f6f8fa;
      --border-color: #d0d7de;
      --text-primary: #24292f;
      --text-secondary: #57606a;
      --accent: #0969da;
      --success: #2da44e;
      color-scheme: light;
    }
    body {
      margin: 0;
      font-family: "Vazirmatn", "Segoe UI", Tahoma, sans-serif;
      background: var(--bg-secondary);
      color: var(--text-primary);
      padding: 24px;
    }
    .wrap {
      max-width: 1040px;
      margin: 0 auto;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 24px;
    }
    h1, h2, p { margin: 0; }
    h1 {
      font-size: 20px;
      margin-bottom: 8px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .chip {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .hero {
      margin: 0 0 16px;
      display: grid;
      gap: 8px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-secondary);
      padding: 16px;
    }
    .hero p {
      color: var(--text-secondary);
      font-size: 13px;
    }
    .totals {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
    }
    .total-box {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-primary);
      padding: 8px;
    }
    .total-box span {
      display: block;
      color: var(--text-secondary);
      font-size: 12px;
      margin-bottom: 4px;
    }
    .total-box strong {
      font-size: 18px;
    }
    .grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
    .card {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px;
      background: var(--bg-primary);
    }
    .card h2 {
      font-size: 15px;
      margin-bottom: 8px;
    }
    .rank-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 8px;
    }
    .rank-item {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px;
      background: var(--bg-primary);
    }
    .rank-empty {
      border: 1px dashed var(--border-color);
      border-radius: 8px;
      padding: 16px;
      color: var(--text-secondary);
      text-align: center;
      background: var(--bg-secondary);
    }
    .rank-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .rank-head strong {
      font-size: 13px;
      font-weight: 600;
    }
    .rank-head span {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
    }
    .rank-bar {
      height: 8px;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      overflow: hidden;
    }
    .rank-bar > span {
      display: block;
      height: 100%;
      border-radius: inherit;
    }
    .c1 { background: var(--accent); }
    .c2 { background: var(--success); }
    @media (max-width: 760px) {
      body { padding: 10px; }
      .wrap { padding: 12px; border-radius: 12px; }
      h1 { font-size: 18px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>${escapeHtml(reportTitle)}</h1>
    <div class="meta">
      <span class="chip">${escapeHtml(generatedLabel)}: ${escapeHtml(new Date().toLocaleString(locale || "en-US"))}</span>
      <span class="chip">${escapeHtml(totalHoursLabel)}: ${escapeHtml(totalHours)}</span>
    </div>
    <section class="hero">
      <p>${escapeHtml(reportTitle)}</p>
      <div class="totals">
        <div class="total-box">
          <span>${escapeHtml(totalHoursLabel)}</span>
          <strong>${escapeHtml(totalHours)}</strong>
        </div>
        <div class="total-box">
          <span>${escapeHtml(totalHoursLabel)} (${escapeHtml(hoursLabel)})</span>
          <strong>${escapeHtml(numericTotalHours.toFixed(2))}</strong>
        </div>
        <div class="total-box">
          <span>${escapeHtml(labels.category || "Category")}</span>
          <strong>${escapeHtml(String(categoryData.length))}</strong>
        </div>
        <div class="total-box">
          <span>${escapeHtml(labels.title || "Title")}</span>
          <strong>${escapeHtml(String(titleData.length))}</strong>
        </div>
      </div>
    </section>
    <section class="grid">
      <article class="card">
        <h2>${escapeHtml(categoryTitle)}</h2>
        <ul class="rank-list">${renderRows(categoryData, maxCategoryHours, "c1")}</ul>
      </article>
      <article class="card">
        <h2>${escapeHtml(titleTitle)}</h2>
        <ul class="rank-list">${renderRows(titleData, maxTitleHours, "c2")}</ul>
      </article>
    </section>
  </main>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, `week-report-${language || "en"}.html`);
}

export function exportGoalsCsv({ goals, language }) {
  const rows = [["title", "status", "target", "current", "unit", "deadline"]];

  goals.forEach((goal) => {
    rows.push([
      goal.title,
      goal.status,
      goal.targetValue,
      goal.currentValue,
      goal.unit,
      goal.deadline || ""
    ]);
  });

  downloadCsv(rows, `goals-${language}.csv`);
}

export function exportHabitsCsv({ habits, logs, language }) {
  const rows = [["habit", "frequency", "target_per_period", "date", "value", "note"]];
  const habitMap = new Map(habits.map((item) => [item.id, item]));

  logs.forEach((log) => {
    const habit = habitMap.get(log.habitId);
    rows.push([
      habit?.title || log.habitId,
      habit?.frequency || "",
      habit?.targetPerPeriod || "",
      log.date,
      log.value,
      log.note || ""
    ]);
  });

  downloadCsv(rows, `habits-${language}.csv`);
}

export function exportFocusCsv({ sessions, language }) {
  const rows = [["mode", "planned_minutes", "actual_minutes", "started_at", "ended_at", "goal_id", "event_id", "note"]];

  sessions.forEach((session) => {
    rows.push([
      session.mode,
      session.plannedMinutes,
      session.actualMinutes,
      session.startedAt,
      session.endedAt,
      session.linkedGoalId || "",
      session.linkedEventId || "",
      session.note || ""
    ]);
  });

  downloadCsv(rows, `focus-sessions-${language}.csv`);
}
