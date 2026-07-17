import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("./MobileMapOverview.jsx", () => ({
  default: ({ trips, onSelectTrip, onBack }) => (
    <div>
      <div>전체 여행 {trips.length}개</div>
      {trips.map((trip) => <button key={trip.id} onClick={() => onSelectTrip(trip.id)}>{trip.title}</button>)}
      <button onClick={onBack}>overview back</button>
    </div>
  ),
}));

vi.mock("./MobileTripMap.jsx", () => ({
  default: ({ trip, selectedDayId, selectedSpotId, onSelectDay, onBack, onZoomOutToOverview, onOpenSpot }) => (
    <div>
      <div>선택 여행 {trip.title}</div>
      <div>선택 Day {selectedDayId || "전체"}</div>
      <div>선택 스팟 {selectedSpotId}</div>
      <button onClick={() => onSelectDay("d2")}>mock Day 2</button>
      <button onClick={onBack}>trip back</button>
      {onZoomOutToOverview && <button onClick={onZoomOutToOverview}>zoom out</button>}
      <button onClick={() => onOpenSpot(trip.days[0].spots[0])}>moment open</button>
    </div>
  ),
}));

import MobileMapScreen from "./MobileMapScreen.jsx";

const trips = [
  { id: "busan", title: "부산", days: [{ label: "Day 1", spots: [{ id: "a" }, { id: "b" }] }] },
  { id: "jeju", title: "제주", days: [{ label: "Day 1", spots: [{ id: "c" }] }] },
];

test("direct entry starts from the all-trips overview", () => {
  render(<MobileMapScreen trips={trips} nav={{ back: () => {}, openMoment: () => {} }} settings={{}} />);

  expect(screen.getByText("전체 여행 2개")).toBeInTheDocument();
  expect(screen.queryByText(/선택 여행/)).not.toBeInTheDocument();
});

test("selecting a trip opens that trip, then back returns to overview", () => {
  render(<MobileMapScreen trips={trips} nav={{ back: () => {}, openMoment: () => {} }} settings={{}} />);

  fireEvent.click(screen.getByRole("button", { name: "제주" }));
  expect(screen.getByText("선택 여행 제주")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "trip back" }));
  expect(screen.getByText("전체 여행 2개")).toBeInTheDocument();
});

test("automatic semantic zoom remains disabled in a selected trip", () => {
  render(<MobileMapScreen trips={trips} nav={{ back: () => {}, openMoment: () => {} }} settings={{}} />);

  fireEvent.click(screen.getByRole("button", { name: "부산" }));
  expect(screen.queryByRole("button", { name: "zoom out" })).not.toBeInTheDocument();
  expect(screen.getByText("선택 여행 부산")).toBeInTheDocument();
});

test("Journey entry opens the requested trip and spot directly", () => {
  render(
    <MobileMapScreen
      trips={trips}
      initialTripId="busan"
      initialSpotIndex={1}
      nav={{ back: () => {}, openMoment: () => {} }}
      settings={{}}
    />
  );

  expect(screen.getByText("선택 여행 부산")).toBeInTheDocument();
  expect(screen.getByText("선택 스팟 b")).toBeInTheDocument();
});

test("back from overview exits the map and spot opening uses the existing moment flow", () => {
  const nav = { back: vi.fn(), openMoment: vi.fn() };
  render(<MobileMapScreen trips={trips} nav={nav} settings={{}} />);

  fireEvent.click(screen.getByRole("button", { name: "overview back" }));
  expect(nav.back).toHaveBeenCalledOnce();

  fireEvent.click(screen.getByRole("button", { name: "부산" }));
  fireEvent.click(screen.getByRole("button", { name: "moment open" }));
  expect(nav.openMoment).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }), 0);
});

test("refreshed trip data resets a removed selected Day to the whole trip", () => {
  const refreshable = {
    id: "refresh",
    title: "새로고침 여행",
    days: [
      { id: "d1", label: "Day 1", spots: [{ id: "first" }] },
      { id: "d2", label: "Day 2", spots: [{ id: "second" }] },
    ],
  };
  const nav = { back: () => {}, openMoment: () => {} };
  const { rerender } = render(<MobileMapScreen trips={[refreshable]} nav={nav} settings={{}} />);

  fireEvent.click(screen.getByRole("button", { name: "새로고침 여행" }));
  fireEvent.click(screen.getByRole("button", { name: "mock Day 2" }));
  expect(screen.getByText("선택 Day d2")).toBeInTheDocument();

  rerender(
    <MobileMapScreen
      trips={[{ ...refreshable, days: [refreshable.days[0]] }]}
      nav={nav}
      settings={{}}
    />
  );
  expect(screen.getByText("선택 Day 전체")).toBeInTheDocument();
  expect(screen.getByText("선택 스팟 first")).toBeInTheDocument();
});
