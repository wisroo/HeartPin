import { useEffect, useState } from "react";
import { getOriginalStorageSummary } from "../../api.js";
import { ORIGINAL_LOCATION_LABELS } from "../../core/originalLocations.js";

export default function OriginalStorageScreen({ nav }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getOriginalStorageSummary().then(
      (summary) => { if (active) setResult({ summary }); },
      () => { if (active) setResult({ error: true }); },
    );
    return () => { active = false; };
  }, [attempt]);

  const summary = result?.summary;

  return (
    <div className="hpm-full dotgrid">
      <div className="hpm-top" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <button className="ic back" type="button" aria-label="원본 보관 현황 닫기" onClick={nav.back}>‹</button>
        <div className="ttl">원본 보관 현황</div>
      </div>
      <div className="hpm-view">
        <div className="hpm-pad hpm-storage">
          {!result && <p role="status">보관 현황을 불러오는 중…</p>}
          {result?.error && (
            <div className="hpm-storage-panel" role="alert">
              <p>보관 현황을 불러오지 못했어요.</p>
              <button className="hpm-btn" type="button" onClick={() => {
                setResult(null);
                setAttempt((value) => value + 1);
              }}>다시 불러오기</button>
            </div>
          )}
          {result?.summary === null && <p>Supabase에 연결하면 보관 현황을 볼 수 있어요.</p>}
          {summary && (
              <section className="hpm-storage-panel" aria-labelledby="storage-counts">
                <h2 id="storage-counts">위치별 확인된 원본</h2>
                <dl className="hpm-storage-counts">
                  {Object.entries(ORIGINAL_LOCATION_LABELS).map(([location, label]) => (
                    <div key={location}>
                      <dt>{label}</dt>
                      <dd>{summary.counts[location]}장</dd>
                    </div>
                  ))}
                </dl>
                <p>같은 원본이 여러 위치에 있으면 각 위치에 집계돼요.</p>
              </section>
          )}
        </div>
      </div>
    </div>
  );
}
