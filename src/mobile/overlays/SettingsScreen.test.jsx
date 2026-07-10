import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect } from "vitest";
import SettingsScreen from "./SettingsScreen.jsx";

test("theme swatch updates settings", () => {
  const nav = { back: vi.fn(), setSettings: vi.fn(), openCouple: vi.fn() };
  render(<SettingsScreen nav={nav} settings={{ theme: "coral", tone: "다정", mapSkin: "cozy", showChars: true, alerts: true, nameBara: "바라", nameNyong: "뇽이", anniv: null }} />);
  fireEvent.click(screen.getByText(/노을 다크/));
  expect(nav.setSettings).toHaveBeenCalledWith({ theme: "dark" });
});
