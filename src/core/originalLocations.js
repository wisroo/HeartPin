export const ORIGINAL_LOCATION_LABELS = {
  bara_phone: "바라 폰",
  nyong_phone: "뇽이 폰",
  personal_pc: "개인 PC",
  vault: "외장하드",
};

export function summarizeOriginalCopies(rows, owner) {
  const locations = Object.keys(ORIGINAL_LOCATION_LABELS);
  const hashesByLocation = new Map(locations.map((location) => [location, new Set()]));
  const verifiedVault = new Set();
  const verifiedPhone = new Set();
  const phone = owner === "bara" || owner === "nyong" ? `${owner}_phone` : null;

  for (const row of rows) {
    const { content_hash: hash, location, status, checked_at: checkedAt } = row;
    if (!hash || status !== "present" || !hashesByLocation.has(location)) continue;
    hashesByLocation.get(location).add(hash);
    if (checkedAt && location === "vault") verifiedVault.add(hash);
    if (checkedAt && location === phone) verifiedPhone.add(hash);
  }

  return {
    counts: Object.fromEntries(locations.map((location) => [location, hashesByLocation.get(location).size])),
    candidateHashes: [...verifiedPhone].filter((hash) => verifiedVault.has(hash)),
  };
}
