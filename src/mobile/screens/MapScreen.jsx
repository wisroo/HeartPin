/* HeartPin Mobile · MapScreen — 3-snap sheet + spot rail (Leaflet) */
import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { ordered } from "../../data.js";
import { TILES, ATTR } from "../../mapUtil.js";
import { CHAR } from "../../chars.js";
import { Photo } from "../ui/MobileAtoms.jsx";

const SNAP = { peek: 0.17, half: 0.5, full: 0.9 };

export default function MapScreen({ trip, initialSpotIdx = 0, nav, settings }) {
  const spots = trip ? ordered(trip) : [];

  if (!trip || spots.length === 0) {
    return (
      <div className="hpm-map-screen">
        <div className="hpm-empty">아직 여행 스팟이 없어요</div>
      </div>
    );
  }

  const clampedIdx = Math.max(0, Math.min(initialSpotIdx, spots.length - 1));
  return <MapScreenInner trip={trip} spots={spots} initialIdx={clampedIdx} nav={nav} settings={settings} />;
}

function MapScreenInner({ trip, spots, initialIdx, nav, settings }) {
  const [active, setActive] = useState(initialIdx);
  const [snap, setSnap] = useState("half");
  const [dragH, setDragH] = useState(null);
  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const markersRef = useRef([]);
  const charRef = useRef(null);
  const railRef = useRef(null);
  const dragRef = useRef(null);
  const skin = settings.mapSkin || "cozy";

  function pinHtml(sp, i, isActive) {
    const done = i < active;
    const cls = isActive ? "active" : done ? "done" : "";
    const ring = isActive ? '<div class="ring"></div>' : "";
    return `<div class="hpm-pin ${cls}"><div class="hd"><span>${done ? "✓" : i + 1}</span></div>${ring}</div>`;
  }

  // init leaflet
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { zoomControl: false, attributionControl: true });
    L.tileLayer(TILES, { attribution: ATTR, subdomains: "abcd", maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    spots.forEach((sp, i) => {
      const m = L.marker([sp.lat, sp.lng], {
        icon: L.divIcon({ className: "", html: pinHtml(sp, i, i === active), iconSize: [30, 30], iconAnchor: [15, 30] }),
      }).addTo(map);
      m.on("click", () => { setActive(i); setSnap("half"); });
      markersRef.current.push(m);
    });

    const ll = spots.map(s => [s.lat, s.lng]);
    map.fitBounds(ll, { padding: [60, 60], maxZoom: 14 });
    setTimeout(() => { map.invalidateSize(); flyTo(active); }, 60);

    return () => { map.remove(); mapRef.current = null; markersRef.current = []; };
    // eslint-disable-next-line
  }, []);

  // re-render markers when active changes
  useEffect(() => {
    markersRef.current.forEach((m, i) => {
      m.setIcon(L.divIcon({ className: "", html: pinHtml(spots[i], i, i === active), iconSize: [30, 30], iconAnchor: [15, 30] }));
    });
    placeChars();
    flyTo(active);
    if (railRef.current && typeof railRef.current.scrollTo === "function") {
      const card = railRef.current.children[active];
      if (card) railRef.current.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
    }
    // eslint-disable-next-line
  }, [active, settings.showChars]);

  useEffect(() => { setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 360); }, [snap, dragH]);

  function flyTo(i) {
    const map = mapRef.current; if (!map) return;
    map.panTo([spots[i].lat, spots[i].lng], { animate: true, duration: 0.5 });
  }

  function placeChars() {
    const map = mapRef.current; if (!map) return;
    if (charRef.current) { map.removeLayer(charRef.current); charRef.current = null; }
    if (!settings.showChars) return;
    const sp = spots[active];
    const html = `<div class="hpm-mapchars"><img src="${CHAR.bara.src}"><img src="${CHAR.nyong.src}"></div>`;
    charRef.current = L.marker([sp.lat, sp.lng], {
      icon: L.divIcon({ className: "", html, iconSize: [70, 38], iconAnchor: [-6, 44] }),
      interactive: false, zIndexOffset: 1000,
    }).addTo(map);
  }

  function onRailScroll() {
    if (!railRef.current) return;
    const r = railRef.current;
    const center = r.scrollLeft + r.clientWidth / 2;
    let best = 0, bd = 1e9;
    [...r.children].forEach((c, i) => {
      const cc = c.offsetLeft + c.clientWidth / 2;
      const d = Math.abs(cc - center);
      if (d < bd) { bd = d; best = i; }
    });
    if (best !== active) setActive(best);
  }

  function screenH() { return mapElRef.current ? mapElRef.current.parentElement.clientHeight : 700; }
  function curHeightPx() { return dragH != null ? dragH : SNAP[snap] * screenH(); }

  function startDrag(e) {
    const y0 = e.touches ? e.touches[0].clientY : e.clientY;
    const h0 = curHeightPx();
    dragRef.current = { y0, h0 };
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", endDrag);
  }

  function moveDrag(e) {
    if (!dragRef.current) return;
    const dy = dragRef.current.y0 - e.clientY;
    const total = screenH();
    let h = dragRef.current.h0 + dy;
    h = Math.max(total * 0.12, Math.min(total * 0.92, h));
    setDragH(h);
  }

  function endDrag() {
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", endDrag);
    if (dragH != null) {
      const frac = dragH / screenH();
      const nearest = Object.entries(SNAP).reduce(
        (a, [k, v]) => Math.abs(v - frac) < Math.abs(SNAP[a] - frac) ? k : a,
        "half"
      );
      setSnap(nearest);
    }
    setDragH(null);
    dragRef.current = null;
  }

  function cycleSnap() {
    setSnap(s => s === "peek" ? "half" : s === "half" ? "full" : "peek");
  }

  const sheetH = dragH != null ? dragH : `${SNAP[snap] * 100}%`;
  const sp = spots[active];

  return (
    <div className="hpm-map-screen">
      <div ref={mapElRef} className={`hpm-leaflet hpm-map-skin-${skin}`} />
      <div className="hpm-map-top">
        <button className="hpm-map-back" onClick={nav.back}>‹</button>
        <div className="hpm-map-title">{trip.title} · {sp.dayLabel}</div>
      </div>

      <div className="hpm-sheet" style={{ height: dragH != null ? dragH + "px" : sheetH, transition: dragH != null ? "none" : undefined }}>
        <div className="hpm-grab" onClick={cycleSnap} onPointerDown={startDrag}><i /></div>

        {snap === "peek" ? (
          <div className="hpm-sheet-head">
            <span className="hpm-sheet-title">이 여행 · 스팟 {spots.length}곳</span>
            <span className="hpm-chip cool sm mono">{active + 1} / {spots.length}</span>
          </div>
        ) : (
          <div className="hpm-sheet-head">
            <span className="hpm-sheet-title">{snap === "full" ? `${sp.dayLabel} 코스` : sp.name}</span>
            <span className="hpm-chip cool sm mono">{active + 1} / {spots.length}</span>
          </div>
        )}

        <div className="hpm-sheet-body">
          {snap === "full" ? (
            <div className="hpm-sheet-list">
              {spots.map((s, i) => (
                <div key={s.id} className={`hpm-listrow ${i === active ? "on" : ""} ${i < active ? "done" : ""}`}>
                  <div className="hpm-listnum">{i < active ? "✓" : i + 1}</div>
                  <button className="hpm-listcard" onClick={() => { setActive(i); nav.openMoment(s, 0); }}>
                    <Photo photo={s.photos?.[0]} cap={false} />
                    <div>
                      <div className="nm">{s.name}</div>
                      <div className="mt">{s.dayLabel} · {s.time} · {s.photos.length}컷</div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="hpm-spotrail" ref={railRef} onScroll={onRailScroll}>
                {spots.map((s, i) => (
                  <button key={s.id} className={`hpm-railcard ${i === active ? "on" : ""}`}
                    onClick={() => { if (i === active) nav.openMoment(s, 0); else setActive(i); }}>
                    <Photo photo={s.photos?.[0]} className="hpm-railcard-cover" />
                    <div className="hpm-railcard-body">
                      <div className="hpm-railcard-name">{s.name}</div>
                      <div className="hpm-railcard-row">
                        <span className="hpm-chip sm">{s.time}</span>
                        <span className="hpm-chip sm cool">{s.photos.length}컷</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="hpm-dots">
                {spots.map((_, i) => <i key={i} className={i === active ? "on" : ""} />)}
                <span>{active + 1} / {spots.length}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
