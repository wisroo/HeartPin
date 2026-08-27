import { afterEach, describe, expect, it, vi } from "vitest";
import { apiUrl, localAdapter, localUploadFile } from "./localAdapter.js";

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

describe("local upload preparation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps a plain File as the local upload file", () => {
    const file = new File(["photo"], "plain.jpg", {
      type: "image/jpeg",
      lastModified: 1700000000000
    });

    expect(localUploadFile(file)).toBe(file);
  });

  it("unwraps a normalized item for the local upload file", () => {
    const file = new File(["photo"], "wrapped.jpg", {
      type: "image/jpeg",
      lastModified: 1700000000000
    });

    expect(localUploadFile({ file, bytes: new Uint8Array([1]) })).toBe(file);
  });

  it("appends a normalized item's underlying file and last-modified value", async () => {
    const file = new File(["photo"], "wrapped.jpg", {
      type: "image/jpeg",
      lastModified: 1700000000000
    });
    const normalizedItem = {
      file,
      bytes: new Uint8Array([1])
    };
    const append = vi.spyOn(FormData.prototype, "append");

    class SuccessfulUploadXmlHttpRequest {
      upload = {};
      status = 200;
      responseText = "[]";

      open() {}

      send() {
        this.onload();
      }
    }

    vi.stubGlobal("XMLHttpRequest", SuccessfulUploadXmlHttpRequest);

    await expect(localAdapter.uploadPhotos([normalizedItem], "bara")).resolves.toEqual([]);

    expect(append).toHaveBeenCalledWith("photos", file, "wrapped.jpg");
    expect(append).toHaveBeenCalledWith("lastModified", JSON.stringify([1700000000000]));
  });
});
