import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { barPoints, closedArea, curvePoints, fmt, polyline, smoothCurve } from "./chart.js";
import { BAR_LAYOUTS, legoBricks, minecraftBlocks } from "./blocks.js";

const THEMES = [
  "elvish",
  "mountain",
  "anime",
  "cats",
  "automotive",
  "circuits",
  "cubism",
  "fallout",
  "lego",
  "minecraft",
];

const CURVES = {
  elvish: { x0: 28, x1: 468, base: 166, min: 12, max: 52, ink: "#ffe7a8", halo: "#1a1008" },
  mountain: { x0: 22, x1: 474, base: 104, min: 16, max: 54, ink: "#e9f8ff", halo: "#1a120e", poly: true, shadowDx: 0, shadowDy: 0, peaks: true, labelFloor: 12, labelGap: 10 },
  fallout: { x0: 40, x1: 456, base: 150, min: 16, max: 70, ink: "#1a1a1a", halo: "#d9c79a" },
  cubism: { x0: 40, x1: 456, base: 150, min: 16, max: 70, ink: "#161616", halo: "#e7dccb", poly: true },
  circuits: { x0: 150, x1: 458, base: 150, min: 14, max: 66, ink: "#72efb5", halo: "#07110d" },
  anime: { x0: 210, x1: 468, base: 150, min: 12, max: 60, ink: "#d2e5da", halo: "#102832", labelGap: 7 },
  cats: { x0: 210, x1: 468, base: 150, min: 12, max: 60, ink: "#f5e4d8", halo: "#363039", labelGap: 7 },
  automotive: { x0: 222, x1: 468, base: 150, min: 12, max: 60, ink: "#f5d6bf", halo: "#152432", labelGap: 7 },
};

const templates = new Map();

export function themeNames() {
  return THEMES;
}

export function knownTheme(name) {
  return THEMES.includes(name);
}

export function renderTheme(theme, activity) {
  const counts = activity.days.map((day) => day.count);
  let svg = template(theme);
  if (BAR_LAYOUTS[theme]) svg = paintBars(svg, theme, counts);
  else svg = paintCurve(svg, theme, counts);
  svg = paintSummary(svg, activity);
  const total = activity.total.toLocaleString("en-US");
  const summary = `${escapeXml(activity.login)}: ${total} contributions in ${escapeXml(activity.month)}, from ${escapeXml(activity.from)}.`;
  svg = svg.replace(/<desc id="d">[\s\S]*?<\/desc>/, `<desc id="d">${summary}</desc>`);
  return svg.replace(/<title id="t">([^<]*)<\/title>/, (_, title) => {
    return `<title id="t">${title.replace(/3 months|this month/g, activity.month)}</title>`;
  });
}

export function renderError(message) {
  const text = escapeXml(message);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="495" height="180" viewBox="0 0 495 180" role="img">
  <rect width="495" height="180" rx="12" fill="#1c2430"/>
  <text x="247.5" y="96" fill="#d5deea" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="16" text-anchor="middle">${text}</text>
</svg>`;
}

export function renderGallery(origin, login) {
  const user = escapeXml(login || "");
  const cards = login
    ? THEMES.map((theme) => {
        const src = `${origin}/${theme}?user=${encodeURIComponent(login)}`;
        return `<figure><img src="${escapeXml(src)}" width="495" height="180" alt="${theme}"><figcaption><code>${escapeXml(src)}</code></figcaption></figure>`;
      }).join("\n")
    : "";
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>gh-badges</title>
<style>
  body { margin: 0; font: 16px/1.45 Segoe UI, Helvetica, Arial, sans-serif; background: #10141a; color: #e7edf5; }
  main { max-width: 540px; margin: 0 auto; padding: 28px 16px 48px; }
  form { display: flex; gap: 8px; margin: 16px 0 28px; }
  input, button { font: inherit; border-radius: 8px; border: 1px solid #3a4658; }
  input { flex: 1; padding: 8px 10px; background: #181e28; color: inherit; }
  button { padding: 8px 14px; background: #2a3546; color: inherit; }
  figure { margin: 0 0 22px; }
  img { width: 100%; height: auto; display: block; }
  code { display: block; margin-top: 6px; font-size: 12px; color: #9aabbf; word-break: break-all; }
</style>
<main>
  <h1>Живые бейджи</h1>
  <p>Угол карточки — вклады с 1-го числа этого месяца, например 349 contributions, и полное имя месяца. Пики — тот же месяц по дням: на каждом дне написано, сколько вкладов было именно в этот день. 1-го числа месяца счёт начинается заново.</p>
  <form>
    <input name="user" value="${user}" placeholder="github login" autocomplete="username" required>
    <button>Показать</button>
  </form>
  ${cards}
</main>`;
}

