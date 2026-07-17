import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { ATTR, TILES } from "../../../mapUtil.js";
import { tripMapSummary } from "./mobileMapModel.js";

const KOREA_CENTER = [36.2, 127.8];

export default function MobileMapOverview({ trips, onSelectTrip, onUpload, onBack, settings = {} }) {
  const mapElRef = useRef(null);
  const summaries = useMemo(() => trips.map(tripMapSummary), [trips]);

  useEffect(() => {
    if (!mapElRef.current) return undefined;
    const map = L.map(mapElRef.current, { zoomControl: false, attributionControl: true });
    L.tileLayer(TILES, { attribution: ATTR, subdomains: "abcd", maxZoom: 19 }).addTo(map);

    const located = summaries.filter((summary) => summary.center);
    located.forEach((summary) => {
      const tripNumber = summaries.findIndex((candidate) => candidate.tripId === summary.tripId) + 1;
      L.marker(summary.center, {
        icon: L.divIcon({
          className: "",
          html: `<div class="hpm-trip-pin"><span>${tripNumber}</span></div>`,
          iconSize: [42, 42],
          iconAnchor: [21, 42],
        }),
      })
        .addTo(map)
        .on("click", () => onSelectTrip(summary.tripId));
    });

    if (located.length) map.fitBounds(located.map((summary) => summary.center), { padding: [56, 56], maxZoom: 10 });
    else map.setView(KOREA_CENTER, 6);
    map.invalidateSize();

    return () => map.remove();
  }, [onSelectTrip, summaries]);

  return (
    <div className="hpm-map-screen">
      <div ref={mapElRef} className={`hpm-leaflet hpm-map-skin-${settings.mapSkin || "cozy"}`} />
      <div className="hpm-map-top">
        {onBack && <button className="hpm-map-back" onClick={onBack} aria-label="여정으로 돌아가기">‹</button>}
        <div className="hpm-map-title">우리 여행 지도 · {summaries.length}개</div>
      </div>

      <section className="hpm-map-overview" aria-label="전체 여행">
        <div className="hpm-grab" aria-hidden="true"><i /></div>
        <div className="hpm-map-overview-head">
          <div>
            <strong>여행을 골라보세요</strong>
            <span>지도의 핀이나 카드를 누르면 전체 경로가 열려요.</span>
          </div>
        </div>
        {summaries.length ? (
          <div className="hpm-triprail">
            {summaries.map((summary, index) => (
              <button
                key={summary.tripId}
                className="hpm-tripmini"
                onClick={() => onSelectTrip(summary.tripId)}
                aria-label={`${summary.title} 여행 열기`}
              >
                <span className="hpm-tripmini-num">{index + 1}</span>
                <span className="hpm-tripmini-copy">
                  <b>{summary.title}</b>
                  <small>{summary.dateLabel || `${summary.dayCount}일`} · 스팟 {summary.totalSpotCount}곳</small>
                </span>
                <span className={`hpm-chip sm ${summary.center ? "cool" : ""}`}>
                  {summary.center ? `${summary.locatedSpotCount} pins` : "지도 핀 없음"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="hpm-map-overview-empty">
            <p>아직 여행이 없어요. 사진을 올려 첫 여행을 만들어보세요.</p>
            {onUpload && <button type="button" className="hpm-btn primary" onClick={onUpload}>사진 올리기</button>}
          </div>
        )}
      </section>
    </div>
  );
}
