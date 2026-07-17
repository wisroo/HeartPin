import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, expect, test, vi } from "vitest";

const leafletSpies = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  setView: vi.fn(),
  polyline: vi.fn(),
  handlers: {},
  container: null,
  zoom: 8,
}));

vi.mock("leaflet", () => {
  const layer = () => ({
    addTo() { return this; },
    on() { return this; },
  });
  return {
    default: {
      map: () => {
        leafletSpies.container = document.createElement("div");
        leafletSpies.handlers = {};
        return ({
        fitBounds: leafletSpies.fitBounds,
        setView: leafletSpies.setView,
        getContainer: () => leafletSpies.container,
        getZoom: () => leafletSpies.zoom,
        on(name, handler) { leafletSpies.handlers[name] = handler; return this; },
        off(name) { delete leafletSpies.handlers[name]; return this; },
        invalidateSize() { return this; },
        remove() {},
        });
      },
      tileLayer: layer,
      layerGroup: () => ({ addTo() { return this; }, clearLayers() {} }),
      marker: layer,
      polyline: (...args) => { leafletSpies.polyline(...args); return layer(); },
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

test("draws a soft rounded dotted curve through the trip", () => {
  const curvedTrip = {
    id: "curve",
    title: "곡선 여행",
    days: [{
      id: "curve-day",
      label: "Day 1",
      spots: [
        { id: "one", name: "하나", lat: 35.1, lng: 129.1, photos: [] },
        { id: "two", name: "둘", lat: 35.2, lng: 129.25, photos: [] },
        { id: "three", name: "셋", lat: 35.3, lng: 129.2, photos: [] },
      ],
    }],
  };

  render(
    <MobileTripMap
      trip={curvedTrip}
      selectedDayId={null}
      selectedSpotId="one"
      onSelectDay={() => {}}
      onSelectSpot={() => {}}
      onOpenSpot={() => {}}
      onBack={() => {}}
      onZoomOutToOverview={() => {}}
      settings={{ showChars: false }}
    />
  );

  const [coordinates, options] = leafletSpies.polyline.mock.calls[0];
  expect(coordinates.length).toBeGreaterThan(curvedTrip.days[0].spots.length);
  expect(options).toEqual({
    color: "#e46f61",
    weight: 2.5,
    opacity: 0.38,
    dashArray: "1 10",
    lineCap: "round",
    lineJoin: "round",
  });
});

test("user zoom-out at level 8 requests the all-trips overview", () => {
  const onZoomOutToOverview = vi.fn();
  render(
    <MobileTripMap
      trip={trip}
      selectedDayId={null}
      selectedSpotId="sea"
      onSelectDay={() => {}}
      onSelectSpot={() => {}}
      onOpenSpot={() => {}}
      onBack={() => {}}
      onZoomOutToOverview={onZoomOutToOverview}
      settings={{ showChars: false }}
    />
  );

  leafletSpies.zoom = 9;
  leafletSpies.container.dispatchEvent(new Event("wheel"));
  leafletSpies.zoom = 8;
  leafletSpies.handlers.zoomend?.();
  expect(onZoomOutToOverview).toHaveBeenCalledOnce();
});
