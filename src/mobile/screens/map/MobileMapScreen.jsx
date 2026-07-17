import { useCallback, useEffect, useMemo, useState } from "react";
import MobileMapOverview from "./MobileMapOverview.jsx";
import MobileTripMap from "./MobileTripMap.jsx";
import { spotSequence, tripDayGroups } from "./mobileMapModel.js";

const tripSpots = (trip) => spotSequence(tripDayGroups(trip));

export default function MobileMapScreen({
  trips,
  initialTripId = null,
  initialSpotIndex = 0,
  nav,
  settings,
}) {
  const initialTrip = trips.find((trip) => trip.id === initialTripId) ?? null;
  const initialSpots = initialTrip ? tripSpots(initialTrip) : [];
  const safeInitialIndex = Math.max(0, Math.min(initialSpotIndex, Math.max(0, initialSpots.length - 1)));
  const [selectedTripId, setSelectedTripId] = useState(initialTrip?.id ?? null);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [selectedSpotId, setSelectedSpotId] = useState(initialSpots[safeInitialIndex]?.id ?? null);
  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [selectedTripId, trips]
  );

  const selectTrip = useCallback((tripId) => {
    const trip = trips.find((candidate) => candidate.id === tripId);
    if (!trip) return;
    setSelectedTripId(tripId);
    setSelectedDayId(null);
    setSelectedSpotId(tripSpots(trip)[0]?.id ?? null);
  }, [trips]);

  const selectDay = useCallback((dayId) => {
    if (!selectedTrip) return;
    const spots = tripSpots(selectedTrip);
    setSelectedDayId(dayId);
    setSelectedSpotId(spots.find((spot) => !dayId || spot.dayId === dayId)?.id ?? null);
  }, [selectedTrip]);

  useEffect(() => {
    if (!selectedTrip || !selectedDayId) return;
    const dayStillExists = tripDayGroups(selectedTrip).some((day) => day.id === selectedDayId);
    if (!dayStillExists) selectDay(null);
  }, [selectDay, selectedDayId, selectedTrip]);

  const backToOverview = useCallback(() => {
    setSelectedTripId(null);
    setSelectedDayId(null);
    setSelectedSpotId(null);
  }, []);

  if (!selectedTrip) {
    return (
      <MobileMapOverview
        trips={trips}
        onSelectTrip={selectTrip}
        onUpload={nav.openUpload}
        onBack={nav.back}
        settings={settings}
      />
    );
  }

  return (
    <MobileTripMap
      trip={selectedTrip}
      selectedDayId={selectedDayId}
      selectedSpotId={selectedSpotId}
      onSelectDay={selectDay}
      onSelectSpot={setSelectedSpotId}
      onOpenSpot={(spot) => nav.openMoment(spot, 0)}
      onBack={backToOverview}
      onZoomOutToOverview={backToOverview}
      settings={settings}
    />
  );
}
