import { useState } from "react";
import { Photo, Avatar, Ico } from "../ui/MobileAtoms.jsx";
import { ordered } from "../../data.js";

function tripStats(trip) {
  let spots = 0, photos = 0;
  trip.days.forEach(d => d.spots.forEach(s => { spots++; photos += s.photos.length; }));
  return { spots, photos };
}

export default function JourneyScreen({ app, nav, settings }) {
  const [region, setRegion] = useState("all");
  const dom = app.regions.domestic.trips;
  const intl = app.regions.intl.trips;
  const allTrips = [...dom, ...intl];
  const trips = region === "all" ? allTrips : region === "domestic" ? dom : intl;

  let totSpots = 0, totPhotos = 0;
  allTrips.forEach(t => { const s = tripStats(t); totSpots += s.spots; totPhotos += s.photos; });
  const totTrips = allTrips.length;

  return (
    <div className="hpm-app">
      <div className="hpm-top">
        <div className="mk" />
        <div className="ttl">여정</div>
        <button className="ic"><Ico.search /></button>
      </div>
      <div className="hpm-view">
        <div className="hpm-pad">
          <div className="hpm-strip">
            <div className="hpm-strip-top">
              <div style={{ display: "flex", gap: 16 }}>
                <div className="hpm-stat"><b>{totTrips}</b><span>여행</span></div>
                <div className="hpm-stat"><b>{totSpots}</b><span>스팟</span></div>
                <div className="hpm-stat"><b>{totPhotos}</b><span>사진</span></div>
              </div>
              <div style={{ display: "flex" }}>
                <Avatar who="bara" size={32} />
                <Avatar who="nyong" size={32} style={{ marginLeft: -11 }} />
              </div>
            </div>
            <div className="hpm-strip-line"><Ico.chat width="15" height="15" />가장 가까운 추억 · <b>오사카 여행, 다시 볼까요?</b></div>
          </div>

          <div className="hpm-seg" style={{ marginBottom: 13 }}>
            <button className={`hpm-chip ${region === "all" ? "on" : ""}`} onClick={() => setRegion("all")}>전체 {totTrips}</button>
            <button className={`hpm-chip ${region === "domestic" ? "on" : ""}`} onClick={() => setRegion("domestic")}>국내 {dom.length}</button>
            <button className={`hpm-chip ${region === "intl" ? "on" : ""}`} onClick={() => setRegion("intl")}>국외 {intl.length}</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {trips.map(t => {
              const st = tripStats(t);
              return (
                <button key={t.id} className="hpm-trip" onClick={() => nav.openTrip(t)}>
                  <Photo className="hpm-trip-cover" photo={t.cover} />
                  <div className="hpm-trip-meta">
                    <div className="hpm-trip-row">
                      <span className="hpm-trip-name">{t.title}</span>
                      <span className="hpm-chip sm cool">{st.photos}장</span>
                    </div>
                    <div className="hpm-trip-date">{t.dateLabel} · 스팟 {st.spots}곳</div>
                    <div className="hpm-trip-tags">
                      {t.tags.map(tag => <span key={tag} className="hpm-chip sm">#{tag}</span>)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
