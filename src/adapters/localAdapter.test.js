import { afterEach, describe, expect, it, vi } from "vitest";
import { apiUrl } from "./localAdapter.js";

describe("apiUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses relative API paths by default", () => {
    vi.stubEnv("VITE_HEARTPIN_API_BASE_URL", "");

    expect(apiUrl("/api/state")).toBe("/api/state");
  });

  it("prefixes API paths when a local server base URL is configured", () => {
    vi.stubEnv("VITE_HEARTPIN_API_BASE_URL", "http://10.250.186.63:3300/");

    expect(apiUrl("/api/state")).toBe("http://10.250.186.63:3300/api/state");
  });
});
