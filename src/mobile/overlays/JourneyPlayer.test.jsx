import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect, afterEach } from "vitest";

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
    },
  };
});

import JourneyPlayer from "./JourneyPlayer.jsx";

const trip = {
  id: "t",
  title: "부산",
  days: [{
    label: "Day1",
    date: "10.11",
    spots: [{
      id: "a",
      name: "해운대",
      time: "11:40",
      lat: 35.1,
      lng: 129.1,
      mood: "바다",
      guide: "안내",
      reaction: "우와",
      photos: [{ label: "p", tint: "cool" }]
    }]
  }]
};

let unmount;
afterEach(() => { if (unmount) { unmount(); unmount = null; } });

test("shows the first scene place + close works", () => {
  const nav = { back: vi.fn() };
  const result = render(
    <JourneyPlayer
      trip={trip}
      nav={nav}
      settings={{ tone: "다정", nameBara: "바라", nameNyong: "뇽이", mapSkin: "cozy" }}
    />
  );
  unmount = result.unmount;
  expect(screen.getByText("해운대")).toBeInTheDocument();
  fireEvent.click(screen.getByText("✕"));
  expect(nav.back).toHaveBeenCalled();
});
