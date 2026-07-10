import { render, screen, act } from "@testing-library/react";
import { vi, test, expect, beforeEach } from "vitest";
vi.mock("./MobileShell.jsx", () => ({ default: () => <div>SHELL</div> }));
vi.mock("./onboarding/LoginScreen.jsx", () => ({ default: () => <div>LOGIN</div> }));
vi.mock("./onboarding/PickSide.jsx", () => ({ default: () => <div>PICK</div> }));
import * as authMod from "./useAuth.js";
import MobileApp from "./MobileApp.jsx";

beforeEach(() => localStorage.clear());

test("local + no myChar: splash auto-advances to pick-side", () => {
  vi.spyOn(authMod, "useAuth").mockReturnValue({ needsLogin: false, signIn: vi.fn(), signOut: vi.fn() });
  vi.useFakeTimers();
  render(<MobileApp app={{ regions: { domestic: { trips: [] }, intl: { trips: [] } }, inboxItems: [] }} />);
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByText("PICK")).toBeInTheDocument();
  vi.useRealTimers();
});

test("supabase + needsLogin shows LOGIN after splash", () => {
  vi.spyOn(authMod, "useAuth").mockReturnValue({ needsLogin: true, signIn: vi.fn(), signOut: vi.fn() });
  vi.useFakeTimers();
  render(<MobileApp app={{ regions: { domestic: { trips: [] }, intl: { trips: [] } }, inboxItems: [] }} />);
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByText("LOGIN")).toBeInTheDocument();
  vi.useRealTimers();
});

test("loaded supabase state skips duplicate mobile login gate", () => {
  vi.spyOn(authMod, "useAuth").mockImplementation((opts = {}) => ({
    needsLogin: !opts.hasLoadedState,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }));
  vi.useFakeTimers();
  render(<MobileApp app={{ data: {}, regions: { domestic: { trips: [] }, intl: { trips: [] } }, inboxItems: [] }} />);
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByText("PICK")).toBeInTheDocument();
  vi.useRealTimers();
});
