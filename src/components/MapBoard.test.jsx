import { render } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const leafletRuntime = vi.hoisted(() => ({
  container: null,
  handlers: {},
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
        leafletRuntime.container = document.createElement("div");
        leafletRuntime.handlers = {};
        return {
          setView() { return this; },
          fitBounds() { return this; },
          invalidateSize() { return this; },
          getContainer: () => leafletRuntime.container,
          getZoom: () => leafletRuntime.zoom,
          on(name, handler) { leafletRuntime.handlers[name] = handler; return this; },
          off(name) { delete leafletRuntime.handlers[name]; return this; },
          remove() {},
        };
      },
      tileLayer: layer,
      layerGroup: () => ({ addTo() { return this; }, clearLayers() {} }),
      marker: layer,
      polyline: layer,
      divIcon: () => ({}),
      control: { zoom: layer },
    },
  };
});

import MapBoard from "./MapBoard.jsx";

const trip = {
  id: "web-trip",
  title: "웹 여행",
  days: [{ label: "Day 1", spots: [
    { id: "a", name: "첫 장소", lat: 35.1, lng: 129.1 },
    { id: "b", name: "둘째 장소", lat: 35.2, lng: 129.2 },
  ] }],
};

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
});

test("user zoom-out from a Web trip requests the trips overview", () => {
  const onZoomOutToOverview = vi.fn();
  render(
    <MapBoard
      region="domestic"
      view="trip"
      trips={[trip]}
      trip={trip}
      tripId={trip.id}
      spotIndex={0}
      onSelectTrip={() => {}}
      onSelectSpot={() => {}}
      onZoomOutToOverview={onZoomOutToOverview}
    />
  );

  leafletRuntime.zoom = 9;
  leafletRuntime.container.dispatchEvent(new Event("wheel"));
  leafletRuntime.zoom = 8;
  leafletRuntime.handlers.zoomend?.();
  expect(onZoomOutToOverview).toHaveBeenCalledOnce();
});
