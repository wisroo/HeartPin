import { Ico } from "../ui/MobileAtoms.jsx";
import { dday } from "../useMobileSettings.js";

const HPM_THEMES = [
  ["coral", "코랄 (현재)", "#e3814f"],
  ["trace", "여정 · 저채도", "#c9714f"],
  ["vivid", "선명 · Airbnb", "#f5503f"],
  ["calm", "여백 · 블루", "#2f5bcf"],
  ["mapfn", "지도 · 기능형", "#1488c6"],
  ["pop", "팝 · 고채도", "#fb3d6e"],
  ["dark", "노을 다크", "#ff7a52"],
];

export default function SettingsScreen({ nav, settings }) {
  const seg = (key, opts) => (
    <div className="hpm-set-seg">
      {opts.map(([v, l]) => <button key={v} className={settings[key] === v ? "on" : ""} onClick={() => nav.setSettings({ [key]: v })}>{l}</button>)}
    </div>
  );
  const dd = dday(settings);
  return (
    <div className="hpm-full dotgrid">
      <div className="hpm-top" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <button className="ic back" onClick={nav.back}>‹</button>
        <div className="ttl" style={{ fontSize: 20 }}>설정</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="hpm-view"><div className="hpm-pad">
        <button className="hpm-card" onClick={nav.openCouple} style={{ width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 12, background: "var(--ptint)", borderColor: "var(--psoft)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--fd)", fontSize: 19, color: "var(--ink)" }}>{(settings.nameBara || "바라")} · {(settings.nameNyong || "뇽이")}</span>
            <span className="hpm-chip on">D+{dd}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 5 }}>이름 · 기념일 · 내 캐릭터 설정 ›</div>
        </button>

        <div className="hpm-set-sec">캐릭터 · 대사</div>
        <div className="hpm-menu">
          <button className="hpm-menurow" onClick={nav.openCouple}><span className="ic"><Ico.heart width="18" height="18" /></span><span className="lb">캐릭터 · 커플 정보</span><span className="ch">›</span></button>
          <div className="hpm-set-row"><div className="lb"><b>대사 톤</b><small>자동 생성 대사의 말투</small></div>{seg("tone", [["담백", "담백"], ["다정", "다정"], ["장난", "장난"]])}</div>
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

        <div className="hpm-set-sec">지도</div>
        <div className="hpm-menu">
          <div className="hpm-set-row"><div className="lb"><b>지도 스킨</b></div>{seg("mapSkin", [["cozy", "코지"], ["sepia", "세피아"], ["forest", "포레스트"]])}</div>
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
