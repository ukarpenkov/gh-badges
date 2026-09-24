import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { barPoints, closedArea, curvePoints, fmt, polyline, smoothCurve } from "./chart.js";

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
  elvish: { x0: 40, x1: 456, base: 150, min: 16, max: 70, ink: "#e3d3a4", halo: "#1c2a22" },
  mountain: { x0: 40, x1: 456, base: 150, min: 16, max: 70, ink: "#e0b088", halo: "#2c2823" },
  fallout: { x0: 40, x1: 456, base: 150, min: 16, max: 70, ink: "#1a1a1a", halo: "#d9c79a" },
  cubism: { x0: 40, x1: 456, base: 150, min: 16, max: 70, ink: "#161616", halo: "#e7dccb", poly: true },
  circuits: { x0: 154, x1: 458, base: 150, min: 14, max: 66, ink: "#8fd6b8", halo: "#0e1411" },
  anime: { x0: 176, x1: 458, base: 150, min: 14, max: 66, ink: "#60e69c", halo: "#171922" },
  cats: { x0: 176, x1: 458, base: 150, min: 14, max: 66, ink: "#9ee7ef", halo: "#162a34" },
  automotive: { x0: 176, x1: 458, base: 150, min: 14, max: 66, ink: "#ff3858", halo: "#111318" },
};

const BARS = {
  lego: { x0: 18, x1: 470, maxWidth: 28, base: 158, min: 18, max: 78, ink: "#2a313a", halo: "#f4f5f7" },
  minecraft: { x0: 14, x1: 478, maxWidth: 18, base: 155, min: 14, max: 78, ink: "#16324a", halo: "#79c0ea" },
};

const LEGO = [
  ["#d21f26", "#ef4b45"],
  ["#e6b400", "#ffd84a"],
  ["#0a62b8", "#2d86db"],
  ["#00843d", "#1aa352"],
];

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
  if (BARS[theme]) svg = paintBars(svg, theme, counts);
  else svg = paintCurve(svg, theme, counts);
  svg = paintSummary(svg, theme, activity);
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
  <p>Угол карточки — вклады с 1-го числа этого месяца, например 349 contributions, и короткое имя месяца. Пики — тот же месяц по дням: на каждом дне написано, сколько вкладов было именно в этот день. 1-го числа месяца счёт начинается заново.</p>
  <form>
    <input name="user" value="${user}" placeholder="github login" autocomplete="username" required>
    <button>Показать</button>
  </form>
  ${cards}