function paintSummary(svg, activity) {
  const total = escapeXml(activity.total.toLocaleString("en-US"));
  const line = `${total} contributions`;
  const month = escapeXml(activity.month);
  const size = line.length > 20 ? 11 : 13;
  return svg.replace(/<text\b([^>]*)>\s*(?:3 months|this month)\s*<\/text>/, (_, attrs) => {
    const y = Number(attrs.match(/\by="([\d.]+)"/)?.[1] ?? 32);
    const countAttrs = attrs.replace(/\by="[\d.]+"/, `y="${y - 1}"`).replace(/font-size="[\d.]+"/, `font-size="${size}"`);
    const periodAttrs = attrs.replace(/\by="[\d.]+"/, `y="${y + 14}"`).replace(/font-size="[\d.]+"/, 'font-size="12"');
    return `<text${countAttrs} font-weight="700">${line}</text>\n    <text${periodAttrs} font-weight="700">${month}</text>`;
  });
}

function shapeSeries(counts) {
  if (counts.length !== 1) return { counts, labels: counts };
  return { counts: [0, counts[0], 0], labels: [null, counts[0], null] };
}

function paintCurve(svg, theme, counts) {
  const layout = CURVES[theme];
  const series = shapeSeries(counts);
  const points = curvePoints(series.counts, layout);
  if (theme === "circuits") return paintCircuit(svg, points, series.labels, layout);
  const line = layout.poly ? polyline(points) : smoothCurve(points);
  const area = closedArea(line, points, layout.base);
  const shadow = layout.poly ? polyline(points, layout.shadowDx ?? 5, layout.shadowDy ?? -6) : null;
  svg = svg.replace(/<path\b([^>]*)>/g, (full, attrs) => {
    const found = attrs.match(/\bd="([^"]+)"/);
    if (!found) return full;
    const kind = chartKind(found[1], attrs);
    if (!kind) return full;
    const next = kind === "area" ? area : kind === "shadow" ? shadow : line;
    return `<path${attrs.replace(found[0], `d="${next}"`)}>`;
  });
  const cursor = points[lastLabeled(series.labels)];
  const start = points[firstLabeled(series.labels)];
  svg = svg.replace(/<circle cx="[\d.]+" cy="[\d.]+" r="3\.4"/g, `<circle cx="${fmt(cursor.x)}" cy="${fmt(cursor.y)}" r="3.4"`);
  svg = svg.replace(/<circle cx="[\d.]+" cy="[\d.]+" r="1\.7"/g, `<circle cx="${fmt(cursor.x)}" cy="${fmt(cursor.y)}" r="1.7"`);
  svg = replaceGuides(svg, []);
  if (layout.peaks) svg = paintPeaks(svg, points, series.labels, layout);
  return paintDayCounts(svg, points, series.labels, layout.ink, layout.halo, layout);
}

function paintCircuit(svg, points, labels, layout) {
  const start = points[firstLabeled(labels)];
  const cursor = points[lastLabeled(labels)];
  const line = orthogonalTrace(points);
  const area = `${line}V${fmt(layout.base)}H${fmt(points[0].x)}Z`;

  svg = replacePath(svg, "circuit-area", area);
  svg = replacePath(svg, "circuit-shadow", line);
  svg = replacePath(svg, "circuit-line", line);
  svg = replacePath(svg, "signal-input", `M121 96H132V${fmt(start.y)}H${fmt(start.x)}`);

  const vias = sampleVias(points, labels);
  const rings = vias.map((point) => `<circle cx="${fmt(point.x)}" cy="${fmt(point.y)}" r="3.4"/>`).join("");
  const drills = vias.map((point) => `<circle cx="${fmt(point.x)}" cy="${fmt(point.y)}" r="1.15"/>`).join("");
  svg = replaceMarked(
    svg,
    "signal-vias",
    `<g fill="#0b1712" stroke="#8bffc9" stroke-width="1.4">${rings}</g>
    <g fill="#72efb5">${drills}</g>`,
  );
  svg = replaceMarked(
    svg,
    "output-pad",
    `<circle cx="${fmt(cursor.x)}" cy="${fmt(cursor.y)}" r="7" fill="#173525" stroke="#487b5f" stroke-width="1"/>
    <circle cx="${fmt(cursor.x)}" cy="${fmt(cursor.y)}" r="4.2" fill="#d0a85b"/>
    <circle cx="${fmt(cursor.x)}" cy="${fmt(cursor.y)}" r="1.7" fill="#74551f"/>`,
  );
  svg = replaceGuides(svg, []);
  return paintDayCounts(svg, points, labels, layout.ink, layout.halo);
}

function orthogonalTrace(points) {
  if (!points.length) return "";
  return points.slice(1).reduce((d, point) => `${d}H${fmt(point.x)}V${fmt(point.y)}`, `M${fmt(points[0].x)} ${fmt(points[0].y)}`);
}

function sampleVias(points, labels) {
  const first = firstLabeled(labels);
  const last = lastLabeled(labels);
  const count = Math.min(7, last - first + 1);
  if (count <= 1) return [points[first]];
  const indexes = Array.from({ length: count }, (_, index) => Math.round(first + ((last - first) * index) / (count - 1)));
  return [...new Set(indexes)].map((index) => points[index]);
}

