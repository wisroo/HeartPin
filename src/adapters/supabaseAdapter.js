import { createSupabaseClient } from "./supabaseClient.js";

const PHOTOS_BUCKET = "photos";
const SIGNED_URL_SECONDS = 60 * 60;
const EDITABLE_SPOT_FIELDS = new Set(["name", "time", "mood", "guide", "reaction"]);

function emptyState() {
  return {
    version: 1,
    regions: {
      domestic: { key: "domestic", label: "국내", trips: [] },
      intl: { key: "intl", label: "국외", trips: [] },
    },
    inbox: [],
  };
}

function sessionIdFromDate(date = new Date()) {
  return date.toISOString().replace(/[-:.]/g, "").replace("Z", "Z");
}

function extensionFor(item) {
  const fromName = (item.name || item.file?.name || "").split(".").pop();
  if (fromName && fromName !== item.name) return fromName.toLowerCase();
  const mime = item.mimeType || item.file?.type || "image/jpeg";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function safeBaseName(name) {
  const base = (name || "photo").replace(/\.[^.]+$/, "");
  const ascii = base.normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .toLowerCase();
  return ascii || "photo";
}

export function buildTestOriginalPath(userId, uploadSessionId, item, index = 0) {
  const ext = extensionFor(item);
  const prefix = String(index + 1).padStart(3, "0");
  return `test-originals/${userId}/${uploadSessionId}/${prefix}-${safeBaseName(item.name || item.file?.name)}.${ext}`;
}

function normalizeUploadItem(item) {
  if (item.file) return item;
  return {
    file: item,
    name: item.name,
    mimeType: item.type,
    size: item.size,
    lastModified: item.lastModified,
    bytes: null,
    takenAt: null,
    lat: null,
    lng: null,
    source: "file",
  };
}

function dateParts(takenAt) {
  if (!takenAt) return { date: null, time: null };
  const parsed = new Date(takenAt);
  if (Number.isNaN(parsed.getTime())) return { date: null, time: null };
  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toISOString().slice(11, 16),
  };
}

function assertSupabaseOk(result, message) {
  if (result.error) throw new Error(`${message}: ${result.error.message}`);
  return result.data;
}

async function updateById(client, table, id, patch, message) {
  assertSupabaseOk(
    await client.from(table).update(patch).eq("id", id),
    message,
  );
}

function sortRows(rows) {
  return [...rows].sort((a, b) => (
    (a.sort_order ?? 0) - (b.sort_order ?? 0)
    || String(a.created_at || "").localeCompare(String(b.created_at || ""))
    || String(a.id || "").localeCompare(String(b.id || ""))
  ));
}

function rowVersion(rows) {
  return rows.reduce((max, row) => {
    const time = Date.parse(row.updated_at || row.created_at || "");
    return Number.isNaN(time) ? max : Math.max(max, time);
  }, 1);
}

async function fetchOrderedTable(client, table) {
  return assertSupabaseOk(
    await client.from(table).select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    `Supabase ${table} 조회 실패`,
  ) || [];
}

async function fetchCreatedTable(client, table) {
  return assertSupabaseOk(
    await client.from(table).select("*").order("created_at", { ascending: true }),
    `Supabase ${table} 조회 실패`,
  ) || [];
}

async function createPathSigner(client) {
  const storage = client.storage.from(PHOTOS_BUCKET);
  const cache = new Map();
  return async function signedUrl(path) {
    if (!path) return "";
    if (cache.has(path)) return cache.get(path);
    const signed = assertSupabaseOk(
      await storage.createSignedUrl(path, SIGNED_URL_SECONDS),
      "Supabase signed URL 생성 실패",
    );
    cache.set(path, signed.signedUrl);
    return signed.signedUrl;
  };
}

async function momentToPhoto(row, signedUrl) {
  return {
    id: row.id,
    src: await signedUrl(row.display_path),
    thumb: await signedUrl(row.thumb_path),
    label: row.label,
    ratio: row.ratio || "4/3",
    tint: row.tint,
    content_hash: row.content_hash,
    owner: row.owner,
    taken_at: row.taken_at,
    lat: row.lat,
    lng: row.lng,
    original_status: row.original_status || "kept",
  };
}

