import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { useHeartPinState } from "./core/useHeartPinState.js";
import { useResponsiveMode } from "./core/useResponsiveMode.js";

vi.mock("./core/useHeartPinState.js", () => ({
  useHeartPinState: vi.fn(),
}));

vi.mock("./core/useResponsiveMode.js", () => ({
  useResponsiveMode: vi.fn(),
}));

vi.mock("./web/WebApp.jsx", () => ({
  default: () => <div data-testid="web-app">web shell</div>,
}));

vi.mock("./mobile/MobileApp.jsx", () => ({
  default: () => <div data-testid="mobile-app">mobile shell</div>,
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
    useHeartPinState.mockReturnValue(appState);
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
});
