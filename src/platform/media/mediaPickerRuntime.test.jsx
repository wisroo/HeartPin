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

  it("routes web library selection to the web picker", async () => {
    Capacitor.isNativePlatform.mockReturnValue(false);
    pickWebPhotos.mockResolvedValue(["web"]);

    await expect(pickPhotos({ source: "library", multiple: true })).resolves.toEqual(["web"]);
    expect(pickWebPhotos).toHaveBeenCalledWith({ source: "library", multiple: true });
    expect(pickAndroidOriginalPhotos).not.toHaveBeenCalled();
    expect(pickCapacitorPhotos).not.toHaveBeenCalled();
  });

  it("routes native Android camera selection to the Capacitor picker", async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    Capacitor.getPlatform.mockReturnValue("android");
    pickCapacitorPhotos.mockResolvedValue(["native-camera"]);

    await expect(pickPhotos({ source: "camera", multiple: false })).resolves.toEqual(["native-camera"]);
    expect(pickCapacitorPhotos).toHaveBeenCalledWith({ source: "camera", multiple: false });
    expect(pickAndroidOriginalPhotos).not.toHaveBeenCalled();
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
