/* HeartPin · minimal JPEG EXIF reader (DateTimeOriginal + GPS), no deps */
function readIFD(view, tiff, ifdAbs, le) {
  const map = {};
  if (ifdAbs + 2 > view.byteLength) return map;
  const count = view.getUint16(ifdAbs, le);
  const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  for (let i = 0; i < count; i++) {
    const e = ifdAbs + 2 + i * 12;
    if (e + 12 > view.byteLength) break;
    const tag = view.getUint16(e, le), type = view.getUint16(e + 2, le), cnt = view.getUint32(e + 4, le);
    const len = (SZ[type] || 1) * cnt;
    const off = len <= 4 ? e + 8 : tiff + view.getUint32(e + 8, le);
    map[tag] = { type, count: cnt, off };
  }
  return map;
}
function ascii(view, ent) { let s = ""; for (let i = 0; i < ent.count; i++) { const c = view.getUint8(ent.off + i); if (!c) break; s += String.fromCharCode(c); } return s; }
function rat(view, off, le) { const n = view.getUint32(off, le), d = view.getUint32(off + 4, le); return d ? n / d : 0; }
function coord(view, ent, le) { return rat(view, ent.off, le) + rat(view, ent.off + 8, le) / 60 + rat(view, ent.off + 16, le) / 3600; }
function ptr(view, ent, tiff, le) { return tiff + view.getUint32(ent.off, le); }

function parseTiff(view, tiff) {
  const le = view.getUint16(tiff, false) === 0x4949;
  const ifd0 = readIFD(view, tiff, tiff + view.getUint32(tiff + 4, le), le);
  const out = {};
  if (ifd0[0x8769]) {
    const ex = readIFD(view, tiff, ptr(view, ifd0[0x8769], tiff, le), le);
    const dt = ex[0x9003] ? ascii(view, ex[0x9003]) : (ex[0x9004] ? ascii(view, ex[0x9004]) : "");
    const m = dt.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2})/);
    if (m) { out.date = `${m[1]}-${m[2]}-${m[3]}`; out.time = `${m[4]}:${m[5]}`; }
  }
  if (ifd0[0x8825]) {
    const g = readIFD(view, tiff, ptr(view, ifd0[0x8825], tiff, le), le);
    if (g[0x0002] && g[0x0004]) {
      let lat = coord(view, g[0x0002], le), lng = coord(view, g[0x0004], le);
      if (g[0x0001] && ascii(view, g[0x0001]).charAt(0) === "S") lat = -lat;
      if (g[0x0003] && ascii(view, g[0x0003]).charAt(0) === "W") lng = -lng;
      if (isFinite(lat) && isFinite(lng) && (lat || lng)) { out.lat = lat; out.lng = lng; }
    }
  }
  return out;
}

function parse(buf) {
  const view = new DataView(buf);
  if (view.getUint16(0, false) !== 0xFFD8) return null; // not JPEG
  let off = 2;
  while (off + 4 < view.byteLength) {
    if (view.getUint8(off) !== 0xFF) { off++; continue; }
    const marker = view.getUint8(off + 1);
    if (marker === 0xE1) {
      const size = view.getUint16(off + 2, false);
      if (view.getUint32(off + 4, false) === 0x45786966) return parseTiff(view, off + 10); // "Exif"
      off += 2 + size;
    } else if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) {
      off += 2;
    } else if (marker === 0xDA) { break; } // start of scan
    else { off += 2 + view.getUint16(off + 2, false); }
  }
  return null;
}

// -> Promise<{date,time,lat,lng} | null>
// NOTE: HEIC 등 비JPEG는 브라우저에서 파싱 불가 → null 반환 (실서비스는 백엔드 메타 추출로 교체)
export async function readExifFromBytes(bytes, mimeType) {
  if (!bytes || !/jpe?g/i.test(mimeType || "")) return null;
  const buffer = bytes instanceof ArrayBuffer
    ? bytes
    : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  try {
    return parse(buffer);
  } catch {
    return null;
  }
}

export function readExif(file) {
  return new Promise((resolve) => {
    if (!file || !/jpe?g/i.test(file.type || "")) { resolve(null); return; }
    const r = new FileReader();
    r.onload = (e) => { readExifFromBytes(e.target.result, file.type).then(resolve); };
    r.onerror = () => resolve(null);
    r.readAsArrayBuffer(file.slice(0, 384 * 1024));
  });
}
