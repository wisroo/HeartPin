/* HeartPin · data helpers — 데이터는 서버(record.json)가 정본, 여기는 동기화된 사본 + 헬퍼
 * (샘플 여행·INITIAL_INBOX는 Phase 0에서 제거 — 빈 상태에서 실데이터로 시작) */

// 서버 state.regions의 동기화 사본 — Inbox/suggest 등이 모듈로 직접 참조
export const HP_DATA = {
  regions: {
    domestic: { key: "domestic", label: "국내", trips: [] },
    intl: { key: "intl", label: "국외", trips: [] }
  }
};
export function syncData(regions) { HP_DATA.regions = regions; }

// flatten ordered spots for a trip (with day context)
export function ordered(trip) {
  const out = [];
  trip.days.forEach((d) => {
    d.spots.forEach((s) => { out.push({ dayLabel: d.label, dayDate: d.date, ...s }); });
  });
  return out;
}

// ---- auto character lines (simple: time-of-day + random template) ----
export function autoLine(opts) {
  const hour = parseInt(((opts && opts.time) || "12:00").slice(0, 2), 10);
  const slot = hour < 11 ? "morning" : hour < 16 ? "day" : hour < 19 ? "evening" : "night";
  const B = {
    morning: ["아침부터 부지런하네! 여기서 하루를 열었지.", "이른 시간이라 한적했어. 공기 좋더라."],
    day: ["한낮의 이곳, 활기가 가득했지.", "여기 풍경 기억나? 한참 머물렀잖아."],
    evening: ["해질 무렵이라 빛이 참 예뻤어.", "노을 시간에 도착했네. 분위기 최고였지."],
    night: ["밤의 이곳, 불빛이 근사했어.", "저녁 늦게 들른 곳이야. 야경 좋았지."]
  }[slot];
  const N = {
    morning: ["상쾌해~ 여기 좋아!", "아침 공기 좋다아 ☀️"],
    day: ["우와 여기 진짜 좋다!", "사진 더 찍을걸 그랬나 ㅎㅎ"],
    evening: ["노을 봐봐… 예쁘다 🧡", "이 시간 풍경 최고야!"],
    night: ["반짝반짝하다…✨", "밤이라 더 분위기 있어!"]
  }[slot];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  return { guide: pick(B), reaction: pick(N) };
}

export function hav(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// auto-suggest Trip / Day / Spot from a photo's date + GIS
export function suggest(item) {
  const ym = item.date.slice(0, 7);
  let trip = null;
  ["domestic", "intl"].forEach((rk) => {
    HP_DATA.regions[rk].trips.forEach((t) => {
      if (t.start && t.start.slice(0, 7) === ym) trip = t;
    });
  });
  if (!trip) return null;
  const res = { tripId: trip.id, tripTitle: trip.title, spots: ordered(trip) };
  const mm = item.date.slice(5, 7), dd = item.date.slice(8, 10);
  const day = trip.days.find((d) => {
    const m = d.date.match(/(\d+)\.(\d+)/);
    return m && String(m[1]).padStart(2, "0") === mm && String(m[2]).padStart(2, "0") === dd;
  });
  if (day) res.dayLabel = day.label;
  if (item.lat != null) {
    let best = null, bd = 1e9;
    const pool = day ? day.spots : trip.days.reduce((a, d) => a.concat(d.spots), []);
    pool.forEach((s) => { const dist = hav(item.lat, item.lng, s.lat, s.lng); if (dist < bd) { bd = dist; best = s; } });
    if (best) {
      res.spotId = best.id; res.spotName = best.name; res.distM = Math.round(bd * 1000);
      if (!res.dayLabel) trip.days.forEach((d) => { if (d.spots.some((s) => s.id === best.id)) res.dayLabel = d.label; });
    }
  }
  return res;
}
