const missing = () => {
  throw new Error("SupabaseAdapter는 아직 계정 설정 전이에요. Supabase URL/key를 만든 뒤 이 파일에 실제 구현을 연결합니다.");
};

export const supabaseAdapter = {
  fetchState: missing,
  uploadPhotos: missing,
  placePhotos: missing,
  addTrip: missing,
  editTrip: missing,
  editSpot: missing,
  inboxKeep: missing,
  inboxDiscard: missing,
  inboxPurge: missing
};