async function inboxRowToItem(row, signedUrl) {
  return {
    id: row.id,
    kind: row.kind,
    date: row.date,
    time: row.time,
    takenAt: row.taken_at,
    taken_at: row.taken_at,
    lat: row.lat,
    lng: row.lng,
    src: await signedUrl(row.display_path),
    thumb: await signedUrl(row.thumb_path),
    label: row.label,
    autoLabel: row.auto_label || row.label || row.original_name || "사진",
    ratio: row.ratio || "4/3",
    tint: row.tint,
    blur: row.blur,
    content_hash: row.content_hash,
    original_name: row.original_name,
    original_size: row.original_size,
    owner: row.owner,
    original_status: row.original_status || "kept",
  };
}

async function assembleState(client, rows) {
  const state = emptyState();
  const signedUrl = await createPathSigner(client);
  const daysByTrip = new Map();
  const spotsByDay = new Map();
  const photosBySpot = new Map();

  sortRows(rows.days).forEach((day) => {
    const list = daysByTrip.get(day.trip_id) || [];
    list.push(day);
    daysByTrip.set(day.trip_id, list);
  });

  sortRows(rows.spots).forEach((spot) => {
    const list = spotsByDay.get(spot.day_id) || [];
    list.push(spot);
    spotsByDay.set(spot.day_id, list);
  });

  for (const moment of sortRows(rows.moments)) {
    const list = photosBySpot.get(moment.spot_id) || [];
    list.push(await momentToPhoto(moment, signedUrl));
    photosBySpot.set(moment.spot_id, list);
  }

  for (const tripRow of sortRows(rows.trips)) {
    const days = (daysByTrip.get(tripRow.id) || []).map((dayRow) => ({
      id: dayRow.id,
      label: dayRow.label,
      date: dayRow.date_label,
      dateValue: dayRow.date_value,
      spots: (spotsByDay.get(dayRow.id) || []).map((spotRow) => ({
        id: spotRow.id,
        name: spotRow.name,
        time: spotRow.time,
        lat: spotRow.lat,
        lng: spotRow.lng,
        mood: spotRow.mood,
        guide: spotRow.guide,
        reaction: spotRow.reaction,
        photos: photosBySpot.get(spotRow.id) || [],
      })),
    }));
    const firstPhoto = days.flatMap((day) => day.spots).find((spot) => spot.photos.length)?.photos[0] || null;
    state.regions[tripRow.region].trips.push({
      id: tripRow.id,
      region: tripRow.region,
      start: tripRow.start_date,
      title: tripRow.title,
      dateLabel: tripRow.date_label,
      cover: firstPhoto,
      tags: tripRow.tags || [],
      days,
    });
  }

  for (const row of sortRows(rows.inboxItems)) {
    state.inbox.push(await inboxRowToItem(row, signedUrl));
  }

  state.version = Math.max(
    rowVersion(rows.trips),
    rowVersion(rows.days),
    rowVersion(rows.spots),
    rowVersion(rows.moments),
    rowVersion(rows.inboxItems),
  );
  return state;
}

