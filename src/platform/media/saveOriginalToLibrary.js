import { Capacitor, registerPlugin } from "@capacitor/core";

const HeartPinMedia = registerPlugin("HeartPinMedia");
const IMAGE_MIME_BY_EXTENSION = new Map([
  ["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["png", "image/png"],
  ["heic", "image/heic"], ["heif", "image/heif"], ["webp", "image/webp"],
  ["gif", "image/gif"], ["tiff", "image/tiff"], ["tif", "image/tiff"],
]);

export const supportsOriginalLibrarySave = () => Capacitor.isNativePlatform();

export async function saveOriginalToLibrary({ url, filename, mimeType, size }) {
  const link = new URL(url);
  const extension = /\.([a-z0-9]+)$/i.exec(filename)?.[1].toLowerCase();
  const imageMime = !mimeType || mimeType === "application/octet-stream"
    ? IMAGE_MIME_BY_EXTENSION.get(extension)
    : mimeType;
  if (link.protocol !== "https:" || !imageMime?.startsWith("image/")) {
    throw new Error("사진함에 저장할 원본 정보가 올바르지 않아요.");
  }
  await HeartPinMedia.saveOriginal({ url, filename, mimeType: imageMime, size });
}
