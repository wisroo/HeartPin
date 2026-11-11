import { expect, it } from "vitest";
import { ORIGINAL_ARRIVAL_DATA, shouldSendOriginalArrival } from "./functions/original-arrival-push/delivery.js";

it("only delivers unexpired arrivals to the recorded recipient in the same account", () => {
  const transfer = { status: "uploaded", expires_at: "2026-11-12T00:00:00Z", user_id: "same", dest_owner: "nyong" };
  const device = { user_id: "same", owner: "nyong" };
  const now = Date.parse("2026-11-11T00:00:00Z");
  expect(shouldSendOriginalArrival(transfer, device, now)).toBe(true);
  expect(shouldSendOriginalArrival(transfer, { ...device, user_id: "other" }, now)).toBe(false);
  expect(shouldSendOriginalArrival(transfer, { ...device, owner: "bara" }, now)).toBe(false);
  expect(shouldSendOriginalArrival({ ...transfer, status: "landed" }, device, now)).toBe(false);
  expect(shouldSendOriginalArrival(transfer, device, Date.parse(transfer.expires_at))).toBe(false);
  expect(ORIGINAL_ARRIVAL_DATA).toEqual({ type: "original_arrival" });
});
