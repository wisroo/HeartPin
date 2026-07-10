import { useState } from "react";
import { Photo, Avatar, Ico } from "../ui/MobileAtoms.jsx";
import { suggest, ordered } from "../../data.js";

function doneCount(app) {
  let n = 0;
  ["domestic", "intl"].forEach((rk) => {
    app.regions[rk].trips.forEach((t) => {
      ordered(t).forEach((s) => { n += s.photos.length; });
    });
  });
  return n;
}

export default function InboxScreen({ app, nav, settings }) {
  const [tab, setTab] = useState("need");
  const [gone, setGone] = useState({});

  const visible = (app.inboxItems || []).filter((i) => !gone[i.id]);
  const done = doneCount(app);

  async function handlePlace(item, sug) {
    await app.placePhotos([{ item, tripId: sug.tripId, spotId: sug.spotId }]);
    setGone((g) => ({ ...g, [item.id]: true }));
    nav.toast(`${sug.spotName}에 담았어요`);
  }

  return (
    <div className="hpm-app">
      <div className="hpm-top">
        <div className="ttl">정리함</div>
        <button className="ic">⋯</button>
      </div>
      <div className="hpm-inbox-tabs">
        <button className={`hpm-chip ${tab === "need" ? "on" : ""}`} onClick={() => setTab("need")}>
          정리 필요 {visible.length}
        </button>
        <button className={`hpm-chip ${tab === "done" ? "on" : ""}`} onClick={() => setTab("done")}>
          완료 {done}
        </button>
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
              {visible.map((item) => {
                const sug = suggest(item);
                return (
                  <div key={item.id} className="hpm-icard">
                    <div className="hpm-icard-cover" onClick={() => nav.openMomentItem(item)}>
                      <Photo
                        photo={item}
                        label={item.autoLabel}
                        tint={item.tint}
                        className="hpm-railcard-cover"
                        style={{ height: 96 }}
                      />
                    </div>
                    <div className="hpm-icard-body">
                      <div style={{ fontSize: 12, color: "var(--ink2)" }}>
                        {item.date.slice(5).replace("-", ".")} · {item.time}
                      </div>
                      {sug && sug.spotName ? (
                        <button className="hpm-icard-sug" onClick={() => handlePlace(item, sug)}>
                          <Ico.pin width="12" height="12" style={{ verticalAlign: "-2px", marginRight: 2 }} />
                          {sug.spotName} 담기
                        </button>
                      ) : (
                        <span className="hpm-icard-sug need">스팟 직접 고르기</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hpm-swipe-hint"><span>← 버리기</span><span style={{ color: "var(--line2)" }}>·</span><span>담기 →</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
