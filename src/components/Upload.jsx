/* HeartPin · photo upload (PC 모달) — 서버 업로드(EXIF·해시·압축은 서버), 진행률 표시
 * EXIF 없는 사진은 '위치 없음'으로 분류 (가짜 메타 폴백 제거 — Phase 0) */
import { useState } from "react";
import { CHAR } from "../chars.js";
import * as api from "../api.js";

export default function Upload({ onDone, onClose, title }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState(null);
  const [owner, setOwnerState] = useState(api.getOwner() || "bara");

  const pickOwner = (who) => { api.setOwner(who); setOwnerState(who); };

  const handle = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.indexOf("image/") === 0 || /\.(heic|heif)$/i.test(f.name));
    if (!files.length) { onClose(); return; }
    setBusy(true); setErr(null);
    try {
      const result = await api.uploadPhotos(files, owner, setProg);
      onDone(result);
    } catch (e) {
      setErr(e.message); setBusy(false); setProg(0);
    }
  };

  return (
    <div className="hp-upload" onClick={busy ? undefined : onClose}>
      <div className="hp-upload-card" onClick={(e) => e.stopPropagation()}>
        <button className="hp-upload-close" onClick={onClose} type="button" aria-label="닫기">✕</button>
        <h3>{title || "사진 불러오기"}</h3>
        <p className="hp-upload-sub">여러 장을 한 번에 올릴 수 있어요. 촬영 날짜·위치(EXIF)를 읽어 자동 정리합니다.</p>
        {busy
          ? (
            <div className="hp-dropzone busy">
              <div className="hp-drop-ico">⏳</div>
              <div className="hp-drop-main">{prog < 1 ? `올리는 중… ${Math.round(prog * 100)}%` : "사진 정보 읽고 보관소에 담는 중…"}</div>
            </div>
          )
          : (
            <label
              className={`hp-dropzone ${over ? "over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
            >
              <input type="file" accept="image/*,.heic,.heif" multiple className="hp-file-input" onChange={(e) => handle(e.target.files)} />
              <div className="hp-drop-ico">🖼️</div>
              <div className="hp-drop-main">사진을 여기로 끌어다 놓기</div>
              <div className="hp-drop-sub">또는 눌러서 선택 (여러 장 가능)</div>
            </label>
          )}
        {err && <p className="hp-upload-err">⚠️ {err}</p>}
        <div className="hp-upload-owner">
          <span>올리는 사람</span>
          <button type="button" className={`hp-owner-btn ${owner === "bara" ? "on" : ""}`} onClick={() => pickOwner("bara")}>
            <img src={CHAR.bara.src} alt="" /> 바라
          </button>
          <button type="button" className={`hp-owner-btn ${owner === "nyong" ? "on" : ""}`} onClick={() => pickOwner("nyong")}>
            <img src={CHAR.nyong.src} alt="" /> 뇽이
          </button>
        </div>
        <div className="hp-upload-foot">
          <img src={CHAR.nyong.src} alt="뇽이" className="hp-upload-char" />
          <p>날짜·위치를 못 읽은 사진은 정리함의 '위치 없음'에 모아둘게! 거기서 직접 배치하면 돼요.</p>
        </div>
      </div>
    </div>
  );
}
