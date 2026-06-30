/* HeartPin Mobile · shared atoms + device frame */
const { useState, useEffect, useRef, useCallback } = React;

const AV_BARA = "assets/bara.webp";
const AV_NYONG = "assets/nyong.jpeg";

/* ---------- rounded line icons (unified set) ---------- */
const Ico = {
  journey: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 20s-6.5-5-6.5-9.3A6.5 6.5 0 0112 5a6.5 6.5 0 016.5 5.7C18.5 15 12 20 12 20z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>),
  map: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.7"/></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5.5v13M5.5 12h13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>),
  inbox: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 13l2.2-7A2 2 0 018.1 4.6h7.8A2 2 0 0117.8 6L20 13v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M4 13h4l1 2h6l1-2h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>),
  profile: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="8.5" r="3.4" stroke="currentColor" strokeWidth="1.7"/><path d="M5.5 19c.6-3.3 3.3-5.2 6.5-5.2S17.9 15.7 18.5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>),
  gear: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M12 3.5v2.2M12 18.3v2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>),
  search: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8"/><path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  cam: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="7" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="13.5" r="3.3" stroke="currentColor" strokeWidth="1.7"/><path d="M8.5 7l1.2-2.2h4.6L15.5 7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>),
  pin: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 21s6-5.3 6-10A6 6 0 006 11c0 4.7 6 10 6 10z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.7"/></svg>),
  clock: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7"/><path d="M12 8v4.2l2.8 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  play: (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 6.5v11l9-5.5-9-5.5z"/></svg>),
  chat: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M4 5.5h16v10H9l-4 3.2V15.5H4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M8.5 10h7M8.5 12.6h4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>),
  bell: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><path d="M6.5 17.5V11a5.5 5.5 0 0111 0v6.5M4.5 17.5h15M10 20.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  pc: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M9 20.5h6M12 17v3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>),
  image: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="M5 16.5l4-3.5 3.5 3 3-2.5 3.5 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  heart: (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 20s-6.5-5-6.5-9.3A4.2 4.2 0 0112 8a4.2 4.2 0 016.5 2.7C18.5 15 12 20 12 20z"/></svg>),
  skin: (p) => (<svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7"/><circle cx="9" cy="9.5" r="1.4" fill="currentColor"/><circle cx="14.5" cy="9.5" r="1.4" fill="currentColor"/><circle cx="15" cy="14" r="1.4" fill="currentColor"/></svg>),
};

/* ---------- photo placeholder ---------- */
function Photo({ label, tint = "cool", className = "", style = {}, cap = true }) {
  return (
    <div className={`hpm-photo tint-${tint} ${className}`} style={style}>
      {cap && label ? <span className="hpm-photo-cap">{label}</span> : null}
    </div>
  );
}

function Avatar({ who, size = 34, className = "", style = {} }) {
  return <img className={`hpm-av ${className}`} src={who === "nyong" ? AV_NYONG : AV_BARA}
    alt={who} style={{ width: size, height: size, ...style }} />;
}

function Speech({ who, text, compact }) {
  return (
    <div className={`hpm-speech ${who}`}>
      <Avatar who={who} size={compact ? 28 : 32} />
      <div className="hpm-bubble">
        <span className="hpm-who">{who === "bara" ? "바라" : "뇽이"}</span>
        <p style={compact ? { fontSize: 12.5 } : null}>{text}</p>
      </div>
    </div>
  );
}

/* ---------- status bar (platform-aware) ---------- */
function StatusBar({ platform, onMap }) {
  const ios = platform === "ios";
  const c = "currentColor";
  return (
    <div className={`hpm-status ${ios ? "ios" : "android"} ${onMap ? "onmap" : ""}`}>
      <span className="clock">9:41</span>
      <span className="sysic">
        {/* signal */}
        <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="7" width="3" height="5" rx="0.6" fill={c}/><rect x="5" y="4.5" width="3" height="7.5" rx="0.6" fill={c}/><rect x="10" y="2" width="3" height="10" rx="0.6" fill={c}/><rect x="15" y="0" width="3" height="12" rx="0.6" fill={c} opacity={ios ? 1 : .4}/></svg>
        {/* wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 3C10.3 3 12.4 3.9 13.9 5.4L15 4.3C13.2 2.5 10.7 1.3 8 1.3 5.3 1.3 2.8 2.5 1 4.3L2.1 5.4C3.6 3.9 5.7 3 8 3Z" fill={c}/><path d="M8 6.4C9.3 6.4 10.5 6.9 11.4 7.8L12.5 6.7C11.3 5.5 9.7 4.8 8 4.8 6.3 4.8 4.7 5.5 3.5 6.7L4.6 7.8C5.5 6.9 6.7 6.4 8 6.4Z" fill={c}/><circle cx="8" cy="10" r="1.4" fill={c}/></svg>
        {/* battery */}
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={c} strokeOpacity=".4" fill="none"/><rect x="2" y="2" width="18" height="8" rx="1.8" fill={c}/><path d="M23 4v4c.8-.3 1.4-1 1.4-2S23.8 4.3 23 4z" fill={c} fillOpacity=".5"/></svg>
      </span>
    </div>
  );
}

/* ---------- device frame (iOS / Android, responsive screen content) ---------- */
const FRAMES = {
  ios: { w: 384, h: 832, bz: 52, bzp: 11, scr: 41 },
  android: { w: 384, h: 836, bz: 38, bzp: 9, scr: 30 },
};

function PhoneFrame({ platform, theme, dark, scale, children }) {
  const f = FRAMES[platform];
  return (
    <div className="hpm-device" style={{ width: f.w * scale, height: f.h * scale }}>
      <div style={{ width: f.w, height: f.h, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        <div className="hpm-bezel" style={{ "--bz": f.bz + "px", "--bzp": f.bzp + "px" }}>
          <div className={`hpm ${dark ? "" : ""}`} data-theme={theme}
            style={{ "--scr": f.scr + "px", height: "100%" }}>
            <div className="hpm-screen dotgrid" style={{ "--scr": f.scr + "px" }}>
              {platform === "ios" ? <div className="hpm-island" /> : <div className="hpm-punch" />}
              {children}
              <div className="hpm-homeind" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Ico, Photo, Avatar, Speech, StatusBar, PhoneFrame, FRAMES, AV_BARA, AV_NYONG });