function replacePath(svg, id, d) {
  const pattern = new RegExp(`(<path\\b[^>]*\\bid="${id}"[^>]*\\bd=")[^"]*(")`);
  return svg.replace(pattern, `$1${d}$2`);
}

function replaceMarked(svg, marker, content) {
  const pattern = new RegExp(`(<!-- ${marker}:start -->)[\\s\\S]*?(<!-- ${marker}:end -->)`);
  return svg.replace(pattern, `$1\n    ${content}\n    $2`);
}

function chartKind(d, attrs) {
  const closed = /Z\s*$/.test(d.trim());
  if ((d.match(/ C /g) || []).length >= 8) return closed ? "area" : "line";
  const lines = (d.match(/ L /g) || []).length;
  if (lines >= 8 && closed) return "area";
  if (lines >= 8 && /stroke-width="5"/.test(attrs)) return "shadow";
  if (lines >= 8 && /stroke-width="2\.6"/.test(attrs)) return "line";
  return null;
}

function paintPeaks(svg, points, labels, layout) {
  const step = points.length < 2 ? 40 : Math.abs(points[1].x - points[0].x);
  const radius = step >= 18 ? 2.7 : step >= 12 ? 2.15 : 1.65;
  const dots = points
    .map((point, index) => {
      if (labels[index] == null) return "";
      return `<circle cx="${fmt(point.x)}" cy="${fmt(point.y)}" r="${fmt(radius)}" fill="${layout.ink}" stroke="${layout.halo}" stroke-width="1"/>`;
    })
    .join("");
  return replaceMarked(svg, "peaks", `<g>${dots}</g>`);
}

function replaceGuides(svg, marks) {
  const re = /[ \t]*<line x1="[\d.]+" y1="(\d+)" x2="[\d.]+" y2="150" stroke="([^"]+)" stroke-opacity="([^"]+)" stroke-dasharray="2 5"\/>\n?/g;
  const found = [...svg.matchAll(re)];
  if (!found.length) return svg;
  const [, y, stroke, opacity] = found[0];
  const lines = marks
    .map((x) => `<line x1="${fmt(x)}" y1="${y}" x2="${fmt(x)}" y2="150" stroke="${stroke}" stroke-opacity="${opacity}" stroke-dasharray="2 5"/>`)
    .join("\n");
  let used = false;
  return svg.replace(re, () => {
    if (used) return "";
    used = true;
    return lines ? `${lines}\n` : "";
  });
}

function paintBars(svg, theme, counts) {
  const layout = BAR_LAYOUTS[theme];
  const bars = barPoints(counts, layout);
  const labels = bars.map((bar) => ({ x: bar.x + bar.w / 2, y: bar.y }));
  svg = replaceMarked(svg, "activity-bars", theme === "lego" ? legoBricks(bars) : minecraftBlocks(bars));
  return paintDayCounts(svg, labels, counts, layout.ink, layout.halo, layout);
}

function paintDayCounts(svg, points, labels, ink, halo, layout = {}) {
  const step = points.length < 2 ? 40 : Math.abs(points[1].x - points[0].x);
  const size = step >= 22 ? 10 : step >= 16 ? 8 : step >= 12 ? 7 : 6;
  const texts = points
    .map((point, index) => {
      const value = labels[index];
      if (value == null) return "";
      const y = Math.max(layout.labelFloor ?? 46, point.y - (layout.labelGap ?? 2));
      const opacity = value === 0 ? 0.5 : 1;
      return `<text x="${fmt(point.x)}" y="${fmt(y)}" font-size="${size}" opacity="${opacity}">${value}</text>`;
    })
    .join("");
  const block = `<g font-family="${layout.fontFamily ?? "Segoe UI, Helvetica, Arial, sans-serif"}" font-weight="700" text-anchor="middle" fill="${ink}" stroke="${halo}" stroke-width="2.2" paint-order="stroke" stroke-linejoin="round">${texts}</g>\n    `;
  if (/<text\b[^>]*>\s*(?:3 months|this month)\s*<\/text>/.test(svg)) {
    return svg.replace(/(<text\b[^>]*>\s*(?:3 months|this month)\s*<\/text>)/, `${block}$1`);
  }
  const at = svg.lastIndexOf("</g>");
  return at < 0 ? svg : svg.slice(0, at) + block + svg.slice(at);
}

function firstLabeled(labels) {
  const index = labels.findIndex((value) => value != null);
  return index < 0 ? 0 : index;
}

function lastLabeled(labels) {
  for (let index = labels.length - 1; index >= 0; index -= 1) {
    if (labels[index] != null) return index;
  }
  return Math.max(labels.length - 1, 0);
}

function template(theme) {
  if (!templates.has(theme)) templates.set(theme, readFileSync(badgePath(theme), "utf8"));
  return templates.get(theme);
}

function badgePath(theme) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [path.join(here, "..", "badges", `${theme}.svg`), path.join(process.cwd(), "badges", `${theme}.svg`)];
  const found = candidates.find((file) => existsSync(file));
  if (!found) throw new Error(`Missing badge template ${theme}`);
  return found;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}
