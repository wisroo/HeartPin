import { render, screen } from "@testing-library/react";
import { vi, test, expect } from "vitest";

vi.mock("leaflet", () => {
  const chain = () => obj;
  const obj = {
    setView: chain, addTo: chain, on: chain, fitBounds: chain,
    panTo: chain, invalidateSize: chain, remove: chain,
    setIcon: chain, removeLayer: chain, setLatLngs: chain, setZIndexOffset: chain,
  };
  return {
    default: {
      map: () => obj,
      tileLayer: () => obj,
      marker: () => obj,
      divIcon: () => ({}),
      polyline: () => obj,
      layerGroup: () => obj,
    },
  };
});

import MapScreen from "./MapScreen.jsx";

const trip = {
  id: "t",
  title: "부산",
  days: [
    {
      label: "Day 1",
      date: "10.11",
      spots: [
        { id: "a", name: "해운대", time: "11:40", lat: 35.1, lng: 129.1, photos: [{ label: "p", tint: "cool" }] },
        { id: "b", name: "광안리", time: "18:30", lat: 35.15, lng: 129.11, photos: [{ label: "q", tint: "warm" }] },
      ],
    },
  ],
};

test("shows spot rail with spot names", () => {
  render(
    <MapScreen
      trip={trip}
      initialSpotIdx={0}
      nav={{ back: () => {}, openMoment: () => {} }}
      settings={{ mapSkin: "cozy", showChars: true }}
    />
  );
  expect(screen.getAllByText("해운대").length).toBeGreaterThan(0);
  expect(screen.getAllByText("광안리").length).toBeGreaterThan(0);
});

test("empty trip renders an empty state, not a crash", () => {
  render(<MapScreen trip={null} nav={{ back: () => {} }} settings={{}} />);
  expect(screen.getByText(/여행/)).toBeInTheDocument();
});
