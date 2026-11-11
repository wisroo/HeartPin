import { expect, it } from "vitest";
import { isOriginalArrivalAction } from "./originalArrival.js";

it("routes only a default tap on an original-arrival notification", () => {
  const notification = { data: { type: "original_arrival" } };
  expect(isOriginalArrivalAction({ actionId: "tap", notification })).toBe(true);
  expect(isOriginalArrivalAction({ actionId: "dismiss", notification })).toBe(false);
  expect(isOriginalArrivalAction({ actionId: "tap", notification: { data: { type: "other" } } })).toBe(false);
});
