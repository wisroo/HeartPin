/* HeartPin · Journey — fullscreen cinematic playback */
import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import { TILES, ATTR, smooth, pinIcon, charIcon } from "../mapUtil.js";
import { CHAR } from "../chars.js";
import { ordered } from "../data.js";
import { Photo } from "./ui.jsx";

export default function Journey({ trip, onClose }) {
  const spots = ordered(trip);
  const elRef = useRef(null), mapRef = useRef(null), lgRef = useRef(null);
  const total = spots.length + 2;          // intro + spots + ending
  const [step, setStep] = useState(0);     // 0=intro, 1..n=spots, n+1=ending
  const [playing, setPlaying] = useState(true);
  const [photoI, setPhotoI] = useState(0);

  const isSpot = step >= 1 && step <= spots.length;
  const sIdx = step - 1;
  const spot = isSpot ? spots[sIdx] : null;

  // init map
  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true, minZoom: 3 });
    L.tileLayer(TILES, { attribution: ATTR, subdomains: "abcd", maxZoom: 19 }).addTo(map);
    mapRef.current = map; lgRef.current = L.layerGroup().addTo(map);
    const locs = spots.filter((s) => s.lat != null);
    if (locs.length) map.fitBounds(locs.map((s) => [s.lat, s.lng]), { padding: [140, 140] });
    else map.setView([36.2, 127.9], 7); // 위치 없는 스팟만 있는 여행 — 기본 뷰
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setStep((s) => Math.min(total - 1, s + 1));
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); map.remove(); };
  }, []);

  // draw + camera per step
  useEffect(() => {
    const map = mapRef.current, lg = lgRef.current; if (!map) return;
    lg.clearLayers();
    const geo = spots.filter((s) => s.lat != null).map((s) => [s.lat, s.lng]);
    if (geo.length > 1) L.polyline(smooth(geo, 16), { color: "#e3814f", weight: 3.5, opacity: 0.4, dashArray: "1 11", lineCap: "round" }).addTo(lg);
    const upto = step > spots.length ? spots.length - 1 : sIdx;
    const doneGeo = spots.slice(0, upto + 1).filter((s) => s.lat != null).map((s) => [s.lat, s.lng]);
    if (upto >= 1 && doneGeo.length > 1) L.polyline(smooth(doneGeo, 16), { color: "#e3814f", weight: 4.5, opacity: 0.95, dashArray: "1 11", lineCap: "round" }).addTo(lg);
    spots.forEach((s, i) => {
      if (s.lat == null) return; // 위치 없는 스팟은 핀 생략 (자막·사진은 그대로 진행)
      const state = isSpot && i === sIdx ? "active" : ((step > spots.length || i < sIdx) ? "done" : "");
      L.marker([s.lat, s.lng], { icon: pinIcon(i + 1, s.name, state), zIndexOffset: i === sIdx ? 1000 : 0 }).addTo(lg);
    });
    if (isSpot && spot.lat != null) {
      L.marker([spot.lat, spot.lng], { icon: charIcon(), zIndexOffset: 2000, interactive: false }).addTo(lg);
      map.flyTo([spot.lat, spot.lng], 14, { duration: 2.0 });
    } else if (geo.length) {
      map.flyToBounds(geo, { padding: [140, 140], duration: 1.4 });
    }
    setPhotoI(0);
  }, [step]);

  // scene auto-advance
  useEffect(() => {
    if (!playing) return;
    if (step >= total - 1) { setPlaying(false); return; }
    const dur = step === 0 ? 4600 : 8200;
    const id = setTimeout(() => setStep((s) => Math.min(total - 1, s + 1)), dur);
    return () => clearTimeout(id);
  }, [step, playing]);

  // cycle moments inside a spot scene
  useEffect(() => {
    if (!isSpot || !playing || spot.photos.length < 2) return;
    const id = setInterval(() => setPhotoI((p) => (p + 1) % spot.photos.length), 2600);
    return () => clearInterval(id);
  }, [step, playing, isSpot]);

  const go = (d) => setStep((s) => Math.max(0, Math.min(total - 1, s + d)));

  return (
    <div className="hp-journey">
      <div className="hp-jmap" ref={elRef} />
      <div className="hp-journey-veil" />

      {/* top bar */}
      <div className="hp-jtop">
        <div className="hp-jtitle">여정 재생 · <b>{trip.title}</b></div>
        <div className="hp-jprogress">
          {Array.from({ length: total }).map((_, i) => <span key={i} className={`hp-jbar ${i <= step ? "on" : ""}`} />)}
        </div>
        <button className="hp-jclose" onClick={onClose} type="button" aria-label="닫기">✕</button>
      </div>

      {/* intro */}
      {step === 0 && (
        <div className="hp-jcard intro">
          <div className="hp-jchip">{trip.region === "domestic" ? "🇰🇷 국내" : "✈ 국외"}</div>
          <h2>{trip.title}</h2>
          <p className="hp-jdate">{trip.dateLabel}</p>
          <p className="hp-jstat">{`Spot ${spots.length} · ${spots.reduce((a, s) => a + s.photos.length, 0)}컷의 기억`}</p>
          <div className="hp-jchars">
            <img src={CHAR.bara.src} alt="바라" />
            <img src={CHAR.nyong.src} alt="뇽이" />
          </div>
          <div className="hp-jgo">이제 출발해볼까? ▶</div>
        </div>
      )}

      {/* spot scene */}
      {isSpot && (
        <div className="hp-jscene" key={step}>
          <div className="hp-jspotchip">{`${spot.dayLabel} · ${spot.dayDate}`}</div>
          <div className="hp-jpolaroid">
            <Photo photo={spot.photos[photoI]} className="hp-jphoto" />
            <div className="hp-jcap">
              {spot.name}
              {spot.photos.length > 1 && (
                <span className="hp-jdots">
                  {spot.photos.map((_, i) => <i key={i} className={i === photoI ? "on" : ""} />)}
                </span>
              )}
            </div>
          </div>
          <div className="hp-jsubs">
            <div className="hp-jsub bara">
              <img src={CHAR.bara.src} alt="바라" />
              <p><b>바라 </b>{spot.guide}</p>
            </div>
            <div className="hp-jsub nyong">
              <img src={CHAR.nyong.src} alt="뇽이" />
              <p><b>뇽이 </b>{spot.reaction}</p>
            </div>
          </div>
        </div>
      )}

      {/* ending */}
      {step === total - 1 && (
        <div className="hp-jcard end">
          <div className="hp-jbadge">★</div>
          <h2>여정 완료!</h2>
          <p className="hp-jstat">{`${trip.title} · ${spots.length}곳을 함께 돌았어요`}</p>
          <div className="hp-jchars">
            <img src={CHAR.bara.src} alt="바라" />
            <img src={CHAR.nyong.src} alt="뇽이" />
          </div>
          <div className="hp-jend-btns">
            <button className="hp-jbtn" type="button" onClick={() => { setStep(0); setPlaying(true); }}>↺ 다시 보기</button>
            <button className="hp-jbtn ghost" type="button" onClick={onClose}>닫기</button>
          </div>
        </div>
      )}

      {/* transport controls */}
      <div className="hp-jctrl">
        <button className="hp-jctrl-btn" onClick={() => go(-1)} disabled={step === 0} type="button" aria-label="이전">‹</button>
        <button className="hp-jctrl-btn play" onClick={() => setPlaying((p) => !p)} type="button" aria-label="재생/일시정지">{playing ? "❚❚" : "▶"}</button>
        <button className="hp-jctrl-btn" onClick={() => go(1)} disabled={step === total - 1} type="button" aria-label="다음">›</button>
      </div>
    </div>
  );
}
