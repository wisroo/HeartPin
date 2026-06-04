/* HeartPin · Home (entry screen) */
import { CHAR } from "../chars.js";
import { ordered } from "../data.js";
import { Photo } from "./ui.jsx";

export default function Home({ regions, region, trips, onRegion, onOpenTrip, onOpenMap, onNewTrip, onUpload, onInbox, inboxCount }) {
  return (
    <div className="hp-home">
      <div className="hp-home-inner">

        <header className="hp-home-top">
          <div className="hp-brand">
            <span className="hp-logo" />
            <div>
              <h1>HeartPin</h1>
              <span className="hp-brand-sub">우리 둘만의 여정</span>
            </div>
          </div>
          <button className="hp-home-inbox" type="button" onClick={onInbox}>정리함 <b>{inboxCount}</b></button>
        </header>

        <section className="hp-hero">
          <div className="hp-hero-text">
            <h2>다시 떠나볼까?</h2>
            <p>우리가 다녀온 곳, 핀으로 모아둔 기억</p>
            <div className="hp-hero-actions">
              <button className="hp-hero-btn" type="button" onClick={onOpenMap}><span>🗺️</span> 지도에서 보기</button>
              <button className="hp-hero-btn ghost" type="button" onClick={onNewTrip}><span>＋</span> 새 여행 만들기</button>
            </div>
          </div>
          <div className="hp-hero-chars">
            <div className="hp-hero-speech">오늘은 어디부터 다시 가볼까?</div>
            <img className="hp-hero-bara" src={CHAR.bara.src} alt="바라" />
            <img className="hp-hero-nyong" src={CHAR.nyong.src} alt="뇽이" />
          </div>
        </section>

        <div className="hp-home-seg">
          {Object.values(regions).map((r) => (
            <button key={r.key} type="button" className={`hp-home-segbtn ${region === r.key ? "on" : ""}`} onClick={() => onRegion(r.key)}>
              {r.key === "domestic" ? "🇰🇷 " : "✈ "}{r.label}<span className="hp-seg-n">{r.trips.length}</span>
            </button>
          ))}
        </div>

        <section className="hp-home-sec">
          <div className="hp-home-sechead"><h3>최근 여행</h3><span>{`${trips.length}개`}</span></div>
          <div className="hp-home-trips">
            {trips.map((t) => {
              const o = ordered(t);
              const photos = o.reduce((a, s) => a + s.photos.length, 0);
              return (
                <button key={t.id} type="button" className="hp-htrip" onClick={() => onOpenTrip(t.id)}>
                  <Photo photo={t.cover} className="hp-htrip-cover" />
                  <div className="hp-htrip-meta">
                    <div className="hp-htrip-name">{t.title}</div>
                    <div className="hp-htrip-date">{t.dateLabel}</div>
                    <div className="hp-htrip-stats">{`Spot ${o.length} · 사진 ${photos}`}</div>
                    <div className="hp-htrip-tags">{t.tags.map((tg) => <span key={tg} className="hp-tag">#{tg}</span>)}</div>
                  </div>
                  <span className="hp-htrip-go">여정 열기 →</span>
                </button>
              );
            })}
            <button className="hp-htrip hp-htrip-new" type="button" onClick={onNewTrip}>
              <span className="hp-htrip-plus">＋</span>
              <span className="hp-htrip-newt">새 여행 만들기</span>
              <span className="hp-htrip-newsub">사진을 올리면 자동으로 정리해요</span>
            </button>
          </div>
        </section>

        <section className="hp-home-quick">
          <button className="hp-qbtn" type="button" onClick={onUpload}>
            <span className="hp-qbtn-ico">🖼️</span>
            <span><b>사진 불러오기</b><small>여러 장 끌어다 놓기</small></span>
          </button>
          <button className="hp-qbtn" type="button" onClick={onInbox}>
            <span className="hp-qbtn-ico">🗂️</span>
            <span><b>정리함</b><small>{`손볼 사진 ${inboxCount}장`}</small></span>
          </button>
        </section>
      </div>
    </div>
  );
}
