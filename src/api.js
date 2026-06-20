/* HeartPin · StorageAdapter 시임 (D4)
 * 모든 서버 통신은 이 모듈만 거친다 — Phase 1에서 이 구현을 SupabaseAdapter로 교체.
 * 현재 구현: LocalServerAdapter (Phase 0 — 로컬 Express 서버, D12)
 */

async function json(res) {
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json();
}

// 기록 전체 조회 — since(버전)와 같으면 {unchanged:true}
export async function fetchState(since) {
  const q = since != null ? `?since=${since}` : "";
  return json(await fetch(`/api/state${q}`));
}

// 사진 업로드 (multipart) — onProgress(0~1)는 업로드 바이트 기준
export function uploadPhotos(files, owner, onProgress) {
  const fd = new FormData();
  const lm = [];
  [...files].forEach((f) => { fd.append("photos", f, f.name); lm.push(f.lastModified || null); });
  fd.append("owner", owner);
  fd.append("lastModified", JSON.stringify(lm));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos");
    xhr.upload.onprogress = (e) => { if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(`업로드 실패 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("업로드 실패 — 서버에 연결할 수 없어요"));
    xhr.send(fd);
  });
}

// 기록 변이 — 서버가 직렬화·영속화하고 새 state를 돌려줌
async function op(body) {
  const r = await json(await fetch("/api/ops", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  }));
  return r.state;
}
export const opPlacePhotos = (rows) => op({ op: "placePhotos", rows });
export const opAddTrip = (trip) => op({ op: "addTrip", trip });
export const opEditTrip = (tripId, text) => op({ op: "editTrip", tripId, field: "title", text });
export const opEditSpot = (spotId, field, text) => op({ op: "editSpot", spotId, field, text });
export const opInboxKeep = (id) => op({ op: "inboxKeep", id });
export const opInboxDiscard = (ids) => op({ op: "inboxDiscard", ids });
export const opInboxPurge = (ids) => op({ op: "inboxPurge", ids }); // 완전 삭제 (원본·압축본·원장까지)

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
