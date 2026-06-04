/* HeartPin · Moment viewer — docked over the map area, ‹ 사진 › pager */
import { CHAR } from "../chars.js";
import { Photo } from "./ui.jsx";

export default function Gallery({ spot, photoIndex, onClose, onSelect, onPrev, onNext }) {
  if (!spot) return null;
  const photo = spot.photos[photoIndex];
  const many = spot.photos.length > 1;
  return (
    <div className="hp-gallery" onClick={onClose}>
      <div className="hp-gallery-inner" onClick={(e) => e.stopPropagation()}>
        <div className="hp-gallery-top">
          <div>
            <div className="hp-gallery-spot">{spot.name}</div>
            <div className="hp-gallery-meta">{`${spot.dayLabel} · ${spot.time}`}</div>
          </div>
          <button className="hp-gallery-close" onClick={onClose} type="button" aria-label="닫기">✕</button>
        </div>
        <div className="hp-gallery-stage">
          {many && <button className="hp-gallery-arrow left" onClick={onPrev} type="button" disabled={photoIndex === 0} aria-label="이전 사진">‹</button>}
          <Photo photo={photo} className="hp-gallery-photo" />
          {many && <button className="hp-gallery-arrow right" onClick={onNext} type="button" disabled={photoIndex === spot.photos.length - 1} aria-label="다음 사진">›</button>}
        </div>
        {/* explicit  ‹ 사진 N/M ›  pager (only when the spot has multiple moments) */}
        {many && (
          <div className="hp-gallery-pager">
            <button className="hp-pager-btn" onClick={onPrev} type="button" disabled={photoIndex === 0} aria-label="이전 사진">‹</button>
            <span className="hp-pager-label">사진 <b>{photoIndex + 1}</b> / {spot.photos.length}</span>
            <button className="hp-pager-btn" onClick={onNext} type="button" disabled={photoIndex === spot.photos.length - 1} aria-label="다음 사진">›</button>
          </div>
        )}
        <div className="hp-gallery-react">
          <img src={CHAR.nyong.src} className="hp-avatar" style={{ width: 40, height: 40 }} alt="뇽이" />
          <p>{spot.reaction}</p>
        </div>
        {many && (
          <div className="hp-gallery-strip">
            {spot.photos.map((p, i) => (
              <button key={i} type="button" className={`hp-gallery-thumb ${i === photoIndex ? "on" : ""}`} onClick={() => onSelect(i)}>
                <Photo photo={p} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
