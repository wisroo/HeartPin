import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect } from "vitest";

vi.mock("./screens/JourneyScreen.jsx", () => ({
  default: ({ app, nav }) => (
    <div>
      <button onClick={() => nav.openUpload()}>여정화면</button>
      {app.regions.domestic.trips[0] && (
        <button onClick={() => nav.openTrip(app.regions.domestic.trips[0])}>여행 열기</button>
      )}
    </div>
  ),
}));
vi.mock("./screens/TripDetail.jsx", () => ({
  default: ({ trip, nav }) => <button onClick={() => nav.openMap(trip, 1)}>여행상세화면</button>,
}));
vi.mock("./screens/map/MobileMapScreen.jsx", () => ({
  default: ({ initialTripId, initialSpotIndex, nav }) => (
    <div>
      <span>지도:{initialTripId ? initialTripId + ":" + initialSpotIndex : "overview"}</span>
      <button onClick={nav.back}>지도 나가기</button>
    </div>
  ),
}));
vi.mock("./screens/InboxScreen.jsx", () => ({
  default: () => <div>정리함화면</div>,
}));
vi.mock("./overlays/MomentViewer.jsx", () => ({
  default: () => <div>모멘트뷰어</div>,
}));
vi.mock("./overlays/JourneyPlayer.jsx", () => ({
  default: () => <div>여정플레이어</div>,
}));
vi.mock("./overlays/SettingsScreen.jsx", () => ({
  default: () => <div>설정화면</div>,
}));
vi.mock("./overlays/CoupleScreen.jsx", () => ({
  default: () => <div>커플화면</div>,
}));
vi.mock("./overlays/UploadSheet.jsx", () => ({
  default: () => <div>업로드시트</div>,
}));
vi.mock("./overlays/RecipientTransfersScreen.jsx", () => ({
  default: ({ nav, owner }) => (
    <div>
      <span>받을 원본 화면:{owner}</span>
      <button onClick={nav.back}>받을 원본 닫기</button>
    </div>
  ),
}));
vi.mock("./ui/MobileAtoms.jsx", () => ({
  Avatar: ({ who }) => <span>{who}</span>,
  Ico: new Proxy(
    {},
    { get: () => () => null }
  ),
}));

import MobileShell from "./MobileShell.jsx";

const emptyApp = {
  regions: { domestic: { trips: [] }, intl: { trips: [] } },
  inboxItems: [],
};
const trip = {
  id: "busan",
  title: "부산",
  days: [{ label: "Day 1", spots: [{ id: "a" }, { id: "b" }] }],
};
const app = {
  regions: { domestic: { trips: [trip] }, intl: { trips: [] } },
  inboxItems: [],
};
const settings = { theme: "coral" };

test("renders journey tab by default and switches to inbox", () => {
  render(<MobileShell app={app} settings={settings} setSettings={() => {}} />);
  expect(screen.getByText("여정화면")).toBeInTheDocument();
  fireEvent.click(screen.getByText("정리함"));
  expect(screen.getByText("정리함화면")).toBeInTheDocument();
});

test("FAB opens upload overlay", () => {
  render(<MobileShell app={app} settings={settings} setSettings={() => {}} />);
  fireEvent.click(screen.getByText("여정화면")); // triggers nav.openUpload via mock
  expect(screen.getByText(/업로드/)).toBeInTheDocument();
});

test("applies the theme via data-theme", () => {
  const { container } = render(
    <MobileShell app={emptyApp} settings={{ theme: "dark" }} setSettings={() => {}} />
  );
  expect(container.querySelector("[data-theme='dark']")).toBeInTheDocument();
});

test("opening the Map tab starts from the all-trips overview", () => {
  render(<MobileShell app={app} settings={settings} setSettings={() => {}} />);

  fireEvent.click(screen.getByText("지도"));
  expect(screen.getByText("지도:overview")).toBeInTheDocument();
});

test("Journey detail can open a requested trip and spot directly", () => {
  render(<MobileShell app={app} settings={settings} setSettings={() => {}} />);

  fireEvent.click(screen.getByText("여행 열기"));
  fireEvent.click(screen.getByText("여행상세화면"));
  expect(screen.getByText("지도:busan:1")).toBeInTheDocument();

  fireEvent.click(screen.getByText("여정"));
  fireEvent.click(screen.getByText("지도"));
  expect(screen.getByText("지도:overview")).toBeInTheDocument();
});

test("Profile opens recipient transfers for the active owner and returns", () => {
  render(
    <MobileShell
      app={emptyApp}
      settings={{ ...settings, myChar: "nyong", mapSkin: "cozy", alerts: true }}
      setSettings={() => {}}
    />,
  );

  fireEvent.click(screen.getByText("프로필"));
  fireEvent.click(screen.getByRole("button", { name: /받을 원본/ }));
  expect(screen.getByText("받을 원본 화면:nyong")).toBeInTheDocument();

  fireEvent.click(screen.getByText("받을 원본 닫기"));
  expect(screen.getByText("우리")).toBeInTheDocument();
});
