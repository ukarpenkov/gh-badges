import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { barPoints, closedArea, curvePoints, fmt, monthMarks, polyline, smoothCurve } from "./chart.js";

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
  elvish: { x0: 40, x1: 456, base: 150, min: 16, max: 78 },
  mountain: { x0: 40, x1: 456, base: 150, min: 16, max: 78 },
  fallout: { x0: 40, x1: 456, base: 150, min: 16, max: 78 },
  cubism: { x0: 40, x1: 456, base: 150, min: 16, max: 78, poly: true },
  circuits: { x0: 154, x1: 458, base: 150, min: 14, max: 74 },
  anime: { x0: 176, x1: 458, base: 150, min: 14, max: 74 },
  cats: { x0: 176, x1: 458, base: 150, min: 14, max: 74 },
  automotive: { x0: 176, x1: 458, base: 150, min: 14, max: 74 },
};

const BARS = {
  lego: { x0: 20, step: 35, width: 30, base: 158, min: 28, max: 92 },
  minecraft: { x0: 55, step: 30, base: 155, min: 38, max: 100 },
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
  const counts = activity.weeks.map((week) => week.count);
  let svg = template(theme);
  if (BARS[theme]) svg = paintBars(svg, theme, counts);
  else svg = paintCurve(svg, theme, activity, counts);
  svg = paintCommits(svg, theme, activity.commits);
  const total = activity.total.toLocaleString("en-US");
  const commits = typeof activity.commits === "number" ? activity.commits.toLocaleString("en-US") : null;
  const summary = commits
    ? `${escapeXml(activity.login)}: ${commits} commits since ${escapeXml(activity.from)}, ${total} contributions in the last 13 weeks.`
    : `${escapeXml(activity.login)}: ${total} contributions in the last 13 weeks.`;
  return svg.replace(/<desc id="d">[\s\S]*?<\/desc>/, `<desc id="d">${summary}</desc>`);
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
  <p>Число в углу — публичные коммиты с первого дня этих 13 недель. Кривая и столбики — вклады по неделям: самая высокая неделя занимает верх карточки.</p>
  <form>
    <input name="user" value="${user}" placeholder="github login" autocomplete="username" required>
    <button>Показать</button>
  </form>
  ${cards}
</main>`;
}

function paintCommits(svg, theme, commits) {
  if (typeof commits !== "number") return svg;
  const label = escapeXml(commits.toLocaleString("en-US"));
  if (theme === "minecraft") {
    const row = `<text x="318" y="22" fill="#16324a" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="end">${label}</text>\n`;
    const at = svg.lastIndexOf("</g>");
    return at < 0 ? svg : svg.slice(0, at) + row + svg.slice(at);
  }
  return svg.replace(/<text\b([^>]*)>\s*3 months\s*<\/text>/, (_, attrs) => {
    const y = Number(attrs.match(/\by="([\d.]+)"/)?.[1] ?? 32);
    const countAttrs = attrs.replace(/\by="[\d.]+"/, `y="${y - 1}"`).replace(/font-size="[\d.]+"/, 'font-size="16"');
    const periodAttrs = attrs.replace(/\by="[\d.]+"/, `y="${y + 13}"`).replace(/font-size="[\d.]+"/, 'font-size="11"');
    return `<text${countAttrs} font-weight="600">${label}</text>\n    <text${periodAttrs}>3 months</text>`;
  });
}

function paintCurve(svg, theme, activity, counts) {
  const layout = CURVES[theme];
  const points = curvePoints(counts, layout);
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
  const last = points[points.length - 1];
  svg = svg.replace(/<circle cx="[\d.]+" cy="[\d.]+" r="3\.4"/g, `<circle cx="${fmt(last.x)}" cy="${fmt(last.y)}" r="3.4"`);
  svg = svg.replace(/<circle cx="[\d.]+" cy="[\d.]+" r="1\.7"/g, `<circle cx="${fmt(last.x)}" cy="${fmt(last.y)}" r="1.7"`);
  svg = replaceGuides(svg, monthMarks(activity.weeks, points));
  if (theme === "circuits") {
    const first = points[0];
    svg = svg.replace(/M116 77 H132 V[\d.]+ H[\d.]+/, `M116 77 H132 V${fmt(first.y)} H${fmt(first.x)}`);
    svg = svg.replace(
      /<circle cx="[\d.]+" cy="[\d.]+" r="2\.3" fill="#8fd6b8"\/>/,
      `<circle cx="${fmt(first.x)}" cy="${fmt(first.y)}" r="2.3" fill="#8fd6b8"/>`,
    );
  }
  return svg;
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
  const bars = barPoints(counts, BARS[theme]);
  if (theme === "lego") return splice(svg, '<rect x="20.0"', '<g transform="translate(16 14)">', legoBricks(bars));
  const ground = '<rect x="5" y="155" width="485" height="20" fill="#6b4428"/>';
  const text = '<rect x="16" y="14" width="3" height="3" fill="#1a2430"/>';
  const start = svg.indexOf(ground);
  const end = svg.indexOf(text);
  if (start < 0 || end < 0) return svg;
  return svg.slice(0, start + ground.length) + minecraftTrees(bars) + svg.slice(end);
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
      const x = fmt(bar.x);
      const y = fmt(bar.y);
      const h = fmt(bar.h);
      return `<g>
      <rect x="${x}" y="${y}" width="30" height="${h}" rx="1" fill="${body}"/>
      <rect x="${x}" y="${y}" width="30" height="3.5" fill="${hi}"/>
      <rect x="${fmt(bar.x + 26.5)}" y="${y}" width="3.5" height="${h}" fill="#000" opacity="0.12"/>
      <ellipse cx="${fmt(bar.x + 9)}" cy="${fmt(bar.y - 2.8)}" rx="5" ry="3.6" fill="${body}"/>
      <ellipse cx="${fmt(bar.x + 9)}" cy="${fmt(bar.y - 4.2)}" rx="5" ry="3.1" fill="${hi}"/>
      <ellipse cx="${fmt(bar.x + 21)}" cy="${fmt(bar.y - 2.8)}" rx="5" ry="3.6" fill="${body}"/>
      <ellipse cx="${fmt(bar.x + 21)}" cy="${fmt(bar.y - 4.2)}" rx="5" ry="3.1" fill="${hi}"/>
    </g>`;
    })
    .join("");
}

function minecraftTrees(bars) {
  return bars
    .map((bar) => {
      const x = fmt(bar.x);
      const y = fmt(bar.y);
      const h = fmt(bar.h);
      const side = fmt(Math.max(bar.h - 10, 4));
      let tree = `<rect x="${x}" y="${y}" width="25" height="${h}" fill="#8b5e34"/>
<rect x="${x}" y="${y}" width="25" height="5" fill="#b6e67a"/>
<rect x="${x}" y="${fmt(bar.y + 5)}" width="25" height="5" fill="#4f8f32"/>
<rect x="${fmt(bar.x + 20)}" y="${fmt(bar.y + 10)}" width="5" height="${side}" fill="#6b4526"/>
<rect x="${fmt(bar.x + 5)}" y="${fmt(bar.y + 15)}" width="5" height="5" fill="#6d4a28"/>`;
      if (bar.h >= 70) {
        tree += `<rect x="${x}" y="135" width="25" height="20" fill="#8d8d8d"/>
<rect x="${fmt(bar.x + 20)}" y="135" width="5" height="20" fill="#5f5f5f"/>
<rect x="${fmt(bar.x + 5)}" y="140" width="5" height="5" fill="#a3a3a3"/>`;
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
