import { useRef, useState } from "react";
import { getApiMode } from "../api.js";
import Home from "../components/Home.jsx";
import WebMapShell from "./WebMapShell.jsx";
import WebRecipientTransfers from "./WebRecipientTransfers.jsx";

export default function WebApp({ app }) {
  const dialog = useRef(null);
  const [receiving, setReceiving] = useState(false);
  const canReceive = getApiMode() === "supabase";

  function openRecipientTransfers() {
    dialog.current.showModal();
    setReceiving(true);
  }

  if (app.screen !== "home") return <WebMapShell app={app} />;

  return (
    <>
      <Home
        regions={app.regions}
        region={app.region}
        trips={app.trips}
        onRegion={app.setRegion}
        onOpenTrip={(id) => {
          app.enterTrip(id);
          app.openMain();
        }}
        onOpenMap={() => {
          app.back();
          app.openMain();
        }}
        onNewTrip={() => app.openUpload("newtrip")}
        onUpload={() => app.openUpload("inbox")}
        onInbox={app.openInbox}
        inboxCount={app.inboxItems.length}
        onReceiveOriginals={canReceive ? openRecipientTransfers : undefined}
      />
      {canReceive && (
        <dialog
          ref={dialog}
          className="hpm hp-receive-dialog"
          aria-labelledby="hp-receive-heading"
          onClose={() => setReceiving(false)}
        >
          <header>
            <h2 id="hp-receive-heading">받을 원본</h2>
            <button type="button" className="hp-top-btn ghost" onClick={() => dialog.current.close()}>닫기</button>
          </header>
          {receiving && <WebRecipientTransfers />}
        </dialog>
      )}
    </>
  );
}
