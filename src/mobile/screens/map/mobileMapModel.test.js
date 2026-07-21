import { describe, expect, test } from "vitest";
import {
  locatedSpots,
  spotSequence,
  tripDayGroups,
  tripMapSummary,
} from "./mobileMapModel.js";

const trip = {
  id: "busan",
  title: "부산 여행",
  days: [
    {
      id: "day-a",
      label: "Day 1",
      date: "7.10",
      spots: [
        { id: "haeundae", name: "해운대", lat: 35.1, lng: 129.1, photos: [{ id: "p1" }] },
        { id: "market", name: "시장", photos: [{ id: "p2" }, { id: "p3" }] },
      ],
    },
    {
      label: "Day 2",
      date: "7.11",
      spots: [
        { id: "gwangalli", name: "광안리", lat: 35.2, lng: 129.2, photos: [] },
      ],
    },
  ],
};

describe("tripDayGroups", () => {
  test("keeps explicit day IDs and derives a stable fallback ID", () => {
    const groups = tripDayGroups(trip);

    expect(groups.map((group) => group.id)).toEqual(["day-a", "busan:day:7.11"]);
    expect(groups[0].spots[0]).toMatchObject({ dayId: "day-a", dayLabel: "Day 1" });
  });
});

test("spotSequence numbers spots across the whole trip", () => {
  const sequence = spotSequence(tripDayGroups(trip));

  expect(sequence.map(({ id, sequenceNumber }) => [id, sequenceNumber])).toEqual([
    ["haeundae", 1],
    ["market", 2],
    ["gwangalli", 3],
  ]);
});

test("locatedSpots filters by day without inventing coordinates", () => {
  const groups = tripDayGroups(trip);

  expect(locatedSpots(groups, null).map((spot) => spot.id)).toEqual(["haeundae", "gwangalli"]);
  expect(locatedSpots(groups, "day-a").map((spot) => spot.id)).toEqual(["haeundae"]);
  expect(locatedSpots(groups, "busan:day:7.11")[0].sequenceNumber).toBe(3);
  expect(locatedSpots(groups, "missing")).toEqual([]);
});

test("tripMapSummary reports counts and the centroid of located spots", () => {
  const summary = tripMapSummary(trip);

  expect(summary).toMatchObject({
    tripId: "busan",
    title: "부산 여행",
    locatedSpotCount: 2,
    totalSpotCount: 3,
    photoCount: 3,
    dayCount: 2,
  });
  expect(summary.center[0]).toBeCloseTo(35.15);
  expect(summary.center[1]).toBeCloseTo(129.15);
});

test("tripMapSummary leaves center null when no spot has a location", () => {
  expect(tripMapSummary({ id: "empty", title: "기록 여행", days: [{ label: "Day 1", spots: [{ id: "note" }] }] }).center).toBeNull();
});
