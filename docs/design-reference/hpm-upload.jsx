/* HeartPin Mobile · 사진 올리기 → 빠른 확인 */

function UploadFlow({ nav }) {
  const roll = window.HP_INBOX.slice(0, 12);
  const [step, setStep] = useState(1);
  const [src, setSrc] = useState("roll");
  const [sel, setSel] = useState(() => roll.slice(0, 6).map(r => r.id));
  const [idx, setIdx] = useState(0);
  const [decided, setDecided] = useState({}); // id -> 'kept'|'dropped'

  const selItems = roll.filter(r => sel.includes(r.id));

  function toggle(id) {
    setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function decide(kind) {
    const cur = selItems[idx];
    setDecided(d => ({ ...d, [cur.id]: kind }));
    if (idx + 1 < selItems.length) setIdx(idx + 1);
    else { nav.toast(`${selItems.length}장 정리 완료! 🐻`); nav.close(); }
  }

  // STEP 1 — pick
  if (step === 1) {
    return (
      <div className="hpm-overlay" onClick={(e) => { if (e.target === e.currentTarget) nav.close(); }}>
        <div className="hpm-sheet-modal">
          <div className="hpm-up-head">
            <div className="ttl">사진 올리기</div>
            <button className="ic" onClick={nav.close} style={{ width: 34, height: 34, border: "1.5px solid var(--line2)", borderRadius: 11, color: "var(--ink2)" }}>✕</button>
          </div>
          <div className="hpm-up-body" style={{ maxHeight: "70vh" }}>
            <div className="hpm-speech bara" style={{ marginBottom: 14 }}>
              <Avatar who="bara" size={30} />
              <div className="hpm-bubble"><p>여행 중 찍은 거 그냥 다 골라줘! 정리는 내가 할게 🐻✨</p></div>
            </div>
            <div className="hpm-src">
              <button className={src === "roll" ? "on" : ""} onClick={() => setSrc("roll")}><span className="ic"><Ico.image width="24" height="24" /></span><span className="lb">카메라롤</span></button>
              <button className={src === "cam" ? "on" : ""} onClick={() => setSrc("cam")}><span className="ic"><Ico.cam width="24" height="24" /></span><span className="lb">바로 찍기</span></button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink)" }}>최근 사진</span>
              <span className="hpm-chip sm on">{sel.length}장 선택</span>
            </div>
            <div className="hpm-roll">
              {roll.map(r => (
                <button key={r.id} className={`hpm-rollitem ${sel.includes(r.id) ? "sel" : ""}`} onClick={() => toggle(r.id)}>
                  <Photo cap={false} tint={r.tint} />
                  <span className="hpm-rollcheck">{sel.includes(r.id) ? "✓" : ""}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="hpm-up-foot">
            <button className="hpm-btn block" disabled={!sel.length} style={!sel.length ? { opacity: .5, boxShadow: "0 4px 0 var(--line2)" } : null}
              onClick={() => { setIdx(0); setStep(2); }}>
              {sel.length}장 올리고 정리하기 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2 — one-by-one confirm
  const cur = selItems[idx];
  const sug = window.HP_SUGGEST(cur);
  const altSpots = sug ? sug.spots.slice(0, 3) : [];
  return (
    <div className="hpm-full dotgrid">
      <div className="hpm-up-head" style={{ paddingTop: 46 }}>
        <button className="ic" onClick={nav.close} style={{ width: 34, height: 34, border: "1.5px solid var(--line2)", borderRadius: 11, color: "var(--ink2)" }}>✕</button>
        <div className="ttl" style={{ textAlign: "center", fontSize: 18 }}>{idx + 1} / {selItems.length} 확인</div>
        <button onClick={() => decide("skip")} style={{ fontSize: 13, color: "var(--ink2)", fontFamily: "var(--fb)", paddingRight: 4 }}>건너뛰기</button>
      </div>
      <div className="hpm-up-prog">
        {selItems.map((_, i) => <i key={i} className={i <= idx ? "on" : ""} />)}
      </div>
      <div className="hpm-up-body">
        <Photo className="hpm-confirm-photo" label={cur.autoLabel} tint={cur.tint} />
        <div className="hpm-auto">
          <div className="hpm-auto-row"><Ico.pin width="16" height="16" style={{ color: "var(--sd)" }} /><b style={{ fontWeight: 400, fontFamily: "var(--fb)" }}>{cur.lat != null ? "위치 인식됨" : "위치 정보 없음"}</b><span className="hpm-chip sm cool" style={{ marginLeft: "auto" }}>자동</span></div>
          <div className="hpm-auto-row"><Ico.clock width="16" height="16" style={{ color: "var(--sd)" }} /><span>{cur.date.replaceAll("-", ".")} · {cur.time}</span></div>
          <div className="hpm-auto-guess">
            → {sug ? <><b>{sug.tripTitle}</b> · {sug.dayLabel || "날짜 추정"}{sug.spotName ? <> · <b>{sug.spotName}</b>{sug.distM != null ? ` (${sug.distM}m)` : ""}</> : ""} 으로 추정</> : "추천할 여행을 못 찾았어요 — 직접 골라주세요"}
          </div>
        </div>
        <div style={{ fontFamily: "var(--fd)", fontSize: 14, color: "var(--ink)", marginBottom: 8 }}>어디에 담을까?</div>
        <div className="hpm-secrow" style={{ flexWrap: "wrap", gap: 7 }}>
          {altSpots.map((s, i) => (
            <span key={s.id} className={`hpm-chip ${sug && s.id === sug.spotId ? "on" : ""}`}>{s.name}</span>
          ))}
          <span className="hpm-chip">＋ 새 스팟</span>
        </div>
      </div>
      <div className="hpm-up-foot">
        <button className="hpm-btn ghost" style={{ flex: "0 0 84px" }} onClick={() => decide("dropped")}>버리기</button>
        <button className="hpm-btn" style={{ flex: 1 }} onClick={() => decide("kept")}>담고 다음 →</button>
      </div>
    </div>
  );
}

Object.assign(window, { UploadFlow });
