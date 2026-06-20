/* HeartPin · Inbox (정리함) — full-screen photo organizer */
import { Fragment, useState } from "react";
import { CHAR } from "../chars.js";
import { HP_DATA, ordered, suggest } from "../data.js";
import { Photo } from "./ui.jsx";
import MapPicker from "./MapPicker.jsx";

const TABS = [
  { key: "unsorted", label: "미분류", desc: "GIS·날짜 정보로 자동 정리했어요. 사진을 골라 여정에 배치해 주세요." },
  { key: "noloc", label: "위치 없음", desc: "위치 정보가 빠진 사진이에요. 배치할 때 장소를 직접 지정해 채워 주세요." },
  { key: "blurry", label: "검토함", desc: "흐릿해서 따로 빼뒀어요. 바로 지우지 않으니 천천히 남길지 정해 주세요." }
];
const tripShort = (t) => t.replace(/^\d+박 \d+일 /, "");

function suggestLine(item) {
  const s = suggest(item);
  if (!s) return "추정 불가";
  if (item.lat != null && s.spotName) return `${tripShort(s.tripTitle)} · ${s.spotName} 근처`;
  return `${tripShort(s.tripTitle)} · ${s.dayLabel || "날짜 추정"} · 위치 지정 필요`;
}

export default function Inbox({ items, onClose, onPlace, onNewTrip, onKeep, onDiscard, onPurge }) {
  const [tab, setTab] = useState("unsorted");
  const [sel, setSel] = useState(() => new Set());
  const [confirm, setConfirm] = useState(null);
  const [mapPickFor, setMapPickFor] = useState(null); // 지도 찍기 대상 row index
  const [toast, setToast] = useState(null);
  const allTrips = Object.values(HP_DATA.regions).flatMap((r) => r.trips);
  const spotsOf = (tripId) => { const t = allTrips.find((x) => x.id === tripId); return t ? ordered(t) : []; };

  const counts = { unsorted: 0, noloc: 0, blurry: 0 };
  items.forEach((i) => { counts[i.kind]++; });
  const list = items.filter((i) => i.kind === tab);
  const tabInfo = TABS.find((t) => t.key === tab);

  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selInTab = [...sel].filter((id) => { const it = items.find((x) => x.id === id); return it && it.kind === tab; });

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const openPlace = () => {
    const rows = selInTab.map((id) => {
      const item = items.find((x) => x.id === id);
      const sug = suggest(item);
      return { item, sug, tripId: (sug && sug.tripId) || "", spotId: (sug && sug.spotId) || "", memo: item.autoLabel };
    });
    setConfirm({ rows, tripTitle: "" });
  };
  const setRow = (i, patch) => setConfirm((c) => ({ ...c, rows: c.rows.map((r, j) => j === i ? { ...r, ...patch } : r) }));
  const rowValid = (r) => r.tripId && (r.tripId === "__newtrip__"
    ? (r.newSpotName || "").trim()
    : (r.spotId && (r.spotId !== "__new__" || (r.newSpotName || "").trim())));
  const placeValid = confirm && confirm.rows.every(rowValid);
  const doPlace = async () => {
    const n = confirm.rows.length;
    if (onPlace) await onPlace(confirm.rows, { newTripTitle: confirm.tripTitle }); // 서버가 배치 후 정리함에서 제거
    setSel(new Set()); setConfirm(null);
    flash(`${n}장을 여정에 배치했어요 ✓`);
  };
  const purgeSelected = () => {
    const n = selInTab.length;
    if (!window.confirm(`${n}장을 완전히 삭제할까요?\n보관소(하드)의 원본·압축본도 함께 지워져요. (같은 사진을 다시 올릴 수 있어요)`)) return;
    onPurge(selInTab); setSel(new Set()); flash(`${n}장을 완전히 삭제했어요`);
  };
  const newTripFromSel = () => {
    const its = selInTab.map((id) => items.find((x) => x.id === id)).filter(Boolean);
    const ok = onNewTrip && onNewTrip(its);
    if (!ok) flash("위치 정보가 있는 사진이 필요해요");
  };

  const keep = (id) => onKeep(id);
  const discard = (id) => { onDiscard([id]); setSel((s) => { const n = new Set(s); n.delete(id); return n; }); };
  const discardSelected = () => { const n = selInTab.length; onDiscard(selInTab); setSel(new Set()); flash(`${n}장을 정리했어요`); };

  return (
    <div className="hp-inbox">
      <div className="hp-inbox-head">
        <div className="hp-inbox-htext">
          <h2>정리함</h2>
          <p>{`자동 분류 ${items.length}장 · 손볼 사진을 골라보세요`}</p>
        </div>
        <div className="hp-inbox-help">
          <img src={CHAR.bara.src} alt="바라" />
          <p>사진 정보(날짜·위치)로 미리 정리해 뒀어. 확인만 해주면 여정에 쏙 넣을게!</p>
        </div>
        <button className="hp-inbox-close" onClick={onClose} type="button" aria-label="닫기">✕</button>
      </div>

      <div className="hp-inbox-tabs">
        {TABS.map((t) => (
          <button
            key={t.key} type="button"
            className={`hp-inbox-tab ${tab === t.key ? "on" : ""} ${t.key === "blurry" ? "warn" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}<span className="hp-tab-n">{counts[t.key]}</span>
          </button>
        ))}
      </div>
      <p className="hp-inbox-desc">{tabInfo.desc}</p>

      {list.length === 0
        ? (
          <div className="hp-inbox-empty">
            <img src={CHAR.nyong.src} alt="뇽이" />
            <p>여긴 다 정리했어요! 🎉</p>
          </div>
        )
        : (
          <div className="hp-inbox-grid">
            {list.map((it) => (
              <div
                key={it.id} className={`hp-icard ${sel.has(it.id) ? "sel" : ""}`}
                onClick={tab === "blurry" ? undefined : () => toggle(it.id)}
              >
                <div className={`hp-icard-photo ${it.blur ? "blur" : ""}`}>
                  <Photo photo={{ label: it.autoLabel, ratio: "4/3", tint: it.tint, src: it.src }} />
                  {tab !== "blurry" && <span className="hp-icard-check">{sel.has(it.id) ? "✓" : ""}</span>}
                </div>
                <div className="hp-icard-body">
                  <div className="hp-icard-name">{it.autoLabel}</div>
                  <div className="hp-imeta">📅 {it.date.replace(/-/g, ".").slice(2)} · {it.time}</div>
                  <div className="hp-imeta">{it.lat != null ? `📍 ${it.lat.toFixed(4)}, ${it.lng.toFixed(4)}` : "📍 위치 정보 없음"}</div>
                  <div className={`hp-isug ${it.lat == null ? "need" : ""}`}>✦ {suggestLine(it)}</div>
                  {tab === "blurry" && (
                    <div className="hp-iblur-acts">
                      <button type="button" className="hp-mini keep" onClick={() => keep(it.id)}>남기기</button>
                      <button type="button" className="hp-mini drop" onClick={() => discard(it.id)}>버리기</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* bottom action bar */}
      {selInTab.length > 0 && (
        <div className="hp-inbox-bar">
          <span className="hp-inbox-selinfo"><b>{selInTab.length}</b>장 선택됨</span>
          <button type="button" className="hp-bar-ghost" onClick={() => setSel(new Set())}>선택 해제</button>
          {tab === "blurry"
            ? (
              <Fragment>
                <button type="button" className="hp-bar-ghost danger" onClick={purgeSelected}>🗑 완전 삭제</button>
                <button type="button" className="hp-bar-act drop" onClick={discardSelected}>선택한 사진 버리기</button>
              </Fragment>
            )
            : (
              <Fragment>
                <button type="button" className="hp-bar-ghost danger" onClick={purgeSelected}>🗑 완전 삭제</button>
                <button type="button" className="hp-bar-ghost" onClick={newTripFromSel}>새 여행으로</button>
                <button type="button" className="hp-bar-act" onClick={openPlace}>여정에 배치하기 →</button>
              </Fragment>
            )}
        </div>
      )}

      {/* placement confirmation */}
      {confirm && (
        <div className="hp-confirm" onClick={() => setConfirm(null)}>
          <div className="hp-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="hp-confirm-head">
              <h3>이렇게 배치할까요?</h3>
              <p>날짜·위치로 자동 정리했어요. 장소나 메모를 고쳐도 돼요.</p>
              {confirm.rows.some((r) => r.tripId === "__newtrip__") && (
                <div className="hp-ntrip">
                  <label>새 여행 이름</label>
                  <input
                    className="hp-input"
                    placeholder="예: 부산 여행 (비우면 자동: 당일 여행 / N박 M일 여행)"
                    value={confirm.tripTitle || ""}
                    onChange={(e) => setConfirm((c) => ({ ...c, tripTitle: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div className="hp-confirm-rows">
              {confirm.rows.map((r, i) => (
                <div key={r.item.id} className="hp-crow">
                  <div className="hp-crow-photo"><Photo photo={{ label: r.item.autoLabel, ratio: "1/1", tint: r.item.tint, src: r.item.src }} /></div>
                  <div className="hp-crow-fields">
                    <div className="hp-crow-auto">
                      <span>📅 {r.item.date.replace(/-/g, ".").slice(2)} {r.item.time}</span>
                      {r.item.lat != null
                        ? <span>📍 {r.item.lat.toFixed(3)}, {r.item.lng.toFixed(3)}</span>
                        : (
                          <Fragment>
                            <span>{r.pickedLat != null ? `📍 ${r.pickedLat.toFixed(3)}, ${r.pickedLng.toFixed(3)} ✓` : "📍 위치 없음"}</span>
                            <button type="button" className="hp-mini pick" onClick={() => setMapPickFor(i)}>
                              {r.pickedLat != null ? "위치 수정" : "지도에서 위치 찍기"}
                            </button>
                          </Fragment>
                        )}
                    </div>
                    <div className="hp-field-row">
                      <div className="hp-field">
                        <label>여정</label>
                        <select className={`hp-select ${r.tripId ? "" : "need"}`} value={r.tripId} onChange={(e) => setRow(i, { tripId: e.target.value, spotId: "" })}>
                          <option value="">여정 선택…</option>
                          {allTrips.map((t) => <option key={t.id} value={t.id}>{tripShort(t.title)}</option>)}
                          <option value="__newtrip__">＋ 새 여행 만들기</option>
                        </select>
                      </div>
                      <div className="hp-field">
                        <label>장소</label>
                        {r.tripId === "__newtrip__"
                          ? (
                            <input
                              className={`hp-input nspot ${(r.newSpotName || "").trim() ? "" : "need"}`}
                              placeholder="장소 이름 (같은 이름끼리 한 장소로 묶여요)"
                              value={r.newSpotName || ""}
                              onChange={(e) => setRow(i, { newSpotName: e.target.value })}
                            />
                          )
                          : (
                            <Fragment>
                              <select className={`hp-select ${r.spotId ? "" : "need"}`} value={r.spotId} disabled={!r.tripId} onChange={(e) => setRow(i, { spotId: e.target.value })}>
                                <option value="">장소 선택…</option>
                                {spotsOf(r.tripId).map((s) => <option key={s.id} value={s.id}>{`${s.dayLabel} · ${s.name}`}</option>)}
                                {r.tripId && <option value="__new__">+ 새 장소 추가</option>}
                              </select>
                              {r.spotId === "__new__" && (
                                <input
                                  className={`hp-input nspot ${(r.newSpotName || "").trim() ? "" : "need"}`}
                                  placeholder="새 장소 이름 (핀 = 사진 위치)"
                                  value={r.newSpotName || ""}
                                  onChange={(e) => setRow(i, { newSpotName: e.target.value })}
                                />
                              )}
                            </Fragment>
                          )}
                      </div>
                    </div>
                    <div className="hp-field">
                      <label>메모</label>
                      <input className="hp-input" value={r.memo} onChange={(e) => setRow(i, { memo: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hp-confirm-foot">
              {!placeValid && <span className="hp-confirm-warn">장소가 비어 있는 사진이 있어요</span>}
              <button type="button" className="hp-bar-ghost" onClick={() => setConfirm(null)}>취소</button>
              <button type="button" className="hp-bar-act" disabled={!placeValid} onClick={doPlace}>{`이대로 배치 (${confirm.rows.length})`}</button>
            </div>
          </div>
        </div>
      )}

      {mapPickFor != null && confirm && (
        <MapPicker
          initial={confirm.rows[mapPickFor].pickedLat != null
            ? { lat: confirm.rows[mapPickFor].pickedLat, lng: confirm.rows[mapPickFor].pickedLng }
            : null}
          onSave={(pos) => setRow(mapPickFor, { pickedLat: pos.lat, pickedLng: pos.lng })}
          onClose={() => setMapPickFor(null)}
        />
      )}

      {toast && <div className="hp-toast">{toast}</div>}
    </div>
  );
}
