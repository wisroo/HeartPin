import { renderHook, act } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { useMobileSettings, dday } from "./useMobileSettings.js";

beforeEach(() => localStorage.clear());

test("defaults to coral / 다정 / names", () => {
  const { result } = renderHook(() => useMobileSettings());
  expect(result.current[0]).toMatchObject({ theme: "coral", tone: "다정", nameBara: "바라", myChar: null });
});

test("setSettings merges and persists", () => {
  const { result } = renderHook(() => useMobileSettings());
  act(() => result.current[1]({ theme: "dark", myChar: "nyong" }));
  expect(result.current[0].theme).toBe("dark");
  expect(JSON.parse(localStorage.getItem("hp-mobile-settings")).myChar).toBe("nyong");
});

test("dday falls back to ANNIVERSARY when anniv unset", () => {
  expect(dday({ anniv: null })).toBeGreaterThan(0);
});
