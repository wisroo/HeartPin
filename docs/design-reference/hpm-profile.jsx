/* HeartPin Mobile · 프로필(우리) + 설정 + 저니 플레이어(맛보기) */

function hpDday(anniv) {
  if (!anniv) return 412;
  const d = Math.round((new Date("2026-06-29") - new Date(anniv)) / 86400000);
  return d > 0 ? d : 1;
}

function ProfileScreen({ nav, settings }) {
  let totSpots = 0, totPhotos = 0;
  window.allTrips().forEach(t => { const s = window.tripStats(t); totSpots += s.spots; totPhotos += s.photos; });
  const totTrips = window.allTrips().length;
  const nameBara = settings.nameBara || "바라", nameNyong = settings.nameNyong || "뇽이";
  const dd = hpDday(settings.anniv);
  return (
    <div className="hpm-app">
      <div className="hpm-top">
        <div className="ttl">우리</div>
        <button className="ic" onClick={nav.openSettings}><Ico.gear /></button>
      </div>
      <div className="hpm-view">
        <div className="hpm-pad">
          <div className="hpm-couple">
            <div className="hpm-couple-avs"><Avatar who="bara" size={64} /><Avatar who="nyong" size={64} /></div>
            <div className="hpm-couple-name">{nameBara} <span>♥</span> {nameNyong}</div>
            <div style={{ marginTop: 7 }}><span className="hpm-chip on">D+{dd} · 함께한 {dd}일</span></div>
          </div>
          <div className="hpm-footprint">
            <div className="hpm-fp"><b>{totTrips}</b><span>여행</span></div>
            <div className="hpm-fp"><b>{totSpots}</b><span>스팟</span></div>
            <div className="hpm-fp"><b>{totPhotos}</b><span>사진</span></div>
            <div className="hpm-fp"><b>5</b><span>도시</span></div>
          </div>
          <div className="hpm-menu">
            <button className="hpm-menurow" onClick={nav.openCouple}><span className="ic"><Ico.heart width="18" height="18" /></span><span className="lb">캐릭터 · 커플 정보</span><span className="ch">›</span></button>
            <button className="hpm-menurow" onClick={nav.openSettings}><span className="ic"><Ico.skin /></span><span className="lb">지도 스킨</span><span className="hpm-chip sm cool">{({cozy:"코지",sepia:"세피아",forest:"포레스트"})[settings.mapSkin]}</span></button>
            <div className="hpm-menurow"><span className="ic"><Ico.bell /></span><span className="lb">기록 알림</span>
              <button className={`hpm-toggle ${settings.alerts ? "on" : ""}`} onClick={() => nav.setSettings({ alerts: !settings.alerts })}><i /></button></div>
            <button className="hpm-menurow" onClick={nav.openSettings}><span className="ic"><Ico.gear width="16" height="16" /></span><span className="lb">계정 · 동기화 · 설정</span><span className="ch">›</span></button>
          </div>
          <div className="hpm-pcnudge"><Ico.pc width="17" height="17" /><span>코스 편집 · 대사 다듬기 · 일괄 정리는 <b>PC에서</b> 더 편해요</span></div>
        </div>
      </div>
    </div>
  );
}

const HPM_THEMES = [
  ["coral", "코랄 (현재)", "#e3814f"],
  ["trace", "여정 · 저채도", "#c9714f"],
  ["vivid", "선명 · Airbnb", "#f5503f"],
  ["calm", "여백 · 블루", "#2f5bcf"],
  ["mapfn", "지도 · 기능형", "#1488c6"],
  ["pop", "팝 · 고채도", "#fb3d6e"],
  ["dark", "노을 다크", "#ff7a52"],
];

