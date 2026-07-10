import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, test, expect } from "vitest";
import LaunchSplash from "./LaunchSplash.jsx";

const settings = { nameBara: "바라", nameNyong: "뇽이", anniv: null };

test("auto-advances after 1.5s", () => {
  vi.useFakeTimers();
  const onDone = vi.fn();
  render(<LaunchSplash settings={settings} onDone={onDone} />);
  expect(onDone).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1500));
  expect(onDone).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});

test("tap skips immediately", () => {
  const onDone = vi.fn();
  render(<LaunchSplash settings={settings} onDone={onDone} />);
  fireEvent.click(screen.getByRole("button", { name: /시작/i }));
  expect(onDone).toHaveBeenCalled();
});
