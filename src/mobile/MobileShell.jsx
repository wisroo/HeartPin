import { useMemo, useState, useRef } from "react";
import { Ico } from "./ui/MobileAtoms.jsx";
import JourneyScreen from "./screens/JourneyScreen.jsx";
import TripDetail from "./screens/TripDetail.jsx";
import MobileMapScreen from "./screens/map/MobileMapScreen.jsx";
import InboxScreen from "./screens/InboxScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import MomentViewer from "./overlays/MomentViewer.jsx";
import JourneyPlayer from "./overlays/JourneyPlayer.jsx";
import SettingsScreen from "./overlays/SettingsScreen.jsx";
import CoupleScreen from "./overlays/CoupleScreen.jsx";
import UploadSheet from "./overlays/UploadSheet.jsx";

const TABS = [
  ["journey", "여정", "journey"],
  ["map", "지도", "map"],
  ["__fab", "", ""],
  ["inbox", "정리함", "inbox"],
  ["profile", "프로필", "profile"],
];
const detectPlatform = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios" : "android";

export default function MobileShell({ app, settings, setSettings }) {
  const [tab, setTab] = useState("journey");
  const [detail, setDetail] = useState(null);
  const [mapEntry, setMapEntry] = useState(null);
  const [overlays, setOverlays] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const allTrips = useMemo(() => [
    ...app.regions.domestic.trips,
    ...app.regions.intl.trips,
  ], [app.regions.domestic.trips, app.regions.intl.trips]);

  const push = (o) => setOverlays((s) => [...s, o]);
  const popOverlay = () => setOverlays((s) => s.slice(0, -1));
  const showToast = (m) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  };

  const nav = {
    back: () => {
      if (overlays.length) popOverlay();
      else if (detail) setDetail(null);
    },
    openTrip: (trip) => setDetail(trip),
    openMap: (trip, idx) => {
      setMapEntry({ tripId: trip.id, spotIndex: idx || 0 });
      setDetail(null);
      setOverlays([]);
      setTab("map");
    },
    openMoment: (spot, idx) => push({ type: "moment", spot, idx: idx || 0 }),
    openMomentItem: (item) =>
      push({
        type: "moment",
        spot: {
          name: item.autoLabel,
          photos: [item],
          time: item.time,
          reaction: "이 사진 마음에 들어! 📸",
        },
        idx: 0,
      }),
    openPlayer: (trip) => push({ type: "player", trip }),
    openSettings: () => push({ type: "settings" }),
    openCouple: () => push({ type: "couple" }),
    openUpload: () => push({ type: "upload" }),
    close: () => setOverlays([]),
    toast: showToast,
    setSettings,
  };

  const switchTab = (name) => {
    if (name === "__fab") return nav.openUpload();
    setDetail(null);
    setOverlays([]);
    if (name === "map") setMapEntry(null);
    setTab(name);
  };

  let root;
  if (tab === "journey")
    root = detail ? (
      <TripDetail trip={detail} nav={nav} settings={settings} />
    ) : (
      <JourneyScreen app={app} nav={nav} settings={settings} />
    );
  else if (tab === "map")
    root = (
      <MobileMapScreen
        key={mapEntry ? `${mapEntry.tripId}:${mapEntry.spotIndex}` : "overview"}
        trips={allTrips}
        initialTripId={mapEntry?.tripId}
        initialSpotIndex={mapEntry?.spotIndex}
        nav={{ ...nav, back: () => switchTab("journey") }}
        settings={settings}
      />
    );
  else if (tab === "inbox")
    root = <InboxScreen app={app} nav={nav} settings={settings} />;
  else root = <ProfileScreen app={app} nav={nav} settings={settings} />;

  return (
    <div
      className="hpm-screen dotgrid"
      data-theme={settings.theme}
      data-platform={detectPlatform()}
      style={{ height: "100%" }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {root}
      </div>
      <nav className="hpm-tabbar">
        {TABS.map(([name, label, ico]) =>
          name === "__fab" ? (
            <span key="fab" style={{ display: "contents" }}>
              <button className="hpm-tab spacer">
                <div className="ti" />
                <div className="tl" />
              </button>
              <button
                className="hpm-fab"
                aria-label="올리기"
                onClick={() => switchTab("__fab")}
              >
                <Ico.plus />
              </button>
            </span>
          ) : (
            <button
              key={name}
              className={`hpm-tab ${tab === name ? "on" : ""}`}
              onClick={() => switchTab(name)}
            >
              <div className="ti">{Ico[ico]()}</div>
              <div className="tl">{label}</div>
            </button>
          )
        )}
      </nav>
      {overlays.map((o, i) => (
        <div key={i}>
          {o.type === "moment" && (
            <MomentViewer
              spot={o.spot}
              startIdx={o.idx}
              nav={nav}
              settings={settings}
            />
          )}
          {o.type === "player" && (
            <JourneyPlayer trip={o.trip} nav={nav} settings={settings} />
          )}
          {o.type === "settings" && (
            <SettingsScreen nav={nav} settings={settings} />
          )}
          {o.type === "couple" && (
            <CoupleScreen nav={nav} settings={settings} />
          )}
          {o.type === "upload" && (
            <UploadSheet app={app} nav={nav} settings={settings} />
          )}
        </div>
      ))}
      {toast && <div className="hpm-toast">{toast}</div>}
    </div>
  );
}
