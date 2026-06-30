/* HeartPin Mobile · 여정 (home=gallery) + trip detail */

// tone-aware lines: authored "다정" set, else auto-generated
function hpLines(spot, tone) {
  if (tone === "다정" || !tone) return { guide: spot.guide, reaction: spot.reaction };
  const a = window.HP_AUTOLINE({ time: spot.time, tone });
  return { guide: a.guide, reaction: a.reaction };
}

function tripStats(trip) {
  let spots = 0, photos = 0;
  trip.days.forEach(d => d.spots.forEach(s => { spots++; photos += s.photos.length; }));
  return { spots, photos };
}

function allTrips() {
  return [...window.HP_DATA.regions.domestic.trips, ...window.HP_DATA.regions.intl.trips];
}

function JourneyScreen({ nav, tone }) {
  const [region, setRegion] = useState("all");
  const dom = window.HP_DATA.regions.domestic.trips;
  const intl = window.HP_DATA.regions.intl.trips;
  const trips = region === "all" ? allTrips() : region === "domestic" ? dom : intl;

  // totals
  let totSpots = 0, totPhotos = 0;
  allTrips().forEach(t => { const s = tripStats(t); totSpots += s.spots; totPhotos += s.photos; });
  const totTrips = allTrips().length;

  return (
    <div className="hpm-app">
      <div className="hpm-top">
        <div className="mk" />
        <div className="ttl">여정</div>
        <button className="ic"><Ico.search /></button>
      </div>
      <div className="hpm-view">
        <div className="hpm-pad">
          {/* strip: stats + one-liner (absorbs the "home" role) */}
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

          {/* segmented region filter */}
          <div className="hpm-seg" style={{ marginBottom: 13 }}>
            <button className={`hpm-chip ${region === "all" ? "on" : ""}`} onClick={() => setRegion("all")}>전체 {totTrips}</button>
            <button className={`hpm-chip ${region === "domestic" ? "on" : ""}`} onClick={() => setRegion("domestic")}>국내 {dom.length}</button>
            <button className={`hpm-chip ${region === "intl" ? "on" : ""}`} onClick={() => setRegion("intl")}>국외 {intl.length}</button>
          </div>

          {/* trip gallery */}
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {trips.map(t => {
              const st = tripStats(t);
              return (
                <button key={t.id} className="hpm-trip" onClick={() => nav.openTrip(t)}>
                  <Photo className="hpm-trip-cover" label={t.cover.label} tint={t.cover.tint} />
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

function TripDetail({ trip, nav, tone }) {
  const st = tripStats(trip);
  return (
    <div className="hpm-app">
      <div className="hpm-top">
        <button className="ic back" onClick={nav.back}>‹</button>
        <div className="ttl" style={{ fontSize: 20 }}>{trip.title}</div>
        <button className="ic" onClick={() => nav.openMap(trip, 0)}><Ico.map /></button>
      </div>
      <div className="hpm-view">
        <div className="hpm-pad">
          {/* play journey entry */}
          <button className="hpm-playentry" onClick={() => nav.openPlayer(trip)}>
            <span className="pi"><Ico.play width="14" height="14" /></span>
            <span className="pt"><b>여정 재생</b><small>핀을 따라 그날을 다시 걷기 · 큰 화면은 PC에서 ↗</small></span>
          </button>

          {trip.days.map((day, di) => (
            <div key={di}>
              <div className="hpm-daylabel"><b>{day.label}</b><span>{day.date}</span></div>
              {day.spots.map((spot, si) => {
                const ln = hpLines(spot, tone);
                const gi = window.HP_ORDERED(trip).findIndex(s => s.id === spot.id);
                return (
                  <div key={spot.id} className="hpm-spotcard">
                    <div className="hpm-spotcard-cover" onClick={() => nav.openMoment(spot, 0)}>
                      <Photo className="hpm-trip-cover" style={{ height: "100%" }} label={spot.photos[0].label} tint={spot.photos[0].tint} />
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
                          <Photo key={pi} cap={false} tint={ph.tint} />
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

Object.assign(window, { JourneyScreen, TripDetail, hpLines, tripStats, allTrips });