function SettingsScreen({ nav, settings }) {
  const seg = (key, opts) => (
    <div className="hpm-set-seg">
      {opts.map(([v, l]) => <button key={v} className={settings[key] === v ? "on" : ""} onClick={() => nav.setSettings({ [key]: v })}>{l}</button>)}
    </div>
  );
  return (
    <div className="hpm-full dotgrid">
      <div className="hpm-top" style={{ paddingTop: 46 }}>
        <button className="ic back" onClick={nav.back}>‹</button>
        <div className="ttl" style={{ fontSize: 20 }}>설정</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="hpm-view"><div className="hpm-pad">
        <button className="hpm-card" onClick={nav.openCouple} style={{ width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 12, background: "var(--ptint)", borderColor: "var(--psoft)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--fd)", fontSize: 19, color: "var(--ink)" }}>{(settings.nameBara || "바라")} · {(settings.nameNyong || "뇽이")}</span>
            <span className="hpm-chip on">D+{hpDday(settings.anniv)}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 5 }}>이름 · 기념일 · 내 캐릭터 설정 ›</div>
        </button>

        <div className="hpm-set-sec">캐릭터 · 대사</div>
        <div className="hpm-menu">
          <button className="hpm-menurow" onClick={nav.openCouple}><span className="ic"><Ico.heart width="18" height="18" /></span><span className="lb">캐릭터 · 커플 정보</span><span className="ch">›</span></button>
          <div className="hpm-set-row"><div className="lb"><b>대사 톤</b><small>자동 생성 대사의 말투</small></div>{seg("tone", [["담백","담백"],["다정","다정"],["장난","장난"]])}</div>
          <div className="hpm-set-row"><div className="lb"><b>지도에 캐릭터 표시</b><small>바라·뇽이를 지도 위에</small></div>
            <button className={`hpm-toggle ${settings.showChars ? "on" : ""}`} onClick={() => nav.setSettings({ showChars: !settings.showChars })}><i /></button></div>
        </div>

        <div className="hpm-set-sec">화면 테마</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {HPM_THEMES.map(([key, label, color]) => (
            <button key={key} onClick={() => nav.setSettings({ theme: key })}
              style={{
                display: "flex", alignItems: "center", gap: 9, textAlign: "left",
                border: `1.5px solid ${settings.theme === key ? "var(--p)" : "var(--line2)"}`,
                background: settings.theme === key ? "var(--ptint)" : "var(--card)",
                borderRadius: 13, padding: "10px 11px",
                boxShadow: settings.theme === key ? "0 0 0 2px var(--psoft)" : "0 2px 8px var(--shadow-soft)",
              }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", flex: "none", background: color, border: "2px solid var(--card)", boxShadow: "0 1px 4px var(--shadow)" }} />
              <span style={{ fontFamily: "var(--fd)", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.15 }}>{label}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink2)", margin: "8px 2px 0" }}>§7 색 방향 탐색안 — 상단 Tweaks에서도 동일하게 전환돼요.</div>

        <div className="hpm-set-sec">지도</div>
        <div className="hpm-menu">
          <div className="hpm-set-row"><div className="lb"><b>지도 스킨</b></div>{seg("mapSkin", [["cozy","코지"],["sepia","세피아"],["forest","포레스트"]])}</div>
          <div className="hpm-set-row"><div className="lb"><b>기록 알림</b><small>여행 중 정리 리마인드</small></div>
            <button className={`hpm-toggle ${settings.alerts ? "on" : ""}`} onClick={() => nav.setSettings({ alerts: !settings.alerts })}><i /></button></div>
        </div>

        <div className="hpm-set-sec">계정</div>
        <div className="hpm-menu">
          <button className="hpm-menurow"><span className="lb">파트너 연결</span><span className="hpm-chip sm cool">연결됨</span></button>
          <button className="hpm-menurow"><span className="lb">개인정보 · 백업</span><span className="ch">›</span></button>
          <button className="hpm-menurow"><span className="lb">앱 정보</span><span style={{ fontSize: 12, color: "var(--ink3)" }}>v1.0</span></button>
        </div>
      </div></div>
    </div>
  );
}

/* cinematic journey player (taster) */
function JourneyPlayer({ trip, nav, tone, settings }) {
  const spots = window.HP_ORDERED(trip);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const mapElRef = useRef(null), mapRef = useRef(null);
  const markersRef = useRef([]), pastRef = useRef(null);
  const sp = spots[scene];
  const ln = window.hpLines(sp, tone);

  function mmHtml(i) {
    const cls = i === scene ? "active" : i < scene ? "done" : "";
    const ring = i === scene ? '<div class="pr"></div>' : "";
    return `<div class="hpm-mmpin ${cls}">${ring}</div>`;
  }

  // init minimap: whole route stays in view, only the position marker moves
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, keyboard: false, boxZoom: false, touchZoom: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    const latlngs = spots.map(s => [s.lat, s.lng]);
    L.polyline(latlngs, { color: "#fff", weight: 2.5, opacity: .65, dashArray: "1 7", lineCap: "round" }).addTo(map);
    pastRef.current = L.polyline([latlngs[0]], { color: getComputedStyle(mapElRef.current).getPropertyValue("--p") || "#e3814f", weight: 3.5, opacity: 1, lineCap: "round" }).addTo(map);
    spots.forEach((s, i) => {
      markersRef.current.push(L.marker([s.lat, s.lng], {
        icon: L.divIcon({ className: "", html: mmHtml(i), iconSize: [14, 14], iconAnchor: [7, 7] }),
        zIndexOffset: i === 0 ? 500 : 0,
      }).addTo(map));
    });
    map.fitBounds(latlngs, { padding: [22, 22] });
    setTimeout(() => { map.invalidateSize(); map.fitBounds(latlngs, { padding: [20, 20] }); }, 120);
    setTimeout(() => { map.invalidateSize(); map.fitBounds(latlngs, { padding: [20, 20] }); }, 420);
    return () => { map.remove(); mapRef.current = null; markersRef.current = []; };
    // eslint-disable-next-line
  }, []);

  // move the "you are here" marker + traveled trail along the route
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    markersRef.current.forEach((m, i) => {
      m.setIcon(L.divIcon({ className: "", html: mmHtml(i), iconSize: [14, 14], iconAnchor: [7, 7] }));
      m.setZIndexOffset(i === scene ? 1000 : 0);
    });
    if (pastRef.current) pastRef.current.setLatLngs(spots.slice(0, scene + 1).map(s => [s.lat, s.lng]));
  }, [scene, spots]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (scene + 1 < spots.length) setScene(scene + 1);
      else setPlaying(false);
    }, 4600);
    return () => clearTimeout(t);
  }, [playing, scene, spots.length]);

  return (
    <div className="hpm-player">
      <div className="hpm-player-photo" key={scene}>
        <Photo label={sp.photos[0].label} tint={sp.photos[0].tint} />
      </div>
      <div className="hpm-player-shade" />

      <div className="hpm-minimap">
        <div ref={mapElRef} className={`hpm-minimap-map hpm-map-skin-${settings.mapSkin}`} />
        <div className="hpm-minimap-label">코스 {scene + 1} / {spots.length}</div>
      </div>

      <div className="hpm-player-top">
        <div className="hpm-player-prog">{spots.map((_, i) => <i key={i} className={i <= scene ? "on" : ""} />)}</div>
        <button className="hpm-player-close" onClick={nav.back}>✕</button>
      </div>

      <div className="hpm-player-subs" key={"s" + scene}>
        <div className="hpm-player-place">{sp.name}<small>{sp.dayLabel} · {sp.time} · {sp.mood}</small></div>
        <div className="hpm-player-sub bara"><Avatar who="bara" size={38} /><p><b>{settings.nameBara || "바라"}</b> {ln.guide}</p></div>
        <div className="hpm-player-sub nyong" style={{ animationDelay: ".35s" }}><Avatar who="nyong" size={38} /><p><b>{settings.nameNyong || "뇽이"}</b> {ln.reaction}</p></div>
      </div>

      <div className="hpm-player-ctrl">
        <button disabled={scene === 0} onClick={() => setScene(scene - 1)}>‹</button>
        <button className="play" onClick={() => setPlaying(p => !p)}>{playing ? "⏸" : "▶"}</button>
        <button disabled={scene === spots.length - 1} onClick={() => setScene(scene + 1)}>›</button>
      </div>
    </div>
  );
}

