/* HeartPin · Phase 0 로컬 서버 (D12)
 * 폰 2대 ──Wi-Fi──→ 이 서버(:3300) ──Node fs──→ 외장하드(HEARTPIN_VAULT)/HeartPin/
 * record.json 필드는 Supabase 스키마(ROADMAP §3)와 동일 — Phase 1 전환 보장
 */
import express from "express";
import multer from "multer";
import sharp from "sharp";
import exifr from "exifr";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3300;

// ── vault (정본 보관소) ──────────────────────────────────────────────
const VAULT_ROOT = process.env.HEARTPIN_VAULT || path.join(__dirname, "..", "vault");
if (process.env.HEARTPIN_VAULT && !fs.existsSync(VAULT_ROOT)) {
  console.error(`❌ HEARTPIN_VAULT=${VAULT_ROOT} 가 존재하지 않습니다. 외장하드가 마운트됐는지 확인하세요.`);
  process.exit(1);
}
const VAULT = path.join(VAULT_ROOT, "HeartPin");
const DIR = {
  originals: path.join(VAULT, "originals"),
  display: path.join(VAULT, "display"),
  thumb: path.join(VAULT, "thumb")
};
Object.values(DIR).forEach((d) => fs.mkdirSync(d, { recursive: true }));
const RECORD = path.join(VAULT, "record.json");

// ── state (record.json — 기록 트리 + 정리함 + 원장) ──────────────────
const emptyState = () => ({
  version: 0,
  saved_at: null,
  regions: {
    domestic: { key: "domestic", label: "국내", trips: [] },
    intl: { key: "intl", label: "국외", trips: [] }
  },
  inbox: [],
  photos_index: {},   // content_hash → 원장(소재·메타) — Supabase moments/photo_copies의 씨앗
  discarded: []
});
let state = emptyState();
try {
  if (fs.existsSync(RECORD)) state = JSON.parse(fs.readFileSync(RECORD, "utf8"));
} catch (e) {
  console.error(`⚠️ record.json 읽기 실패(${e.message}) — 손상 대비 백업 후 빈 상태로 시작합니다.`);
  fs.copyFileSync(RECORD, RECORD + ".corrupt-" + Date.now());
}

async function save() {
  state.version += 1;
  state.saved_at = new Date().toISOString();
  const tmp = RECORD + ".tmp";
  await fsp.writeFile(tmp, JSON.stringify(state, null, 2));
  await fsp.rename(tmp, RECORD); // atomic
}
const publicState = () => ({ version: state.version, regions: state.regions, inbox: state.inbox });
const stateCounts = () => {
  const trips = allTrips();
  const spots = trips.reduce((sum, trip) => sum + trip.days.reduce((n, day) => n + day.spots.length, 0), 0);
  const moments = trips.reduce((sum, trip) => (
    sum + trip.days.reduce((daySum, day) => (
      daySum + day.spots.reduce((spotSum, spot) => spotSum + (spot.photos?.length || 0), 0)
    ), 0)
  ), 0);
  return {
    trips: trips.length,
    spots,
    moments,
    inbox: state.inbox.length,
    photos: Object.keys(state.photos_index || {}).length,
    discarded: state.discarded.length
  };
};

// ── helpers ──────────────────────────────────────────────────────────
const TINTS = ["cool", "warm", "sage", "gold"];
const pad2 = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const safeName = (s) => s.replace(/[/\\:*?"<>|]/g, "_").slice(-80);

function allTrips() {
  return [...state.regions.domestic.trips, ...state.regions.intl.trips];
}
function findTrip(id) {
  return allTrips().find((t) => t.id === id) || null;
}
function dayForDate(trip, date) {
  if (date) {
    const mm = date.slice(5, 7), dd = date.slice(8, 10);
    const d = trip.days.find((x) => {
      const m = x.date.match(/(\d+)\.(\d+)/);
      return m && pad2(m[1]) === mm && pad2(m[2]) === dd;
    });
    if (d) return d;
  }
  return trip.days[trip.days.length - 1];
}

// HEIC → JPEG 폴백 (sharp가 못 읽을 때만, 동적 import)
async function decodableBuffer(buf, name) {
  try { await sharp(buf).metadata(); return buf; }
  catch (e) {
    if (/\.(heic|heif)$/i.test(name) || true) {
      const { default: heicConvert } = await import("heic-convert");
      return Buffer.from(await heicConvert({ buffer: buf, format: "JPEG", quality: 0.92 }));
    }
    throw e;
  }
}

// ── app ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: 80 * 1024 * 1024, files: 60 }
});

