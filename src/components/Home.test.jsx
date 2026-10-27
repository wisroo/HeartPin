import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Home from "./Home.jsx";

const trip = { id: "t1", title: "부산", dateLabel: "2026.10", tags: [], days: [], cover: null };
const regions = { domestic: { key: "domestic", label: "국내", trips: [] }, intl: { key: "intl", label: "국외", trips: [trip] } };
const props = () => ({ regions, region: "domestic", trips: [], onRegion: vi.fn(), onOpenTrip: vi.fn(), onOpenMap: vi.fn(), onNewTrip: vi.fn(), onUpload: vi.fn(), onInbox: vi.fn(), inboxCount: 0 });

it("offers working first-trip actions for an empty selected region", () => {
  const handlers = props();
  render(<Home {...handlers} />);
  const empty = screen.getByRole("region", { name: "첫 여행 안내" });
  expect(within(empty).getByRole("heading", { name: "아직 이쪽 여행이 없어요" })).toBeInTheDocument();
  fireEvent.click(within(empty).getByRole("button", { name: "첫 여행 만들기" }));
  fireEvent.click(within(empty).getByRole("button", { name: "사진 불러오기" }));
  expect(handlers.onNewTrip).toHaveBeenCalledOnce();
  expect(handlers.onUpload).toHaveBeenCalledOnce();
});

it("replaces the empty guidance with existing trip cards when the region changes", () => {
  const handlers = props();
  const { rerender } = render(<Home {...handlers} />);
  fireEvent.click(screen.getByRole("button", { name: /국외/ }));
  expect(handlers.onRegion).toHaveBeenCalledWith("intl");
  rerender(<Home {...handlers} region="intl" trips={[trip]} />);
  expect(screen.queryByRole("region", { name: "첫 여행 안내" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /부산/ }));
  expect(handlers.onOpenTrip).toHaveBeenCalledWith("t1");
});
