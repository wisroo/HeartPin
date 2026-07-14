import { readExifFromBytes } from "../exif.js";

const TINTS = ["cool", "warm", "sage", "gold"];

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function bytesForItem(item) {
  if (item.bytes) return item.bytes;
  const file = item.file || item;
  return new Uint8Array(await file.arrayBuffer());
}

function datePartsFromExif(exif) {
  if (!exif?.date) return {};
  return {
    date: exif.date,
    time: exif.time || null,
    takenAt: exif.time ? `${exif.date}T${exif.time}:00` : `${exif.date}T00:00:00`,
  };
}

function datePartsFromValue(value) {
  if (!value) return {};
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return {};
  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toISOString().slice(11, 16),
    takenAt: typeof value === "string" ? value : parsed.toISOString(),
  };
}

function labelFromName(name) {
  return (name || "사진").replace(/\.[^.]+$/, "").slice(0, 26) || "사진";
}

export async function sha256Hex(bytes) {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(digest));
}

export async function makeBrowserImageDerivative(file, { maxSize, quality }) {
  if (!globalThis.createImageBitmap || typeof document === "undefined") {
    throw new Error("이 브라우저에서는 사진 압축본을 만들 수 없어요");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, width, height);
  const body = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("사진 압축본 생성에 실패했어요"));
    }, "image/webp", quality);
  });
  if (bitmap.close) bitmap.close();
  return { body, contentType: "image/webp", width, height };
}

export function createBrowserUploadPreparer({ makeImageDerivative = makeBrowserImageDerivative } = {}) {
  return async function prepareUploadItem(item, index = 0) {
    const file = item.file || item;
    const bytes = await bytesForItem(item);
    const contentHash = await sha256Hex(bytes);
    const exif = await readExifFromBytes(bytes, item.mimeType || file.type);
    const fromValue = datePartsFromValue(item.takenAt || item.lastModified || file.lastModified);
    const fromExif = datePartsFromExif(exif);
    const display = await makeImageDerivative(file, { maxSize: 2000, quality: 0.8 });
    const thumb = await makeImageDerivative(file, { maxSize: 400, quality: 0.78 });

    return {
      contentHash,
      display: { body: display.body, contentType: display.contentType },
      thumb: { body: thumb.body, contentType: thumb.contentType },
      ratio: display.width && display.height ? `${display.width}/${display.height}` : "4/3",
      takenAt: item.takenAt || fromExif.takenAt || fromValue.takenAt || null,
      date: item.date || fromExif.date || fromValue.date || null,
      time: item.time || fromExif.time || fromValue.time || null,
      lat: item.lat ?? exif?.lat ?? null,
      lng: item.lng ?? exif?.lng ?? null,
      label: labelFromName(item.name || file.name),
      tint: TINTS[index % TINTS.length],
      originalName: item.name || file.name || "photo",
      originalSize: item.size || file.size || bytes.byteLength,
    };
  };
}
