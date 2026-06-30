import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect } from "vitest";

vi.mock("./screens/JourneyScreen.jsx", () => ({
  default: ({ nav }) => (
    <button onClick={() => nav.openUpload()}>여정화면</button>
  ),
}));
vi.mock("./screens/TripDetail.jsx", () => ({
  default: () => <div>여행상세화면</div>,
}));
vi.mock("./screens/MapScreen.jsx", () => ({
  default: () => <div>지도화면</div>,
}));
vi.mock("./screens/InboxScreen.jsx", () => ({
  default: () => <div>정리함화면</div>,
}));
vi.mock("./screens/ProfileScreen.jsx", () => ({
  default: () => <div>프로필화면</div>,
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
vi.mock("./ui/MobileAtoms.jsx", () => ({
  Ico: new Proxy(
    {},
    { get: () => () => null }
  ),
}));

import MobileShell from "./MobileShell.jsx";

const app = {
  regions: { domestic: { trips: [] }, intl: { trips: [] } },
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
    <MobileShell app={app} settings={{ theme: "dark" }} setSettings={() => {}} />
  );
  expect(container.querySelector("[data-theme='dark']")).toBeInTheDocument();
});
