/* HeartPin · app root — core state + platform shell */
import { useHeartPinState } from "./core/useHeartPinState.js";
import { useResponsiveMode } from "./core/useResponsiveMode.js";
import Journey from "./components/Journey.jsx";
import Inbox from "./components/Inbox.jsx";
import Upload from "./components/Upload.jsx";
import TripPreview from "./components/TripPreview.jsx";
import MobileApp from "./mobile/MobileApp.jsx";
import WebApp from "./web/WebApp.jsx";

export default function App() {
  const mode = useResponsiveMode();
  const app = useHeartPinState();

  if (app.loadError) {
    return (
      <div className="hp-app hp-boot">
        <p>서버에 연결할 수 없어요 😢<br /><small>{app.loadError}</small><br /><small>Mac에서 <code>npm run demo</code>가 실행 중인지 확인해 주세요.</small></p>
      </div>
    );
  }
  if (!app.data) return <div className="hp-app hp-boot"><p>기록 불러오는 중…</p></div>;

  return (
    <div className="hp-app">
      {mode === "mobile" ? <MobileApp app={app} /> : <WebApp app={app} />}

      {app.journeyOpen && app.trip && <Journey trip={app.trip} onClose={app.closeJourney} />}

      {app.inboxOpen && (
        <Inbox
          items={app.inboxItems}
          onClose={app.closeInbox}
          onPlace={app.placePhotos}
          onNewTrip={app.buildDraft}
          onKeep={app.inboxKeep}
          onDiscard={app.inboxDiscard}
          onPurge={app.inboxPurge}
        />
      )}

      {app.uploadOpen && (
        <Upload
          title={app.uploadMode === "newtrip" ? "새 여행 만들기" : "사진 불러오기"}
          onClose={app.closeUpload}
          onDone={app.handleUploadDone}
        />
      )}

      {app.newTripDraft && <TripPreview draft={app.newTripDraft} onCancel={app.cancelNewTrip} onSave={app.saveNewTrip} />}
    </div>
  );
}
