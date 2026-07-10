/* HeartPin Mobile · 지도 + 바텀시트 3스냅 (Leaflet) */

const SNAP = { peek: 0.17, half: 0.5, full: 0.9 };

function MapScreen({ trip, initialSpotIdx = 0, nav, settings }) {
  const spots = window.HP_ORDERED(trip);
  const [active, setActive] = useState(initialSpotIdx);
  const [snap, setSnap] = useState("half");
  const [dragH, setDragH] = useState(null); // px during drag
  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const markersRef = useRef([]);
  const charRef = useRef(null);
  const railRef = useRef(null);
  const skin = settings.mapSkin || "cozy";

  // init leaflet
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { zoomControl: false, attributionControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    spots.forEach((sp, i) => {
      const m = L.marker([sp.lat, sp.lng], {
        icon: L.divIcon({ className: "", html: pinHtml(sp, i, i === active), iconSize: [30, 30], iconAnchor: [15, 30] }),
      }).addTo(map);
      m.on("click", () => { setActive(i); setSnap("half"); });
      markersRef.current.push(m);
    });

    // fit
    const ll = spots.map(s => [s.lat, s.lng]);
    map.fitBounds(ll, { padding: [60, 60], maxZoom: 14 });
    setTimeout(() => { map.invalidateSize(); flyTo(active); }, 60);
    return () => { map.remove(); mapRef.current = null; markersRef.current = []; };
    // eslint-disable-next-line
  }, []);

  function pinHtml(sp, i, isActive) {
    const done = i < active;
    const cls = isActive ? "active" : done ? "done" : "";
    const ring = isActive ? '<div class="ring"></div>' : "";
    const label = isActive ? `<div></div>` : "";
    return `<div class="hpm-pin ${cls}"><div class="hd"><span>${done ? "✓" : i + 1}</span></div>${ring}</div>`;
  }

  // re-render markers when active changes
  useEffect(() => {
    markersRef.current.forEach((m, i) => {
      m.setIcon(L.divIcon({ className: "", html: pinHtml(spots[i], i, i === active), iconSize: [30, 30], iconAnchor: [15, 30] }));
    });
    placeChars();
    flyTo(active);
    // sync rail scroll
    if (railRef.current) {
      const card = railRef.current.children[active];
      if (card) railRef.current.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
    }
    // eslint-disable-next-line
  }, [active, settings.showChars]);

  useEffect(() => { setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 360); }, [snap, dragH]);

  function flyTo(i) {
    const map = mapRef.current; if (!map) return;
    const sp = spots[i];
    map.panTo([sp.lat, sp.lng], { animate: true, duration: .5 });
  }

  function placeChars() {
    const map = mapRef.current; if (!map) return;
    if (charRef.current) { map.removeLayer(charRef.current); charRef.current = null; }
    if (!settings.showChars) return;
    const sp = spots[active];
    const html = `<div class="hpm-mapchars"><img src="${AV_BARA}"><img src="${AV_NYONG}"></div>`;
    charRef.current = L.marker([sp.lat, sp.lng], {
      icon: L.divIcon({ className: "", html, iconSize: [70, 38], iconAnchor: [-6, 44] }),
      interactive: false, zIndexOffset: 1000,
    }).addTo(map);
  }

  // rail swipe → active
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

  // sheet drag
  const dragRef = useRef(null);
  function startDrag(e) {
    const y0 = (e.touches ? e.touches[0].clientY : e.clientY);
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
      const nearest = Object.entries(SNAP).reduce((a, [k, v]) => Math.abs(v - frac) < Math.abs(SNAP[a] - frac) ? k : a, "half");
      setSnap(nearest);
    }
    setDragH(null);
    dragRef.current = null;
  }
  function screenH() { return mapElRef.current ? mapElRef.current.parentElement.clientHeight : 700; }
  function curHeightPx() { return dragH != null ? dragH : SNAP[snap] * screenH(); }

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
                    <Photo cap={false} tint={s.photos[0].tint} />
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
                  <button key={s.id} className={`hpm-railcard ${i === active ? "on" : ""}`} onClick={() => { if (i === active) nav.openMoment(s, 0); else setActive(i); }}>
                    <Photo className="hpm-railcard-cover" label={s.photos[0].label} tint={s.photos[0].tint} />
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

Object.assign(window, { MapScreen });
