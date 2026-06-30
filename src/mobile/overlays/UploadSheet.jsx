/* HeartPin Mobile · UploadSheet — 디자인 시트 UI + 실제 업로드 파이프라인
 * MobileUploadFlow의 실제 로직(addFiles/start/advance/commitName/nearestSpot/finish)을
 * 그대로 포팅하고, hpm-* 마크업으로 재스킨.  런치/완료 화면은 제거: 끝나면 toast + close.
 * pick → reading(진행률) → confirm(한 장씩) */
import { Fragment, useState, useRef } from "react";
import { HP_DATA, suggest, autoLine, hav } from "../../data.js";
import { buildTripFromGroups } from "../../buildTrip.js";
import * as api from "../../api.js";
import { Photo, Avatar, Ico } from "../ui/MobileAtoms.jsx";

// 근접 매칭: 세션 스팟 + 기록의 모든 스팟 중 300m 이내 최단 (MobileUploadFlow에서 그대로)
function nearestSpot(item, sessionSpots) {
  if (item.lat == null) return null;
  let best = null, bd = 0.3;
  sessionSpots.forEach((s) => {
    const d = hav(item.lat, item.lng, s.lat, s.lng);
    if (d < bd) { bd = d; best = { type: "session", key: s.key, name: s.name }; }
  });
  Object.values(HP_DATA.regions).forEach((r) => r.trips.forEach((t) => t.days.forEach((d) => d.spots.forEach((s) => {
    if (s.lat == null) return;
    const dist = hav(item.lat, item.lng, s.lat, s.lng);
    if (dist < bd) { bd = dist; best = { type: "existing", tripId: t.id, spotId: s.id, name: s.name }; }
  }))));
  return best;
}

