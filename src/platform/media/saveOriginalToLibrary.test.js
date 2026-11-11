import { expect, it, vi } from "vitest";
import { saveOriginalToLibrary } from "./saveOriginalToLibrary.js";

const saveOriginal = vi.hoisted(() => vi.fn());
vi.mock("@capacitor/core", () => ({
  Capacitor: {},
  registerPlugin: () => ({ saveOriginal }),
}));

it("uses a known image extension when a legacy transfer has no MIME type", async () => {
  const download = { url: "https://storage.example/original", filename: "IMG_1234.HEIC", mimeType: null, size: 25 };
  await saveOriginalToLibrary(download);
  expect(saveOriginal).toHaveBeenCalledWith({ ...download, mimeType: "image/heic" });
  await expect(saveOriginalToLibrary({ ...download, filename: "record.txt" })).rejects.toThrow(/원본 정보/);
});
