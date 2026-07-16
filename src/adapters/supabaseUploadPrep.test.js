import { describe, expect, it, vi } from "vitest";
import { createBrowserUploadPreparer, sha256Hex } from "./supabaseUploadPrep.js";

describe("sha256Hex", () => {
  it("hashes upload bytes as lowercase hex", async () => {
    const hash = await sha256Hex(new Uint8Array([97, 98, 99]));

    expect(hash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("createBrowserUploadPreparer", () => {
  it("builds prepared display/thumb derivatives with metadata and content hash", async () => {
    const displayBlob = new Blob(["display"], { type: "image/webp" });
    const thumbBlob = new Blob(["thumb"], { type: "image/webp" });
    const makeImageDerivative = vi.fn()
      .mockResolvedValueOnce({ body: displayBlob, contentType: "image/webp", width: 1200, height: 900 })
      .mockResolvedValueOnce({ body: thumbBlob, contentType: "image/webp", width: 400, height: 300 });
    const file = new File([new Uint8Array([1, 2, 3])], "Seoul Trip.JPG", {
      type: "image/jpeg",
      lastModified: Date.parse("2026-06-25T10:11:12Z"),
    });
    const prepare = createBrowserUploadPreparer({ makeImageDerivative });

    const prepared = await prepare({
      file,
      bytes: new Uint8Array([1, 2, 3]),
      takenAt: "2026-06-25T10:11:12Z",
      lat: 37.5,
      lng: 127.0,
      source: "capacitor-photos",
    }, 0);

    expect(makeImageDerivative).toHaveBeenNthCalledWith(1, file, { maxSize: 2000, quality: 0.8 });
    expect(makeImageDerivative).toHaveBeenNthCalledWith(2, file, { maxSize: 400, quality: 0.78 });
    expect(prepared).toEqual({
      contentHash: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      display: { body: displayBlob, contentType: "image/webp" },
      thumb: { body: thumbBlob, contentType: "image/webp" },
      ratio: "1200/900",
      takenAt: "2026-06-25T10:11:12Z",
      date: "2026-06-25",
      time: "10:11",
      lat: 37.5,
      lng: 127.0,
      label: "Seoul Trip",
      tint: "cool",
      originalName: "Seoul Trip.JPG",
      originalSize: 3,
    });
  });
});
