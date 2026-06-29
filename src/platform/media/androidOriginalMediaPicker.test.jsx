import { beforeEach, describe, expect, it, vi } from "vitest";
import { pickAndroidOriginalPhotos } from "./androidOriginalMediaPicker.js";

const mocks = vi.hoisted(() => ({
  pickImages: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  registerPlugin: vi.fn(() => ({ pickImages: mocks.pickImages })),
}));

describe("pickAndroidOriginalPhotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes Android original photo results for upload", async () => {
    mocks.pickImages.mockResolvedValue({
      photos: [{
        name: "gps.jpg",
        mimeType: "image/jpeg",
        size: 3,
        lastModified: 1719705600000,
        data: "AQID",
        takenAt: "2026:06:29 10:30:00",
        lat: 37.5,
        lng: 127.0,
      }],
    });

    const [item] = await pickAndroidOriginalPhotos({ source: "library", multiple: true });

    expect(mocks.pickImages).toHaveBeenCalledWith({ multiple: false });
    expect(item).toMatchObject({
      name: "gps.jpg",
      mimeType: "image/jpeg",
      size: 3,
      lastModified: 1719705600000,
      takenAt: "2026-06-29T10:30:00",
      lat: 37.5,
      lng: 127.0,
      source: "android-original-media",
    });
    expect([...item.bytes]).toEqual([1, 2, 3]);
    expect(item.file).toBeInstanceOf(File);
  });
});
