/* HeartPin · shared UI atoms */
import { useState, useEffect } from "react";
import { CHAR } from "../chars.js";

export function Avatar({ who, size = 44, ring }) {
  const c = CHAR[who] || CHAR.bara;
  return (
    <img
      src={c.src} alt={c.name} className="hp-avatar"
      style={{ width: size, height: size, outline: ring ? `3px solid ${ring}` : "none" }}
    />
  );
}

// placeholder photo: soft tinted stripes + monospace caption (real photos via photo.src)
export function Photo({ photo, className = "", onClick }) {
  const ratio = (photo && photo.ratio) || "4/3";
  const tint = (photo && photo.tint) || "cool";
  const src = photo && photo.src;
  const style = { aspectRatio: ratio.replace("/", " / ") };
  if (src) { style.backgroundImage = `url(${src})`; style.backgroundSize = "cover"; style.backgroundPosition = "center"; }
  return (
    <div
      className={`hp-photo tint-${tint} ${src ? "has-img" : ""} ${onClick ? "is-tap" : ""} ${className}`}
      style={style} onClick={onClick}
    >
      {!src && <span className="hp-photo-cap">{photo ? photo.label : "사진"}</span>}
    </div>
  );
}

export function Speech({ who, text, compact, editable, onSave }) {
  const c = CHAR[who] || CHAR.bara;
  const tone = who === "bara" ? "bara" : "nyong";
  const [ed, setEd] = useState(false);
  const [val, setVal] = useState(text);
  useEffect(() => { setVal(text); }, [text]);
  const commit = () => { setEd(false); if (val.trim() && val !== text && onSave) onSave(val.trim()); else setVal(text); };
  return (
    <div className={`hp-speech tone-${tone} ${compact ? "compact" : ""} ${editable ? "editable" : ""}`}>
      <Avatar who={who} size={compact ? 34 : 46} />
      <div className="hp-bubble">
        <span className="hp-who">
          {c.name}
          {editable && !ed && <button className="hp-edit-pen" type="button" onClick={() => setEd(true)} aria-label="대사 편집">✎</button>}
        </span>
        {ed
          ? <textarea
              className="hp-bubble-edit" value={val} autoFocus rows={2}
              onChange={(e) => setVal(e.target.value)} onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
                else if (e.key === "Escape") { setVal(text); setEd(false); }
              }}
            />
          : <p className={editable ? "tap" : ""} onClick={editable ? () => setEd(true) : undefined}>{text}</p>}
      </div>
    </div>
  );
}

export function Chip({ children, tint, active, onClick }) {
  return (
    <button className={`hp-chip ${tint ? "t-" + tint : ""} ${active ? "active" : ""}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}
