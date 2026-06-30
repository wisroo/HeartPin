import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { ordered } from "../../data.js";
import { mobileLines } from "../screens/TripDetail.jsx";
import { Photo, Avatar } from "../ui/MobileAtoms.jsx";
import { TILES } from "../../mapUtil.js";

export default function JourneyPlayer({ trip, nav, settings }) {
  const spots = ordered(trip);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const mapElRef = useRef(null), mapRef = useRef(null);
  const markersRef = useRef([]), pastRef = useRef(null);
  const sp = spots[scene];
  const ln = mobileLines(sp, settings);

  function mmHtml(i) {
    const cls = i === scene ? "active" : i < scene ? "done" : "";
    const ring = i === scene ? '<div class="pr"></div>' : "";
    return `<div class="hpm-mmpin ${cls}">${ring}</div>`;
  }

  // init minimap: whole route stays in view, only the position marker moves
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, {
      zoomControl: false, attributionControl: false, dragging: false,
      scrollWheelZoom: false, doubleClickZoom: false, keyboard: false,
      boxZoom: false, touchZoom: false
    });
    L.tileLayer(TILES, { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    const latlngs = spots.map(s => [s.lat, s.lng]);
    L.polyline(latlngs, { color: "#fff", weight: 2.5, opacity: .65, dashArray: "1 7", lineCap: "round" }).addTo(map);
    const trailColor = mapElRef.current
      ? (getComputedStyle(mapElRef.current).getPropertyValue("--p") || "#e3814f")
      : "#e3814f";
    pastRef.current = L.polyline([latlngs[0]], {
      color: trailColor, weight: 3.5, opacity: 1, lineCap: "round"
    }).addTo(map);
    spots.forEach((s, i) => {
      markersRef.current.push(
        L.marker([s.lat, s.lng], {
          icon: L.divIcon({ className: "", html: mmHtml(i), iconSize: [14, 14], iconAnchor: [7, 7] }),
          zIndexOffset: i === 0 ? 500 : 0,
        }).addTo(map)
      );
    });
    map.fitBounds(latlngs, { padding: [22, 22] });
    const t1 = setTimeout(() => { map.invalidateSize(); map.fitBounds(latlngs, { padding: [20, 20] }); }, 120);
    const t2 = setTimeout(() => { map.invalidateSize(); map.fitBounds(latlngs, { padding: [20, 20] }); }, 420);
    return () => { clearTimeout(t1); clearTimeout(t2); map.remove(); mapRef.current = null; markersRef.current = []; };
    // eslint-disable-next-line
  }, []);

  // move the "you are here" marker + traveled trail along the route
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    markersRef.current.forEach((m, i) => {
      m.setIcon(L.divIcon({ className: "", html: mmHtml(i), iconSize: [14, 14], iconAnchor: [7, 7] }));
      m.setZIndexOffset(i === scene ? 1000 : 0);
    });
    if (pastRef.current) pastRef.current.setLatLngs(spots.slice(0, scene + 1).map(s => [s.lat, s.lng]));
  }, [scene, spots]);

  // auto-advance
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (scene + 1 < spots.length) setScene(scene + 1);
      else setPlaying(false);
    }, 4600);
    return () => clearTimeout(t);
  }, [playing, scene, spots.length]);

  return (
    <div className="hpm-player">
      <div className="hpm-player-photo" key={scene}>
        {sp.photos?.[0] && <Photo photo={sp.photos[0]} />}
      </div>
      <div className="hpm-player-shade" />

      <div className="hpm-minimap">
        <div ref={mapElRef} className={`hpm-minimap-map hpm-map-skin-${settings.mapSkin}`} />
        <div className="hpm-minimap-label">코스 {scene + 1} / {spots.length}</div>
      </div>

      <div className="hpm-player-top">
        <div className="hpm-player-prog">
          {spots.map((_, i) => <i key={i} className={i <= scene ? "on" : ""} />)}
        </div>
        <button className="hpm-player-close" onClick={nav.back}>✕</button>
      </div>

      <div className="hpm-player-subs" key={"s" + scene}>
        <div className="hpm-player-place">
          {sp.name}<small>{sp.dayLabel} · {sp.time} · {sp.mood}</small>
        </div>
        <div className="hpm-player-sub bara">
          <Avatar who="bara" size={38} />
          <p><b>{settings.nameBara || "바라"}</b> {ln.guide}</p>
        </div>
        <div className="hpm-player-sub nyong" style={{ animationDelay: ".35s" }}>
          <Avatar who="nyong" size={38} />
          <p><b>{settings.nameNyong || "뇽이"}</b> {ln.reaction}</p>
        </div>
      </div>

      <div className="hpm-player-ctrl">
        <button disabled={scene === 0} onClick={() => setScene(scene - 1)}>‹</button>
        <button className="play" onClick={() => setPlaying(p => !p)}>{playing ? "⏸" : "▶"}</button>
        <button disabled={scene === spots.length - 1} onClick={() => setScene(scene + 1)}>›</button>
      </div>
    </div>
  );
}
