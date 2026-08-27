import { describe, expect, it, vi } from "vitest";
import { normalizeWebFile, pickWebPhotos } from "./webMediaPicker.js";

describe("normalizeWebFile", () => {
  it("returns the upload contract for a browser File", async () => {
    const file = new File([new Uint8Array([0, 1, 2])], "sample.jpg", {
      type: "image/jpeg",
      lastModified: 1719705600000,
    });

    const item = await normalizeWebFile(file);

    expect(item).toMatchObject({
      name: "sample.jpg",
      mimeType: "image/jpeg",
      size: 3,
      lastModified: 1719705600000,
      takenAt: null,
      lat: null,
      lng: null,
      source: "web-input",
      file,
    });
    expect(item.bytes).toBeInstanceOf(Uint8Array);
  });

  it("resolves an empty selection when the browser picker is cancelled", async () => {
    const input = document.createElement("input");
    vi.spyOn(document, "createElement").mockReturnValue(input);
    vi.spyOn(input, "click").mockImplementation(() => {});

    const selection = pickWebPhotos({ source: "library", multiple: true });
    input.oncancel();

    await expect(selection).resolves.toEqual([]);
  });
});