export function createSupabaseAdapter({ client = createSupabaseClient() } = {}) {
  return {
    async signIn(email, password) {
      assertSupabaseOk(
        await client.auth.signInWithPassword({ email, password }),
        "Supabase 로그인 실패",
      );
    },

    async fetchState(since) {
      const sessionResult = await client.auth.getSession();
      const session = assertSupabaseOk(sessionResult, "Supabase 세션 확인 실패")?.session;
      if (!session?.user) throw new Error("Supabase 로그인이 필요해요");
      const [trips, days, spots, moments, inboxItems] = await Promise.all([
        fetchOrderedTable(client, "trips"),
        fetchOrderedTable(client, "days"),
        fetchOrderedTable(client, "spots"),
        fetchOrderedTable(client, "moments"),
        fetchCreatedTable(client, "inbox_items"),
      ]);
      const state = await assembleState(client, { trips, days, spots, moments, inboxItems });
      if (since != null && state.version <= since) return { unchanged: true };
      return state;
    },

    async uploadPhotos(items, owner, onProgress) {
      const sessionResult = await client.auth.getSession();
      const session = assertSupabaseOk(sessionResult, "Supabase 세션 확인 실패")?.session;
      const user = session?.user;
      if (!user) throw new Error("Supabase 로그인이 필요해요");

      const normalized = [...items].map(normalizeUploadItem);
      const uploadSessionId = sessionIdFromDate();
      const rows = [];
      const added = [];
      const storage = client.storage.from(PHOTOS_BUCKET);

      for (let i = 0; i < normalized.length; i += 1) {
        const item = normalized[i];
        const path = buildTestOriginalPath(user.id, uploadSessionId, item, i);
        const body = item.bytes || item.file;
        const mimeType = item.mimeType || item.file?.type || "application/octet-stream";
        assertSupabaseOk(
          await storage.upload(path, body, { contentType: mimeType, upsert: false }),
          "Supabase Storage 업로드 실패",
        );

        const signed = assertSupabaseOk(
          await storage.createSignedUrl(path, SIGNED_URL_SECONDS),
          "Supabase signed URL 생성 실패",
        );
        const { date, time } = dateParts(item.takenAt);

        rows.push({
          user_id: user.id,
          upload_session_id: uploadSessionId,
          owner,
          storage_path: path,
          original_name: item.name || item.file?.name || "photo",
          original_size: item.size || item.file?.size || null,
          mime_type: mimeType,
          taken_at: item.takenAt || null,
          lat: item.lat ?? null,
          lng: item.lng ?? null,
          source: item.source || "unknown",
        });

        added.push({
          id: `supabase-test-${uploadSessionId}-${i}`,
          kind: item.lat == null ? "noloc" : "unsorted",
          date,
          time,
          takenAt: item.takenAt || null,
          lat: item.lat ?? null,
          lng: item.lng ?? null,
          src: signed.signedUrl,
          autoLabel: "Supabase test original",
          content_hash: `supabase-test-${uploadSessionId}-${i}`,
        });

        if (onProgress) onProgress((i + 1) / normalized.length);
      }

      if (rows.length) {
        assertSupabaseOk(
          await client.from("test_uploads").insert(rows),
          "Supabase test_uploads 기록 실패",
        );
      }

      return {
        state: emptyState(),
        added,
        duplicates: [],
      };
    },

    async placePhotos() { return emptyState(); },
    async addTrip() { return emptyState(); },
    async editTrip(tripId, text) {
      await updateById(client, "trips", tripId, { title: text }, "Supabase 여행 수정 실패");
      return this.fetchState();
    },

    async editSpot(spotId, field, text) {
      if (!EDITABLE_SPOT_FIELDS.has(field)) throw new Error("수정할 수 없는 Spot 필드예요");
      await updateById(client, "spots", spotId, { [field]: text }, "Supabase Spot 수정 실패");
      return this.fetchState();
    },
    async inboxKeep() { return emptyState(); },
    async inboxDiscard() { return emptyState(); },
    async inboxPurge() { return emptyState(); },
  };
}

let defaultAdapter = null;

function getDefaultAdapter() {
  if (!defaultAdapter) defaultAdapter = createSupabaseAdapter();
  return defaultAdapter;
}

export const supabaseAdapter = {
  signIn: (...args) => getDefaultAdapter().signIn(...args),
  fetchState: (...args) => getDefaultAdapter().fetchState(...args),
  uploadPhotos: (...args) => getDefaultAdapter().uploadPhotos(...args),
  placePhotos: (...args) => getDefaultAdapter().placePhotos(...args),
  addTrip: (...args) => getDefaultAdapter().addTrip(...args),
  editTrip: (...args) => getDefaultAdapter().editTrip(...args),
  editSpot: (...args) => getDefaultAdapter().editSpot(...args),
  inboxKeep: (...args) => getDefaultAdapter().inboxKeep(...args),
  inboxDiscard: (...args) => getDefaultAdapter().inboxDiscard(...args),
  inboxPurge: (...args) => getDefaultAdapter().inboxPurge(...args),
};
