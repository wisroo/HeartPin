import { useState } from "react";
import { Avatar, Ico } from "../ui/MobileAtoms.jsx";

export default function LoginScreen({ onSignIn, settings }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await onSignIn(email.trim(), password); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="hpm-screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <div className="hpm-logo" style={{ width: 48, height: 48, marginBottom: 10 }}><Ico.heart /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 6 }}><Avatar who="bara" size={36} /><span style={{ color: "var(--p)" }}>♥</span><Avatar who="nyong" size={36} /></div>
      <h1 style={{ fontFamily: "var(--fd)", fontSize: 22, color: "var(--ink)", marginBottom: 16 }}>HeartPin 로그인</h1>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ fontSize: 13, color: "var(--ink2)" }}>이메일
          <input className="hpm-cinput" style={{ width: "100%", textAlign: "left" }} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, color: "var(--ink2)" }}>비밀번호
          <input className="hpm-cinput" style={{ width: "100%", textAlign: "left" }} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <small style={{ color: "var(--pd)" }}>{error}</small>}
        <button className="hpm-btn block" type="submit" disabled={busy || !email.trim() || !password}>{busy ? "로그인 중…" : "로그인"}</button>
      </form>
    </div>
  );
}
