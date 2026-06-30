import { Avatar, Ico } from "../ui/MobileAtoms.jsx";
import { dday } from "../useMobileSettings.js";
import { ordered } from "../../data.js";

export default function ProfileScreen({ app, nav, settings }) {
  const allTrips = app.regions.domestic.trips.concat(app.regions.intl.trips);
  let totSpots = 0, totPhotos = 0;
  allTrips.forEach(t => { const spots = ordered(t); totSpots += spots.length; spots.forEach(s => { totPhotos += (s.photos || []).length; }); });
  const totTrips = allTrips.length;
  const nameBara = settings.nameBara || "바라", nameNyong = settings.nameNyong || "뇽이";
  const dd = dday(settings);
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
            <button className="hpm-menurow" onClick={nav.openSettings}><span className="ic"><Ico.skin /></span><span className="lb">지도 스킨</span><span className="hpm-chip sm cool">{({ cozy: "코지", sepia: "세피아", forest: "포레스트" })[settings.mapSkin]}</span></button>
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
