/* HeartPin · StorageAdapter 시임 (D4)
 * 화면 코드는 이 모듈만 호출한다. Phase 0은 localAdapter, Phase 1은 supabaseAdapter.
 */
import { localAdapter } from "./adapters/localAdapter.js";
import { supabaseAdapter } from "./adapters/supabaseAdapter.js";

const API_MODE = import.meta.env.VITE_HEARTPIN_API_MODE || "local";

const adapter = API_MODE === "supabase" ? supabaseAdapter : localAdapter;

export function getApiMode() {
  return API_MODE;
}

export function signInToSupabase(email, password) {
  if (API_MODE !== "supabase" || !adapter.signIn) {
    throw new Error("Supabase 모드에서만 로그인할 수 있어요.");
  }
  return adapter.signIn(email, password);
}

// 기록 전체 조회 — since(버전)와 같으면 {unchanged:true}
export async function fetchState(since) {
  return adapter.fetchState(since);
}

// 사진 업로드 — onProgress(0~1)는 업로드 바이트 기준
export function uploadPhotos(files, owner, onProgress) {
  return adapter.uploadPhotos(files, owner, onProgress);
}

export const opPlacePhotos = (rows) => adapter.placePhotos(rows);
export const opAddTrip = (trip) => adapter.addTrip(trip);
export const opEditTrip = (tripId, text) => adapter.editTrip(tripId, text);
export const opEditSpot = (spotId, field, text) => adapter.editSpot(spotId, field, text);
export const opInboxKeep = (id) => adapter.inboxKeep(id);
export const opInboxDiscard = (ids) => adapter.inboxDiscard(ids);
export const opInboxPurge = (ids) => adapter.inboxPurge(ids); // 완전 삭제 (원본·압축본·원장까지)

// ── owner (바라/뇽이) — 기기에 기억 (런치 화면 첫 1회 선택) ──
export function getOwner() {
  const v = localStorage.getItem("hp-owner");
  return v === "bara" || v === "nyong" ? v : null;
}
export function setOwner(who) { localStorage.setItem("hp-owner", who); }

// ── D+N — 기념일 설정값 기준 자동 계산 (2024-06-29 = D+1) ──
export const ANNIVERSARY = "2024-06-29";
export function dplus(now = new Date()) {
  const a = new Date(ANNIVERSARY + "T00:00:00");
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((t - a) / 86400000) + 1;
}
