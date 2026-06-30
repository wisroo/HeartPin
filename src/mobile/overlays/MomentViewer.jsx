import { useState } from "react";
import { Photo, Avatar } from "../ui/MobileAtoms.jsx";
import { mobileLines } from "../screens/TripDetail.jsx";

export default function MomentViewer({ spot, startIdx = 0, nav, settings }) {
  const [i, setI] = useState(startIdx);
  const photos = spot.photos || [];
  const ln = mobileLines(spot, settings);

  return (
    <div className="hpm-moment">
      <div className="hpm-moment-top">
        <span className="sp">{spot.name}</span>
        <button className="hpm-moment-close" onClick={nav.back}>✕</button>
      </div>
      <div className="hpm-moment-stage">
        {photos[i] && <Photo photo={photos[i]} />}
      </div>
      <div className="hpm-moment-react">
        <div className="hpm-speech nyong" style={{ alignItems: "flex-start" }}>
          <Avatar who="nyong" size={34} />
          <div className="hpm-moment-bubble">{ln.reaction}</div>
        </div>
      </div>
      <div className="hpm-moment-strip">
        {photos.map((ph, pi) => (
          <button key={pi} onClick={() => setI(pi)}>
            <Photo photo={ph} cap={false} className={pi === i ? "on" : ""} />
          </button>
        ))}
      </div>
      <div className="hpm-moment-pager">
        <button className="hpm-moment-arrow" disabled={i === 0} onClick={() => setI(i - 1)}>‹</button>
        <span className="hpm-moment-count">{i + 1} / {photos.length}</span>
        <button className="hpm-moment-arrow" disabled={i === photos.length - 1} onClick={() => setI(i + 1)}>›</button>
      </div>
    </div>
  );
}
