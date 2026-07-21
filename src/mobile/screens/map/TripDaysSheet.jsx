import { useMemo, useRef, useState } from "react";
import { Photo } from "../../ui/MobileAtoms.jsx";
import { hasLocation, spotSequence } from "./mobileMapModel.js";

const SNAP_HEIGHT = { peek: "17%", half: "50%", full: "90%" };
const SNAP_ORDER = ["peek", "half", "full"];

export default function TripDaysSheet({
  trip,
  groups,
  selectedDayId,
  selectedSpotId,
  onSelectDay,
  onSelectSpot,
  onOpenSpot,
}) {
  const [snap, setSnap] = useState("half");
  const pointerY = useRef(null);
  const dragged = useRef(false);
  const allSpots = useMemo(() => spotSequence(groups), [groups]);
  const visibleSpots = selectedDayId
    ? allSpots.filter((spot) => spot.dayId === selectedDayId)
    : allSpots;
  const visibleGroups = selectedDayId
    ? groups.filter((group) => group.id === selectedDayId)
    : groups;
  const sequenceById = new Map(allSpots.map((spot) => [spot.id, spot.sequenceNumber]));

  const moveSnap = (direction) => {
    const index = SNAP_ORDER.indexOf(snap);
    const next = Math.max(0, Math.min(SNAP_ORDER.length - 1, index + direction));
    setSnap(SNAP_ORDER[next]);
  };

  const cycleSnap = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setSnap((value) => value === "peek" ? "half" : value === "half" ? "full" : "peek");
  };
  const handleSpot = (spot) => {
    if (spot.id === selectedSpotId) onOpenSpot(spot);
    else onSelectSpot(spot.id);
  };

  return (
    <section className="hpm-sheet" style={{ height: SNAP_HEIGHT[snap] }} data-snap={snap}>
      <button
        type="button"
        className="hpm-grab hpm-grab-button"
        aria-label="시트 펼치기"
        onClick={cycleSnap}
        onPointerDown={(event) => {
          pointerY.current = event.clientY;
          dragged.current = false;
        }}
        onPointerUp={(event) => {
          if (pointerY.current == null) return;
          const delta = pointerY.current - event.clientY;
          if (Math.abs(delta) > 28) {
            dragged.current = true;
            moveSnap(delta > 0 ? 1 : -1);
          }
          pointerY.current = null;
        }}
      >
        <i />
      </button>

      <div className="hpm-sheet-head">
        <span className="hpm-sheet-copy">
          <span className="hpm-sheet-title">{snap === "peek" ? trip.title : "여행 Days"}</span>
          {snap === "peek" && trip.dateLabel && <small>{trip.dateLabel}</small>}
        </span>
        <span className="hpm-chip cool sm mono">{groups.length}일 · {allSpots.length}곳</span>
      </div>

      {snap !== "peek" && (
        <div className="hpm-dayfilters" aria-label="여행 일자 필터">
          <button
            type="button"
            className={`hpm-dayfilter ${selectedDayId == null ? "on" : ""}`}
            aria-pressed={selectedDayId == null}
            onClick={() => onSelectDay(null)}
          >
            전체
          </button>
          {groups.map((group) => (
            <button
              type="button"
              key={group.id}
              className={`hpm-dayfilter ${selectedDayId === group.id ? "on" : ""}`}
              aria-pressed={selectedDayId === group.id}
              onClick={() => onSelectDay(group.id)}
            >
              {group.label}
            </button>
          ))}
        </div>
      )}

      <div className="hpm-sheet-body">
        {snap === "full" ? (
          <div className="hpm-sheet-list">
            {visibleGroups.map((group) => (
              <section className="hpm-daygroup" key={group.id}>
                <div className="hpm-daygroup-title">
                  <h3>{group.label}</h3>
                  <span>{group.date}</span>
                </div>
                {group.spots.length ? group.spots.map((spot) => (
                  <SpotListRow
                    key={spot.id}
                    spot={spot}
                    sequenceNumber={sequenceById.get(spot.id)}
                    active={spot.id === selectedSpotId}
                    onClick={() => handleSpot(spot)}
                  />
                )) : <p className="hpm-map-location-empty">이 Day에는 아직 스팟이 없어요.</p>}
              </section>
            ))}
          </div>
        ) : snap === "half" ? (
          visibleSpots.length ? (
            <>
              <div className="hpm-spotrail">
                {visibleSpots.map((spot) => (
                  <button
                    type="button"
                    key={spot.id}
                    className={`hpm-railcard ${spot.id === selectedSpotId ? "on" : ""}`}
                    onClick={() => handleSpot(spot)}
                    aria-label={`${spot.name} 스팟`}
                  >
                    <Photo photo={spot.photos?.[0]} className="hpm-railcard-cover" />
                    <div className="hpm-railcard-body">
                      <div className="hpm-railcard-name">{spot.name}</div>
                      <div className="hpm-railcard-row">
                        <span className="hpm-chip sm">{spot.dayLabel}</span>
                        <span className="hpm-chip sm cool">{spot.time || "시간 미상"}</span>
                        {!hasLocation(spot) && <span className="hpm-chip sm">핀 없음</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="hpm-dots"><span>{visibleSpots.length}개 스팟</span></div>
            </>
          ) : <p className="hpm-map-location-empty">선택한 범위에 아직 스팟이 없어요.</p>
        ) : null}
      </div>
    </section>
  );
}

function SpotListRow({ spot, sequenceNumber, active, onClick }) {
  return (
    <div className={`hpm-listrow ${active ? "on" : ""}`}>
      <div className="hpm-listnum">{sequenceNumber}</div>
      <button type="button" className="hpm-listcard" onClick={onClick} aria-label={`${spot.name} 스팟`}>
        <Photo photo={spot.photos?.[0]} cap={false} />
        <div>
          <div className="nm">{spot.name}</div>
          <div className="mt">{spot.time || "시간 미상"} · {spot.photos?.length ?? 0}컷{hasLocation(spot) ? "" : " · 핀 없음"}</div>
        </div>
      </button>
    </div>
  );
}
