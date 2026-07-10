import { render, screen } from "@testing-library/react";
import { vi, test, expect } from "vitest";
import ProfileScreen from "./ProfileScreen.jsx";

test("profile shows couple names and D+N", () => {
  const app = { regions: { domestic: { trips: [] }, intl: { trips: [] } } };
  render(<ProfileScreen app={app} nav={{ openSettings: vi.fn(), openCouple: vi.fn(), setSettings: vi.fn() }} settings={{ nameBara: "바라", nameNyong: "뇽이", anniv: null, mapSkin: "cozy", alerts: true }} />);
  expect(screen.getByText(/바라/)).toBeInTheDocument();
  expect(screen.getByText(/D\+/)).toBeInTheDocument();
});
