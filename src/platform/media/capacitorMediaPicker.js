import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem } from "@capacitor/filesystem";
import { readExifFromBytes } from "../../exif.js";

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function mimeTypeFor(format) {
  const normalized = (format || "jpeg").toLowerCase();
  if (normalized === "jpg") return "image/jpeg";
  return `image/${normalized}`;
}

function nameForPath(path, format) {
  const fallback = `photo-${Date.now()}.${format || "jpg"}`;
  if (!path) return fallback;
  return decodeURIComponent(path.split("?")[0].split("/").pop() || fallback);
}

function signedGps(value, ref) {
  if (typeof value !== "number") return null;
  if (ref === "S" || ref === "W") return -Math.abs(value);
  return value;
}

function metadataFromPluginExif(exif) {
  if (!exif || typeof exif !== "object") return {};
  const lat = exif.latitude ?? exif.GPSLatitude ?? exif.gpsLatitude;
  const lng = exif.longitude ?? exif.GPSLongitude ?? exif.gpsLongitude;
  return {
    takenAt: exif.DateTimeOriginal ?? exif.dateTimeOriginal ?? exif.DateTime ?? null,
    lat: signedGps(lat, exif.GPSLatitudeRef) ?? null,
    lng: signedGps(lng, exif.GPSLongitudeRef) ?? null,
  };
}

async function normalizeCapacitorPhoto(photo, source) {
  const path = photo.path || photo.webPath;
  const format = photo.format || "jpeg";
  const mimeType = mimeTypeFor(format);
  const { data } = await Filesystem.readFile({ path });
  const bytes = typeof data === "string" ? base64ToBytes(data) : new Uint8Array(await data.arrayBuffer());
  const parsedExif = await readExifFromBytes(bytes, mimeType);
  const pluginExif = metadataFromPluginExif(photo.exif);
  const lastModified = Date.now();
  const name = nameForPath(path, format === "jpeg" ? "jpg" : format);
  const file = new File([bytes], name, { type: mimeType, lastModified });

  return {
    name,
    mimeType,
    size: bytes.byteLength,
    lastModified,
    bytes,
    takenAt: parsedExif?.date && parsedExif?.time ? `${parsedExif.date}T${parsedExif.time}` : pluginExif.takenAt ?? null,
    lat: parsedExif?.lat ?? pluginExif.lat ?? null,
    lng: parsedExif?.lng ?? pluginExif.lng ?? null,
    source,
    file,
  };
}

export async function pickCapacitorPhotos({ source = "library", multiple = true } = {}) {
  if (source === "camera") {
    const photo = await Camera.getPhoto({
      quality: 100,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });
    return [await normalizeCapacitorPhoto(photo, "capacitor-camera")];
  }

  const result = await Camera.pickImages({
    quality: 100,
    limit: multiple ? 0 : 1,
  });
  return Promise.all(result.photos.map((photo) => normalizeCapacitorPhoto(photo, "capacitor-photos")));
}
