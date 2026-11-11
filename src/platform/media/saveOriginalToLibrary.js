import { Capacitor, registerPlugin } from "@capacitor/core";

const HeartPinMedia = registerPlugin("HeartPinMedia");

export const supportsOriginalLibrarySave = () => Capacitor.isNativePlatform();

export async function saveOriginalToLibrary({ url, filename, mimeType, size }) {
  const link = new URL(url);
  if (link.protocol !== "https:" || !mimeType?.startsWith("image/")) {
    throw new Error("사진함에 저장할 원본 정보가 올바르지 않아요.");
  }
  await HeartPinMedia.saveOriginal({ url, filename, mimeType, size });
}
