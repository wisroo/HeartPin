/* HeartPin · photo upload (multi drag&drop) — reads EXIF, dummy-fills missing meta */
import { useState, useRef } from "react";
import { CHAR } from "../chars.js";
import { readExif } from "../exif.js";

const TINTS = ["cool", "warm", "sage", "gold"];

// demo fallback: missing date/GPS -> coherent "강릉" cluster so the flow completes
// (실서비스에선 HEIC 등 EXIF를 못 읽는 사진의 메타를 백엔드에서 추출하는 것으로 교체)
const DEMO = {
  dates: ["2025-12-20", "2025-12-21"],
  spots: [
    { lat: 37.7713, lng: 128.9470, day: 0, t: "10:30" },
    { lat: 37.7990, lng: 128.9170, day: 0, t: "15:10" },
    { lat: 37.7950, lng: 128.9080, day: 1, t: "11:20" }
  ]
};
function dummyFor(i) {
  const s = DEMO.spots[i % DEMO.spots.length];
  const jit = () => (Math.random() - 0.5) * 0.0015;
  const mm = (parseInt(s.t.slice(3), 10) + i * 3) % 60;
  return { date: DEMO.dates[s.day], time: s.t.slice(0, 3) + ("0" + mm).slice(-2), lat: +(s.lat + jit()).toFixed(5), lng: +(s.lng + jit()).toFixed(5) };
}

async function process(fileList) {
  const files = [...fileList].filter((f) => f.type.indexOf("image/") === 0 || /\.(heic|heif)$/i.test(f.name));
  const items = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const meta = await readExif(f);
    let date = meta && meta.date, time = meta && meta.time, lat = meta && meta.lat, lng = meta && meta.lng;
    let metaSource = (meta && meta.lat != null) ? "exif" : (meta && meta.date ? "exif" : "demo");
    if (date == null || lat == null) {
      const dm = dummyFor(i);
      if (date == null) { date = dm.date; time = time || dm.time; }
      if (lat == null) { lat = dm.lat; lng = dm.lng; }
      metaSource = "demo";
    }
    items.push({
      id: "up" + Date.now() + "_" + i, kind: "unsorted",
      date, time: time || "12:00", lat, lng, tint: TINTS[i % 4],
      autoLabel: (f.name.replace(/\.[^.]+$/, "") || "새 사진").slice(0, 26),
      src: URL.createObjectURL(f), metaSource
    });
  }
  return items;
}

export default function Upload({ onAdd, onClose, title }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const handle = async (fileList) => {
    setBusy(true);
    const items = await process(fileList);
    setBusy(false);
    if (items.length) onAdd(items); else onClose();
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
              <div className="hp-drop-main">사진 정보 읽는 중…</div>
            </div>
          )
          : (
            <label
              className={`hp-dropzone ${over ? "over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
            >
              <input ref={inputRef} type="file" accept="image/*,.heic,.heif" multiple className="hp-file-input" onChange={(e) => handle(e.target.files)} />
              <div className="hp-drop-ico">🖼️</div>
              <div className="hp-drop-main">사진을 여기로 끌어다 놓기</div>
              <div className="hp-drop-sub">또는 눌러서 선택 (여러 장 가능)</div>
            </label>
          )}
        <div className="hp-upload-foot">
          <img src={CHAR.nyong.src} alt="뇽이" className="hp-upload-char" />
          <p>EXIF 없는 사진(아이폰 HEIC 등)은 데모용 위치·날짜를 채워서 흐름을 보여줄게! (실제 서비스는 백엔드가 읽어줘요)</p>
        </div>
      </div>
    </div>
  );
}
