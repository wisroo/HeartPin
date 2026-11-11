import { expect, it } from "vitest";
import { summarizeOriginalCopies } from "./originalLocations.js";

it("counts distinct originals per location and requires a confirmed vault copy for the active phone", () => {
  const copy = (content_hash, location, status = "present") => ({ content_hash, location, status, checked_at: "2026-11-11" });
  const rows = [
    copy("a", "bara_phone"), copy("a", "vault"), copy("a", "vault"),
    copy("b", "bara_phone"), copy("b", "vault", "missing"),
    copy("c", "bara_phone"), copy("c", "personal_pc"),
    copy("d", "nyong_phone"), copy("d", "vault"),
    copy("e", "bara_phone"), { ...copy("e", "vault"), checked_at: null },
  ];
  expect(summarizeOriginalCopies(rows, "bara")).toEqual({
    counts: { bara_phone: 4, nyong_phone: 1, personal_pc: 1, vault: 3 },
    candidateHashes: ["a"],
  });
  expect(summarizeOriginalCopies(rows, "nyong").candidateHashes).toEqual(["d"]);
  expect(summarizeOriginalCopies(rows, null).candidateHashes).toEqual([]);
});
