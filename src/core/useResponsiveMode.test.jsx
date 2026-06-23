import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useResponsiveMode } from "./useResponsiveMode.js";

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("useResponsiveMode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns web when the mobile media query does not match", () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useResponsiveMode());

    expect(result.current).toBe("web");
  });

  it("returns mobile when the mobile media query matches", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useResponsiveMode());

    expect(result.current).toBe("mobile");
  });
});
