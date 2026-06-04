/* HeartPin · "이렇게 정리했어요" — auto-built trip preview/confirm */
import { useState } from "react";
import { Photo } from "./ui.jsx";

export default function TripPreview({ draft, onCancel, onSave }) {
  const [trip, setTrip] = useState(draft);
  const totalSpots = trip.days.reduce((a, d) => a + d.spots.length, 0);
  const totalPhotos = trip.days.reduce((a, d) => a + d.spots.reduce((b, s) => b + s.photos.length, 0), 0);
  const setSpotName = (di, si, v) => setTrip((t) => ({
    ...t,
    days: t.days.map((d, j) => j !== di ? d : { ...d, spots: d.spots.map((s, k) => k !== si ? s : { ...s, name: v }) })
  }));

  return (
    <div className="hp-preview" onClick={onCancel}>
      <div className="hp-preview-card" onClick={(e) => e.stopPropagation()}>
        <div className="hp-preview-head">
          <div>
            <div className="hp-preview-kicker">✦ 이렇게 정리했어요</div>
            <input className="hp-preview-title" value={trip.title} onChange={(e) => setTrip((t) => ({ ...t, title: e.target.value }))} />
          </div>
          <button className="hp-preview-close" type="button" onClick={onCancel} aria-label="닫기">✕</button>
        </div>
        <div className="hp-preview-meta">
          <span className={"hp-chip t-" + (trip.region === "domestic" ? "cool" : "warm")}>{trip.region === "domestic" ? "🇰🇷 국내" : "✈ 국외"}</span>
          <span>{trip.dateLabel}</span>
          <span>{`Day ${trip.days.length} · 장소 ${totalSpots} · 사진 ${totalPhotos}`}</span>
        </div>
        <div className="hp-preview-body">
          {trip.days.map((d, di) => (
            <div key={di} className="hp-pv-day">
              <div className="hp-pv-daylabel">{d.label}<span>{d.date}</span></div>
              {d.spots.map((s, si) => (
                <div key={s.id} className="hp-pv-spot">
                  <span className="hp-pv-num">📍</span>
                  <div className="hp-pv-spotmain">
                    <input className="hp-pv-name" value={s.name} onChange={(e) => setSpotName(di, si, e.target.value)} />
                    <div className="hp-pv-thumbs">
                      {s.photos.slice(0, 5).map((p, k) => <Photo key={k} photo={p} className="hp-pv-thumb" />)}
                      {s.photos.length > 5 && <span className="hp-pv-more">+{s.photos.length - 5}</span>}
                    </div>
                  </div>
                  <span className="hp-pv-count">{s.photos.length}장</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="hp-preview-foot">
          <span className="hp-preview-note">장소 이름은 나중에 위치로 자동 채워져요</span>
          <button className="hp-bar-ghost" type="button" onClick={onCancel}>취소</button>
          <button className="hp-bar-act" type="button" onClick={() => onSave(trip)}>이 여행 저장</button>
        </div>
      </div>
    </div>
  );
}
