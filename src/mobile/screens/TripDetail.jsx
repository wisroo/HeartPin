import { Photo, Speech, Ico } from "../ui/MobileAtoms.jsx";
import { ordered, autoLine } from "../../data.js";

function tripStats(trip) {
  let spots = 0, photos = 0;
  trip.days.forEach(d => d.spots.forEach(s => { spots++; photos += s.photos.length; }));
  return { spots, photos };
}

export function mobileLines(spot, settings) {
  if (!settings || settings.tone === "다정") {
    return { guide: spot.guide, reaction: spot.reaction };
  }
  const a = autoLine({ time: spot.time });
  return { guide: a.guide, reaction: a.reaction };
}

export default function TripDetail({ trip, nav, settings }) {
  return (
    <div className="hpm-app">
      <div className="hpm-top">
        <button className="ic back" onClick={nav.back}>‹</button>
        <div className="ttl" style={{ fontSize: 20 }}>{trip.title}</div>
        <button className="ic" onClick={() => nav.openMap(trip, 0)}><Ico.map /></button>
      </div>
      <div className="hpm-view">
        <div className="hpm-pad">
          <button className="hpm-playentry" onClick={() => nav.openPlayer(trip)}>
            <span className="pi"><Ico.play width="14" height="14" /></span>
            <span className="pt"><b>여정 재생</b><small>핀을 따라 그날을 다시 걷기 · 큰 화면은 PC에서 ↗</small></span>
          </button>

          {trip.days.map((day, di) => (
            <div key={di}>
              <div className="hpm-daylabel"><b>{day.label}</b><span>{day.date}</span></div>
              {day.spots.map((spot) => {
                const ln = mobileLines(spot, settings);
                const gi = ordered(trip).findIndex(s => s.id === spot.id);
                const coverPhoto = spot.photos[0];
                return (
                  <div key={spot.id} className="hpm-spotcard">
                    <div className="hpm-spotcard-cover" onClick={() => nav.openMoment(spot, 0)}>
                      <Photo
                        className="hpm-trip-cover"
                        style={{ height: "100%" }}
                        photo={coverPhoto}
                        label={coverPhoto?.label}
                        tint={coverPhoto?.tint}
                      />
                      <span className="hpm-spot-time">{spot.time}</span>
                      <span className="hpm-spot-count">{spot.photos.length}컷</span>
                    </div>
                    <div className="hpm-spotcard-body">
                      <h3 className="hpm-spot-name">{spot.name}</h3>
                      <div className="hpm-talk">
                        <Speech who="bara" text={ln.guide} compact />
                        <Speech who="nyong" text={ln.reaction} compact />
                      </div>
                      <div className="hpm-thumbs">
                        {spot.photos.slice(0, 4).map((ph, pi) => (
                          <Photo key={pi} photo={ph} cap={false} />
                        ))}
                      </div>
                      <button className="hpm-btn ghost" style={{ width: "100%", marginTop: 11, fontSize: 14 }} onClick={() => nav.openMap(trip, gi)}>
                        <Ico.pin width="16" height="16" /> 지도에서 보기
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
