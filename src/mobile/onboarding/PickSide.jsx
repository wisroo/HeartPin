import { Avatar } from "../ui/MobileAtoms.jsx";
export default function PickSide({ settings, onPick }) {
  return (
    <div className="hpm-screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
      <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, color: "var(--ink)" }}>누구의 폰인가요?</h2>
      <p style={{ color: "var(--ink2)" }}>한 번만 골라주세요</p>
      <div style={{ display: "flex", gap: 16 }}>
        {[["bara", settings.nameBara], ["nyong", settings.nameNyong]].map(([who, name]) => (
          <button key={who} className="hpm-card" onClick={() => onPick(who)} aria-label={name}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "22px 26px", background: "var(--card)" }}>
            <Avatar who={who} size={84} />
            <span style={{ fontFamily: "var(--fd)", fontSize: 18, color: "var(--ink)" }}>{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
