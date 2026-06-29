import { createSupabaseClient } from "./supabaseClient.js";

const PHOTOS_BUCKET = "photos";
const SIGNED_URL_SECONDS = 60 * 60;

function emptyState() {
  return {
    version: 1,
    regions: { domestic: { trips: [] }, intl: { trips: [] } },
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

export function createSupabaseAdapter({ client = createSupabaseClient() } = {}) {
  return {
    async signIn(email, password) {
      assertSupabaseOk(
        await client.auth.signInWithPassword({ email, password }),
        "Supabase 로그인 실패",
      );
    },

    async fetchState() {
      const sessionResult = await client.auth.getSession();
      const session = assertSupabaseOk(sessionResult, "Supabase 세션 확인 실패")?.session;
      if (!session?.user) throw new Error("Supabase 로그인이 필요해요");
      return emptyState();
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
    async editTrip() { return emptyState(); },
    async editSpot() { return emptyState(); },
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
