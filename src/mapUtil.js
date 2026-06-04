/* HeartPin · shared Leaflet helpers — cozy tiles, custom markers, curved timeline */
import L from "leaflet";
import { CHAR } from "./chars.js";

export const TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
export const ATTR = "&copy; OpenStreetMap &copy; CARTO";

// Catmull-Rom spline through latlng points -> smooth dashed curve
export function smooth(points, seg) {
  if (points.length < 3) return points;
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    for (let t = 0; t <= seg; t++) {
      const s = t / seg, s2 = s * s, s3 = s2 * s;
      const lat = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3);
      const lng = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3);
      out.push([lat, lng]);
    }
  }
  return out;
}

export function pinIcon(n, name, state) {
  const extra = state === "active"
    ? `<span class="hp-pin-ring"></span><span class="hp-pin-label">${name}</span>` : "";
  return L.divIcon({
    className: `hp-leafpin ${state}`,
    html: `<div class="hp-pin-head"><span>${n}</span></div>${extra}`,
    iconSize: [34, 42], iconAnchor: [17, 34]
  });
}

export function charIcon() {
  return L.divIcon({
    className: "hp-leafchars",
    html: `<img class="hp-mapchar bara" src="${CHAR.bara.src}"/><img class="hp-mapchar nyong" src="${CHAR.nyong.src}"/>`,
    iconSize: [88, 50], iconAnchor: [44, -6]
  });
}

export function tripIcon(t, n) {
  const short = t.title.replace(/^\d+박 \d+일 /, "");
  return L.divIcon({
    className: "hp-leaftrip",
    html: `<span class="hp-trippin-bub"><b>${short}</b><small>${n} spots</small></span><span class="hp-trippin-stem"></span>`,
    iconSize: [150, 62], iconAnchor: [75, 62]
  });
}
