import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, expect, test, vi } from "vitest";

const leafletSpies = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  setView: vi.fn(),
}));

vi.mock("leaflet", () => {
  const layer = () => ({
    addTo() { return this; },
    on() { return this; },
  });
  return {
    default: {
      map: () => ({
        fitBounds: leafletSpies.fitBounds,
        setView: leafletSpies.setView,
        invalidateSize() { return this; },
        remove() {},
      }),
      tileLayer: layer,
      layerGroup: () => ({ addTo() { return this; }, clearLayers() {} }),
      marker: layer,
      polyline: layer,
      divIcon: () => ({}),
    },
  };
});

import MobileTripMap from "./MobileTripMap.jsx";

const trip = {
  id: "gangneung",
  title: "강릉 여행",
  days: [
    { id: "d1", label: "Day 1", date: "7.1", spots: [{ id: "sea", name: "바다", lat: 37.7, lng: 128.9, photos: [] }] },
    { id: "d2", label: "Day 2", date: "7.2", spots: [{ id: "note", name: "위치 없는 카페", photos: [] }] },
  ],
};

function TripMapHarness() {
  const [dayId, setDayId] = useState(null);
  const [spotId, setSpotId] = useState("sea");
  return (
    <MobileTripMap
      trip={trip}
      selectedDayId={dayId}
      selectedSpotId={spotId}
      onSelectDay={setDayId}
      onSelectSpot={setSpotId}
      onBack={() => {}}
      onOpenSpot={() => {}}
      settings={{ mapSkin: "cozy", showChars: false }}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

test("defaults to the full trip and fits its located route", () => {
  render(<TripMapHarness />);

  expect(screen.getByText("바다")).toBeInTheDocument();
  expect(screen.getByText("위치 없는 카페")).toBeInTheDocument();
  expect(leafletSpies.fitBounds).toHaveBeenCalledWith([[37.7, 128.9]], expect.any(Object));
});

test("a location-free Day remains inspectable and does not reuse another Day bounds", () => {
  render(<TripMapHarness />);
  leafletSpies.setView.mockClear();
  leafletSpies.fitBounds.mockClear();

  fireEvent.click(screen.getByRole("button", { name: "Day 2" }));

  expect(screen.queryByText("바다")).not.toBeInTheDocument();
  expect(screen.getByText("위치 없는 카페")).toBeInTheDocument();
  expect(screen.getByText(/선택한 Day에는 지도 핀이 없어요/)).toBeInTheDocument();
  expect(leafletSpies.fitBounds).not.toHaveBeenCalled();
  expect(leafletSpies.setView).toHaveBeenCalled();
});
