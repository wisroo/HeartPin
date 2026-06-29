import { Capacitor } from "@capacitor/core";
import { pickAndroidOriginalPhotos } from "./androidOriginalMediaPicker.js";
import { pickCapacitorPhotos } from "./capacitorMediaPicker.js";
import { pickWebPhotos } from "./webMediaPicker.js";

export async function pickPhotos(options) {
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === "android" && options?.source !== "camera") return pickAndroidOriginalPhotos(options);
    return pickCapacitorPhotos(options);
  }
  return pickWebPhotos(options);
}