// 기록 전체 조회 (폴링: since=버전이면 unchanged)
app.get("/api/state", (req, res) => {
  if (req.query.since != null && Number(req.query.since) === state.version) {
    return res.json({ version: state.version, unchanged: true });
  }
  res.json(publicState());
});

// 데모 시작 전 빠른 점검용: 서버·보관소·record.json 상태를 한 번에 확인
app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    version: state.version,
    saved_at: state.saved_at,
    vault: {
      root: VAULT_ROOT,
      path: VAULT,
      external: Boolean(process.env.HEARTPIN_VAULT),
      record: RECORD,
      record_exists: fs.existsSync(RECORD)
    },
    counts: stateCounts()
  });
});

// ── 업로드 공용 파이프라인 — /api/photos(앱) · /api/share(공유 시트) 양쪽에서 사용 ──

// 파일 목록 전개 — zip이면 내부 이미지로 펼침 (안드로이드 위치 마스킹 우회: zip은 미디어 파일이 아니라 원본 바이트 그대로 전달됨)
async function expandUploads(reqFiles, lastModified) {
  const inputs = [];
  for (let i = 0; i < (reqFiles || []).length; i++) {
    const f = reqFiles[i];
    try {
      const buf = await fsp.readFile(f.path);
      if (/\.zip$/i.test(f.originalname) || /zip/.test(f.mimetype || "")) {
        const { default: AdmZip } = await import("adm-zip");
        new AdmZip(buf).getEntries().forEach((e) => {
          if (!e.isDirectory && /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(e.entryName)) {
            inputs.push({ name: path.basename(e.entryName), buf: e.getData(), lm: e.header.time ? e.header.time.getTime() : null });
          }
        });
      } else {
        inputs.push({ name: f.originalname, buf, lm: lastModified[i] ?? null });
      }
    } catch (e) { console.error("read fail:", f.originalname, e.message); }
    finally { fsp.unlink(f.path).catch(() => {}); }
  }
  return inputs;
}

// EXIF·해시·압축본 생성 → 하드 안착 → 정리함 추가
async function ingestInputs(inputs, owner) {
  const added = [], duplicates = [], failed = [];
  for (const inp of inputs) {
    const f = { originalname: inp.name };
    try {
      const buf = inp.buf;
      const hash = crypto.createHash("sha256").update(buf).digest("hex");
      if (state.photos_index[hash]) { duplicates.push(f.originalname); continue; }

      // EXIF (exifr: JPEG·HEIC 모두) — 날짜 없으면 클라이언트가 보낸 lastModified로 폴백
      let meta = null;
      try { meta = await exifr.parse(buf); } catch { /* no exif */ }
      const taken = meta?.DateTimeOriginal || meta?.CreateDate || (inp.lm ? new Date(inp.lm) : new Date());
      const lat = Number.isFinite(meta?.latitude) ? +meta.latitude.toFixed(6) : null;
      const lng = Number.isFinite(meta?.longitude) ? +meta.longitude.toFixed(6) : null;

      // 압축본 생성 (rotate()=EXIF 방향 반영, WebP는 메타 미포함 → 위치정보 제거 효과)
      const dec = await decodableBuffer(buf, f.originalname);
      const disp = await sharp(dec).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
      const th = await sharp(dec).rotate().resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 }).toBuffer();

      // 하드에 안착: 원본 + 압축본
      const ym = fmtDate(taken).slice(0, 7);
      await fsp.mkdir(path.join(DIR.originals, ym), { recursive: true });
      const origRel = path.join("originals", ym, `${hash.slice(0, 12)}__${safeName(f.originalname)}`);
      await fsp.writeFile(path.join(VAULT, origRel), buf);
      await fsp.writeFile(path.join(DIR.display, hash + ".webp"), disp.data);
      await fsp.writeFile(path.join(DIR.thumb, hash + ".webp"), th);

      const item = {
        id: "ib_" + hash.slice(0, 10),
        kind: lat != null ? "unsorted" : "noloc",
        date: fmtDate(taken), time: fmtTime(taken), taken_at: taken.toISOString(),
        lat, lng, blur: false,
        tint: TINTS[(state.inbox.length + added.length) % 4],
        autoLabel: (f.originalname.replace(/\.[^.]+$/, "") || "새 사진").slice(0, 26),
        src: `/photos/display/${hash}.webp`, thumb: `/photos/thumb/${hash}.webp`,
        ratio: `${disp.info.width}/${disp.info.height}`,
        content_hash: hash, original_name: f.originalname, owner
      };
      state.inbox.unshift(item);
      state.photos_index[hash] = {
        content_hash: hash, original_path: origRel,
        display_path: `display/${hash}.webp`, thumb_path: `thumb/${hash}.webp`,
        original_name: f.originalname, original_size: buf.length,
        taken_at: item.taken_at, lat, lng, owner, original_status: "kept"
      };
      added.push(item);
    } catch (e) {
      console.error(`upload fail: ${f.originalname}`, e.message);
      failed.push(f.originalname);
    }
  }
  return { added, duplicates, failed };
}

