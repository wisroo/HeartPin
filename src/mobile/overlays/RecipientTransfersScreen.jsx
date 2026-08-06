import { useEffect, useState } from "react";
import * as api from "../../api.js";
import { Ico } from "../ui/MobileAtoms.jsx";

const HOUR_MS = 60 * 60 * 1000;

export function startBrowserDownload({ url, filename }, documentRef = document) {
  const anchor = documentRef.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  documentRef.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function phoneLocationFor(owner) {
  return owner === "bara" ? "bara_phone" : "nyong_phone";
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "용량 정보 없음";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function remainingLabel(expiresAt) {
  const hours = Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / HOUR_MS));
  if (hours <= 24) return `${hours}시간 남음`;
  return `${Math.ceil(hours / 24)}일 남음`;
}

function sourceLabel(owner) {
  return owner === "bara" ? "바라가 보냈어요" : "뇽이가 보냈어요";
}

function LoadingRows() {
  return (
    <div className="hpm-receive-list" role="status" aria-label="받을 원본 불러오는 중">
      {[0, 1].map((index) => (
        <div className="hpm-receive-card skeleton" key={index} aria-hidden="true">
          <span className="hpm-receive-skeleton title" />
          <span className="hpm-receive-skeleton meta" />
          <span className="hpm-receive-skeleton action" />
        </div>
      ))}
    </div>
  );
}

export default function RecipientTransfersScreen({
  nav,
  owner,
  downloadFile = startBrowserDownload,
}) {
  const [reloadKey, setReloadKey] = useState(0);
  const [transfers, setTransfers] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const [readyIds, setReadyIds] = useState([]);
  const [busyKey, setBusyKey] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  useEffect(() => {
    let alive = true;
    setLoadState("loading");
    setLoadError(null);
    Promise.resolve()
      .then(() => api.listIncomingTransfers(owner))
      .then(
        (rows) => {
          if (!alive) return;
          setTransfers(rows);
          setLoadState("ready");
        },
        (error) => {
          if (!alive) return;
          setLoadError(error.message);
          setLoadState("error");
        },
      );
    return () => {
      alive = false;
    };
  }, [owner, reloadKey]);

  const setRowError = (id, message) => {
    setRowErrors((current) => ({ ...current, [id]: message }));
  };

  const startDownload = async (transfer) => {
    const key = `download:${transfer.id}`;
    setBusyKey(key);
    setRowError(transfer.id, null);
    try {
      const signed = await api.createIncomingTransferDownload(transfer.id, owner);
      downloadFile(signed);
      setReadyIds((ids) => ids.includes(transfer.id) ? ids : [...ids, transfer.id]);
    } catch (error) {
      setRowError(transfer.id, error.message);
    } finally {
      setBusyKey(null);
    }
  };

  const confirmSaved = async (transfer, location) => {
    const key = `confirm:${transfer.id}`;
    setBusyKey(key);
    setRowError(transfer.id, null);
    try {
      await api.confirmIncomingTransferSaved(transfer.id, owner, location);
      setTransfers((rows) => rows.filter((row) => row.id !== transfer.id));
      setReadyIds((ids) => ids.filter((id) => id !== transfer.id));
      nav.toast("원본 저장을 확인했어요");
    } catch (error) {
      setRowError(transfer.id, error.message);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="hpm-full dotgrid">
      <div className="hpm-top" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <button className="ic back" aria-label="받을 원본 닫기" onClick={nav.back}>‹</button>
        <div className="ttl" style={{ fontSize: 20 }}>받을 원본</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="hpm-view">
        <div className="hpm-pad hpm-receive-pad">
          <div className="hpm-receive-intro">
            <Ico.inbox width="22" height="22" />
            <div>
              <b>파트너가 보낸 원본</b>
              <span>저장이 끝난 뒤 위치를 확인하면 임시 원본이 정리돼요.</span>
            </div>
          </div>

          {loadState === "loading" && <LoadingRows />}

          {loadState === "error" && (
            <div className="hpm-receive-state" role="alert">
              <b>원본 목록을 열지 못했어요</b>
              <p>{loadError}</p>
              <button className="hpm-btn ghost" onClick={() => setReloadKey((key) => key + 1)}>
                다시 불러오기
              </button>
            </div>
          )}

          {loadState === "ready" && transfers.length === 0 && (
            <div className="hpm-receive-state empty">
              <span className="hpm-receive-empty-icon"><Ico.image width="28" height="28" /></span>
              <b>기다리는 원본이 없어요</b>
              <p>파트너가 새 사진을 올리면 여기에 나타나요.</p>
            </div>
          )}

          {loadState === "ready" && transfers.length > 0 && (
            <div className="hpm-receive-list">
              {transfers.map((transfer) => {
                const isReady = readyIds.includes(transfer.id);
                const downloading = busyKey === `download:${transfer.id}`;
                const confirming = busyKey === `confirm:${transfer.id}`;
                const disabled = busyKey !== null;
                return (
                  <article className="hpm-receive-card" key={transfer.id}>
                    <div className="hpm-receive-head">
                      <span className="hpm-receive-file-icon"><Ico.image width="20" height="20" /></span>
                      <div className="hpm-receive-file">
                        <b title={transfer.originalName}>{transfer.originalName}</b>
                        <span>{sourceLabel(transfer.sourceOwner)}</span>
                      </div>
                      <span className="hpm-chip sm warm">{remainingLabel(transfer.expiresAt)}</span>
                    </div>

                    <div className="hpm-receive-meta">
                      <span>{formatSize(transfer.originalSize)}</span>
                      <span>{transfer.mimeType || "파일"}</span>
                    </div>

                    {rowErrors[transfer.id] && (
                      <p className="hpm-receive-error" role="alert">{rowErrors[transfer.id]}</p>
                    )}

                    {!isReady ? (
                      <button
                        className="hpm-btn block"
                        aria-label={`${transfer.originalName} 다운로드`}
                        disabled={disabled}
                        onClick={() => startDownload(transfer)}
                      >
                        {downloading ? "다운로드 준비 중" : "다운로드"}
                      </button>
                    ) : (
                      <div className="hpm-receive-confirm">
                        <div>
                          <b>저장을 마쳤나요?</b>
                          <span>실제로 저장된 위치를 선택해 주세요.</span>
                        </div>
                        <div className="hpm-receive-actions">
                          <button
                            className="hpm-btn"
                            disabled={disabled}
                            onClick={() => confirmSaved(transfer, phoneLocationFor(owner))}
                          >
                            {confirming ? "확인 중" : "내 폰에 저장 완료"}
                          </button>
                          <button
                            className="hpm-btn ghost"
                            disabled={disabled}
                            onClick={() => confirmSaved(transfer, "personal_pc")}
                          >
                            개인 PC에 저장 완료
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
