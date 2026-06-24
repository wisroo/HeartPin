import { beforeEach, describe, expect, it, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import { pickPhotos } from "./mediaPicker.js";
import { pickCapacitorPhotos } from "./capacitorMediaPicker.js";
import { pickWebPhotos } from "./webMediaPicker.js";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
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
  });

  it("uses the Capacitor picker on native platforms", async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    pickCapacitorPhotos.mockResolvedValue(["native"]);
    pickWebPhotos.mockResolvedValue(["web"]);

    await expect(pickPhotos({ source: "library" })).resolves.toEqual(["native"]);
    expect(pickCapacitorPhotos).toHaveBeenCalledWith({ source: "library" });
    expect(pickWebPhotos).not.toHaveBeenCalled();
  });
});
