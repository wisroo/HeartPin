import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

it("serves an offline page for the app entry without intercepting data or photo requests", async () => {
  const handlers = {};
  const fetch = vi.fn().mockRejectedValue(new Error("offline"));
  const offlinePage = {};
  const caches = {
    open: vi.fn(async () => ({ add: vi.fn() })),
    match: vi.fn(async () => offlinePage),
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { location: { origin: "https://heartpin.test" }, addEventListener: (name, fn) => { handlers[name] = fn; } },
    URL, fetch, caches,
  });
  const respondWith = vi.fn();
  for (const path of ["/api/state", "/photos/private.jpg", "/?token=secret"]) {
    handlers.fetch({ request: { url: "https://heartpin.test" + path, mode: "navigate", method: "GET" }, respondWith });
  }
  expect(respondWith).not.toHaveBeenCalled();
  handlers.fetch({ request: { url: "https://heartpin.test/", mode: "navigate", method: "GET" }, respondWith });
  expect(await respondWith.mock.calls[0][0]).toBe(offlinePage);
  expect(caches.match).toHaveBeenCalledWith("/offline.html", { cacheName: "heartpin-offline-v1" });
});
