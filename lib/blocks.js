import { fmt } from "./chart.js";

export const BAR_LAYOUTS = {
  lego: { x0: 202, x1: 470, maxWidth: 20, base: 158, min: 12, max: 64, ink: "#fff0d2", halo: "#18334b", labelGap: 9 },
  minecraft: { x0: 202, x1: 470, maxWidth: 20, base: 158, min: 12, max: 64, ink: "#f2f6d2", halo: "#233b31", labelGap: 7, fontFamily: "Courier New, monospace" },
};

const LEGO_COLORS = [
  ["#c6342f", "#ed6250", "#8f2528"],
  ["#e7b42c", "#ffe07a", "#ae781b"],
  ["#287dc2", "#62b5ed", "#185083"],
  ["#3d9261", "#84cf8c", "#276744"],
];

function polygon(points) {
  return points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" ");
}

export function legoBricks(bars) {
  return bars.map((bar, index) => {
    const { x, y, w, h } = bar;
    const base = y + h;
    const depth = Math.min(2.4, w * 0.22);
    const [body, light, dark] = LEGO_COLORS[index % LEGO_COLORS.length];
    const side = polygon([[x + w, y], [x + w + depth, y - depth], [x + w + depth, base - depth], [x + w, base]]);
    const top = polygon([[x, y], [x + depth, y - depth], [x + w + depth, y - depth], [x + w, y]]);
    const studCount = w >= 11 ? 2 : 1;
    const radius = Math.min(2.7, w / (studCount === 2 ? 5.2 : 3.5));
    const studs = Array.from({ length: studCount }, (_, stud) => {
      const cx = x + (w * (stud + 0.5)) / studCount + depth * 0.5;
      const cy = y - depth * 0.5 - 0.7;
      return `<ellipse cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${fmt(radius)}" ry="${fmt(radius * 0.58)}" fill="${dark}"/>
      <ellipse cx="${fmt(cx)}" cy="${fmt(cy - 0.85)}" rx="${fmt(radius)}" ry="${fmt(radius * 0.52)}" fill="${light}"/>
      <path d="M${fmt(cx - radius * 0.65)} ${fmt(cy - 1)}h${fmt(radius)}" stroke="#fff" stroke-width="0.55" opacity="0.38"/>`;
    }).join("");
    let seams = "";
    for (let seam = base - 8; seam > y + 3; seam -= 8) {
      seams += `<path d="M${fmt(x)} ${fmt(seam)}h${fmt(w)}l${fmt(depth)} ${fmt(-depth)}" fill="none" stroke="${dark}" stroke-width="0.8"/>
      <path d="M${fmt(x + 0.5)} ${fmt(seam + 0.8)}h${fmt(w - 1)}" stroke="${light}" stroke-width="0.5" opacity="0.65"/>`;
    }
    return `<g data-day="${index + 1}">
      <ellipse cx="${fmt(x + w * 0.55 + depth)}" cy="${fmt(base + 1)}" rx="${fmt(w * 0.7)}" ry="1.8" fill="#0b2034" opacity="0.36"/>
      <polygon points="${side}" fill="${dark}"/>
      <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="0.45" fill="${body}"/>
      <polygon points="${top}" fill="${light}"/>
      <rect x="${fmt(x + 0.65)}" y="${fmt(y + 1)}" width="0.7" height="${fmt(h - 2)}" fill="#fff" opacity="0.16"/>
      ${seams}${studs}
    </g>`;
  }).join("");
}

export function minecraftBlocks(bars) {
  return bars.map((bar, index) => {
    const { x, y, w, h } = bar;
    const base = y + h;
    const depth = Math.min(2.4, w * 0.22);
    const grass = Math.min(4, w * 0.45);
    const side = polygon([[x + w, y], [x + w + depth, y - depth], [x + w + depth, base - depth], [x + w, base]]);
    const top = polygon([[x, y], [x + depth, y - depth], [x + w + depth, y - depth], [x + w, y]]);
    let stone = "";
    if (h >= 36) {
      const height = Math.min(22, h * 0.34);
      stone = `<rect x="${fmt(x)}" y="${fmt(base - height)}" width="${fmt(w)}" height="${fmt(height)}" fill="url(#minecraft-stone)"/>
      <polygon points="${polygon([[x + w, base - height], [x + w + depth, base - height - depth], [x + w + depth, base - depth], [x + w, base]])}" fill="#4c5457"/>`;
    }
    return `<g data-day="${index + 1}">
      <path d="M${fmt(x - 0.5)} ${fmt(base + 1)}h${fmt(w + depth + 2)}" stroke="#20362b" stroke-width="2" opacity="0.4"/>
      <polygon points="${side}" fill="#534333"/>
      <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="url(#minecraft-dirt)"/>${stone}
      <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(grass)}" fill="#579638"/>
      <rect x="${fmt(x + w * 0.16)}" y="${fmt(y + grass)}" width="${fmt(w * 0.24)}" height="2" fill="#579638"/>
      <rect x="${fmt(x + w * 0.66)}" y="${fmt(y + grass)}" width="${fmt(w * 0.2)}" height="1" fill="#70aa43"/>
      <polygon points="${top}" fill="url(#minecraft-grass)"/>
      <path d="M${fmt(x)} ${fmt(y)}h${fmt(w)}" stroke="#b6d46c" stroke-width="0.8"/>
    </g>`;
  }).join("");
}
