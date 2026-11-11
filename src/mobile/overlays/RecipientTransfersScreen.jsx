import { saveOriginalToLibrary, supportsOriginalLibrarySave } from "../../platform/media/saveOriginalToLibrary.js";
import RecipientTransferList from "../../features/transfers/RecipientTransferList.jsx";
export { startBrowserDownload } from "../../features/transfers/RecipientTransferList.jsx";

export default function RecipientTransfersScreen({ nav, owner, downloadFile, saveToLibrary = supportsOriginalLibrarySave() ? saveOriginalToLibrary : undefined }) {
  return (
    <div className="hpm-full dotgrid">
      <div className="hpm-top" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <button className="ic back" aria-label="받을 원본 닫기" onClick={nav.back}>‹</button>
        <div className="ttl" style={{ fontSize: 20 }}>받을 원본</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="hpm-view">
        <div className="hpm-pad hpm-receive-pad">
          <RecipientTransferList key={owner} owner={owner} downloadFile={downloadFile} saveToLibrary={saveToLibrary} onSaved={() => nav.toast("원본 저장을 확인했어요")} />
        </div>
      </div>
    </div>
  );
}
