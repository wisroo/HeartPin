import { beforeEach, describe, expect, it, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import { pickPhotos } from "./mediaPicker.js";
import { pickAndroidOriginalPhotos } from "./androidOriginalMediaPicker.js";
import { pickCapacitorPhotos } from "./capacitorMediaPicker.js";
import { pickWebPhotos } from "./webMediaPicker.js";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: vi.fn(),
    isNativePlatform: vi.fn(),
  },
}));

vi.mock("./androidOriginalMediaPicker.js", () => ({
  pickAndroidOriginalPhotos: vi.fn(),
}));

vi.mock("./capacitorMediaPicker.js", () => ({
  pickCapacitorPhotos: vi.fn(),
}));

vi.mock("./webMediaPicker.js", () => ({
  pickWebPhotos: vi.fn(),
}));

describe("pickPhotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Capacitor.getPlatform.mockReturnValue("web");
  });

  it("uses the Android original picker for native Android library selection", async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    Capacitor.getPlatform.mockReturnValue("android");
    pickAndroidOriginalPhotos.mockResolvedValue(["android-original"]);
    pickCapacitorPhotos.mockResolvedValue(["native"]);
    pickWebPhotos.mockResolvedValue(["web"]);

    await expect(pickPhotos({ source: "library" })).resolves.toEqual(["android-original"]);
    expect(pickAndroidOriginalPhotos).toHaveBeenCalledWith({ source: "library" });
    expect(pickCapacitorPhotos).not.toHaveBeenCalled();
    expect(pickWebPhotos).not.toHaveBeenCalled();
  });

  it("uses the Capacitor picker on other native platforms", async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    Capacitor.getPlatform.mockReturnValue("ios");
    pickCapacitorPhotos.mockResolvedValue(["native"]);
    pickWebPhotos.mockResolvedValue(["web"]);

    await expect(pickPhotos({ source: "library" })).resolves.toEqual(["native"]);
    expect(pickCapacitorPhotos).toHaveBeenCalledWith({ source: "library" });
    expect(pickWebPhotos).not.toHaveBeenCalled();
  });
});
