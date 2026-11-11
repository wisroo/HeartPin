export async function cleanupRelayRows(rows, { claim, remove, finish, defer }) {
  let cleaned = 0;
  let failed = 0;

  for (const row of rows) {
    let status = row.status;
    if (!["uploaded", "expired", "landed"].includes(status)) continue;
    try {
      const path = row.tmp_path;
      const parts = typeof path === "string" ? path.split("/") : [];
      if (
        parts.length !== 4 || path !== path.trim()
        || parts[0] !== "relay-originals" || !row.user_id || parts[1] !== row.user_id
        || !row.id || parts[2] !== row.id || !parts[3]
        || parts.some((part) => part === "." || part === ".." || part.includes("\\"))
      ) throw new Error("Invalid relay path");

      if (status === "uploaded") {
        if (!await claim(row)) continue;
        status = "expired";
      }
      await remove(path);
      await finish(row, status);
      cleaned += 1;
    } catch {
      failed += 1;
      await defer?.(row, status);
    }
  }
  return { cleaned, failed };
}
