/* HeartPin Mobile · 정리함(라이트) + 모먼트 뷰어 */

function InboxScreen({ nav, tone }) {
  const [tab, setTab] = useState("need"); // need | blurry | done
  const [gone, setGone] = useState({});

  const need = window.HP_INBOX.filter(i => i.kind === "unsorted" || i.kind === "noloc");
  const blurry = window.HP_INBOX.filter(i => i.kind === "blurry");
  const list = tab === "need" ? need : tab === "blurry" ? blurry : [];
  const visible = list.filter(i => !gone[i.id]);

  function remove(id, msg) {
    setGone(g => ({ ...g, [id]: true }));
    if (msg) nav.toast(msg);
  }

  return (
    <div className="hpm-app">
      <div className="hpm-top">
        <div className="ttl">정리함</div>
        <button className="ic">⋯</button>
      </div>
      <div className="hpm-inbox-tabs">
        <button className={`hpm-chip ${tab === "need" ? "on" : ""}`} onClick={() => setTab("need")}>정리 필요 {need.filter(i => !gone[i.id]).length}</button>
        <button className={`hpm-chip ${tab === "blurry" ? "on" : ""}`} onClick={() => setTab("blurry")}>흐릿 {blurry.filter(i => !gone[i.id]).length}</button>
        <button className={`hpm-chip ${tab === "done" ? "on" : ""}`} onClick={() => setTab("done")}>완료 40</button>
      </div>

      <div className="hpm-view">
        {tab === "done" ? (
          <div className="hpm-empty">
            <Avatar who="nyong" size={72} />
            <b>여기까진 다 정리됐어!</b>
            <p style={{ fontSize: 13 }}>완료된 사진은 각 여행 스팟에 들어가 있어요.<br />많은 양은 <b style={{ color: "var(--sd)" }}>PC</b>에서 한 번에 정리하면 편해요</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="hpm-empty">
            <Avatar who="bara" size={72} />
            <b>비었어요!</b>
            <p style={{ fontSize: 13 }}>이 탭의 사진을 모두 정리했어요 ✨</p>
          </div>
        ) : (
          <div className="hpm-pad">
            <div className="hpm-igrid">
              {visible.map(item => {
                const sug = window.HP_SUGGEST(item);
                return (
                  <div key={item.id} className={`hpm-icard ${gone[item.id] ? "gone" : ""}`}>
                    <div className={`hpm-icard-cover ${item.kind === "blurry" ? "blur" : ""}`} onClick={() => tab !== "blurry" && nav.openMomentItem(item)}>
                      <Photo className="hpm-railcard-cover" style={{ height: 96 }} label={item.autoLabel} tint={item.tint} />
                    </div>
                    <div className="hpm-icard-body">
                      <div style={{ fontSize: 12, color: "var(--ink2)" }}>{item.date.slice(5).replace("-", ".")} · {item.time}</div>
                      {item.kind === "blurry" ? (
                        <div className="hpm-iacts">
                          <button className="hpm-mini keep" onClick={() => remove(item.id, "보관했어요")}>보관</button>
                          <button className="hpm-mini drop" onClick={() => remove(item.id, "버렸어요")}>버리기</button>
                        </div>
                      ) : sug && sug.spotName ? (
                        <button className="hpm-icard-sug" onClick={() => remove(item.id, `${sug.spotName}에 담았어요`)}><Ico.pin width="12" height="12" style={{ verticalAlign: "-2px", marginRight: 2 }} />{sug.spotName} 담기</button>
                      ) : (
                        <span className="hpm-icard-sug need">스팟 직접 고르기</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {tab === "need" && <div className="hpm-swipe-hint"><span>← 버리기</span><span style={{ color: "var(--line2)" }}>·</span><span>담기 →</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* moment viewer — from a spot (photos) */
function MomentViewer({ spot, startIdx = 0, nav, tone }) {
  const [i, setI] = useState(startIdx);
  const photos = spot.photos;
  const ln = window.hpLines(spot, tone);
  return (
    <div className="hpm-moment">
      <div className="hpm-moment-top">
        <span className="sp">{spot.name}</span>
        <button className="hpm-moment-close" onClick={nav.back}>✕</button>
      </div>
      <div className="hpm-moment-stage">
        <Photo label={photos[i].label} tint={photos[i].tint} />
      </div>
      <div className="hpm-moment-react">
        <div className="hpm-speech nyong" style={{ alignItems: "flex-start" }}>
          <Avatar who="nyong" size={34} />
          <div className="hpm-moment-bubble">{ln.reaction}</div>
        </div>
      </div>
      <div className="hpm-moment-strip">
        {photos.map((ph, pi) => (
          <button key={pi} onClick={() => setI(pi)}>
            <Photo cap={false} tint={ph.tint} className={pi === i ? "on" : ""} />
          </button>
        ))}
      </div>
      <div className="hpm-moment-pager">
        <button className="hpm-moment-arrow" disabled={i === 0} onClick={() => setI(i - 1)}>‹</button>
        <span className="hpm-moment-count">{i + 1} / {photos.length}</span>
        <button className="hpm-moment-arrow" disabled={i === photos.length - 1} onClick={() => setI(i + 1)}>›</button>
      </div>
    </div>
  );
}

Object.assign(window, { InboxScreen, MomentViewer });
