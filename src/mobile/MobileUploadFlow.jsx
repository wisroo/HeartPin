/* HeartPin · 모바일 업로드 플로우 (디자인 핸드오프 #4: 런치→고르기→읽는 중→한 장씩 확인→완료)
 * 웹 번역 2건: 카메라롤 그리드 = OS 사진 선택기 경유 / 장소명 = 세션 부트스트랩
 * (자동 이름 "장소 N" → 사용자 수정 → 이후 근접(300m) 제안 — 역지오코딩은 Phase 5) */
import { Fragment, useState, useRef } from "react";
import { CHAR } from "../chars.js";
import { HP_DATA, suggest, autoLine, hav } from "../data.js";
import { buildTripFromGroups } from "../buildTrip.js";
import * as api from "../api.js";

// 근접 매칭: 세션 스팟 + 기록의 모든 스팟 중 300m 이내 최단
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

function Say({ who, tone, children }) {
  return (
    <div className="hpu-say">
      <img src={CHAR[who].src} className="hpu-av" alt={CHAR[who].name} />
      <div className={`hpu-bubble ${tone || ""}`}>{children}</div>
    </div>
  );
}

export default function MobileUploadFlow({ onApplyState, onOpenMap, hasTrips, inboxCount, onOpenInbox }) {
  const [screen, setScreen] = useState("launch"); // launch | pick | reading | confirm | done
  const [owner, setOwner] = useState(api.getOwner());
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
  const [done, setDone] = useState(null); // {bySpot, droppedN, skippedN, tripLabel}
  const [saving, setSaving] = useState(false);

  const rollRef = useRef(null), camRef = useRef(null);

  const pickOwner = (who) => { api.setOwner(who); setOwner(who); };

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
      const result = await api.uploadPhotos(chosen.map((c) => c.file), owner || "bara", setProg);
      onApplyState(result.state);
      setDupCount(result.duplicates.length);
      setQueue(result.added); setIdx(0); setDec({}); setSessionSpots([]);
      if (result.added.length) setScreen("confirm");
      else { setDone({ bySpot: {}, droppedN: 0, skippedN: 0, tripLabel: null }); setScreen("done"); }
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

  // ── 완료: 결정을 ops로 변환 (기존 여정 배치 / 새 여행 조립 / 버리기) ──
  const finish = async (decisions) => {
    setSaving(true);
    try {
      const kept = queue.filter((q) => decisions[q.id]?.action === "keep" && decisions[q.id].spot);
      const dropped = queue.filter((q) => decisions[q.id]?.action === "discard");
      const skippedN = queue.length - kept.length - dropped.length;

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

      let st = null, tripLabel = null;
      if (rows.length) { st = await api.opPlacePhotos(rows); tripLabel = sug?.tripTitle || null; }
      if (pool.length) {
        const tr = buildTripFromGroups(pool);
        st = await api.opAddTrip(tr);
        tripLabel = `${tr.title} · ${tr.dateLabel}`;
      }
      // 확인 단계의 "버리기" = 방금 올린 사진 취소 → 완전 삭제 (재업로드 가능)
      if (dropped.length) st = await api.opInboxPurge(dropped.map((d) => d.id));
      if (st) onApplyState(st);

      const bySpot = {};
      kept.forEach((q) => { const nm = decisions[q.id].spot.name; bySpot[nm] = (bySpot[nm] || 0) + 1; });
      setDone({ bySpot, droppedN: dropped.length, skippedN, tripLabel });
      setScreen("done");
    } catch (e) {
      setErrMsg(e.message); setScreen("pick");
    } finally { setSaving(false); }
  };

  const resetAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]); setSel(new Set()); setQueue([]); setIdx(0); setDec({});
    setSessionSpots([]); setDupCount(0); setDone(null); setScreen("launch");
  };

  // ════════ LAUNCH ════════
  if (screen === "launch") {
    return (
      <div className="hpu-screen launch">
        <div className="hpu-launch">
          <div className="hpu-launch-brand">
            <div className="hpu-mark">
              <svg viewBox="0 0 24 22" width="24" height="22"><path d="M12 20.4C4.6 14.7 2 10.9 2 6.8 2 3.7 4.4 1.3 7.4 1.3 9.4 1.3 11.1 2.4 12 4.1 12.9 2.4 14.6 1.3 16.6 1.3 19.6 1.3 22 3.7 22 6.8 22 10.9 19.4 14.7 12 20.4Z" fill="#fffdf8" /></svg>
            </div>
            <div className="hpu-wordmark">HeartPin</div>
            <div className="hpu-wordmark-ko">하트핀</div>
          </div>
          <div className="hpu-launch-chars">
            <img src={CHAR.bara.src} className="hpu-lc bara" alt="바라" />
            <span className="hpu-lc-heart">♥</span>
            <img src={CHAR.nyong.src} className="hpu-lc nyong" alt="뇽이" />
          </div>
          <div className="hpu-dday">바라 ♥ 뇽이 · D+{api.dplus()}</div>
          <h2 className="hpu-launch-t">우리 여행, 핀 하나에 담다</h2>
          {owner
            ? <p className="hpu-launch-d">{"오늘 찍은 사진부터 톡 올려봐요.\n장소와 시간은 우리가 알아서 정리할게요."}</p>
            : (
              <div className="hpu-ownerq">
                <p>누구의 폰인가요? <small>(한 번만 물어봐요)</small></p>
                <div className="hpu-ownerq-btns">
                  <button type="button" onClick={() => pickOwner("bara")}><img src={CHAR.bara.src} alt="" /> 바라</button>
                  <button type="button" onClick={() => pickOwner("nyong")}><img src={CHAR.nyong.src} alt="" /> 뇽이</button>
                </div>
              </div>
            )}
        </div>
        <div className="hpu-sticky col">
          <button className="hpu-cta" disabled={!owner} onClick={() => setScreen("pick")}>오늘 사진 올리기 →</button>
          {hasTrips
            ? <button className="hpu-cta ghost" onClick={onOpenMap}>내 여정 둘러보기 ◎</button>
            : <button className="hpu-cta ghost muted" disabled>내 여정 둘러보기 · 곧</button>}
          {inboxCount > 0 && (
            <button className="hpu-cta ghost" onClick={onOpenInbox}>🗂️ 정리함 {inboxCount} — 못 정한 사진 배치</button>
          )}
        </div>
      </div>
    );
  }

  // ════════ PICK ════════
  if (screen === "pick") {
    return (
      <div className="hpu-screen">
        <div className="hpu-top">
          <button className="hpu-x" onClick={resetAll} aria-label="닫기">✕</button>
          <div className="hpu-top-ttl">사진 올리기</div>
          <div style={{ width: 34 }} />
        </div>
        <div className="hpu-body">
          <Say who="bara" tone="warm">여행 중 찍은 거 그냥 다 골라줘! 정리는 내가 할게 🐾</Say>
          <div className="hpu-sources">
            <button className="hpu-src on" type="button" onClick={() => rollRef.current?.click()}>
              <span className="hpu-src-ico">🖼️</span>
              <span className="hpu-src-t">카메라롤</span>
              <span className="hpu-src-d">여러 장 선택</span>
            </button>
            <button className="hpu-src" type="button" onClick={() => camRef.current?.click()}>
              <span className="hpu-src-ico">📷</span>
              <span className="hpu-src-t">바로 찍기</span>
              <span className="hpu-src-d">카메라 열기</span>
            </button>
          </div>
          <input ref={rollRef} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          {errMsg && <p className="hpu-err">⚠️ {errMsg}</p>}
          <div className="hpu-grid-head">
            <span>{files.length ? "고른 사진" : "아직 없어요"}</span>
            <span className="hpu-pick-n">{sel.size}장 선택</span>
          </div>
          {files.length
            ? (
              <div className="hpu-grid">
                {files.map((p) => (
                  <button key={p.id} type="button" className={`hpu-cell ${sel.has(p.id) ? "on" : ""}`} onClick={() => toggle(p.id)}>
                    <div className="hpu-ph" style={{ height: "100%", backgroundImage: `url(${p.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    <span className="hpu-check">{sel.has(p.id) ? "✓" : ""}</span>
                  </button>
                ))}
              </div>
            )
            : <p className="hpu-empty-hint">위에서 <b>카메라롤</b>을 누르면 사진 선택기가 열려요.</p>}
        </div>
        <div className="hpu-sticky">
          <button className="hpu-cta" disabled={sel.size === 0} onClick={start}>{sel.size}장 올리고 정리하기 →</button>
        </div>
      </div>
    );
  }

  // ════════ READING (실제 업로드 진행률) ════════
  if (screen === "reading") {
    const uploading = prog < 1;
    return (
      <div className="hpu-screen">
        <div className="hpu-reading">
          <div className="hpu-read-chars">
            <img src={CHAR.bara.src} className="hpu-read-av bob1" alt="바라" />
            <img src={CHAR.nyong.src} className="hpu-read-av bob2" alt="뇽이" />
          </div>
          <div className="hpu-spin" />
          <h3 className="hpu-read-t">{uploading ? `올리는 중… ${Math.round(prog * 100)}%` : "사진 정보 읽는 중…"}</h3>
          <p className="hpu-read-d">{uploading ? "원본을 보관소로 보내고 있어요" : "찍은 날짜와 위치를 찾아\n자동으로 정리하고 있어요"}</p>
          <div className="hpu-read-prog"><span style={{ width: `${Math.max(8, Math.round(prog * 100))}%` }} /></div>
        </div>
      </div>
    );
  }

  // ════════ DONE ════════
  if (screen === "done" && done) {
    const keptN = Object.values(done.bySpot).reduce((a, b) => a + b, 0);
    return (
      <div className="hpu-screen">
        <div className="hpu-done">
          <div className="hpu-done-chars">
            <img src={CHAR.bara.src} className="hpu-done-av pop1" alt="바라" />
            <div className="hpu-spark">✨</div>
            <img src={CHAR.nyong.src} className="hpu-done-av pop2" alt="뇽이" />
          </div>
          <h2 className="hpu-done-t">{keptN ? `${keptN}장을 여정에 담았어요!` : "올릴 새 사진이 없었어요"}</h2>
          <p className="hpu-done-d">
            {done.tripLabel || ""}
            {done.droppedN > 0 && <span className="hpu-done-drop"> · {done.droppedN}장은 버렸어요</span>}
            {done.skippedN > 0 && <span> · {done.skippedN}장은 정리함에</span>}
            {dupCount > 0 && <span> · 이미 올린 {dupCount}장은 건너뛰었어요</span>}
          </p>
          {keptN > 0 && (
            <div className="hpu-done-card">
              {Object.keys(done.bySpot).map((s) => (
                <div key={s} className="hpu-done-row">
                  <span className="hpu-done-dot" />
                  <span className="hpu-done-spot">{s}</span>
                  <span className="hpu-done-cnt">{done.bySpot[s]}장</span>
                </div>
              ))}
            </div>
          )}
          <Say who="nyong" tone="cool">오늘 하루도 잘 남겼다! 나중에 PC에서 더 예쁘게 꾸며보자 💻</Say>
        </div>
        <div className="hpu-sticky col">
          <button className="hpu-cta" onClick={onOpenMap}>지도에서 보기 ◎</button>
          <button className="hpu-cta ghost" onClick={resetAll}>처음으로</button>
        </div>
      </div>
    );
  }

  // ════════ CONFIRM (한 장씩) ════════
  if (!cur) return null;
  const total = queue.length;
  const needSpot = cur.lat == null && !activeSpot;
  const canNext = !!activeSpot && !saving;

  return (
    <div className="hpu-screen">
      <div className="hpu-top">
        <button className="hpu-x" onClick={() => finish(dec)} aria-label="나머지는 정리함으로">✕</button>
        <div className="hpu-top-ttl">{idx + 1} / {total} 확인</div>
        <button className="hpu-skip" onClick={() => advance("skip")}>건너뛰기</button>
      </div>
      <div className="hpu-seg">
        {queue.map((p, i) => <span key={p.id} className={`hpu-seg-i ${i < idx ? "done" : i === idx ? "now" : ""}`} />)}
      </div>
      <div className="hpu-body confirm slidein" key={cur.id}>
        <div className="hpu-ph" style={{ aspectRatio: "4 / 5", borderRadius: 18, backgroundImage: `url(${cur.src})`, backgroundSize: "cover", backgroundPosition: "center" }}>
          <span className="hpu-ph-hint">{cur.autoLabel}</span>
        </div>
        <div className={`hpu-auto ${cur.lat == null ? "warn" : ""}`}>
          {cur.lat == null
            ? (
              <Fragment>
                <div className="hpu-auto-row">
                  <span className="hpu-auto-ico">📍</span>
                  <span className="hpu-auto-main warn">위치를 못 찾았어요</span>
                  <span className="hpu-auto-time">🕘 {cur.time}</span>
                </div>
                <div className="hpu-auto-sub">{chipList.length ? "아래에서 장소를 직접 골라주면 채워둘게요" : "고를 장소가 아직 없어요 — 건너뛰면 정리함에 모아둘게요 (PC에서 배치)"}</div>
              </Fragment>
            )
            : (
              <Fragment>
                <div className="hpu-auto-row">
                  <span className="hpu-auto-ico">📍</span>
                  <span className="hpu-auto-main">{activeSpot?.name}</span>
                  <span className="hpu-auto-badge">{activeSpot?.auto ? "새 장소 · 자동 이름" : activeSpot?.named ? "직접 지정" : "자동 인식"}</span>
                </div>
                <div className="hpu-auto-sub">🕘 {cur.date.replace(/-/g, ".").slice(2)} · {cur.time} 으로 정리했어요{activeSpot?.auto ? " — 이름은 ＋새 장소에서 바꿀 수 있어요" : ""}</div>
              </Fragment>
            )}
        </div>
        <div className="hpu-spotlabel">{cur.lat == null ? "장소 지정" : "다른 곳이면 바꿔주세요"}</div>
        <div className="hpu-chips">
          {chipList.map((c) => (
            <button key={c.name + (c.spotId || c.key || "")} type="button"
              className={`hpu-chip ${sameAs(activeSpot, c) ? "on" : ""}`}
              onClick={() => setSpot(c)}>{c.name}</button>
          ))}
          {(cur.lat != null || chipList.length > 0) && (
            naming
              ? (
                <input
                  className="hpu-chip-input" autoFocus value={nameVal} placeholder="장소 이름"
                  onChange={(e) => setNameVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNaming(false); setNameVal(""); } }}
                  onBlur={commitName}
                />
              )
              : <button type="button" className="hpu-chip add" onClick={() => cur.lat != null ? setNaming(true) : null} disabled={cur.lat == null}>＋ 새 장소</button>
          )}
        </div>
      </div>
      <div className="hpu-sticky row">
        <button className="hpu-act drop" disabled={saving} onClick={() => advance("discard")}>버리기</button>
        <button className="hpu-act keep" disabled={!canNext} onClick={() => advance("keep")}>
          {saving ? "저장 중…" : idx >= total - 1 ? "담고 완료 ✓" : "담고 다음 →"}
        </button>
      </div>
    </div>
  );
}