// 사진 업로드: 원본→하드, EXIF·해시·압축본(2000/400px WebP) 생성, 정리함 추가
app.post("/api/photos", upload.array("photos", 60), async (req, res) => {
  const owner = req.body.owner === "nyong" ? "nyong" : "bara";
  let lastModified = [];
  try { lastModified = JSON.parse(req.body.lastModified || "[]"); } catch { /* optional */ }
  const inputs = await expandUploads(req.files, lastModified);
  const r = await ingestInputs(inputs, owner);
  if (r.added.length) await save();
  res.json({ ...r, state: publicState() });
});

// 공유 시트 수신 (PWA share_target) — 갤러리 "공유 → HeartPin" 검증/사용 경로
app.post("/api/share", upload.array("photos", 60), async (req, res) => {
  const inputs = await expandUploads(req.files, []);
  const r = await ingestInputs(inputs, "nyong"); // 임시 기본 owner — Phase 1에서 기기/계정 바인딩으로 교체
  if (r.added.length) await save();
  res.redirect(303, `/?shared=${r.added.length}&dup=${r.duplicates.length}`);
});

// 기록 변이 ops — App의 변이 로직을 서버로 이전 (동시 사용자 직렬화)
app.post("/api/ops", async (req, res) => {
  const { op } = req.body || {};
  try {
    if (op === "placePhotos") {
      // rows: [{itemId, tripId, spotId|"__new__", newSpotName, newKey, memo, line:{guide,reaction}}]
      // newKey: 같은 op 안에서 같은 키의 "__new__"는 스팟 하나를 공유 (모바일 확인 플로우)
      const placedIds = [];
      const createdSpots = {}; // `${tripId}|${newKey}` → spot
      for (const r of req.body.rows || []) {
        const item = state.inbox.find((x) => x.id === r.itemId);
        const trip = findTrip(r.tripId);
        if (!item || !trip) continue;
        // r.lat/lng: 위치 없는 사진에 사용자가 지도에서 찍어준 좌표 (있으면 우선)
        const lat = r.lat ?? item.lat, lng = r.lng ?? item.lng;
        const photo = {
          src: item.src, thumb: item.thumb, label: r.memo || item.autoLabel,
          ratio: item.ratio || "4/3", tint: item.tint,
          content_hash: item.content_hash, owner: item.owner,
          taken_at: item.taken_at, lat, lng, original_status: "kept"
        };
        if (r.spotId === "__new__") {
          const key = `${r.tripId}|${r.newKey || r.newSpotName || Math.random()}`;
          if (createdSpots[key]) {
            createdSpots[key].photos.push(photo);
          } else {
            const ln = r.line || {};
            const sp = {
              id: "sp" + Date.now() + Math.random().toString(36).slice(2, 6),
              name: (r.newSpotName || "").trim() || "새 장소",
              time: item.time || "12:00", lat, lng,
              mood: "우리 기록", guide: ln.guide || "여기서의 기록이야.", reaction: ln.reaction || "좋다!",
              photos: [photo]
            };
            dayForDate(trip, item.date).spots.push(sp);
            createdSpots[key] = sp;
          }
        } else {
          let sp = null;
          trip.days.forEach((d) => { const f2 = d.spots.find((s) => s.id === r.spotId); if (f2) sp = f2; });
          if (sp) sp.photos.push(photo); else continue;
        }
        placedIds.push(item.id);
      }
      state.inbox = state.inbox.filter((i) => !placedIds.includes(i.id));
    } else if (op === "addTrip") {
      const tr = req.body.trip;
      if (!tr || !tr.id || !state.regions[tr.region]) return res.status(400).json({ error: "bad trip" });
      const srcIds = tr._sourceIds || [];
      delete tr._sourceIds;
      state.regions[tr.region].trips.unshift(tr);
      state.inbox = state.inbox.filter((i) => !srcIds.includes(i.id));
    } else if (op === "editTrip") {
      const { tripId, field, text } = req.body;
      if (!["title"].includes(field)) return res.status(400).json({ error: "bad field" });
      const t = findTrip(tripId);
      if (t && (text || "").trim()) t[field] = text.trim();
    } else if (op === "editSpot") {
      const { spotId, field, text } = req.body;
      if (!["guide", "reaction", "name", "mood"].includes(field)) return res.status(400).json({ error: "bad field" });
      allTrips().forEach((t) => t.days.forEach((d) => {
        const s = d.spots.find((x) => x.id === spotId); if (s) s[field] = text;
      }));
    } else if (op === "inboxKeep") {
      const it = state.inbox.find((x) => x.id === req.body.id);
      if (it) { it.kind = it.lat != null ? "unsorted" : "noloc"; it.blur = false; }
    } else if (op === "inboxPurge") {
      // 정리함 항목 완전 삭제 (재업로드용) — 원본·압축본·원장에서 모두 제거 → 같은 사진을 다시 올릴 수 있음
      const ids = new Set(req.body.ids || []);
      for (const i of state.inbox.filter((x) => ids.has(x.id))) {
        const led = state.photos_index[i.content_hash];
        if (led) {
          for (const p of [led.original_path, led.display_path, led.thumb_path]) {
            if (p) await fsp.unlink(path.join(VAULT, p)).catch(() => {});
          }
          delete state.photos_index[i.content_hash];
        }
      }
      state.inbox = state.inbox.filter((i) => !ids.has(i.id));
    } else if (op === "inboxDiscard") {
      const ids = new Set(req.body.ids || []);
      state.inbox.filter((i) => ids.has(i.id)).forEach((i) => {
        const led = state.photos_index[i.content_hash];
        if (led) led.original_status = "discard_pending"; // 원본은 하드에 유지 — 삭제는 Phase 1 큐에서
        state.discarded.push({ content_hash: i.content_hash, original_name: i.original_name, at: new Date().toISOString() });
      });
      state.inbox = state.inbox.filter((i) => !ids.has(i.id));
    } else {
      return res.status(400).json({ error: "unknown op" });
    }
    await save();
    res.json({ state: publicState() });
  } catch (e) {
    console.error("op fail:", op, e);
    res.status(500).json({ error: e.message });
  }
});

