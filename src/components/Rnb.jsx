/* HeartPin · RNB record panel (overview list + card-news deck) */
import { CHAR } from "../chars.js";
import { ordered } from "../data.js";
import { Photo, Speech, Chip } from "./ui.jsx";

function CollapsedRail({ onExpand }) {
  return (
    <div className="hp-rnb-rail">
      <button className="hp-rail-btn" onClick={onExpand} type="button" aria-label="기록 패널 펼치기">‹</button>
      <div className="hp-rail-text">우리 기록</div>
      <img src={CHAR.bara.src} className="hp-rail-char" alt="바라" />
    </div>
  );
}

function Overview({ regions, region, onRegion, trips, onSelectTrip }) {
  return (
    <div className="hp-rnb-body">
      <div className="hp-rnb-head">
        <div>
          <h2 className="hp-rnb-title">우리 둘의 여정</h2>
          <p className="hp-rnb-sub">핀을 눌러 그날로 떠나거나, 아래에서 골라봐</p>
        </div>
      </div>
      <div className="hp-seg">
        {Object.values(regions).map((r) => (
          <button key={r.key} type="button" className={`hp-seg-btn ${region === r.key ? "on" : ""}`} onClick={() => onRegion(r.key)}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="hp-trip-list">
        {trips.map((t) => {
          const o = ordered(t);
          const photos = o.reduce((a, s) => a + s.photos.length, 0);
          return (
            <button key={t.id} type="button" className="hp-trip-card" onClick={() => onSelectTrip(t.id)}>
              <Photo photo={t.cover} className="hp-trip-cover" />
              <div className="hp-trip-meta">
                <div className="hp-trip-name">{t.title}</div>
                <div className="hp-trip-date">{t.dateLabel}</div>
                <div className="hp-trip-stats">{`Spot ${o.length} · 사진 ${photos}`}</div>
                <div className="hp-trip-tags">{t.tags.map((tg) => <span key={tg} className="hp-tag">#{tg}</span>)}</div>
              </div>
              <span className="hp-trip-go">여정 열기 →</span>
            </button>
          );
        })}
      </div>
      <div className="hp-rnb-foot">
        <Speech who="bara" text="사진을 불러오면 날짜·장소별로 정리해 둘게. 오늘은 어디부터 다시 가볼까?" compact />
      </div>
    </div>
  );
}

function Deck({ trip, spots, spotIndex, onBack, onSelectSpot, onPrev, onNext, onOpenGallery, onPlayJourney, onEditSpot }) {
  const s = spots[spotIndex];
  return (
    <div className="hp-rnb-body">
      <div className="hp-crumb">
        <button type="button" className="hp-crumb-back" onClick={onBack}>‹ 전체 여정</button>
        <span className="hp-crumb-sep">/</span>
        <b>{trip.title.replace(/^\d+박 \d+일 /, "")}</b>
        <span className="hp-crumb-sep">·</span>
        <span className="hp-crumb-day">{`${s.dayLabel} ${s.dayDate}`}</span>
      </div>

      <button className="hp-play-journey" type="button" onClick={onPlayJourney}>
        <span className="hp-play-ico">▶</span>
        <span>이 여정 재생하기</span>
        <span className="hp-play-sub">풀스크린 시네마틱</span>
      </button>

      <div className="hp-deck" key={s.id}>
        <div className="hp-card">
          <div className="hp-card-cover" onClick={() => onOpenGallery(spotIndex, 0)}>
            <Photo photo={s.photos[0]} className="hp-cover-photo" />
            <span className="hp-card-time">{s.time}</span>
            <span className="hp-card-count">{`📷 ${s.photos.length}`}</span>
          </div>
          <div className="hp-card-main">
            <div className="hp-card-moodrow">
              <span className="hp-card-day">{s.dayLabel}</span>
              <Chip tint="cool">{s.mood}</Chip>
            </div>
            <h3 className="hp-card-name">{s.name}</h3>
            <div className="hp-card-talk">
              <Speech who="bara" text={s.guide} editable onSave={(txt) => onEditSpot && onEditSpot(s.id, "guide", txt)} />
              <Speech who="nyong" text={s.reaction} editable onSave={(txt) => onEditSpot && onEditSpot(s.id, "reaction", txt)} />
            </div>
            <div className="hp-thumbs">
              {s.photos.map((p, i) => (
                <button key={i} type="button" className="hp-thumb-btn" onClick={() => onOpenGallery(spotIndex, i)}>
                  <Photo photo={p} className="hp-thumb" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hp-deck-nav">
        <button type="button" className="hp-nav-btn" onClick={onPrev} disabled={spotIndex === 0}>‹ 이전 장소</button>
        <div className="hp-deck-dots">
          {spots.map((_, i) => <span key={i} className={`hp-dot ${i === spotIndex ? "on" : ""}`} onClick={() => onSelectSpot(i)} />)}
        </div>
        <button type="button" className="hp-nav-btn" onClick={onNext} disabled={spotIndex === spots.length - 1}>다음 ›</button>
      </div>

      {/* ordered timeline list */}
      <div className="hp-timeline">
        <div className="hp-timeline-head">여정 순서</div>
        {spots.map((sp, i) => (
          <button
            key={sp.id} type="button"
            className={`hp-tl-item ${i === spotIndex ? "on" : ""} ${i < spotIndex ? "done" : ""}`}
            onClick={() => onSelectSpot(i)}
          >
            <span className="hp-tl-num">{i + 1}</span>
            <div className="hp-tl-meta">
              <div className="hp-tl-name">{sp.name}</div>
              <div className="hp-tl-sub">{`${sp.dayLabel} · ${sp.time}`}</div>
            </div>
            {i === spotIndex && <span className="hp-tl-here">지금 여기</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Rnb(props) {
  if (props.collapsed) return <div className="hp-rnb collapsed"><CollapsedRail onExpand={props.onToggleCollapse} /></div>;
  return (
    <div className="hp-rnb">
      <button className="hp-collapse-btn" onClick={props.onToggleCollapse} type="button" aria-label="기록 패널 접기">›</button>
      {props.view === "overview" ? <Overview {...props} /> : <Deck {...props} />}
    </div>
  );
}
