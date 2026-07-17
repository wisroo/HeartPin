import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("../../components/MapBoard.jsx", () => ({
  default: ({ onZoomOutToOverview }) => (
    <button onClick={() => onZoomOutToOverview?.()}>Web 지도 축소</button>
  ),
}));
vi.mock("../../components/Rnb.jsx", () => ({ default: () => <div>여행 패널</div> }));
vi.mock("../../components/Gallery.jsx", () => ({ default: () => null }));

import MapShell from "./MapShell.jsx";

test("Web semantic zoom uses the existing app back transition", () => {
  const app = {
    back: vi.fn(),
    openHome: () => {},
    openUpload: () => {},
    openInbox: () => {},
    inboxItems: [],
    region: "domestic",
    view: "trip",
    trips: [],
    trip: null,
    tripId: "trip",
    spotIndex: 0,
    enterTrip: () => {},
    goSpot: () => {},
  };
  render(<MapShell app={app} />);

  fireEvent.click(screen.getByRole("button", { name: "Web 지도 축소" }));
  expect(app.back).toHaveBeenCalledOnce();
});
