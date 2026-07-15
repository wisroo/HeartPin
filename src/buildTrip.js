/* HeartPin · auto-build a Trip tree from photo meta (date→Day, GPS cluster→Spot) */
import { autoLine } from "./data.js";

function hav(a, b, c, d) {
  const R = 6371, dx = (c - a) * Math.PI / 180, dy = (d - b) * Math.PI / 180;
  const s = Math.sin(dx / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dy / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const inKorea = (la, lo) => la > 33 && la < 39 && lo > 124 && lo < 132;

// inbox 아이템 → moment (Supabase moments 필드 유지)
export function photoOf(it, label) {
  return {
    src: it.src, thumb: it.thumb, label: label || it.autoLabel, ratio: it.ratio || "4/3", tint: it.tint,
    content_hash: it.content_hash, owner: it.owner, taken_at: it.taken_at,
    lat: it.lat, lng: it.lng, original_status: "kept"
  };
}

// 사용자가 확정한 (사진→장소) 그룹으로 여행 조립 — 모바일 확인 플로우 · 정리함 "새 여행" 배치 공용.
// pool: [{ item, spot:{key,name,lat?,lng?}, label? }] · 위치 없는 그룹은 lat/lng null (지도엔 위치 있는 스팟만 핀)
export function buildTripFromGroups(pool) {
  const byDate = {};
  pool.forEach((p) => { (byDate[p.item.date] = byDate[p.item.date] || []).push(p); });
  const dates = Object.keys(byDate).sort();
  if (!dates.length) return null;
  let allLat = 0, allLng = 0, allN = 0;
  const days = dates.map((date, di) => {
    const entries = byDate[date].slice().sort((a, b) => (a.item.time || "").localeCompare(b.item.time || ""));
    const groups = [], gmap = {};
    entries.forEach((e) => {
      let g = gmap[e.spot.key];
      if (!g) { g = { spot: e.spot, entries: [] }; gmap[e.spot.key] = g; groups.push(g); }
      g.entries.push(e);
    });
    const spots = groups.map((g) => {
      const pts = g.entries.map((e) => e.item).filter((x) => x.lat != null);
      let lat = null, lng = null;
      if (pts.length) {
        lat = +(pts.reduce((s, x) => s + x.lat, 0) / pts.length).toFixed(5);
        lng = +(pts.reduce((s, x) => s + x.lng, 0) / pts.length).toFixed(5);
      } else if (g.spot.lat != null) { lat = g.spot.lat; lng = g.spot.lng; }
      if (lat != null) { allLat += lat; allLng += lng; allN++; }
      const ln = autoLine({ time: g.entries[0].item.time });
      return {
        id: "sp" + Date.now() + Math.random().toString(36).slice(2, 6),
        name: g.spot.name, time: g.entries[0].item.time || "12:00",
        lat, lng, mood: "우리 기록", guide: ln.guide, reaction: ln.reaction,
        photos: g.entries.map((e) => photoOf(e.item, e.label))
      };
    });
    const dd = new Date(date + "T00:00:00");
    return { label: "Day " + (di + 1), date: `${date.slice(5, 7)}.${date.slice(8, 10)} ${WD[dd.getDay()]}`, dateValue: date, spots };
  });
  const region = allN ? (inKorea(allLat / allN, allLng / allN) ? "domestic" : "intl") : "domestic";
  const nights = Math.max(0, dates.length - 1);
  return {
    id: "trip" + Date.now(), region, start: dates[0],
    title: nights > 0 ? `${nights}박 ${dates.length}일 여행` : "당일 여행",
    dateLabel: `${dates[0].replace(/-/g, ".")} – ${dates[dates.length - 1].slice(5).replace("-", ".")}`,
    cover: days[0].spots[0].photos[0],
    tags: [region === "domestic" ? "국내" : "국외", "새 여행"],
    days, _sourceIds: pool.map((p) => p.item.id)
  };
}

// items: [{id,date,time,lat,lng,src,autoLabel,tint}]
export function buildTrip(items) {
  const valid = items.filter((i) => i.lat != null && i.date);
  if (!valid.length) return null;
  const byDate = {};
  valid.forEach((i) => { (byDate[i.date] = byDate[i.date] || []).push(i); });
  const dates = Object.keys(byDate).sort();
  let spotNo = 0, allLat = 0, allLng = 0, allN = 0;
  const days = dates.map((date, di) => {
    const pool = byDate[date].slice().sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const clusters = [];
    pool.forEach((p) => {
      let c = clusters.find((cl) => hav(cl.lat, cl.lng, p.lat, p.lng) < 0.3); // ~300m
      if (!c) { c = { lat: p.lat, lng: p.lng, items: [] }; clusters.push(c); }
      c.items.push(p);
      c.lat = c.items.reduce((s, x) => s + x.lat, 0) / c.items.length;
      c.lng = c.items.reduce((s, x) => s + x.lng, 0) / c.items.length;
    });
    const spots = clusters.map((c) => {
      spotNo++; allLat += c.lat; allLng += c.lng; allN++;
      const name = "장소 " + spotNo;
      const ln = autoLine({ time: c.items[0].time });
      return {
        id: "sp" + Date.now() + "_" + spotNo, name, time: c.items[0].time || "12:00",
        lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), mood: "우리 기록",
        guide: ln.guide, reaction: ln.reaction,
        photos: c.items.map((x) => ({
          src: x.src, thumb: x.thumb, label: x.autoLabel, ratio: x.ratio || "4/3", tint: x.tint,
          content_hash: x.content_hash, owner: x.owner, taken_at: x.taken_at,
          lat: x.lat, lng: x.lng, original_status: "kept"
        }))
      };
    });
    const dd = new Date(date + "T00:00:00");
    return { label: "Day " + (di + 1), date: `${date.slice(5, 7)}.${date.slice(8, 10)} ${WD[dd.getDay()]}`, dateValue: date, spots };
  });
  const cLat = allLat / allN, cLng = allLng / allN;
  const region = inKorea(cLat, cLng) ? "domestic" : "intl";
  const nights = Math.max(0, dates.length - 1);
  const firstSpot = days[0].spots[0];
  return {
    id: "trip" + Date.now(), region, start: dates[0],
    title: nights > 0 ? `${nights}박 ${dates.length}일 여행` : "당일 여행",
    dateLabel: `${dates[0].replace(/-/g, ".")} – ${dates[dates.length - 1].slice(5).replace("-", ".")}`,
    cover: firstSpot.photos[0],
    tags: [region === "domestic" ? "국내" : "국외", "새 여행"],
    days, _sourceIds: items.map((i) => i.id)
  };
}
