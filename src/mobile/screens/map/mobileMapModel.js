export const hasLocation = (spot) =>
  Number.isFinite(spot?.lat) && Number.isFinite(spot?.lng);

export function tripDayGroups(trip) {
  return (trip?.days ?? []).map((day, dayIndex) => {
    const id = day.id ?? `${trip.id}:day:${day.date || day.label || dayIndex + 1}`;
    return {
      ...day,
      id,
      spots: (day.spots ?? []).map((spot) => ({
        ...spot,
        dayId: id,
        dayLabel: day.label,
        dayDate: day.date,
      })),
    };
  });
}

export function spotSequence(groups) {
  let sequenceNumber = 0;
  return groups.flatMap((group) =>
    group.spots.map((spot) => ({ ...spot, sequenceNumber: ++sequenceNumber }))
  );
}

export function locatedSpots(groups, selectedDayId) {
  return spotSequence(groups).filter((spot) =>
    hasLocation(spot) && (!selectedDayId || spot.dayId === selectedDayId)
  );
}

export function tripMapSummary(trip) {
  const groups = tripDayGroups(trip);
  const spots = spotSequence(groups);
  const located = spots.filter(hasLocation);
  const center = located.length
    ? [
        located.reduce((sum, spot) => sum + spot.lat, 0) / located.length,
        located.reduce((sum, spot) => sum + spot.lng, 0) / located.length,
      ]
    : null;

  return {
    tripId: trip.id,
    title: trip.title,
    dateLabel: trip.dateLabel ?? trip.start ?? "",
    center,
    dayCount: groups.length,
    locatedSpotCount: located.length,
    totalSpotCount: spots.length,
    photoCount: spots.reduce((sum, spot) => sum + (spot.photos?.length ?? 0), 0),
  };
}
