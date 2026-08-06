# Recipient Save Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist an explicitly located recipient copy, transition its relay through `landed`, delete only the temporary original, and mark the transfer `deleted` only after deletion succeeds.

**Architecture:** Keep table and private Storage operations inside `SupabaseAdapter`, expose one matching `src/api.js` operation, and preserve the existing shared-account logical-owner model. Add an exact recipient-copy unique index so Supabase upsert can make save confirmation idempotent, while `landed` remains the durable retry state between copy acknowledgement and relay deletion.

**Tech Stack:** JavaScript, Vite 6, Vitest 4, Supabase JS 2, PostgreSQL schema source contracts.

## Global Constraints

- The caller must explicitly pass `bara_phone`, `nyong_phone`, or `personal_pc`.
- `bara_phone` is valid only for owner `bara`; `nyong_phone` is valid only for owner `nyong`; `personal_pc` is valid for either owner.
- Keep the shared Supabase account and logical owners `bara` and `nyong`.
- Delete only `transfer_queue.tmp_path`; never delete permanent display/thumb derivatives or record rows.
- Mark a transfer `deleted` only after Storage removal succeeds; failures stay `landed` for retry.
- Do not add Web/Mobile UI, scheduled cleanup, dependencies, secrets, or permanent original retention.
- Live Supabase, browser save, operating-system save, and physical-device checks remain Local-only.

---

### Task 1: Recipient-copy upsert identity

**Files:**
- Modify: `supabase/schema.test.js`
- Modify: `supabase/schema.sql`

**Interfaces:**
- Consumes: existing `photo_copies(content_hash, owner, location, ...)` schema.
- Produces: rerunnable exact unique index `photo_copies_unique_owner_location` on `(content_hash, location, owner)` for `upsert(..., { onConflict: "content_hash,location,owner" })`.

- [ ] **Step 1: Write the failing schema source-contract test**

Add to the existing schema contract suite:

```js
expect(sql).toContain(compactSql(`
  create unique index if not exists photo_copies_unique_owner_location
  on public.photo_copies (content_hash, location, owner);
`));
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `npm test -- --run supabase/schema.test.js`

Expected: FAIL because `photo_copies_unique_owner_location` is absent.

- [ ] **Step 3: Add the rerunnable exact index**

Immediately after the existing expression index in `supabase/schema.sql`, add:

```sql
create unique index if not exists photo_copies_unique_owner_location
on public.photo_copies (content_hash, location, owner);
```

Keep `photo_copies_unique_location` unchanged so nullable shared-owner rows retain their existing uniqueness behavior.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `npm test -- --run supabase/schema.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the schema slice**

```bash
git add supabase/schema.sql supabase/schema.test.js
git commit -m "feat: support recipient copy upserts"
```

---

### Task 2: Supabase save-confirmation state machine

**Files:**
- Modify: `src/adapters/supabaseAdapter.test.js`
- Modify: `src/adapters/supabaseAdapter.js`

**Interfaces:**
- Consumes: `transfer_queue` rows with `uploaded | landed | deleted | failed`, private `photos` Storage, and the exact Task 1 upsert conflict target.
- Produces: `confirmIncomingTransferSaved(transferId, owner, location) -> Promise<{ transferId, status: "deleted", location }>` on both adapter factory and lazy default adapter.

- [ ] **Step 1: Extend the fetch-client double for ordered mutations**

Extend `makeFetchClient` with configurable `upsertErrors`, `updateErrors`, and `removeError`, plus `upserts`, `updates`, `removes`, and `operations` spies. The mutation methods must return Supabase-shaped `{ data, error }` promises. Record these operation labels in call order:

```js
{ type: "upsert", table: "photo_copies", payload, options }
{ type: "update", table: "transfer_queue", payload }
{ type: "remove", paths }
```

The Storage double must expose both `createSignedUrl` and:

```js
const remove = vi.fn((paths) => Promise.resolve({
  data: null,
  error: removeError,
}));
```

- [ ] **Step 2: Write failing happy-path and retry tests**

Freeze time at `2026-07-21T01:02:03.000Z` and assert:

```js
await expect(
  adapter.confirmIncomingTransferSaved("tr_hash-123", "nyong", "nyong_phone"),
).resolves.toEqual({
  transferId: "tr_hash-123",
  status: "deleted",
  location: "nyong_phone",
});
```

Assert the upsert is:

