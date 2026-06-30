import { Avatar, Ico } from "../ui/MobileAtoms.jsx";
import { dday } from "../useMobileSettings.js";

export default function CoupleScreen({ nav, settings }) {
  const nameBara = settings.nameBara || "바라", nameNyong = settings.nameNyong || "뇽이";
  const myChar = settings.myChar || "bara";
  const dd = dday(settings);
  return (
    <div className="hpm-full dotgrid">
      <div className="hpm-top" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
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
