import { CHAR } from "../../chars.js";

export const Ico = {
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

export function Photo({ photo, label, tint, className = "", style = {}, cap = true, onClick }) {
  const t = tint ?? photo?.tint ?? "cool";
  const src = photo?.src;
  const lbl = label ?? photo?.label;
  const st = { ...style };
  if (src) { st.backgroundImage = `url(${src})`; st.backgroundSize = "cover"; st.backgroundPosition = "center"; }
  return (
    <div className={`hpm-photo tint-${t} ${className}`} style={st} onClick={onClick}>
      {cap && !src && lbl ? <span className="hpm-photo-cap">{lbl}</span> : null}
    </div>
  );
}

export function Avatar({ who, size = 34, className = "", style = {} }) {
  const c = CHAR[who] || CHAR.bara;
  return <img className={`hpm-av ${className}`} src={c.src} alt={c.name} style={{ width: size, height: size, ...style }} />;
}

export function Speech({ who, text, compact }) {
  const c = CHAR[who] || CHAR.bara;
  return (
    <div className={`hpm-speech ${who}`}>
      <Avatar who={who} size={compact ? 28 : 32} />
      <div className="hpm-bubble"><span className="hpm-who">{c.name}</span><p style={compact ? { fontSize: 12.5 } : null}>{text}</p></div>
    </div>
  );
}

export function Chip({ children, tint, active, sm, mono, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`hpm-chip ${active ? "on" : ""} ${tint || ""} ${sm ? "sm" : ""} ${mono ? "mono" : ""}`}>
      {children}
    </button>
  );
}
