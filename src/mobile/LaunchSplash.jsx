import { useEffect } from "react";
import { Avatar } from "./ui/MobileAtoms.jsx";
import { dday } from "./useMobileSettings.js";

export default function LaunchSplash({ settings, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1500); return () => clearTimeout(t); }, [onDone]);
  return (
    <button type="button" aria-label="시작" className="hpm-screen hpm-splash" onClick={onDone}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, width: "100%", border: "none", background: "var(--paper)" }}>
      <div className="mk" style={{ width: 64, height: 64 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Avatar who="bara" size={56} /><span style={{ color: "var(--p)", fontSize: 22 }}>♥</span><Avatar who="nyong" size={56} />
      </div>
      <div style={{ fontFamily: "var(--fd)", fontSize: 26, color: "var(--ink)" }}>{settings.nameBara} ♥ {settings.nameNyong}</div>
      <span className="hpm-chip on">D+{dday(settings)}</span>
      <p style={{ fontFamily: "var(--fb)", color: "var(--ink2)" }}>우리 여행, 핀 하나에 담다</p>
    </button>
  );
}
