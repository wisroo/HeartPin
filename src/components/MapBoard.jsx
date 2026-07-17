/* HeartPin · Leaflet map — cozy tiles, custom markers, curved timeline */
import { useRef, useEffect } from "react";
import L from "leaflet";
import { TILES, ATTR, smooth, pinIcon, charIcon, tripIcon } from "../mapUtil.js";
import { ordered } from "../data.js";

export default function MapBoard(props) {
  const { region, view, trips, trip, tripId, spotIndex, onSelectTrip, onSelectSpot, skin = "cozy", showChars = true } = props;
  const elRef = useRef(null), mapRef = useRef(null), layerRef = useRef(null);

  // init
  useEffect(() => {
    const map = L.map(elRef.current, {
      zoomControl: false, attributionControl: true,
      minZoom: 3
    });
    map.setView([35.15, 129.06], 11);
    L.tileLayer(TILES, { attribution: ATTR, subdomains: "abcd", maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    const ro = new ResizeObserver(() => map.invalidateSize(false));
    ro.observe(elRef.current);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  // camera: fit on view/region/trip change (not on every card flip)
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (view === "overview") {
      const pts = trips.map((t) => {
        const o = ordered(t).filter((s) => s.lat != null);
        if (!o.length) return null; // 위치 없는 스팟만 있는 여행은 버블 생략
        return [o.reduce((a, s) => a + s.lat, 0) / o.length, o.reduce((a, s) => a + s.lng, 0) / o.length];
      }).filter(Boolean);
      if (pts.length === 0) map.setView([36.2, 127.9], 7); // 빈 기록 시작(Phase 0) — 한반도 기본 뷰
      else if (pts.length === 1) map.setView(pts[0], region === "domestic" ? 11 : 6);
      else map.fitBounds(pts, { padding: [80, 80] });
    } else if (trip) {
      const o = ordered(trip).filter((s) => s.lat != null);
      if (o.length) map.fitBounds(o.map((s) => [s.lat, s.lng]), { padding: [72, 72] });
      else map.setView([36.2, 127.9], 7);
    }
  }, [view, region, tripId]);

  // markers + path: redraw on state change
  useEffect(() => {
    const map = mapRef.current, lg = layerRef.current; if (!map || !lg) return;
    lg.clearLayers();
    if (view === "overview") {
      trips.forEach((t) => {
        const o = ordered(t).filter((s) => s.lat != null);
        if (!o.length) return; // 위치 없는 스팟만 있는 여행 — 버블 생략 (목록에서는 선택 가능)
        const lat = o.reduce((a, s) => a + s.lat, 0) / o.length, lng = o.reduce((a, s) => a + s.lng, 0) / o.length;
        L.marker([lat, lng], { icon: tripIcon(t, o.length) }).addTo(lg).on("click", () => onSelectTrip(t.id));
      });
    } else if (trip) {
      const spots = ordered(trip);
      const geo = spots.filter((s) => s.lat != null).map((s) => [s.lat, s.lng]);
      if (geo.length > 1) L.polyline(smooth(geo, 16), { color: "#e3814f", weight: 3.5, opacity: 0.42, dashArray: "1 11", lineCap: "round" }).addTo(lg);
      const doneGeo = spots.slice(0, spotIndex + 1).filter((s) => s.lat != null).map((s) => [s.lat, s.lng]);
      if (spotIndex >= 1 && doneGeo.length > 1) L.polyline(smooth(doneGeo, 16), { color: "#e3814f", weight: 4.5, opacity: 0.95, dashArray: "1 11", lineCap: "round" }).addTo(lg);
      spots.forEach((s, i) => {
        if (s.lat == null) return; // 위치 없는 스팟은 핀 생략 (카드 덱에서는 정상 진행)
        const state = i === spotIndex ? "active" : (i < spotIndex ? "done" : "");
        L.marker([s.lat, s.lng], { icon: pinIcon(i + 1, s.name, state), zIndexOffset: i === spotIndex ? 1000 : i * 10 })
          .addTo(lg).on("click", () => onSelectSpot(i));
      });
      const a = spots[spotIndex];
      if (showChars && a && a.lat != null) L.marker([a.lat, a.lng], { icon: charIcon(), zIndexOffset: 2000, interactive: false }).addTo(lg);
    }
  }, [view, region, tripId, spotIndex, showChars]);

  return (
    <div className={`hp-map skin-${skin}`}>
      <div className="hp-leaflet" ref={elRef} />
      <div className="hp-map-badge">{region === "domestic" ? "🇰🇷 국내" : "✈ 국외"}</div>
    </div>
  );
}
