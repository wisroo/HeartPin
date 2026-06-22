import { useState, useEffect, useCallback, useRef } from "react";
import { HP_DATA, syncData, ordered, autoLine } from "../data.js";
import { buildTrip, buildTripFromGroups } from "../buildTrip.js";
import * as api from "../api.js";

export function useHeartPinState() {
  const [data, setData] = useState(null);
  const versionRef = useRef(-1);
  const [loadError, setLoadError] = useState(null);

  const apply = useCallback((st) => {
    if (!st || st.unchanged) return;
    syncData(st.regions);
    versionRef.current = st.version;
    setData(st);
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const st = await api.fetchState(versionRef.current >= 0 ? versionRef.current : undefined);
        if (alive) {
          apply(st);
          setLoadError(null);
        }
      } catch (e) {
        if (alive && versionRef.current < 0) setLoadError(e.message);
      }
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [apply]);

  const regions = data ? data.regions : HP_DATA.regions;
  const inboxItems = data ? data.inbox : [];

  const [region, setRegion] = useState("domestic");
  const [screen, setScreen] = useState("home");
  const [view, setView] = useState("overview");
  const [tripId, setTripId] = useState(null);
  const [spotIndex, setSpotIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [gallery, setGallery] = useState(null);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState("inbox");
  const [newTripDraft, setNewTripDraft] = useState(null);

  const trips = regions[region].trips;
  const trip = view === "trip" && tripId ? trips.find((x) => x.id === tripId) : null;
  const spots = trip ? ordered(trip) : null;
  const gallerySpot = gallery && spots ? spots[gallery.spotIndex] : null;

  const enterTrip = useCallback((id) => {
    setTripId(id);
    setSpotIndex(0);
    setView("trip");
  }, []);
  const back = useCallback(() => {
    setView("overview");
    setTripId(null);
  }, []);
  const goSpot = useCallback((i) => setSpotIndex(i), []);
  const prev = useCallback(() => setSpotIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setSpotIndex((i) => Math.min((spots ? spots.length : 1) - 1, i + 1)), [spots]);
  const openGallery = useCallback((si, pi) => setGallery({ spotIndex: si, photoIndex: pi }), []);
  const closeGallery = useCallback(() => setGallery(null), []);
  const changeRegion = useCallback((k) => {
    setRegion(k);
    setView("overview");
    setTripId(null);
  }, []);

  const openHome = useCallback(() => setScreen("home"), []);
  const openMain = useCallback(() => setScreen("main"), []);
  const openUpload = useCallback((mode = "inbox") => {
    setUploadMode(mode);
    setUploadOpen(true);
  }, []);
  const closeUpload = useCallback(() => setUploadOpen(false), []);
  const openInbox = useCallback(() => setInboxOpen(true), []);
  const closeInbox = useCallback(() => setInboxOpen(false), []);
  const openJourney = useCallback(() => setJourneyOpen(true), []);
  const closeJourney = useCallback(() => setJourneyOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  const placePhotos = useCallback(async (rows, opts) => {
    const fresh = rows.filter((r) => r.tripId === "__newtrip__");
    const normal = rows.filter((r) => r.tripId !== "__newtrip__");
    let st = null;
    if (normal.length) {
      st = await api.opPlacePhotos(normal.map((r) => ({
        itemId: r.item.id,
        tripId: r.tripId,
        spotId: r.spotId,
        newSpotName: r.newSpotName,
        memo: r.memo,
        lat: r.pickedLat,
        lng: r.pickedLng,
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

  const editTrip = useCallback(async (id, text) => {
    apply(await api.opEditTrip(id, text));
  }, [apply]);

  const editSpot = useCallback(async (id, field, text) => {
    apply(await api.opEditSpot(id, field, text));
  }, [apply]);

  const inboxKeep = useCallback(async (id) => {
    apply(await api.opInboxKeep(id));
  }, [apply]);
  const inboxDiscard = useCallback(async (ids) => {
    apply(await api.opInboxDiscard(ids));
  }, [apply]);
  const inboxPurge = useCallback(async (ids) => {
    apply(await api.opInboxPurge(ids));
  }, [apply]);

  const buildDraft = useCallback((items) => {
    const tr = buildTrip(items);
    if (tr) setNewTripDraft(tr);
    return !!tr;
  }, []);

  const cancelNewTrip = useCallback(() => setNewTripDraft(null), []);
  const saveNewTrip = useCallback(async (tr) => {
    apply(await api.opAddTrip(tr));
    setNewTripDraft(null);
    setRegion(tr.region);
    setTripId(tr.id);
    setSpotIndex(0);
    setView("trip");
    setScreen("main");
    setInboxOpen(false);
  }, [apply]);

  const handleUploadDone = useCallback((result) => {
    setUploadOpen(false);
    apply(result.state);
    if (uploadMode === "newtrip" && result.added.length) {
      const tr = buildTrip(result.added);
      if (tr) {
        setNewTripDraft(tr);
        return;
      }
    }
    setInboxOpen(true);
  }, [apply, uploadMode]);

  useEffect(() => {
    function onKey(e) {
      if (journeyOpen) return;
      if (gallery) {
        const sp = spots[gallery.spotIndex];
        if (!sp) return;
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

  return {
    data,
    loadError,
    apply,
    regions,
    inboxItems,
    region,
    setRegion,
    screen,
    view,
    tripId,
    spotIndex,
    collapsed,
    gallery,
    gallerySpot,
    journeyOpen,
    inboxOpen,
    uploadOpen,
    uploadMode,
    newTripDraft,
    trips,
    trip,
    spots,
    enterTrip,
    back,
    goSpot,
    prev,
    next,
    openGallery,
    closeGallery,
    changeRegion,
    openHome,
    openMain,
    openUpload,
    closeUpload,
    openInbox,
    closeInbox,
    openJourney,
    closeJourney,
    toggleCollapsed,
    setGallery,
    placePhotos,
    editTrip,
    editSpot,
    inboxKeep,
    inboxDiscard,
    inboxPurge,
    buildDraft,
    cancelNewTrip,
    saveNewTrip,
    handleUploadDone
  };
}