```js
expect(client.spies.upserts).toContainEqual({
  table: "photo_copies",
  payload: {
    content_hash: "hash-123",
    owner: "nyong",
    location: "nyong_phone",
    status: "present",
    path: null,
    checked_at: "2026-07-21T01:02:03.000Z",
  },
  options: { onConflict: "content_hash,location,owner" },
});
```

Assert operation order is `upsert photo_copies`, `update landed`, `remove tmp_path`, `update deleted`, and that the only removed path is `relay-originals/user-123/tr_hash-123/gps.jpg`.

Add separate tests that `personal_pc` succeeds, a `landed` row skips the copy upsert and retries remove/update, and a `deleted` row returns success without any mutation or Storage call.

- [ ] **Step 3: Write failing validation and failure-path tests**

Assert all of these reject before unintended mutations:

```text
owner=shared                         -> 사진 owner는 bara 또는 nyong이어야 해요
owner=nyong, location=bara_phone    -> 원본 저장 위치가 수령자와 맞지 않아요
location=external_drive             -> 지원하지 않는 원본 저장 위치예요
missing session                     -> Supabase 로그인이 필요해요
missing/wrong recipient/failed row  -> 확인할 수 있는 원본 전송을 찾지 못했어요
expired uploaded row                -> 원본 전송이 만료되었어요
blank tmp_path                      -> 원본 전송 경로가 없어요
```

Add one test per mutation failure:

```text
photo_copies upsert -> transfer stays uploaded; no remove
landed update       -> no remove
Storage remove      -> no deleted update
deleted update      -> error surfaced after remove; row is not falsely reported deleted
```

Use distinct Supabase errors and assert the Korean operation prefix so the failing step is visible.

- [ ] **Step 4: Run the focused adapter tests to verify RED**

Run: `npm test -- --run src/adapters/supabaseAdapter.test.js`

Expected: FAIL because `confirmIncomingTransferSaved` and save-location validation do not exist.

- [ ] **Step 5: Implement save-location validation**

Add a pure exported helper near `relayDestinationFor`:

```js
const RECIPIENT_SAVE_LOCATIONS = new Set(["bara_phone", "nyong_phone", "personal_pc"]);

export function recipientSaveLocationFor(owner, location) {
  relayDestinationFor(owner);
  if (!RECIPIENT_SAVE_LOCATIONS.has(location)) {
    throw new Error("지원하지 않는 원본 저장 위치예요");
  }
  const expectedPhone = owner === "bara" ? "bara_phone" : "nyong_phone";
  if (location !== "personal_pc" && location !== expectedPhone) {
    throw new Error("원본 저장 위치가 수령자와 맞지 않아요");
  }
  return location;
}
```

- [ ] **Step 6: Implement the adapter state machine**

Add `confirmIncomingTransferSaved` after signed-download creation. Validate location before session lookup, fetch by transfer id and destination owner, validate status in JavaScript, and implement:

```js
if (row.status === "deleted") {
  return { transferId: row.id, status: "deleted", location: confirmedLocation };
}
if (!row.tmp_path?.trim()) throw new Error("원본 전송 경로가 없어요");

if (row.status === "uploaded") {
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    throw new Error("원본 전송이 만료되었어요");
  }
  assertSupabaseOk(
    await client.from("photo_copies").upsert({
      content_hash: row.content_hash,
      owner,
      location: confirmedLocation,
      status: "present",
      path: null,
      checked_at: new Date().toISOString(),
    }, { onConflict: "content_hash,location,owner" }),
    "Supabase 원본 사본 기록 실패",
  );
  await updateById(
    client,
    "transfer_queue",
    row.id,
    { status: "landed" },
    "Supabase 원본 전송 도착 기록 실패",
  );
}

assertSupabaseOk(
  await client.storage.from(PHOTOS_BUCKET).remove([row.tmp_path]),
  "Supabase 임시 원본 삭제 실패",
);
await updateById(
  client,
  "transfer_queue",
  row.id,
  { status: "deleted" },
  "Supabase 원본 전송 삭제 기록 실패",
);
return { transferId: row.id, status: "deleted", location: confirmedLocation };
```

Expose the same method on the lazy `supabaseAdapter`. Do not add best-effort catches; each failed durable step must remain observable.

- [ ] **Step 7: Run focused adapter tests to verify GREEN**

Run: `npm test -- --run src/adapters/supabaseAdapter.test.js`

