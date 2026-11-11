import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { useHeartPinState } from "./core/useHeartPinState.js";
import { useResponsiveMode } from "./core/useResponsiveMode.js";
import * as api from "./api.js";
import { canUseOriginalPush, listenForOriginalArrival } from "./platform/notifications/originalArrival.js";

vi.mock("./core/useHeartPinState.js", () => ({
  useHeartPinState: vi.fn(),
}));

vi.mock("./core/useResponsiveMode.js", () => ({
  useResponsiveMode: vi.fn(),
}));

vi.mock("./api.js", () => ({
  getApiMode: vi.fn(() => "local"),
  signInToSupabase: vi.fn(),
}));

vi.mock("./platform/notifications/originalArrival.js", () => ({
  canUseOriginalPush: vi.fn(() => false),
  listenForOriginalArrival: vi.fn(),
}));

vi.mock("./web/WebApp.jsx", () => ({
  default: () => <div data-testid="web-app">web shell</div>,
}));

vi.mock("./mobile/MobileApp.jsx", () => ({
  default: ({ originalArrivalPending, onOriginalArrivalHandled }) => (
    <div data-testid="mobile-app">
      mobile shell
      {originalArrivalPending && <button onClick={onOriginalArrivalHandled}>알림 이동 확인</button>}
    </div>
  ),
}));

vi.mock("./components/Journey.jsx", () => ({
  default: () => <div data-testid="journey" />,
}));

vi.mock("./components/Inbox.jsx", () => ({
  default: () => <div data-testid="inbox" />,
}));

vi.mock("./components/Upload.jsx", () => ({
  default: () => <div data-testid="upload" />,
}));

vi.mock("./components/TripPreview.jsx", () => ({
  default: () => <div data-testid="trip-preview" />,
}));

const appState = {
  data: { version: 1 },
  loadError: null,
  journeyOpen: false,
  trip: null,
  inboxOpen: false,
  uploadOpen: false,
  uploadMode: "inbox",
  newTripDraft: null,
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    canUseOriginalPush.mockReturnValue(false);
    useHeartPinState.mockReturnValue(appState);
    api.getApiMode.mockReturnValue("local");
    api.signInToSupabase.mockResolvedValue();
  });

  it("renders the web shell in web mode", () => {
    useResponsiveMode.mockReturnValue("web");

    render(<App />);

    expect(screen.getByTestId("web-app")).toBeInTheDocument();
    expect(screen.queryByTestId("mobile-app")).not.toBeInTheDocument();
  });

  it("renders the mobile shell in mobile mode", () => {
    useResponsiveMode.mockReturnValue("mobile");

    render(<App />);

    expect(screen.getByTestId("mobile-app")).toBeInTheDocument();
    expect(screen.queryByTestId("web-app")).not.toBeInTheDocument();
  });

  it("renders HeartPin login on web when a Supabase session is required", async () => {
    useResponsiveMode.mockReturnValue("web");
    api.getApiMode.mockReturnValue("supabase");
    useHeartPinState.mockReturnValue({
      ...appState,
      data: null,
      loadError: "Supabase 로그인이 필요해요",
    });

    render(<App />);

    expect(screen.getByRole("heading", { name: "HeartPin 로그인" })).toBeInTheDocument();
    expect(screen.getByText("로그인이 필요해요")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "heartpin@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "secret-password" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(api.signInToSupabase).toHaveBeenCalledWith("heartpin@example.com", "secret-password");
    });
  });

  it("renders the mobile login screen when a Supabase session is required", async () => {
    useResponsiveMode.mockReturnValue("mobile");
    api.getApiMode.mockReturnValue("supabase");
    useHeartPinState.mockReturnValue({
      ...appState,
      data: null,
      loadError: "Supabase 로그인이 필요해요",
    });

    render(<App />);

    expect(screen.getByRole("heading", { name: "HeartPin 로그인" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "heartpin@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "secret-password" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(api.signInToSupabase).toHaveBeenCalledWith("heartpin@example.com", "secret-password");
    });
  });
});


it("carries a notification tap across the login reload and consumes it once", async () => {
  canUseOriginalPush.mockReturnValue(true);
  api.getApiMode.mockReturnValue("supabase");
  useResponsiveMode.mockReturnValue("mobile");
  useHeartPinState.mockReturnValue({ ...appState, data: null, loadError: "Supabase 로그인이 필요해요" });
  const remove = vi.fn();
  listenForOriginalArrival.mockResolvedValue({ remove });
  const login = render(<App />);
  const [onArrival] = listenForOriginalArrival.mock.calls[0];
  act(() => onArrival());
  login.unmount();
  await waitFor(() => expect(remove).toHaveBeenCalledOnce());

  useHeartPinState.mockReturnValue(appState);
  const loaded = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "알림 이동 확인" }));
  loaded.unmount();
  render(<App />);
  expect(screen.queryByRole("button", { name: "알림 이동 확인" })).not.toBeInTheDocument();
});