export default function UploadSheet({ app, nav, settings }) {
  const owner = settings.myChar || "bara";
  const [screen, setScreen] = useState("pick"); // pick | reading | confirm
  const [src, setSrc] = useState("roll");
  const [files, setFiles] = useState([]); // {id, file, url}
  const [sel, setSel] = useState(() => new Set());
  const [prog, setProg] = useState(0);
  const [errMsg, setErrMsg] = useState(null);

  const [queue, setQueue] = useState([]); // 서버가 만든 inbox 아이템들 (이번 업로드분)
  const [idx, setIdx] = useState(0);
  const [dec, setDec] = useState({}); // itemId -> {action:'keep'|'discard'|'skip', spot}
  const [sessionSpots, setSessionSpots] = useState([]); // {key,name,lat,lng}
  const [naming, setNaming] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [dupCount, setDupCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const rollRef = useRef(null), camRef = useRef(null);

  const addFiles = (fileList) => {
    const imgs = [...fileList].filter((f) => f.type.indexOf("image/") === 0 || /\.(heic|heif)$/i.test(f.name));
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => p.file.name + "|" + p.file.size));
      const fresh = imgs.filter((f) => !seen.has(f.name + "|" + f.size))
        .map((f, i) => ({ id: "f" + Date.now() + "_" + i, file: f, url: URL.createObjectURL(f) }));
      setSel((s) => { const n = new Set(s); fresh.forEach((x) => n.add(x.id)); return n; });
      return prev.concat(fresh);
    });
  };
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── 업로드 시작: 서버가 EXIF·해시·압축 처리 ──
  const start = async () => {
    const chosen = files.filter((f) => sel.has(f.id));
    if (!chosen.length) return;
    setScreen("reading"); setProg(0); setErrMsg(null);
    try {
      const result = await api.uploadPhotos(chosen.map((c) => c.file), owner, setProg);
      app.apply(result.state);
      setDupCount(result.duplicates.length);
      setQueue(result.added); setIdx(0); setDec({}); setSessionSpots([]);
      if (result.added.length) setScreen("confirm");
      else endUpload(0, 0, 0, result.duplicates.length);
    } catch (e) {
      setErrMsg(e.message); setScreen("pick");
    }
  };

  // ── 확인 단계 ──
  const cur = queue[idx];
  const curDec = cur ? dec[cur.id] : null;
  const match = cur && !curDec?.spot ? nearestSpot(cur, sessionSpots) : null;
  const autoProposal = cur && !curDec?.spot && !match && cur.lat != null
    ? { type: "session", key: "new_" + cur.id, name: `장소 ${sessionSpots.length + 1}`, auto: true }
    : null;
  const activeSpot = (curDec && curDec.spot) || match || autoProposal;

  const sug = cur ? suggest(cur) : null;
  const chipList = (() => {
    if (!cur) return [];
    const chips = sessionSpots.map((s) => ({ type: "session", key: s.key, name: s.name }));
    (sug?.spots || []).forEach((s) => chips.push({ type: "existing", tripId: sug.tripId, spotId: s.id, name: s.name }));
    if (autoProposal) chips.unshift(autoProposal);
    const seen = new Set();
    return chips.filter((c) => { const k = c.name + (c.spotId || c.key || ""); if (seen.has(k)) return false; seen.add(k); return true; });
  })();
  const sameAs = (a, b) => a && b && a.name === b.name && (a.spotId || a.key) === (b.spotId || b.key);

  const setSpot = (spot) => setDec((d) => ({ ...d, [cur.id]: { action: d[cur.id]?.action || "keep", spot } }));
  const commitName = () => {
    const nm = nameVal.trim();
    setNaming(false); setNameVal("");
    if (!nm || cur.lat == null && !activeSpot) return;
    // 새 이름 = 새 세션 스팟 (위치는 현재 사진 GPS, 없으면 선택 불가라 GPS 보장됨)
    setSpot({ type: "session", key: "new_" + cur.id + "_" + nm, name: nm, named: true });
  };

  const advance = (action) => {
    const spot = action === "keep" ? activeSpot : null;
    if (action === "keep" && spot && spot.type === "session" && !sessionSpots.some((s) => s.key === spot.key)) {
      setSessionSpots((prev) => prev.concat({ key: spot.key, name: spot.name, lat: cur.lat, lng: cur.lng }));
    }
    const nd = { ...dec, [cur.id]: { action, spot } };
    setDec(nd); setNaming(false); setNameVal("");
    if (idx >= queue.length - 1) finish(nd);
    else setIdx((i) => i + 1);
  };

  // ── 끝맺음: 완료 화면 대신 toast + close ──
  const endUpload = (keptN) => {
    nav.toast(keptN ? `${keptN}장 정리에 담았어요` : "올릴 새 사진이 없었어요");
    nav.close();
  };

  // ── 완료: 결정을 ops로 변환 (기존 여정 배치 / 새 여행 조립 / 버리기) ──
  const finish = async (decisions) => {
    setSaving(true);
    try {
      const kept = queue.filter((q) => decisions[q.id]?.action === "keep" && decisions[q.id].spot);
      const dropped = queue.filter((q) => decisions[q.id]?.action === "discard");

      const rows = [], pool = [];
      kept.forEach((q) => {
        const sp = decisions[q.id].spot;
        if (sp.type === "existing") {
          rows.push({ itemId: q.id, tripId: sp.tripId, spotId: sp.spotId, memo: q.autoLabel });
        } else {
          const s = suggest(q);
          if (s?.tripId) rows.push({
            itemId: q.id, tripId: s.tripId, spotId: "__new__", newSpotName: sp.name, newKey: sp.key,
            memo: q.autoLabel, line: autoLine({ time: q.time })
          });
          else pool.push({ item: q, spot: sp });
        }
      });

      let st = null;
      if (rows.length) { st = await api.opPlacePhotos(rows); }
      if (pool.length) {
        const tr = buildTripFromGroups(pool);
        st = await api.opAddTrip(tr);
      }
      // 확인 단계의 "버리기" = 방금 올린 사진 취소 → 완전 삭제 (재업로드 가능)
      if (dropped.length) st = await api.opInboxPurge(dropped.map((d) => d.id));
      if (st) app.apply(st);

      endUpload(kept.length);
    } catch (e) {
      setErrMsg(e.message); setSaving(false); setScreen("pick");
    }
  };

  // ════════ PICK ════════
  if (screen === "pick") {
    const closePick = () => {
      files.forEach((f) => URL.revokeObjectURL(f.url));
      nav.close();
    };
    return (
      <div className="hpm-overlay" onClick={(e) => { if (e.target === e.currentTarget) closePick(); }}>
        <div className="hpm-sheet-modal">
          <div className="hpm-up-head">
            <div className="ttl">사진 올리기</div>
            <button className="ic" onClick={closePick} style={{ width: 34, height: 34, border: "1.5px solid var(--line2)", borderRadius: 11, color: "var(--ink2)" }}>✕</button>
          </div>
          <div className="hpm-up-body" style={{ maxHeight: "70vh" }}>
            <div className="hpm-speech bara" style={{ marginBottom: 14 }}>
              <Avatar who="bara" size={30} />
              <div className="hpm-bubble"><p>여행 중 찍은 거 그냥 다 골라줘! 정리는 내가 할게 🐻✨</p></div>
            </div>
            <div className="hpm-src">
              <button className={src === "roll" ? "on" : ""} onClick={() => { setSrc("roll"); rollRef.current?.click(); }}><span className="ic"><Ico.image width="24" height="24" /></span><span className="lb">카메라롤</span></button>
              <button className={src === "cam" ? "on" : ""} onClick={() => { setSrc("cam"); camRef.current?.click(); }}><span className="ic"><Ico.cam width="24" height="24" /></span><span className="lb">바로 찍기</span></button>
            </div>
            <input ref={rollRef} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            {errMsg && <p className="hpm-err" style={{ color: "var(--sd)", fontSize: 13, margin: "8px 0" }}>⚠️ {errMsg}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--fd)", fontSize: 15, color: "var(--ink)" }}>{files.length ? "고른 사진" : "최근 사진"}</span>
              <span className="hpm-chip sm on">{sel.size}장 선택</span>
            </div>
            {files.length ? (
              <div className="hpm-roll">
                {files.map((p) => (
                  <button key={p.id} className={`hpm-rollitem ${sel.has(p.id) ? "sel" : ""}`} onClick={() => toggle(p.id)}>
                    <Photo cap={false} photo={{ src: p.url }} style={{ width: "100%", height: "100%" }} />
                    <span className="hpm-rollcheck">{sel.has(p.id) ? "✓" : ""}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13.5, color: "var(--ink2)", textAlign: "center", padding: "18px 0" }}>위에서 <b>카메라롤</b>을 누르면 사진 선택기가 열려요.</p>
            )}
          </div>
          <div className="hpm-up-foot">
            <button className="hpm-btn block" disabled={!sel.size} style={!sel.size ? { opacity: .5, boxShadow: "0 4px 0 var(--line2)" } : null}
              onClick={start}>
              {sel.size}장 올리고 정리하기 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════ READING (실제 업로드 진행률) ════════
  if (screen === "reading") {
    const pct = Math.round(prog * 100);
    return (
      <div className="hpm-full dotgrid" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 32 }}>
        <Avatar who="bara" size={64} />
        <h3 style={{ fontFamily: "var(--fd)", fontSize: 18, color: "var(--ink)" }}>{prog < 1 ? `올리는 중… ${pct}%` : "사진 정보 읽는 중…"}</h3>
        <div className="hpm-up-prog" style={{ width: "70%" }}>
          <i className="on" style={{ flex: pct, transition: "flex .2s" }} />
          <i style={{ flex: 100 - pct }} />
        </div>
        <p style={{ fontSize: 13.5, color: "var(--ink2)", textAlign: "center" }}>찍은 날짜와 위치를 찾아 자동으로 정리하고 있어요</p>
      </div>
    );
  }

  // ════════ CONFIRM (한 장씩) ════════
  if (!cur) return null;
  const total = queue.length;
  const canNext = !!activeSpot && !saving;

  return (
    <div className="hpm-full dotgrid">
      <div className="hpm-up-head" style={{ paddingTop: 46 }}>
        <button className="ic" onClick={() => finish(dec)} aria-label="나머지는 정리함으로" style={{ width: 34, height: 34, border: "1.5px solid var(--line2)", borderRadius: 11, color: "var(--ink2)" }}>✕</button>
        <div className="ttl" style={{ textAlign: "center", fontSize: 18 }}>{idx + 1} / {total} 확인</div>
        <button onClick={() => advance("skip")} style={{ fontSize: 13, color: "var(--ink2)", fontFamily: "var(--fb)", paddingRight: 4 }}>건너뛰기</button>
      </div>
      <div className="hpm-up-prog">
        {queue.map((p, i) => <i key={p.id} className={i <= idx ? "on" : ""} />)}
      </div>
      <div className="hpm-up-body">
        <Photo className="hpm-confirm-photo" photo={{ src: cur.src }} label={cur.autoLabel} />
        <div className="hpm-auto">
          <div className="hpm-auto-row">
            <Ico.pin width="16" height="16" style={{ color: "var(--sd)" }} />
            <b style={{ fontWeight: 400, fontFamily: "var(--fb)" }}>{cur.lat != null ? (activeSpot?.name || "위치 인식됨") : "위치 정보 없음"}</b>
            <span className="hpm-chip sm cool" style={{ marginLeft: "auto" }}>{activeSpot?.auto ? "새 장소" : activeSpot?.named ? "직접" : "자동"}</span>
          </div>
          <div className="hpm-auto-row"><Ico.clock width="16" height="16" style={{ color: "var(--sd)" }} /><span>{cur.date.replaceAll("-", ".")} · {cur.time}</span></div>
          <div className="hpm-auto-guess">
            {cur.lat == null
              ? (chipList.length ? "아래에서 장소를 직접 골라주면 채워둘게요" : "고를 장소가 아직 없어요 — 건너뛰면 정리함에 모아둘게요 (PC에서 배치)")
              : (sug
                ? <Fragment>→ <b>{sug.tripTitle}</b> · {sug.dayLabel || "날짜 추정"}{sug.spotName ? <> · <b>{sug.spotName}</b>{sug.distM != null ? ` (${sug.distM}m)` : ""}</> : ""} 으로 추정</Fragment>
                : "추천할 여행을 못 찾았어요 — 직접 골라주세요")}
          </div>
        </div>
        <div style={{ fontFamily: "var(--fd)", fontSize: 14, color: "var(--ink)", marginBottom: 8 }}>{cur.lat == null ? "장소 지정" : "어디에 담을까?"}</div>
        <div className="hpm-secrow" style={{ flexWrap: "wrap", gap: 7 }}>
          {chipList.map((c) => (
            <button key={c.name + (c.spotId || c.key || "")} type="button"
              className={`hpm-chip ${sameAs(activeSpot, c) ? "on" : ""}`}
              onClick={() => setSpot(c)}>{c.name}</button>
          ))}
          {(cur.lat != null || chipList.length > 0) && (
            naming
              ? (
                <input
                  className="hpm-cinput" autoFocus value={nameVal} placeholder="장소 이름"
                  style={{ width: 110, fontSize: 13 }}
                  onChange={(e) => setNameVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNaming(false); setNameVal(""); } }}
                  onBlur={commitName}
                />
              )
              : <button type="button" className="hpm-chip" onClick={() => cur.lat != null ? setNaming(true) : null} disabled={cur.lat == null} style={cur.lat == null ? { opacity: .5 } : null}>＋ 새 스팟</button>
          )}
        </div>
      </div>
      <div className="hpm-up-foot">
        <button className="hpm-btn ghost" style={{ flex: "0 0 84px" }} disabled={saving} onClick={() => advance("discard")}>버리기</button>
        <button className="hpm-btn" style={{ flex: 1 }} disabled={!canNext} onClick={() => advance("keep")}>
          {saving ? "저장 중…" : idx >= total - 1 ? "담고 완료 ✓" : "담고 다음 →"}
        </button>
      </div>
    </div>
  );
}
