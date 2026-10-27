import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Rnb from "./Rnb.jsx";

const trip = { id: "t1", title: "부산", dateLabel: "2026.10", tags: [], days: [], cover: null };
const regions = { domestic: { key: "domestic", label: "국내", trips: [] }, intl: { key: "intl", label: "국외", trips: [trip] } };

it("guides empty regions without adding inactive actions and keeps trip navigation", () => {
  const onSelectTrip = vi.fn();
  const onRegion = vi.fn();
  const props = { view: "overview", regions, region: "domestic", trips: [], onRegion, onSelectTrip, onToggleCollapse: vi.fn() };
  const { rerender } = render(<Rnb {...props} />);
  const empty = screen.getByRole("region", { name: "기록 시작 안내" });
  expect(within(empty).getByText("첫 여행을 만들어 지도에 핀을 남겨보세요")).toBeInTheDocument();
  expect(within(empty).queryByRole("button")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "국외" }));
  expect(onRegion).toHaveBeenCalledWith("intl");
  rerender(<Rnb {...props} region="intl" trips={[trip]} />);
  expect(screen.queryByRole("region", { name: "기록 시작 안내" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /부산/ }));
  expect(onSelectTrip).toHaveBeenCalledWith("t1");
});
