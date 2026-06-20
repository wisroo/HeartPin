/* HeartPin · 지도에서 위치 찍기 — 위치 없는 사진에 좌표를 수동 지정 (Phase 0) */
import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import { TILES, ATTR } from "../mapUtil.js";

export default function MapPicker({ initial, onSave, onClose }) {
  const elRef = useRef(null);
  const [pos, setPos] = useState(initial || null);

  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true });
    if (initial) map.setView([initial.lat, initial.lng], 13);
    else map.setView([36.2, 127.9], 7);
    L.tileLayer(TILES, { attribution: ATTR, subdomains: "abcd", maxZoom: 19 }).addTo(map);
    let mk = initial ? L.marker([initial.lat, initial.lng]).addTo(map) : null;
    map.on("click", (e) => {
      if (mk) mk.setLatLng(e.latlng); else mk = L.marker(e.latlng).addTo(map);
      setPos({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) });
    });
    return () => map.remove();
  }, []);

  return (
    <div className="hp-mappick" onClick={onClose}>
      <div className="hp-mappick-card" onClick={(e) => e.stopPropagation()}>
        <div className="hp-mappick-head">
          <b>📍 사진 위치 찍기</b>
          <span>지도를 클릭(탭)해 핀을 놓아주세요 — 확대할수록 정확해요</span>
          <button type="button" className="hp-upload-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="hp-mappick-map" ref={elRef} />
        <div className="hp-mappick-foot">
          <span>{pos ? `📍 ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "아직 핀이 없어요"}</span>
          <button type="button" className="hp-bar-act" disabled={!pos} onClick={() => { onSave(pos); onClose(); }}>이 위치로 저장</button>
        </div>
      </div>
    </div>
  );
}