// 압축본 서빙 (원본은 비공개 — 하드 안 파일 그대로)
app.use("/photos/display", express.static(DIR.display, { maxAge: "30d", immutable: true }));
app.use("/photos/thumb", express.static(DIR.thumb, { maxAge: "30d", immutable: true }));

// 빌드된 앱 서빙 + SPA 폴백
const DIST = path.join(__dirname, "..", "dist");
app.use(express.static(DIST));
app.get(/^\/(?!api\/|photos\/).*/, (req, res) => res.sendFile(path.join(DIST, "index.html")));

app.listen(PORT, "0.0.0.0", async () => {
  const nets = os.networkInterfaces();
  const ips = Object.values(nets).flat().filter((n) => n && n.family === "IPv4" && !n.internal).map((n) => n.address);
  const host = os.hostname();
  const local = (host.endsWith(".local") ? host : host + ".local").toLowerCase();
  console.log("");
  console.log("  ♥ HeartPin Phase 0 서버");
  console.log(`  보관소: ${VAULT}${process.env.HEARTPIN_VAULT ? " (외장하드)" : "  ⚠️ 폴백 폴더 — 외장하드는 HEARTPIN_VAULT=/Volumes/<이름> 으로"}`);
  const counts = stateCounts();
  console.log(`  기록:   ${state.version}v · 여행 ${counts.trips} · 장소 ${counts.spots} · 사진 ${counts.photos} · 정리함 ${counts.inbox}`);
  console.log(`  점검:   http://localhost:${PORT}/api/status`);
  console.log("  ── 폰에서 접속 ──");
  ips.forEach((ip) => console.log(`  http://${ip}:${PORT}`));
  console.log(`  http://${local}:${PORT}  (아이폰은 이 주소도 잘 열려요 — Bonjour)`);
  if (ips.length) {
    // 아이폰: 카메라로 QR 스캔 → 정확한 http:// 주소로 바로 열림 (https 강제 업그레이드·검색 처리 회피)
    const { default: qrcode } = await import("qrcode-terminal");
    console.log("\n  📷 폰 카메라로 스캔:");
    qrcode.generate(`http://${ips[0]}:${PORT}`, { small: true }, (q) => console.log(q.replace(/^/gm, "  ")));
  }
  console.log("");
});