Expected: PASS.

- [ ] **Step 8: Commit the adapter slice**

```bash
git add src/adapters/supabaseAdapter.js src/adapters/supabaseAdapter.test.js
git commit -m "feat: confirm recipient original saves"
```

---

### Task 3: Shared API seam and Phase status

**Files:**
- Modify: `src/api.test.js`
- Modify: `src/api.js`
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/superpowers/specs/2026-07-17-automatic-original-relay-design.md`
- Modify: `docs/superpowers/plans/2026-08-06-recipient-save-confirmation.md`

**Interfaces:**
- Consumes: Task 2 lazy adapter method.
- Produces: shell-facing `confirmIncomingTransferSaved(transferId, owner, location)` with an explicit local-mode error and accurate Phase 3-3 documentation.

- [ ] **Step 1: Write failing shared API tests**

Extend the hoisted Supabase double with `upsert`, `update`, and Storage `remove` support, then assert:

```js
await expect(
  api.confirmIncomingTransferSaved("tr_hash-123", "nyong", "nyong_phone"),
).resolves.toEqual({
  transferId: "tr_hash-123",
  status: "deleted",
  location: "nyong_phone",
});
```

In local mode assert:

```js
expect(() => api.confirmIncomingTransferSaved(
  "tr_hash-123",
  "nyong",
  "nyong_phone",
)).toThrow("Supabase 모드에서만 원본 전송 저장을 확인할 수 있어요.");
```

- [ ] **Step 2: Run the focused API tests to verify RED**

Run: `npm test -- --run src/api.test.js`

Expected: FAIL because the shared API function is absent.

- [ ] **Step 3: Implement the shared API guard and forward**

Add:

```js
export function confirmIncomingTransferSaved(transferId, owner, location) {
  if (API_MODE !== "supabase" || !adapter.confirmIncomingTransferSaved) {
    throw new Error("Supabase 모드에서만 원본 전송 저장을 확인할 수 있어요.");
  }
  return adapter.confirmIncomingTransferSaved(transferId, owner, location);
}
```

- [ ] **Step 4: Run the focused API tests to verify GREEN**

Run: `npm test -- --run src/api.test.js`

Expected: PASS.

- [ ] **Step 5: Update only completed-scope documentation**

Record that Phase 3-3 now has an adapter/API contract for explicit recipient location, `photo_copies` persistence, `landed`, relay deletion, and `deleted`. Keep UI, real save verification, live Supabase migration/RLS/Storage, physical-device behavior, and Phase 3-4 scheduled cleanup explicitly outstanding.

- [ ] **Step 6: Run full repository verification**

```bash
npm test -- --run
npm run build
git diff --check
git diff --check origin/main...HEAD
```

Expected: 0 failures and no whitespace errors.

- [ ] **Step 7: Self-review the complete branch diff**

Run:

```bash
git status --short --branch
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
rg -n "service_role|SUPABASE_SERVICE|relay-originals|display/|thumb/" src supabase README.md docs/ROADMAP.md docs/superpowers
```

Confirm every removed Storage path comes from the validated transfer `tmp_path`, no secret was added, no original retention became permanent, and no UI/device success is claimed.

- [ ] **Step 8: Mark this plan complete and commit documentation**

Check completed steps in this plan, then:

```bash
git add src/api.js src/api.test.js README.md docs/ROADMAP.md docs/superpowers/specs/2026-07-17-automatic-original-relay-design.md docs/superpowers/plans/2026-08-06-recipient-save-confirmation.md
git commit -m "docs: record recipient save confirmation"
```

- [ ] **Step 9: Prepare a draft PR without merging**

Push `feature/recipient-save-confirmation` and open a draft PR targeting `main`. Include automated verification results and Local-only limitations. Add `codex` and `codex-automation` labels only if they exist. Never merge automatically.

## Self-Review

- Spec coverage: Tasks 1-3 cover explicit location validation, idempotent copy persistence, `uploaded -> landed -> deleted`, failure visibility, lazy/shared API seams, tests, and documentation.
- Placeholder scan: every mutation, failure expectation, command, file, signature, and return field is explicit; no implementation placeholder remains.
- Type consistency: all layers use `confirmIncomingTransferSaved(transferId, owner, location)` and return `{ transferId, status: "deleted", location }`.
- Scope check: UI, scheduled cleanup, Local-only verification, external-drive work, and unrelated upload hardening remain excluded.
