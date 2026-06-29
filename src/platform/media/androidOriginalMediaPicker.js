import { registerPlugin } from "@capacitor/core";

const HeartPinMedia = registerPlugin("HeartPinMedia");

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function normalizeAndroidPhoto(photo) {
  const bytes = base64ToBytes(photo.data);
  const mimeType = photo.mimeType || "image/jpeg";
  const name = photo.name || `photo-${Date.now()}.jpg`;
  const lastModified = photo.lastModified || Date.now();
  const file = new File([bytes], name, { type: mimeType, lastModified });

  return {
    name,
    mimeType,
    size: photo.size || bytes.byteLength,
    lastModified,
    bytes,
    takenAt: normalizeTakenAt(photo.takenAt),
    lat: photo.lat ?? null,
    lng: photo.lng ?? null,
    source: "android-original-media",
    file,
  };
}

function normalizeTakenAt(value) {
  if (!value) return null;
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(value);
  if (match) return `${match[1]}-${match[2]}-${match[3]}T${match[4]}`;
  return value;
}

export async function pickAndroidOriginalPhotos({ source = "library" } = {}) {
  if (source === "camera") throw new Error("Android original media picker only supports library selection.");
  const result = await HeartPinMedia.pickImages({ multiple: false });
  return (result.photos || []).map(normalizeAndroidPhoto);
}
