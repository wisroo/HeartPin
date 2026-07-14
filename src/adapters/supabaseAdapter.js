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

function uploadPathsForHash(contentHash) {
  return {
    displayPath: `display/${contentHash}.webp`,
    thumbPath: `thumb/${contentHash}.webp`,
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

async function updateByIds(client, table, ids, patch, message) {
  if (!ids.length) return;
  assertSupabaseOk(
    await client.from(table).update(patch).in("id", ids),
    message,
  );
}

async function deleteByIds(client, table, ids, message) {
  if (!ids.length) return;
  assertSupabaseOk(
    await client.from(table).delete().in("id", ids),
    message,
  );
}

function normalizeIds(ids) {
  return Array.isArray(ids) ? ids : [ids];
}

function dayIdFor(tripId, day, index) {
  return day.id || `${tripId}-day-${index + 1}`;
}

async function insertRows(client, table, rows, message) {
  if (!rows.length) return;
  assertSupabaseOk(
    await client.from(table).insert(rows),
    message,
  );
}

async function fetchInboxItemsByIds(client, ids) {
  if (!ids.length) return [];
  return assertSupabaseOk(
    await client.from("inbox_items").select("*").in("id", ids),
    "Supabase 정리함 항목 조회 실패",
  ) || [];
}

async function fetchDaysForTrips(client, tripIds) {
  if (!tripIds.length) return [];
  return assertSupabaseOk(
    await client.from("days").select("*").in("trip_id", tripIds),
    "Supabase Day 조회 실패",
  ) || [];
}

function tripRowsForInsert(trip) {
  return [{
    id: trip.id,
    region: trip.region,
    title: trip.title,
    start_date: trip.start || null,
    date_label: trip.dateLabel || null,
    tags: trip.tags || [],
  }];
}

function dayRowsForInsert(trip) {
  return (trip.days || []).map((day, index) => ({
    id: dayIdFor(trip.id, day, index),
    trip_id: trip.id,
    label: day.label,
    date_label: day.date,
    sort_order: index,
  }));
}

function spotRowsForInsert(trip) {
  return (trip.days || []).flatMap((day, dayIndex) => (
    (day.spots || []).map((spot, spotIndex) => ({
      id: spot.id,
      day_id: dayIdFor(trip.id, day, dayIndex),
      name: spot.name,
      time: spot.time,
      lat: spot.lat,
      lng: spot.lng,
      mood: spot.mood,
      guide: spot.guide,
      reaction: spot.reaction,
      sort_order: spotIndex,
    }))
  ));
}

function momentRowsForTrip(trip, inboxItems) {
  const inboxByHash = new Map(inboxItems.map((item) => [item.content_hash, item]));
  return (trip.days || []).flatMap((day) => (
    (day.spots || []).flatMap((spot) => (
      (spot.photos || []).map((photo, photoIndex) => {
        const source = inboxByHash.get(photo.content_hash) || {};
        return {
          spot_id: spot.id,
          display_path: photo.display_path || source.display_path,
          thumb_path: photo.thumb_path || source.thumb_path,
          label: photo.label,
          ratio: photo.ratio || "4/3",
          tint: photo.tint,
          content_hash: photo.content_hash,
          original_name: photo.original_name || source.original_name,
          original_size: photo.original_size || source.original_size,
          taken_at: photo.taken_at || source.taken_at,
          lat: photo.lat ?? source.lat,
          lng: photo.lng ?? source.lng,
          owner: photo.owner || source.owner,
          original_status: photo.original_status || "kept",
          sort_order: photoIndex,
        };
      }).filter((row) => row.display_path && row.thumb_path && row.content_hash)
    ))
  ));
}

function inboxRowFromPrepared(prepared, item, owner) {
  const { displayPath, thumbPath } = uploadPathsForHash(prepared.contentHash);
  const fallbackParts = dateParts(prepared.takenAt);
  return {
    id: `ib_${prepared.contentHash}`,
    kind: prepared.lat == null ? "noloc" : "unsorted",
    date: prepared.date || fallbackParts.date,
    time: prepared.time || fallbackParts.time,
    taken_at: prepared.takenAt || null,
    lat: prepared.lat ?? null,
    lng: prepared.lng ?? null,
    display_path: displayPath,
    thumb_path: thumbPath,
    label: prepared.label || null,
    auto_label: prepared.label || (item.name || item.file?.name || "사진").replace(/\.[^.]+$/, "").slice(0, 26),
    ratio: prepared.ratio || "4/3",
    tint: prepared.tint || "cool",
    blur: false,
    content_hash: prepared.contentHash,
    original_name: prepared.originalName || item.name || item.file?.name || "photo",
    original_size: prepared.originalSize || item.size || item.file?.size || null,
    owner,
    original_status: "kept",
  };
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
    if (row.original_status === "discard_pending" || row.original_status === "discarded") continue;
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

export function createSupabaseAdapter({ client = createSupabaseClient(), prepareUploadItem = null } = {}) {
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
        if (prepareUploadItem) {
          const prepared = await prepareUploadItem(item, i);
          const { displayPath, thumbPath } = uploadPathsForHash(prepared.contentHash);
          assertSupabaseOk(
            await storage.upload(displayPath, prepared.display.body, {
              contentType: prepared.display.contentType || "image/webp",
              upsert: false,
            }),
            "Supabase display 업로드 실패",
          );
          assertSupabaseOk(
            await storage.upload(thumbPath, prepared.thumb.body, {
              contentType: prepared.thumb.contentType || "image/webp",
              upsert: false,
            }),
            "Supabase thumb 업로드 실패",
          );

          const displaySigned = assertSupabaseOk(
            await storage.createSignedUrl(displayPath, SIGNED_URL_SECONDS),
            "Supabase display signed URL 생성 실패",
          );
          const thumbSigned = assertSupabaseOk(
            await storage.createSignedUrl(thumbPath, SIGNED_URL_SECONDS),
            "Supabase thumb signed URL 생성 실패",
          );
          const row = inboxRowFromPrepared(prepared, item, owner);
          rows.push(row);
          added.push({
            id: row.id,
            kind: row.kind,
            date: row.date,
            time: row.time,
            takenAt: row.taken_at,
            lat: row.lat,
            lng: row.lng,
            src: displaySigned.signedUrl,
            thumb: thumbSigned.signedUrl,
            autoLabel: row.auto_label,
            ratio: row.ratio,
            tint: row.tint,
            content_hash: row.content_hash,
            owner,
          });
          if (onProgress) onProgress((i + 1) / normalized.length);
          continue;
        }

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
        const table = prepareUploadItem ? "inbox_items" : "test_uploads";
        assertSupabaseOk(
          await client.from(table).insert(rows),
          prepareUploadItem ? "Supabase inbox_items 기록 실패" : "Supabase test_uploads 기록 실패",
        );
      }

      return {
        state: emptyState(),
        added,
        duplicates: [],
      };
    },

    async placePhotos(rows) {
      const existingSpotRows = rows.filter((row) => row.spotId && row.spotId !== "__new__" && row.itemId);
      const newSpotRows = rows.filter((row) => row.spotId === "__new__" && row.itemId && row.tripId);
      const itemIds = [...existingSpotRows, ...newSpotRows].map((row) => row.itemId);
      const itemsById = new Map((await fetchInboxItemsByIds(client, itemIds)).map((item) => [item.id, item]));
      const daysByTripDate = new Map(
        (await fetchDaysForTrips(client, [...new Set(newSpotRows.map((row) => row.tripId))]))
          .map((day) => [`${day.trip_id}|${day.date_value}`, day]),
      );
      const placedIds = [];
      const moments = [];
      const newSpots = [];

      existingSpotRows.forEach((row, index) => {
        const item = itemsById.get(row.itemId);
        if (!item) return;
        moments.push({
          spot_id: row.spotId,
          display_path: item.display_path,
          thumb_path: item.thumb_path,
          label: row.memo || item.auto_label || item.label,
          ratio: item.ratio || "4/3",
          tint: item.tint,
          content_hash: item.content_hash,
          original_name: item.original_name,
          original_size: item.original_size,
          taken_at: item.taken_at,
          lat: row.lat ?? item.lat,
          lng: row.lng ?? item.lng,
          owner: item.owner,
          original_status: "kept",
          sort_order: index,
        });
        placedIds.push(item.id);
      });

      newSpotRows.forEach((row, index) => {
        const item = itemsById.get(row.itemId);
        const day = item ? daysByTripDate.get(`${row.tripId}|${item.date}`) : null;
        if (!item || !day) return;
        const spotId = row.newSpotId || row.newKey || `spot-${item.id}`;
        newSpots.push({
          id: spotId,
          day_id: day.id,
          name: (row.newSpotName || "").trim() || "새 장소",
          time: item.time || "12:00",
          lat: row.lat ?? item.lat,
          lng: row.lng ?? item.lng,
          mood: "우리 기록",
          guide: row.line?.guide || "여기서의 기록이야.",
          reaction: row.line?.reaction || "좋다!",
          sort_order: index,
        });
        moments.push({
          spot_id: spotId,
          display_path: item.display_path,
          thumb_path: item.thumb_path,
          label: row.memo || item.auto_label || item.label,
          ratio: item.ratio || "4/3",
          tint: item.tint,
          content_hash: item.content_hash,
          original_name: item.original_name,
          original_size: item.original_size,
          taken_at: item.taken_at,
          lat: row.lat ?? item.lat,
          lng: row.lng ?? item.lng,
          owner: item.owner,
          original_status: "kept",
          sort_order: index,
        });
        placedIds.push(item.id);
      });

      await insertRows(client, "spots", newSpots, "Supabase Spot 추가 실패");
      await insertRows(client, "moments", moments, "Supabase 모먼트 추가 실패");
      await deleteByIds(client, "inbox_items", placedIds, "Supabase 배치된 정리함 항목 삭제 실패");
      return this.fetchState();
    },
    async addTrip(trip) {
      const sourceIds = trip?._sourceIds || [];
      const sourceItems = await fetchInboxItemsByIds(client, sourceIds);
      await insertRows(client, "trips", tripRowsForInsert(trip), "Supabase 여행 추가 실패");
      await insertRows(client, "days", dayRowsForInsert(trip), "Supabase Day 추가 실패");
      await insertRows(client, "spots", spotRowsForInsert(trip), "Supabase Spot 추가 실패");
      await insertRows(client, "moments", momentRowsForTrip(trip, sourceItems), "Supabase 모먼트 추가 실패");
      await deleteByIds(client, "inbox_items", sourceIds, "Supabase 새 여행 원본 정리 실패");
      return this.fetchState();
    },
    async editTrip(tripId, text) {
      await updateById(client, "trips", tripId, { title: text }, "Supabase 여행 수정 실패");
      return this.fetchState();
    },

    async editSpot(spotId, field, text) {
      if (!EDITABLE_SPOT_FIELDS.has(field)) throw new Error("수정할 수 없는 Spot 필드예요");
      await updateById(client, "spots", spotId, { [field]: text }, "Supabase Spot 수정 실패");
      return this.fetchState();
    },
    async inboxKeep(id) {
      const row = assertSupabaseOk(
        await client.from("inbox_items").select("lat").eq("id", id).single(),
        "Supabase 정리함 항목 조회 실패",
      );
      await updateById(client, "inbox_items", id, {
        kind: row?.lat != null ? "unsorted" : "noloc",
        blur: false,
      }, "Supabase 정리함 항목 유지 실패");
      return this.fetchState();
    },

    async inboxDiscard(ids) {
      await updateByIds(
        client,
        "inbox_items",
        normalizeIds(ids),
        { original_status: "discard_pending" },
        "Supabase 정리함 항목 버리기 실패",
      );
      return this.fetchState();
    },

    async inboxPurge(ids) {
      await deleteByIds(
        client,
        "inbox_items",
        normalizeIds(ids),
        "Supabase 정리함 항목 삭제 실패",
      );
      return this.fetchState();
    },
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
