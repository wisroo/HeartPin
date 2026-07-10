/* HeartPin · app root — core state + platform shell */
import { useState } from "react";
import { useHeartPinState } from "./core/useHeartPinState.js";
import { useResponsiveMode } from "./core/useResponsiveMode.js";
import * as api from "./api.js";
import Journey from "./components/Journey.jsx";
import Inbox from "./components/Inbox.jsx";
import Upload from "./components/Upload.jsx";
import TripPreview from "./components/TripPreview.jsx";
import MobileApp from "./mobile/MobileApp.jsx";
import LoginScreen from "./mobile/onboarding/LoginScreen.jsx";
import { useMobileSettings } from "./mobile/useMobileSettings.js";
import WebApp from "./web/WebApp.jsx";

async function signInAndReload(email, password) {
  await api.signInToSupabase(email, password);
  if (import.meta.env.MODE !== "test") window.location.reload();
}

function SupabaseLogin({ message }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInAndReload(email.trim(), password);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hp-app hp-boot">
      <form className="hp-login" onSubmit={submit}>
        <h1>Supabase 로그인</h1>
        <p>{message}</p>
        <label>
          이메일
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          비밀번호
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <small className="hp-login-error">{error}</small>}
        <button type="submit" disabled={busy || !email.trim() || !password}>{busy ? "로그인 중..." : "로그인"}</button>
      </form>
    </div>
  );
}

function MobileSupabaseLogin() {
  const [settings] = useMobileSettings();
  return (
    <div className="hpm" data-theme={settings.theme} style={{ height: "100dvh" }}>
      <LoginScreen onSignIn={signInAndReload} settings={settings} />
    </div>
  );
}

export default function App() {
  const mode = useResponsiveMode();
  const app = useHeartPinState();

  if (app.loadError) {
    if (api.getApiMode() === "supabase" && app.loadError.includes("Supabase 로그인이 필요")) {
      return mode === "mobile" ? <MobileSupabaseLogin /> : <SupabaseLogin message={app.loadError} />;
    }
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
