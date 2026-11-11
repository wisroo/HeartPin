import { useEffect, useState } from "react";
import { listConfirmedOriginalLocations } from "../../api.js";
import { ORIGINAL_LOCATION_LABELS } from "../../core/originalLocations.js";

export default function OriginalCopyLocations({ contentHash }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!contentHash) return;
    let active = true;
    listConfirmedOriginalLocations(contentHash).then(
      (locations) => { if (active) setResult({ locations }); },
      () => { if (active) setResult({ error: true }); },
    );
    return () => { active = false; };
  }, [contentHash]);

  let message;
  if (!contentHash) message = "확인된 위치가 없어요";
  else if (!result) message = "저장 위치 확인 중…";
  else if (result.error || result.locations === null) message = "저장 위치를 조회할 수 없어요";
  else if (result.locations.length === 0) message = "확인된 위치가 없어요";

  return (
    <section className="hp-original-locations" aria-label="확인된 원본 사본 위치">
      <b>확인된 원본 사본 위치</b>
      <div aria-live="polite">
        {message ? <span>{message}</span> : (
          <ul>
            {result.locations.map((location) => <li key={location}>{ORIGINAL_LOCATION_LABELS[location]}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
