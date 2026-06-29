import { readExifFromBytes } from "../../exif.js";

export async function normalizeWebFile(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const exif = await readExifFromBytes(bytes, file.type);

  return {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    lastModified: file.lastModified,
    bytes,
    takenAt: exif?.date && exif?.time ? `${exif.date}T${exif.time}` : null,
    lat: exif?.lat ?? null,
    lng: exif?.lng ?? null,
    source: "web-input",
    file,
  };
}

export function pickWebPhotos({ source = "library", multiple = true } = {}) {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.heic,.heif";
    input.multiple = multiple && source !== "camera";
    if (source === "camera") input.capture = "environment";
    input.onchange = async () => {
      try {
        const files = Array.from(input.files || []);
        const images = files.filter((file) => file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name));
        resolve(await Promise.all(images.map(normalizeWebFile)));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