</main>`;
}

function paintSummary(svg, theme, activity) {
  const total = escapeXml(activity.total.toLocaleString("en-US"));
  const line = `${total} contributions`;
  const month = escapeXml(activity.month);
  const size = line.length > 20 ? 11 : 13;
  if (theme === "minecraft") {
    const row = `<rect x="300" y="10" width="152" height="24" fill="#79c0ea"/>
    <text x="446" y="18" fill="#16324a" stroke="#79c0ea" stroke-width="3" paint-order="stroke" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${size}" font-weight="700" text-anchor="end">${line}</text>
    <text x="446" y="31" fill="#16324a" stroke="#79c0ea" stroke-width="3" paint-order="stroke" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="12" font-weight="700" text-anchor="end">${month}</text>\n`;
    const at = svg.lastIndexOf("</g>");
    return at < 0 ? svg : svg.slice(0, at) + row + svg.slice(at);
  }
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
  const line = layout.poly ? polyline(points) : smoothCurve(points);
  const area = closedArea(line, points, layout.base);
  const shadow = layout.poly ? polyline(points, 5, -6) : null;
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
  if (theme === "circuits") {
    svg = svg.replace(/M116 77 H132 V[\d.]+ H[\d.]+/, `M116 77 H132 V${fmt(start.y)} H${fmt(start.x)}`);
    svg = svg.replace(
      /<circle cx="[\d.]+" cy="[\d.]+" r="2\.3" fill="#8fd6b8"\/>/,
      `<circle cx="${fmt(start.x)}" cy="${fmt(start.y)}" r="2.3" fill="#8fd6b8"/>`,
    );
  }
  return paintDayCounts(svg, points, series.labels, layout.ink, layout.halo);
}

function chartKind(d, attrs) {
  if ((d.match(/ C /g) || []).length >= 8) return /Z\s*$/.test(d.trim()) ? "area" : "line";
  if ((d.match(/ L /g) || []).length >= 8 && /stroke-width="5"/.test(attrs)) return "shadow";
  if ((d.match(/ L /g) || []).length >= 8 && /stroke-width="2\.6"/.test(attrs)) return "line";
  return null;
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
  const layout = BARS[theme];
  const bars = barPoints(counts, layout);
  const labels = bars.map((bar) => ({ x: bar.x + bar.w / 2, y: bar.y - 8 }));
  if (theme === "lego") {
    svg = splice(svg, '<rect x="20.0"', '<g transform="translate(16 14)">', legoBricks(bars));
  } else {
    const ground = '<rect x="5" y="155" width="485" height="20" fill="#6b4428"/>';
    const text = '<rect x="16" y="14" width="3" height="3" fill="#1a2430"/>';
    const start = svg.indexOf(ground);
    const end = svg.indexOf(text);
    if (start >= 0 && end >= 0) svg = svg.slice(0, start + ground.length) + minecraftTrees(bars) + svg.slice(end);
  }
  return paintDayCounts(svg, labels, counts, layout.ink, layout.halo);
}

function paintDayCounts(svg, points, labels, ink, halo) {
  const step = points.length < 2 ? 40 : Math.abs(points[1].x - points[0].x);
  const size = step >= 22 ? 10 : step >= 16 ? 8 : step >= 12 ? 7 : 6;
  const texts = points
    .map((point, index) => {
      const value = labels[index];
      if (value == null) return "";
      const y = Math.max(46, point.y - 2);
      const opacity = value === 0 ? 0.5 : 1;
      return `<text x="${fmt(point.x)}" y="${fmt(y)}" font-size="${size}" opacity="${opacity}">${value}</text>`;
    })
    .join("");
  const block = `<g font-family="Segoe UI, Helvetica, Arial, sans-serif" font-weight="700" text-anchor="middle" fill="${ink}" stroke="${halo}" stroke-width="2.2" paint-order="stroke" stroke-linejoin="round">${texts}</g>\n    `;
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

function splice(svg, startMark, endMark, insert) {
  const end = svg.indexOf(endMark);
  const brick = svg.lastIndexOf("<g>", end);
  const start = svg.indexOf(startMark);
  const open = svg.lastIndexOf("<g>", start);
  if (open < 0 || end < 0 || brick < 0) return svg;
  return svg.slice(0, open) + insert + svg.slice(end);
}

function legoBricks(bars) {
  return bars
    .map((bar, index) => {
      const [body, hi] = LEGO[index % LEGO.length];
      const w = bar.w;
      const cap = Math.min(3.5, Math.max(1.5, w * 0.16));
      const shade = Math.min(3.5, Math.max(1.2, w * 0.12));
      let studs = "";
      if (w >= 9) {
        const stud = Math.min(4.2, w * 0.2);
        const inset = w * 0.28;
        studs = `<ellipse cx="${fmt(bar.x + inset)}" cy="${fmt(bar.y - stud * 0.55)}" rx="${fmt(stud)}" ry="${fmt(stud * 0.68)}" fill="${body}"/>
      <ellipse cx="${fmt(bar.x + inset)}" cy="${fmt(bar.y - stud)}" rx="${fmt(stud)}" ry="${fmt(stud * 0.52)}" fill="${hi}"/>
      <ellipse cx="${fmt(bar.x + w - inset)}" cy="${fmt(bar.y - stud * 0.55)}" rx="${fmt(stud)}" ry="${fmt(stud * 0.68)}" fill="${body}"/>
      <ellipse cx="${fmt(bar.x + w - inset)}" cy="${fmt(bar.y - stud)}" rx="${fmt(stud)}" ry="${fmt(stud * 0.52)}" fill="${hi}"/>`;
      }
      return `<g>
      <rect x="${fmt(bar.x)}" y="${fmt(bar.y)}" width="${fmt(w)}" height="${fmt(bar.h)}" rx="1" fill="${body}"/>
      <rect x="${fmt(bar.x)}" y="${fmt(bar.y)}" width="${fmt(w)}" height="${fmt(cap)}" fill="${hi}"/>
      <rect x="${fmt(bar.x + w - shade)}" y="${fmt(bar.y)}" width="${fmt(shade)}" height="${fmt(bar.h)}" fill="#000" opacity="0.12"/>
      ${studs}
    </g>`;
    })
    .join("");
}

function minecraftTrees(bars) {
  return bars
    .map((bar) => {
      const w = bar.w;
      const leaf = Math.min(6, Math.max(2, w * 0.34));
      let tree = `<rect x="${fmt(bar.x)}" y="${fmt(bar.y)}" width="${fmt(w)}" height="${fmt(bar.h)}" fill="#8b5e34"/>
<rect x="${fmt(bar.x)}" y="${fmt(bar.y)}" width="${fmt(w)}" height="${fmt(leaf)}" fill="#b6e67a"/>
<rect x="${fmt(bar.x)}" y="${fmt(bar.y + leaf)}" width="${fmt(w)}" height="${fmt(leaf)}" fill="#4f8f32"/>`;
      if (bar.h >= 58 && w >= 8) {
        const stone = Math.min(14, bar.h * 0.22);
        tree += `<rect x="${fmt(bar.x)}" y="${fmt(bar.y + bar.h - stone)}" width="${fmt(w)}" height="${fmt(stone)}" fill="#8d8d8d"/>`;
      }
      return tree;
    })
    .join("");
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
