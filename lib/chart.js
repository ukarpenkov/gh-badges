export function fmt(value) {
  return (Math.round(value * 10) / 10).toFixed(1);
}

export function heights(counts, min, max) {
  const peak = Math.max(...counts, 0);
  if (peak === 0) return counts.map(() => min);
  return counts.map((count) => min + ((max - min) * count) / peak);
}

export function curvePoints(counts, layout) {
  const hs = heights(counts, layout.min, layout.max);
  if (hs.length <= 1) {
    const x = (layout.x0 + layout.x1) / 2;
    const h = hs[0] ?? layout.min;
    return [{ x, y: layout.base - h, h }];
  }
  const step = (layout.x1 - layout.x0) / (hs.length - 1);
  return hs.map((h, index) => ({
    x: layout.x0 + step * index,
    y: layout.base - h,
    h,
  }));
}

export function barPoints(counts, layout) {
  const hs = heights(counts, layout.min, layout.max);
  const n = Math.max(hs.length, 1);
  const span = layout.x1 - layout.x0;
  const width = Math.min(layout.maxWidth, (span / n) * 0.72);
  const step = n === 1 ? 0 : (span - width) / (n - 1);
  const origin = n === 1 ? (layout.x0 + layout.x1 - width) / 2 : layout.x0;
  return hs.map((h, index) => ({
    x: origin + step * index,
    y: layout.base - h,
    h,
    w: width,
  }));
}

export function smoothCurve(points) {
  let path = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return path;
}

export function closedArea(line, points, base) {
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${fmt(last.x)} ${fmt(base)} L ${fmt(first.x)} ${fmt(base)} Z`;
}

export function polyline(points, dx = 0, dy = 0) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${fmt(point.x + dx)} ${fmt(point.y + dy)}`)
    .join(" ");
}

