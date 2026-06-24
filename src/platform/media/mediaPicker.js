import { Capacitor } from "@capacitor/core";
import { pickCapacitorPhotos } from "./capacitorMediaPicker.js";
import { pickWebPhotos } from "./webMediaPicker.js";

export async function pickPhotos(options) {
  if (Capacitor.isNativePlatform()) return pickCapacitorPhotos(options);
  return pickWebPhotos(options);
}
