#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const defaultRecord = path.join(root, "vault", "HeartPin", "record.json");

const args = process.argv.slice(2);
const recordPath = path.resolve(args[0] || process.env.HEARTPIN_RECORD || defaultRecord);
const outPath = path.resolve(args[1] || path.join(root, "tmp", "supabase-import.json"));

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

const asArray = (v) => Array.isArray(v) ? v : [];
const dateValueFromLabel = (label, startYear) => {
  const m = String(label || "").match(/(\d{1,2})\.(\d{1,2})/);
  if (!m || !startYear) return null;
  return `${startYear}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
};

if (!fs.existsSync(recordPath)) fail(`record.json not found: ${recordPath}`);

const state = JSON.parse(await fsp.readFile(recordPath, "utf8"));
const regions = state.regions || {};
const trips = [];
const days = [];
const spots = [];
const moments = [];
const inbox_items = [];
const photo_copies = [];

for (const region of Object.values(regions)) {
  for (const trip of asArray(region.trips)) {
    const tripIndex = trips.length;
    const startYear = trip.start ? String(trip.start).slice(0, 4) : null;
    trips.push({
      id: trip.id,
      region: trip.region || region.key,
      title: trip.title,
      start_date: trip.start || null,
      date_label: trip.dateLabel || null,
      cover: trip.cover || null,
      tags: asArray(trip.tags),
      sort_order: tripIndex
    });

    asArray(trip.days).forEach((day, dayIndex) => {
      const dayId = day.id || `${trip.id}_day_${dayIndex + 1}`;
      days.push({
        id: dayId,
        trip_id: trip.id,
        label: day.label || `Day ${dayIndex + 1}`,
        date_label: day.date || "",
        date_value: dateValueFromLabel(day.date, startYear),
        sort_order: dayIndex
      });

      asArray(day.spots).forEach((spot, spotIndex) => {
        spots.push({
          id: spot.id,
          day_id: dayId,
          name: spot.name,
          time: spot.time || null,
          lat: spot.lat ?? null,
          lng: spot.lng ?? null,
          mood: spot.mood || null,
          guide: spot.guide || null,
          reaction: spot.reaction || null,
          sort_order: spotIndex
        });

        asArray(spot.photos).forEach((photo, photoIndex) => {
          const hash = photo.content_hash;
          moments.push({
            id: `${spot.id}_${hash || photoIndex}`,
            spot_id: spot.id,
            display_path: hash ? `display/${hash}.webp` : photo.src,
            thumb_path: hash ? `thumb/${hash}.webp` : photo.thumb,
            label: photo.label || null,
            ratio: photo.ratio || null,
            tint: photo.tint || null,
            content_hash: hash,
            original_name: photo.original_name || null,
            original_size: photo.original_size || null,
            taken_at: photo.taken_at || null,
            lat: photo.lat ?? null,
            lng: photo.lng ?? null,
            owner: photo.owner || "bara",
            original_status: photo.original_status || "kept",
            sort_order: photoIndex
          });
        });
      });
    });
  }
}

for (const item of asArray(state.inbox)) {
  const hash = item.content_hash;
  inbox_items.push({
    id: item.id,
    kind: item.kind,
    date: item.date || null,
    time: item.time || null,
    taken_at: item.taken_at || null,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    display_path: hash ? `display/${hash}.webp` : item.src,
    thumb_path: hash ? `thumb/${hash}.webp` : item.thumb,
    label: item.label || null,
    auto_label: item.autoLabel || null,
    ratio: item.ratio || null,
    tint: item.tint || null,
    blur: Boolean(item.blur),
    content_hash: hash,
    original_name: item.original_name || null,
    original_size: item.original_size || null,
    owner: item.owner || "bara",
    original_status: item.original_status || "kept"
  });
}

for (const entry of Object.values(state.photos_index || {})) {
  photo_copies.push({
    content_hash: entry.content_hash,
    owner: entry.owner || null,
    location: "vault",
    status: entry.original_status === "discarded" ? "discarded" : "present",
    path: entry.original_path || null,
    checked_at: state.saved_at || null
  });
}

const requiredHashTables = [
  ["moments", moments],
  ["inbox_items", inbox_items],
  ["photo_copies", photo_copies]
];
const missingHashes = requiredHashTables.flatMap(([table, rows]) => (
  rows.filter((row) => !row.content_hash).map((row) => `${table}:${row.id || row.path || "unknown"}`)
));
if (missingHashes.length) {
  fail(`content_hash missing in ${missingHashes.slice(0, 5).join(", ")}${missingHashes.length > 5 ? " ..." : ""}`);
}

const out = {
  source: recordPath,
  exported_at: new Date().toISOString(),
  counts: {
    trips: trips.length,
    days: days.length,
    spots: spots.length,
    moments: moments.length,
    inbox_items: inbox_items.length,
    photo_copies: photo_copies.length
  },
  tables: { trips, days, spots, moments, inbox_items, photo_copies }
};

await fsp.mkdir(path.dirname(outPath), { recursive: true });
await fsp.writeFile(outPath, JSON.stringify(out, null, 2));

console.log(`Exported ${recordPath}`);
console.log(`Wrote ${outPath}`);
console.log(JSON.stringify(out.counts, null, 2));