function CoupleScreen({ nav, settings }) {
  const nameBara = settings.nameBara || "바라", nameNyong = settings.nameNyong || "뇽이";
  const myChar = settings.myChar || "bara";
  const dd = hpDday(settings.anniv);
  return (
    <div className="hpm-full dotgrid">
      <div className="hpm-top" style={{ paddingTop: 46 }}>
        <button className="ic back" onClick={nav.back}>‹</button>
        <div className="ttl" style={{ fontSize: 20 }}>캐릭터 · 커플</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="hpm-view"><div className="hpm-pad">
        <div className="hpm-couple" style={{ marginTop: 2 }}>
          <div className="hpm-couple-avs">
            <Avatar who="bara" size={60} style={myChar === "bara" ? { boxShadow: "0 0 0 3px var(--p),0 6px 16px var(--shadow)" } : null} />
            <Avatar who="nyong" size={60} style={myChar === "nyong" ? { boxShadow: "0 0 0 3px var(--p),0 6px 16px var(--shadow)" } : null} />
          </div>
          <div className="hpm-couple-name" style={{ fontSize: 22 }}>{nameBara} <span>♥</span> {nameNyong}</div>
          <div style={{ marginTop: 6 }}><span className="hpm-chip on">D+{dd}</span></div>
        </div>

        <div className="hpm-set-sec">두 사람</div>
        <div className="hpm-menu">
          <div className="hpm-set-row"><div className="lb"><b>바라 이름</b><small>따뜻한 안내 담당</small></div>
            <input className="hpm-cinput" value={nameBara} onChange={(e) => nav.setSettings({ nameBara: e.target.value })} /></div>
          <div className="hpm-set-row"><div className="lb"><b>뇽이 이름</b><small>시원한 반응 담당</small></div>
            <input className="hpm-cinput" value={nameNyong} onChange={(e) => nav.setSettings({ nameNyong: e.target.value })} /></div>
        </div>

        <div className="hpm-set-sec">기념일</div>
        <div className="hpm-menu">
          <div className="hpm-set-row"><div className="lb"><b>처음 만난 날</b><small>홈·프로필의 D-day 기준</small></div>
            <input type="date" className="hpm-cinput date" value={settings.anniv || "2025-05-13"} onChange={(e) => nav.setSettings({ anniv: e.target.value })} /></div>
        </div>

        <div className="hpm-set-sec">내 캐릭터</div>
        <div className="hpm-menu">
          <div className="hpm-set-row"><div className="lb"><b>나는 누구?</b><small>대사·아바타에서 '나'로 표시돼요</small></div>
            <div className="hpm-set-seg">
              <button className={myChar === "bara" ? "on" : ""} onClick={() => nav.setSettings({ myChar: "bara" })}>{nameBara}</button>
              <button className={myChar === "nyong" ? "on" : ""} onClick={() => nav.setSettings({ myChar: "nyong" })}>{nameNyong}</button>
            </div></div>
        </div>
        <div className="hpm-pcnudge" style={{ marginTop: 14 }}><Ico.pc width="17" height="17" /><span>캐릭터 일러스트 교체·세부 설정은 <b>PC에서</b> 더 자세히 할 수 있어요</span></div>
      </div></div>
    </div>
  );
}

Object.assign(window, { ProfileScreen, SettingsScreen, CoupleScreen, JourneyPlayer, hpDday });
