import { describe, expect, it } from "vitest";
import { readExifFromBytes } from "./exif.js";

describe("readExifFromBytes", () => {
  it("returns null for non-JPEG bytes", async () => {
    const result = await readExifFromBytes(new Uint8Array([0, 1, 2, 3]), "image/png");

    expect(result).toBeNull();
  });
});
