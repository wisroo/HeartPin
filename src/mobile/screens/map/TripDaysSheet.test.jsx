import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { tripDayGroups } from "./mobileMapModel.js";
import TripDaysSheet from "./TripDaysSheet.jsx";

const trip = {
  id: "jeju",
  title: "제주 여행",
  dateLabel: "2026.05.01–05.03",
  days: [
    {
      id: "d1",
      label: "Day 1",
      date: "5.1",
      spots: [{ id: "oreum", name: "오름", time: "10:00", photos: [] }],
    },
    {
      id: "d2",
      label: "Day 2",
      date: "5.2",
      spots: [
        { id: "cafe", name: "바다 카페", time: "14:00", photos: [] },
        { id: "partial", name: "위도만 있는 곳", time: "16:00", lat: 33.4, photos: [] },
      ],
    },
  ],
};

function SheetHarness({ onOpenSpot = () => {} }) {
  const [dayId, setDayId] = useState(null);
  const [spotId, setSpotId] = useState("oreum");
  return (
    <TripDaysSheet
      trip={trip}
      groups={tripDayGroups(trip)}
      selectedDayId={dayId}
      selectedSpotId={spotId}
      onSelectDay={setDayId}
      onSelectSpot={setSpotId}
      onOpenSpot={onOpenSpot}
    />
  );
}

test("starts with the whole trip and offers each Day as a filter", () => {
  render(<SheetHarness />);

  expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Day 1" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Day 2" })).toBeInTheDocument();
  expect(screen.getByText("오름")).toBeInTheDocument();
  expect(screen.getByText("바다 카페")).toBeInTheDocument();
});

test("selecting a Day limits the half-sheet rail to that Day", () => {
  render(<SheetHarness />);

  fireEvent.click(screen.getByRole("button", { name: "Day 2" }));
  expect(screen.queryByText("오름")).not.toBeInTheDocument();
  expect(screen.getByText("바다 카페")).toBeInTheDocument();
});

test("full sheet groups the whole trip under Day headings", () => {
  render(<SheetHarness />);

  fireEvent.click(screen.getByRole("button", { name: "시트 펼치기" }));
  expect(screen.getByRole("heading", { name: "Day 1" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Day 2" })).toBeInTheDocument();
  expect(screen.getByText("오름")).toBeInTheDocument();
  expect(screen.getByText("바다 카페")).toBeInTheDocument();
});

test("selecting the active spot opens its existing moment flow", () => {
  const onOpenSpot = vi.fn();
  render(<SheetHarness onOpenSpot={onOpenSpot} />);

  fireEvent.click(screen.getByRole("button", { name: /오름/ }));
  expect(onOpenSpot).toHaveBeenCalledWith(expect.objectContaining({ id: "oreum" }));
});

test("swiping the grabber up expands one snap level", () => {
  const { container } = render(<SheetHarness />);
  const grabber = screen.getByRole("button", { name: "시트 펼치기" });

  fireEvent.pointerDown(grabber, { clientY: 300 });
  fireEvent.pointerUp(grabber, { clientY: 220 });
  expect(container.querySelector("[data-snap='full']")).toBeInTheDocument();
});

test("peek summary includes the trip date", () => {
  render(<SheetHarness />);
  const grabber = screen.getByRole("button", { name: "시트 펼치기" });

  fireEvent.click(grabber);
  fireEvent.click(grabber);
  expect(screen.getByText("2026.05.01–05.03")).toBeInTheDocument();
});

test("a partial coordinate is labelled as having no map pin", () => {
  render(<SheetHarness />);

  expect(screen.getByRole("button", { name: "위도만 있는 곳 스팟" })).toHaveTextContent("핀 없음");
});
