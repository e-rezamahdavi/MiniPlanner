function createSvg(width, height) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", String(height));
  svg.classList.add("chart-svg");
  return svg;
}

function safeMax(values) {
  const max = Math.max(...values, 0);
  return max <= 0 ? 1 : max;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cutLabel(text, maxLength) {
  const value = String(text || "");
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 1))}…`;
}

export function renderBarChart(container, items, options = {}) {
  if (!container) return;
  container.innerHTML = "";

  const color = options.color || "#0ea5e9";
  const trackColor = options.trackColor || "rgba(148, 163, 184, 0.24)";
  const labelMaxLength = Number.isFinite(Number(options.labelMaxLength)) ? Number(options.labelMaxLength) : 28;
  const valueFormatter =
    typeof options.valueFormatter === "function"
      ? options.valueFormatter
      : (value) => String(Number(value || 0).toFixed(1));
  const axisFormatter =
    typeof options.axisFormatter === "function"
      ? options.axisFormatter
      : valueFormatter;
  const labelValueFormatter =
    typeof options.labelValueFormatter === "function"
      ? options.labelValueFormatter
      : valueFormatter;
  const showPercent = options.showPercent !== false;
  const showSummary = options.showSummary !== false;
  const showScale = options.showScale !== false;
  const summaryTotalLabel = String(options.summaryTotalLabel || "Total");
  const summaryMaxLabel = String(options.summaryMaxLabel || "Max");
  const maxItems = Number.isFinite(Number(options.maxItems)) ? Math.max(1, Number(options.maxItems)) : 12;

  if (!Array.isArray(items) || items.length === 0) {
    container.textContent = options.emptyText || "No data";
    container.classList.add("chart-empty");
    return;
  }

  container.classList.remove("chart-empty");

  const rows = items
    .slice(0, maxItems)
    .map((item) => ({
      label: String(item.label || ""),
      value: Number(item.value || 0)
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!rows.length) {
    container.textContent = options.emptyText || "No data";
    container.classList.add("chart-empty");
    return;
  }

  const maxValue = safeMax(rows.map((item) => item.value));
  const sumValue = Number.isFinite(Number(options.totalValue))
    ? Number(options.totalValue)
    : rows.reduce((sum, item) => sum + item.value, 0);
  const chart = document.createElement("section");
  chart.className = "chart-v3";
  chart.style.setProperty("--chart-accent", color);
  chart.style.setProperty("--chart-track", trackColor);

  if (showSummary) {
    const summary = document.createElement("div");
    summary.className = "chart-v3-summary";

    const totalChip = document.createElement("span");
    totalChip.className = "chart-v3-chip";
    totalChip.textContent = `${summaryTotalLabel}: ${valueFormatter(sumValue)}`;
    summary.appendChild(totalChip);

    const maxChip = document.createElement("span");
    maxChip.className = "chart-v3-chip";
    maxChip.textContent = `${summaryMaxLabel}: ${valueFormatter(maxValue)}`;
    summary.appendChild(maxChip);

    chart.appendChild(summary);
  }

  if (showScale) {
    const scale = document.createElement("div");
    scale.className = "chart-v3-scale";
    for (let tick = 0; tick <= 4; tick += 1) {
      const scaleItem = document.createElement("span");
      scaleItem.textContent = axisFormatter((tick / 4) * maxValue);
      scale.appendChild(scaleItem);
    }
    chart.appendChild(scale);
  }

  const list = document.createElement("ol");
  list.className = "chart-v3-list";
  list.start = 1;

  rows.forEach((item, index) => {
    const percent = sumValue > 0 ? (item.value / sumValue) * 100 : 0;
    const ratio = clamp(item.value / maxValue, 0, 1);

    const row = document.createElement("li");
    row.className = "chart-v3-row";

    const head = document.createElement("div");
    head.className = "chart-v3-headline";

    const lead = document.createElement("div");
    lead.className = "chart-v3-lead";

    const valueTag = document.createElement("span");
    valueTag.className = "chart-v3-leading-value";
    valueTag.textContent = labelValueFormatter(item.value);
    lead.appendChild(valueTag);

    const rank = document.createElement("span");
    rank.className = "chart-v3-rank";
    rank.textContent = String(index + 1);
    lead.appendChild(rank);

    const label = document.createElement("span");
    label.className = "chart-v3-label";
    label.textContent = cutLabel(item.label, labelMaxLength);
    label.title = item.label;
    lead.appendChild(label);

    const metrics = document.createElement("span");
    metrics.className = "chart-v3-metrics";
    metrics.textContent = showPercent
      ? `${valueFormatter(item.value)} · ${percent.toFixed(1)}%`
      : valueFormatter(item.value);

    head.appendChild(lead);
    head.appendChild(metrics);
    row.appendChild(head);

    const track = document.createElement("div");
    track.className = "chart-v3-track";
    track.title = `${item.label}: ${metrics.textContent}`;

    const fill = document.createElement("span");
    fill.className = "chart-v3-fill";
    fill.style.width = `${Math.max(2, ratio * 100)}%`;

    track.appendChild(fill);
    row.appendChild(track);

    list.appendChild(row);
  });

  chart.appendChild(list);
  container.appendChild(chart);
}

export function renderLineChart(container, items, options = {}) {
  if (!container) return;
  container.innerHTML = "";

  const width = options.width || 700;
  const height = options.height || 220;
  const color = options.color || "#22c55e";

  if (!Array.isArray(items) || items.length === 0) {
    container.textContent = options.emptyText || "No data";
    container.classList.add("chart-empty");
    return;
  }

  container.classList.remove("chart-empty");

  const svg = createSvg(width, height);
  const padding = 24;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const maxValue = safeMax(items.map((item) => Number(item.value || item.minutes || 0)));

  for (let tick = 0; tick <= 4; tick += 1) {
    const y = height - padding - (tick / 4) * plotHeight;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(padding));
    line.setAttribute("x2", String(width - padding));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("opacity", "0.1");
    svg.appendChild(line);
  }

  const points = items.map((item, index) => {
    const value = Number(item.value || item.minutes || 0);
    const x = padding + (items.length === 1 ? plotWidth / 2 : (index / (items.length - 1)) * plotWidth);
    const y = height - padding - (value / maxValue) * plotHeight;
    return { x, y, value, label: item.date || item.label || "" };
  });

  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute(
    "points",
    points.map((point) => `${point.x},${point.y}`).join(" ")
  );
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", color);
  polyline.setAttribute("stroke-width", "3");
  polyline.setAttribute("stroke-linecap", "round");
  polyline.setAttribute("stroke-linejoin", "round");
  svg.appendChild(polyline);

  points.forEach((point) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(point.x));
    circle.setAttribute("cy", String(point.y));
    circle.setAttribute("r", "3.5");
    circle.setAttribute("fill", color);
    svg.appendChild(circle);
  });

  container.appendChild(svg);
}
