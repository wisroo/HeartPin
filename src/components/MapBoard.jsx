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
        const o = ordered(t);
        return [o.reduce((a, s) => a + s.lat, 0) / o.length, o.reduce((a, s) => a + s.lng, 0) / o.length];
      });
      if (pts.length === 1) map.setView(pts[0], region === "domestic" ? 11 : 6);
      else map.fitBounds(pts, { padding: [80, 80] });
    } else if (trip) {
      const o = ordered(trip);
      map.fitBounds(o.map((s) => [s.lat, s.lng]), { padding: [72, 72] });
    }
  }, [view, region, tripId]);

  // markers + path: redraw on state change
  useEffect(() => {
    const map = mapRef.current, lg = layerRef.current; if (!map || !lg) return;
    lg.clearLayers();
    if (view === "overview") {
      trips.forEach((t) => {
        const o = ordered(t);
        const lat = o.reduce((a, s) => a + s.lat, 0) / o.length, lng = o.reduce((a, s) => a + s.lng, 0) / o.length;
        L.marker([lat, lng], { icon: tripIcon(t, o.length) }).addTo(lg).on("click", () => onSelectTrip(t.id));
      });
    } else if (trip) {
      const spots = ordered(trip);
      const geo = spots.map((s) => [s.lat, s.lng]);
      L.polyline(smooth(geo, 16), { color: "#e3814f", weight: 3.5, opacity: 0.42, dashArray: "1 11", lineCap: "round" }).addTo(lg);
      if (spotIndex >= 1) L.polyline(smooth(geo.slice(0, spotIndex + 1), 16), { color: "#e3814f", weight: 4.5, opacity: 0.95, dashArray: "1 11", lineCap: "round" }).addTo(lg);
      spots.forEach((s, i) => {
        const state = i === spotIndex ? "active" : (i < spotIndex ? "done" : "");
        L.marker([s.lat, s.lng], { icon: pinIcon(i + 1, s.name, state), zIndexOffset: i === spotIndex ? 1000 : i * 10 })
          .addTo(lg).on("click", () => onSelectSpot(i));
      });
      const a = spots[spotIndex];
      if (showChars && a) L.marker([a.lat, a.lng], { icon: charIcon(), zIndexOffset: 2000, interactive: false }).addTo(lg);
    }
  }, [view, region, tripId, spotIndex, showChars]);

  return (
    <div className={`hp-map skin-${skin}`}>
      <div className="hp-leaflet" ref={elRef} />
      <div className="hp-map-badge">{region === "domestic" ? "🇰🇷 국내" : "✈ 국외"}</div>
    </div>
  );
}
