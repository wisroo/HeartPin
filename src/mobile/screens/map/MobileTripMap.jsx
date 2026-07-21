import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { CHAR } from "../../../chars.js";
import { ATTR, smooth, TILES } from "../../../mapUtil.js";
import TripDaysSheet from "./TripDaysSheet.jsx";
import { locatedSpots, spotSequence, tripDayGroups } from "./mobileMapModel.js";

const KOREA_CENTER = [36.2, 127.8];

export default function MobileTripMap({
  trip,
  selectedDayId,
  selectedSpotId,
  onSelectDay,
  onSelectSpot,
  onOpenSpot,
  onBack,
  settings = {},
}) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(null);
  const groups = useMemo(() => tripDayGroups(trip), [trip]);
  const allSpots = useMemo(() => spotSequence(groups), [groups]);
  const visibleSpots = selectedDayId
    ? allSpots.filter((spot) => spot.dayId === selectedDayId)
    : allSpots;
  const mapSpots = useMemo(() => locatedSpots(groups, selectedDayId), [groups, selectedDayId]);
  const selectedDay = groups.find((group) => group.id === selectedDayId);

  useEffect(() => {
    if (!mapElRef.current) return undefined;
    const map = L.map(mapElRef.current, { zoomControl: false, attributionControl: true });
    L.tileLayer(TILES, { attribution: ATTR, subdomains: "abcd", maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);
    map.invalidateSize();

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();

    mapSpots.forEach((spot) => {
      const isActive = spot.id === selectedSpotId;
      L.marker([spot.lat, spot.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="hpm-pin ${isActive ? "active" : ""}"><div class="hd"><span>${spot.sequenceNumber}</span></div>${isActive ? '<div class="ring"></div>' : ""}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        }),
      }).addTo(layers).on("click", () => onSelectSpot(spot.id));
    });

    const route = mapSpots.map((spot) => [spot.lat, spot.lng]);
    if (route.length > 1) {
      L.polyline(smooth(route, 16), {
        color: "#e46f61",
        weight: 2.5,
        opacity: 0.38,
        dashArray: "1 10",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layers);
    }

    const activeSpot = mapSpots.find((spot) => spot.id === selectedSpotId);
    if (activeSpot && settings.showChars) {
      const html = `<div class="hpm-mapchars"><img src="${CHAR.bara.src}" alt=""><img src="${CHAR.nyong.src}" alt=""></div>`;
      L.marker([activeSpot.lat, activeSpot.lng], {
        icon: L.divIcon({ className: "", html, iconSize: [70, 38], iconAnchor: [-6, 44] }),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(layers);
    }

    if (route.length) map.fitBounds(route, { padding: [58, 58], maxZoom: 14 });
    else map.setView(KOREA_CENTER, 6);
    map.invalidateSize();
  }, [mapSpots, onSelectSpot, selectedSpotId, settings.showChars]);

  useEffect(() => {
    if (visibleSpots.length && !visibleSpots.some((spot) => spot.id === selectedSpotId)) {
      onSelectSpot(visibleSpots[0].id);
    }
  }, [onSelectSpot, selectedSpotId, visibleSpots]);

  return (
    <div className="hpm-map-screen">
      <div ref={mapElRef} className={`hpm-leaflet hpm-map-skin-${settings.mapSkin || "cozy"}`} />
      <div className="hpm-map-top">
        <button className="hpm-map-back" onClick={onBack} aria-label="전체 여행 지도로 돌아가기">‹</button>
        <div className="hpm-map-title">{trip.title} · {selectedDay?.label || "전체 여행"}</div>
      </div>

      {mapSpots.length === 0 && (
        <div className="hpm-map-notice">
          {selectedDayId ? "선택한 Day에는 지도 핀이 없어요. 아래 기록은 계속 볼 수 있어요." : "이 여행에는 지도 핀이 없어요. 아래 기록은 계속 볼 수 있어요."}
        </div>
      )}

      <TripDaysSheet
        trip={trip}
        groups={groups}
        selectedDayId={selectedDayId}
        selectedSpotId={selectedSpotId}
        onSelectDay={onSelectDay}
        onSelectSpot={onSelectSpot}
        onOpenSpot={onOpenSpot}
      />
    </div>
  );
}
