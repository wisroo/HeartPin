import { describe, expect, it } from "vitest";
import { buildTrip, buildTripFromGroups } from "./buildTrip.js";

describe("buildTrip", () => {
  it("tags each day with an ISO dateValue for later spot-day matching", () => {
    const trip = buildTrip([
      { id: "i1", date: "2026-07-11", time: "10:00", lat: 37.5, lng: 127.0, src: "s", autoLabel: "a" },
    ]);

    expect(trip.days[0].dateValue).toBe("2026-07-11");
  });
});

describe("buildTripFromGroups", () => {
  it("tags each day with an ISO dateValue for later spot-day matching", () => {
    const trip = buildTripFromGroups([
      {
        item: { id: "i1", date: "2026-07-11", time: "10:00", lat: 37.5, lng: 127.0, src: "s", autoLabel: "a" },
        spot: { key: "s1", name: "새 장소" },
        label: "메모",
      },
    ]);

    expect(trip.days[0].dateValue).toBe("2026-07-11");
  });
});
