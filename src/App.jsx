/* HeartPin · main app — 데이터는 서버(api.js = StorageAdapter 시임) 경유, 3초 폴링 동기화 */
import { Fragment, useState, useEffect, useCallback, useRef } from "react";
import { HP_DATA, syncData, ordered, autoLine } from "./data.js";
import { buildTrip, buildTripFromGroups } from "./buildTrip.js";
import * as api from "./api.js";
import MapBoard from "./components/MapBoard.jsx";
import Rnb from "./components/Rnb.jsx";
import Gallery from "./components/Gallery.jsx";
import Journey from "./components/Journey.jsx";
import Inbox from "./components/Inbox.jsx";
import Upload from "./components/Upload.jsx";
import Home from "./components/Home.jsx";
import TripPreview from "./components/TripPreview.jsx";
import MobileUploadFlow from "./components/MobileUploadFlow.jsx";

// 디자인에서 확정한 기본값 (Settings 화면이 생기면 그쪽으로 이동)
const SKIN = "cozy";        // 지도 스킨: cozy | sepia | forest
const SHOW_CHARS = true;    // 지도에 바라·뇽이 표시

const isMobileNow = () => window.matchMedia("(max-width: 760px)").matches;

export default function App() {
  const [data, setData] = useState(null); // {version, regions, inbox} — 서버가 정본
  const versionRef = useRef(-1);
  const [isMobile, setIsMobile] = useState(isMobileNow);
  const [loadError, setLoadError] = useState(null);

  const apply = useCallback((st) => {
    if (!st || st.unchanged) return;
    syncData(st.regions);
    versionRef.current = st.version;
    setData(st);
  }, []);

  // 최초 로드 + 3초 폴링 (상대가 올린 사진이 내 화면에 자동 반영)
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const st = await api.fetchState(versionRef.current >= 0 ? versionRef.current : undefined);
        if (alive) { apply(st); setLoadError(null); }
      } catch (e) {
        if (alive && versionRef.current < 0) setLoadError(e.message);
      }
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(iv); };
  }, [apply]);

  useEffect(() => {
    const onResize = () => setIsMobile(isMobileNow());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const regions = data ? data.regions : HP_DATA.regions;
  const inboxItems = data ? data.inbox : [];

  const [region, setRegion] = useState("domestic");
  const [screen, setScreen] = useState("home"); // home: PC=홈 / 모바일=런치 플로우
  const [view, setView] = useState("overview");
  const [tripId, setTripId] = useState(null);
  const [spotIndex, setSpotIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [gallery, setGallery] = useState(null); // {spotIndex, photoIndex}
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState("inbox");
  const [newTripDraft, setNewTripDraft] = useState(null);

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

  // --- 변이는 전부 서버 ops 경유 (api.js) ---
  const placePhotos = useCallback(async (rows, opts) => {
    // "＋ 새 여행 만들기"를 고른 행은 같은 장소 이름끼리 묶어 새 여행으로 조립
    // r.pickedLat/Lng: 위치 없는 사진에 지도에서 찍어준 좌표
    const fresh = rows.filter((r) => r.tripId === "__newtrip__");
    const normal = rows.filter((r) => r.tripId !== "__newtrip__");
    let st = null;
    if (normal.length) {
      st = await api.opPlacePhotos(normal.map((r) => ({
        itemId: r.item.id, tripId: r.tripId, spotId: r.spotId,
        newSpotName: r.newSpotName, memo: r.memo,
        lat: r.pickedLat, lng: r.pickedLng,
        line: r.spotId === "__new__" ? autoLine({ time: r.item.time }) : undefined
      })));
    }
    if (fresh.length) {
      const pool = fresh.map((r) => {
        const nm = (r.newSpotName || "").trim() || "새 장소";
        const item = r.pickedLat != null ? { ...r.item, lat: r.pickedLat, lng: r.pickedLng } : r.item;
        return { item, spot: { key: nm, name: nm }, label: r.memo };
      });
      const tr = buildTripFromGroups(pool);
      if (tr) {
        const title = (opts && opts.newTripTitle || "").trim();
        if (title) tr.title = title;
        st = await api.opAddTrip(tr);
      }
    }
    if (st) apply(st);
  }, [apply]);

  const editTrip = useCallback(async (tripId, text) => {
    apply(await api.opEditTrip(tripId, text));
  }, [apply]);

  const editSpot = useCallback(async (spotId, field, text) => {
    apply(await api.opEditSpot(spotId, field, text));
  }, [apply]);

  const inboxKeep = useCallback(async (id) => { apply(await api.opInboxKeep(id)); }, [apply]);
  const inboxDiscard = useCallback(async (ids) => { apply(await api.opInboxDiscard(ids)); }, [apply]);
  const inboxPurge = useCallback(async (ids) => { apply(await api.opInboxPurge(ids)); }, [apply]);

  const buildDraft = useCallback((items) => { const tr = buildTrip(items); if (tr) setNewTripDraft(tr); return !!tr; }, []);
  const saveNewTrip = useCallback(async (tr) => {
    apply(await api.opAddTrip(tr));
    setNewTripDraft(null);
    setRegion(tr.region); setTripId(tr.id); setSpotIndex(0); setView("trip");
    setScreen("main"); setInboxOpen(false);
  }, [apply]);

  // keyboard nav (PC)
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

  if (loadError) {
    return (
      <div className="hp-app hp-boot">
        <p>서버에 연결할 수 없어요 😢<br /><small>{loadError}</small><br /><small>Mac에서 <code>npm run demo</code>가 실행 중인지 확인해 주세요.</small></p>
      </div>
    );
  }
  if (!data) return <div className="hp-app hp-boot"><p>기록 불러오는 중…</p></div>;

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

  // 모바일 진입점 = 런치→사진 올리기 플로우 (디자인 핸드오프 #4 · 홈은 와이어프레임 미정)
  const mobileFlow = (
    <MobileUploadFlow
      regions={regions}
      onApplyState={apply}
      onOpenMap={() => { back(); setScreen("main"); }}
      hasTrips={Object.values(regions).some((r) => r.trips.length > 0)}
      inboxCount={inboxItems.length}
      onOpenInbox={() => setInboxOpen(true)}
    />
  );

  const mainEl = (
    <Fragment>
      <header className="hp-topbar">
        <button className="hp-brand" type="button" onClick={() => setScreen("home")}>
          <span className="hp-logo" />
          <div>
            <h1>HeartPin</h1>
            <span className="hp-brand-sub">{isMobile ? "올리기로" : "홈으로"}</span>
          </div>
        </button>
        <div className="hp-topbar-right">
          {!isMobile && <button className="hp-top-btn" type="button" onClick={() => { setUploadMode("inbox"); setUploadOpen(true); }}>＋ 사진 불러오기</button>}
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
          onEditSpot={editSpot} onEditTrip={editTrip}
        />
      </div>
    </Fragment>
  );

  return (
    <div className="hp-app">
      {screen === "home" ? (isMobile ? mobileFlow : home) : mainEl}

      {journeyOpen && trip && <Journey trip={trip} onClose={() => setJourneyOpen(false)} />}

      {inboxOpen && (
        <Inbox
          items={inboxItems}
          onClose={() => setInboxOpen(false)}
          onPlace={placePhotos} onNewTrip={buildDraft}
          onKeep={inboxKeep} onDiscard={inboxDiscard} onPurge={inboxPurge}
        />
      )}

      {uploadOpen && (
        <Upload
          title={uploadMode === "newtrip" ? "새 여행 만들기" : "사진 불러오기"}
          onClose={() => setUploadOpen(false)}
          onDone={(result) => {
            setUploadOpen(false);
            apply(result.state);
            if (uploadMode === "newtrip" && result.added.length) {
              const tr = buildTrip(result.added);
              if (tr) { setNewTripDraft(tr); return; }
            }
            setInboxOpen(true);
          }}
        />
      )}

      {newTripDraft && <TripPreview draft={newTripDraft} onCancel={() => setNewTripDraft(null)} onSave={saveNewTrip} />}
    </div>
  );
}
