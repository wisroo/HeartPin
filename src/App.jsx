/* HeartPin · main app */
import { Fragment, useState, useEffect, useCallback } from "react";
import { HP_DATA, ordered, autoLine, INITIAL_INBOX } from "./data.js";
import { buildTrip } from "./buildTrip.js";
import MapBoard from "./components/MapBoard.jsx";
import Rnb from "./components/Rnb.jsx";
import Gallery from "./components/Gallery.jsx";
import Journey from "./components/Journey.jsx";
import Inbox from "./components/Inbox.jsx";
import Upload from "./components/Upload.jsx";
import Home from "./components/Home.jsx";
import TripPreview from "./components/TripPreview.jsx";

// 디자인에서 확정한 기본값 (Settings 화면이 생기면 그쪽으로 이동)
const SKIN = "cozy";        // 지도 스킨: cozy | sepia | forest
const SHOW_CHARS = true;    // 지도에 바라·뇽이 표시

export default function App() {
  const regions = HP_DATA.regions;

  const [region, setRegion] = useState("domestic");
  const [screen, setScreen] = useState("home");
  const [view, setView] = useState("overview");
  const [tripId, setTripId] = useState(null);
  const [spotIndex, setSpotIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [gallery, setGallery] = useState(null); // {spotIndex, photoIndex}
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxItems, setInboxItems] = useState(() => INITIAL_INBOX.map((x) => ({ ...x })));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState("inbox");
  const [newTripDraft, setNewTripDraft] = useState(null);
  const [, setDataV] = useState(0); // bump to re-render after HP_DATA mutations

  const trips = regions[region].trips;
  const trip = view === "trip" && tripId ? trips.find((x) => x.id === tripId) : null;
  const spots = trip ? ordered(trip) : null;

  const enterTrip = useCallback((id) => { setTripId(id); setSpotIndex(0); setView("trip"); }, []);
  const back = useCallback(() => { setView("overview"); setTripId(null); }, []);
  const goSpot = useCallback((i) => setSpotIndex(i), []);
  const prev = useCallback(() => setSpotIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setSpotIndex((i) => Math.min((spots ? spots.length : 1) - 1, i + 1)), [spots]);

  const openGallery = useCallback((si, pi) => setGallery({ spotIndex: si, photoIndex: pi }), []);
  const closeGallery = useCallback(() => setGallery(null), []);

  const changeRegion = useCallback((k) => { setRegion(k); setView("overview"); setTripId(null); }, []);

  // --- mutable data: trips/spots can be created at runtime (bumps dataV to re-render) ---
  const addTrip = useCallback((tr) => { HP_DATA.regions[tr.region].trips.unshift(tr); setDataV((v) => v + 1); }, []);
  const findTrip = (id) => { let r = null; ["domestic", "intl"].forEach((k) => { const f = HP_DATA.regions[k].trips.find((x) => x.id === id); if (f) r = f; }); return r; };
  const dayForDate = (tr, date) => {
    if (date) {
      const mm = date.slice(5, 7), dd = date.slice(8, 10);
      const d = tr.days.find((x) => { const m = x.date.match(/(\d+)\.(\d+)/); return m && ("0" + m[1]).slice(-2) === mm && ("0" + m[2]).slice(-2) === dd; });
      if (d) return d;
    }
    return tr.days[tr.days.length - 1];
  };
  const placePhotos = useCallback((rows) => {
    rows.forEach((r) => {
      const tr = findTrip(r.tripId); if (!tr) return;
      const photo = { src: r.item.src, label: r.memo || r.item.autoLabel, ratio: "4/3", tint: r.item.tint };
      if (r.spotId === "__new__") {
        const nm = ((r.newSpotName || "").trim()) || "새 장소";
        const ln = autoLine({ time: r.item.time });
        dayForDate(tr, r.item.date).spots.push({
          id: "sp" + Date.now() + Math.random().toString(36).slice(2, 6),
          name: nm, time: r.item.time || "12:00", lat: r.item.lat, lng: r.item.lng,
          mood: "우리 기록", guide: ln.guide, reaction: ln.reaction, photos: [photo]
        });
      } else {
        let sp = null; tr.days.forEach((d) => { const f = d.spots.find((s) => s.id === r.spotId); if (f) sp = f; });
        if (sp) sp.photos.push(photo);
      }
    });
    setDataV((v) => v + 1);
  }, []);
  const buildDraft = useCallback((items) => { const tr = buildTrip(items); if (tr) setNewTripDraft(tr); return !!tr; }, []);
  const editSpot = useCallback((spotId, field, text) => {
    ["domestic", "intl"].forEach((rk) => HP_DATA.regions[rk].trips.forEach((tr) => tr.days.forEach((d) => {
      const s = d.spots.find((x) => x.id === spotId); if (s) s[field] = text;
    })));
    setDataV((v) => v + 1);
  }, []);
  const saveNewTrip = useCallback((tr) => {
    addTrip(tr);
    setInboxItems((prev) => prev.filter((i) => (tr._sourceIds || []).indexOf(i.id) < 0));
    setNewTripDraft(null);
    setRegion(tr.region); setTripId(tr.id); setSpotIndex(0); setView("trip");
    setScreen("main"); setInboxOpen(false);
  }, [addTrip]);

  // keyboard nav
  useEffect(() => {
    function onKey(e) {
      if (journeyOpen) return; // Journey player owns the keyboard while open
      if (gallery) {
        const sp = spots[gallery.spotIndex];
        if (e.key === "ArrowRight") setGallery((g) => ({ ...g, photoIndex: Math.min(sp.photos.length - 1, g.photoIndex + 1) }));
        else if (e.key === "ArrowLeft") setGallery((g) => ({ ...g, photoIndex: Math.max(0, g.photoIndex - 1) }));
        else if (e.key === "Escape") setGallery(null);
        return;
      }
      if (view === "trip") {
        if (e.key === "ArrowRight") next();
        else if (e.key === "ArrowLeft") prev();
        else if (e.key === "Escape") back();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, gallery, spots, next, prev, back, journeyOpen]);

  const gallerySpot = gallery && spots ? spots[gallery.spotIndex] : null;

  const home = (
    <Home
      regions={regions} region={region} trips={trips}
      onRegion={setRegion}
      onOpenTrip={(id) => { enterTrip(id); setScreen("main"); }}
      onOpenMap={() => { back(); setScreen("main"); }}
      onNewTrip={() => { setUploadMode("newtrip"); setUploadOpen(true); }}
      onUpload={() => { setUploadMode("inbox"); setUploadOpen(true); }}
      onInbox={() => setInboxOpen(true)}
      inboxCount={inboxItems.length}
    />
  );

  const mainEl = (
    <Fragment>
      <header className="hp-topbar">
        <button className="hp-brand" type="button" onClick={() => setScreen("home")}>
          <span className="hp-logo" />
          <div>
            <h1>HeartPin</h1>
            <span className="hp-brand-sub">홈으로</span>
          </div>
        </button>
        <div className="hp-topbar-right">
          <button className="hp-top-btn" type="button" onClick={() => { setUploadMode("inbox"); setUploadOpen(true); }}>＋ 사진 불러오기</button>
          <button className="hp-top-btn ghost" type="button" onClick={() => setInboxOpen(true)}>{`정리함 ${inboxItems.length}`}</button>
        </div>
      </header>
      <div className="hp-stage">
        <div className="hp-map-wrap">
          <MapBoard
            region={region} view={view} trips={trips} trip={trip} tripId={tripId} spotIndex={spotIndex}
            skin={SKIN} showChars={SHOW_CHARS}
            onSelectTrip={enterTrip} onSelectSpot={goSpot}
          />
          {gallery && gallerySpot && (
            <Gallery
              spot={gallerySpot} photoIndex={gallery.photoIndex}
              onClose={closeGallery}
              onSelect={(i) => setGallery((g) => ({ ...g, photoIndex: i }))}
              onPrev={() => setGallery((g) => ({ ...g, photoIndex: Math.max(0, g.photoIndex - 1) }))}
              onNext={() => setGallery((g) => ({ ...g, photoIndex: Math.min(gallerySpot.photos.length - 1, g.photoIndex + 1) }))}
            />
          )}
        </div>
        <Rnb
          view={view} regions={regions} region={region} trips={trips} trip={trip} spots={spots}
          spotIndex={spotIndex} collapsed={collapsed}
          onRegion={changeRegion} onSelectTrip={enterTrip} onBack={back}
          onSelectSpot={goSpot} onPrev={prev} onNext={next} onOpenGallery={openGallery}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onPlayJourney={() => setJourneyOpen(true)}
          onEditSpot={editSpot}
        />
      </div>
    </Fragment>
  );

  return (
    <div className="hp-app">
      {screen === "home" ? home : mainEl}

      {journeyOpen && trip && <Journey trip={trip} onClose={() => setJourneyOpen(false)} />}

      {inboxOpen && (
        <Inbox
          items={inboxItems} setItems={setInboxItems}
          onClose={() => setInboxOpen(false)}
          onPlace={placePhotos} onNewTrip={buildDraft}
        />
      )}

      {uploadOpen && (
        <Upload
          title={uploadMode === "newtrip" ? "새 여행 만들기" : "사진 불러오기"}
          onClose={() => setUploadOpen(false)}
          onAdd={(newItems) => {
            setUploadOpen(false);
            if (uploadMode === "newtrip") { const tr = buildTrip(newItems); if (tr) { setNewTripDraft(tr); return; } }
            setInboxItems((p) => newItems.concat(p)); setInboxOpen(true);
          }}
        />
      )}

      {newTripDraft && <TripPreview draft={newTripDraft} onCancel={() => setNewTripDraft(null)} onSave={saveNewTrip} />}
    </div>
  );
}
