import { expect, it, vi } from "vitest";
import { cleanupRelayRows } from "./functions/relay-cleanup/cleanup.js";

it("claims expired uploads, retries landed and expired rows, and preserves failures", async () => {
  const row = (id, status, path = `relay-originals/user/${id}/original.heic`) => ({
    id, status, user_id: "user", tmp_path: path,
  });
  const rows = [
    row("a", "uploaded"), row("b", "landed"), row("c", "expired"),
    row("d", "uploaded"), row("e", "landed", "display/keep.jpg"),
  ];
  const claim = vi.fn(async ({ id }) => id === "a");
  const remove = vi.fn(async (path) => {
    if (path.includes("/b/")) throw new Error("retry later");
  });
  const finish = vi.fn();
  expect(await cleanupRelayRows(rows, { claim, remove, finish })).toEqual({ cleaned: 2, failed: 2 });
  expect(claim.mock.calls.map(([value]) => value.id)).toEqual(["a", "d"]);
  expect(remove.mock.calls.flat()).toEqual([rows[0].tmp_path, rows[1].tmp_path, rows[2].tmp_path]);
  expect(finish.mock.calls.map(([value, status]) => [value.id, status])).toEqual([["a", "expired"], ["c", "expired"]]);
});

it("retries finalization when Storage already removed the original", async () => {
  const row = { id: "a", user_id: "user", status: "landed", tmp_path: "relay-originals/user/a/original.jpg" };
  const claim = vi.fn();
  const remove = vi.fn();
  const finish = vi.fn().mockRejectedValueOnce(new Error("database unavailable")).mockResolvedValueOnce(undefined);
  const defer = vi.fn();
  const operations = { claim, remove, finish, defer };
  expect(await cleanupRelayRows([row], operations)).toEqual({ cleaned: 0, failed: 1 });
  expect(await cleanupRelayRows([row], operations)).toEqual({ cleaned: 1, failed: 0 });
  expect(defer).toHaveBeenCalledWith(row, "landed");
  expect(remove).toHaveBeenCalledTimes(2);
  expect(claim).not.toHaveBeenCalled();
});
