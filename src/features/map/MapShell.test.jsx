import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("../../components/MapBoard.jsx", () => ({
  default: ({ onZoomOutToOverview }) => (
    <div>{onZoomOutToOverview ? "semantic zoom enabled" : "semantic zoom disabled"}</div>
  ),
}));
vi.mock("../../components/Rnb.jsx", () => ({ default: () => <div>여행 패널</div> }));
vi.mock("../../components/Gallery.jsx", () => ({ default: () => null }));

import MapShell from "./MapShell.jsx";

test("Web map keeps automatic semantic zoom disabled", () => {
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

  expect(screen.getByText("semantic zoom disabled")).toBeInTheDocument();
  expect(app.back).not.toHaveBeenCalled();
});
