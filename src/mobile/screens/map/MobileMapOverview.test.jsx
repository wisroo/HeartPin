import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("leaflet", () => {
  const layer = () => ({
    addTo() { return this; },
    on() { return this; },
  });
  return {
    default: {
      map: () => ({
        setView() { return this; },
        fitBounds() { return this; },
        invalidateSize() { return this; },
        remove() {},
      }),
      tileLayer: layer,
      marker: layer,
      divIcon: () => ({}),
    },
  };
});

import MobileMapOverview from "./MobileMapOverview.jsx";

const trips = [
  {
    id: "busan",
    title: "부산 여행",
    dateLabel: "2026.07",
    days: [{ label: "Day 1", spots: [{ id: "beach", lat: 35.1, lng: 129.1, photos: [] }] }],
  },
  {
    id: "notes",
    title: "위치 없는 여행",
    dateLabel: "2026.06",
    days: [{ label: "Day 1", spots: [{ id: "memo", photos: [] }] }],
  },
];

test("lists every trip including trips without located spots", () => {
  render(<MobileMapOverview trips={trips} onSelectTrip={() => {}} settings={{}} />);

  expect(screen.getByRole("button", { name: /부산 여행/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /위치 없는 여행/ })).toBeInTheDocument();
  expect(screen.getByText("지도 핀 없음")).toBeInTheDocument();
});

test("selecting a trip card reports the trip ID", () => {
  const onSelectTrip = vi.fn();
  render(<MobileMapOverview trips={trips} onSelectTrip={onSelectTrip} settings={{}} />);

  fireEvent.click(screen.getByRole("button", { name: /위치 없는 여행/ }));
  expect(onSelectTrip).toHaveBeenCalledWith("notes");
});

test("an empty overview can start the existing upload flow", () => {
  const onUpload = vi.fn();
  render(<MobileMapOverview trips={[]} onSelectTrip={() => {}} onUpload={onUpload} settings={{}} />);

  fireEvent.click(screen.getByRole("button", { name: "사진 올리기" }));
  expect(onUpload).toHaveBeenCalledOnce();
});
