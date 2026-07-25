# Recipient Transfer Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cloud-friendly Supabase adapter contract that lists unexpired original transfers for the active recipient and creates a short-lived download URL only after an explicit recipient action.

**Architecture:** Keep transfer queries and private Storage paths inside `SupabaseAdapter`. Return UI-safe transfer metadata without `tmp_path`, then re-fetch and revalidate destination, status, and expiry before signing a five-minute download URL with the original filename. Defer UI, save confirmation, `photo_copies`, and Storage deletion to later slices.

**Tech Stack:** JavaScript, Supabase JS 2, Vitest 4, existing HeartPin adapter boundary.

## Global Constraints

- Keep the shared Supabase account and logical owners `bara` and `nyong`.
- RLS remains the account-level authorization boundary; `dest_owner` is an application-level recipient rule.
- Never return `tmp_path` from the incoming-transfer list.
- Create signed relay URLs only when `createIncomingTransferDownload` is called.
- Signed relay URLs expire after exactly 300 seconds and request a download using `original_name`.
- Reject unsupported owners, unauthenticated sessions, non-recipient transfers, non-`uploaded` transfers, missing paths, and expired transfers.
- Do not add UI, `photo_copies` writes, status transitions, Storage deletion, expiry jobs, dependencies, or real-device claims.
- Preserve Web/Mobile shell boundaries and the permanent display/thumb behavior.

---

### Task 1: Incoming transfer adapter contract

**Files:**
- Modify: `src/adapters/supabaseAdapter.test.js`
- Modify: `src/adapters/supabaseAdapter.js`

**Interfaces:**
- Consumes: authenticated Supabase session, `owner: "bara" | "nyong"`, `transferId: string`, private `photos` bucket.
- Produces: `listIncomingTransfers(owner)` returning UI-safe transfer metadata and `createIncomingTransferDownload(transferId, owner)` returning `{ transferId, url, filename, mimeType, size, expiresAt }`.

- [x] **Step 1: Extend the Supabase client double and write failing list tests**

Add query support for `maybeSingle()` and assert that `listIncomingTransfers("nyong")`:

```js
await expect(adapter.listIncomingTransfers("nyong")).resolves.toEqual([{
  id: "tr_hash-123",
  contentHash: "hash-123",
  sourceOwner: "bara",
  destinationOwner: "nyong",
  originalName: "gps.jpg",
  originalSize: 3,
  mimeType: "image/jpeg",
  expiresAt: "2026-07-28T01:02:03.000Z",
  createdAt: "2026-07-21T01:02:03.000Z",
}]);
expect(result[0]).not.toHaveProperty("tmpPath");
expect(result[0]).not.toHaveProperty("tmp_path");
```

Cover owner/status filtering, removal of expired rows, invalid owner rejection, and unauthenticated rejection. Freeze time with `vi.setSystemTime("2026-07-21T01:02:03.000Z")`.

- [x] **Step 2: Run the list tests to verify RED**

Run: `npm test -- --run src/adapters/supabaseAdapter.test.js`

Expected: FAIL because `listIncomingTransfers` does not exist.

- [x] **Step 3: Implement the minimal list method**

Add a pure row mapper that omits `tmp_path`, validate the logical owner, require a Supabase session, query only `dest_owner = owner` and `status = uploaded`, order newest first, and filter rows whose parsed `expires_at` is not strictly later than `Date.now()`.

```js
async listIncomingTransfers(owner) {
  relayDestinationFor(owner);
  const sessionResult = await client.auth.getSession();
  const session = assertSupabaseOk(sessionResult, "Supabase 세션 확인 실패")?.session;
  if (!session?.user) throw new Error("Supabase 로그인이 필요해요");
  const rows = assertSupabaseOk(
    await client.from("transfer_queue")
      .select("*")
      .eq("dest_owner", owner)
      .eq("status", "uploaded")
      .order("created_at", { ascending: false }),
    "Supabase 수신 대기 원본 조회 실패",
  ) || [];
  return rows
    .filter((row) => new Date(row.expires_at).getTime() > Date.now())
    .map(incomingTransferFromRow);
}
```

- [x] **Step 4: Run the focused adapter tests to verify GREEN**

Run: `npm test -- --run src/adapters/supabaseAdapter.test.js`

Expected: PASS.

- [x] **Step 5: Write failing download tests**

Assert that `createIncomingTransferDownload("tr_hash-123", "nyong")` re-fetches an `uploaded` row for `nyong` and calls:

```js
storage.createSignedUrl(
  "relay-originals/user-123/tr_hash-123/gps.jpg",
  300,
  { download: "gps.jpg" },
);
```

Expect the returned object to contain the signed URL and safe metadata but no Storage path. Cover invalid owner, unauthenticated session, missing/non-recipient transfer, expired transfer, blank path, and signing failure. Assert no signing call occurs for every rejected row.

- [x] **Step 6: Run the download tests to verify RED**

Run: `npm test -- --run src/adapters/supabaseAdapter.test.js`

Expected: FAIL because `createIncomingTransferDownload` does not exist.

- [x] **Step 7: Implement the minimal download method**

Add `RELAY_SIGNED_URL_SECONDS = 5 * 60`. Require a session, validate `owner`, fetch one `uploaded` transfer by `id` and `dest_owner`, reject missing/expired/pathless data before Storage access, and sign with the original filename.

```js
const signed = assertSupabaseOk(
  await client.storage.from(PHOTOS_BUCKET).createSignedUrl(
    row.tmp_path,
    RELAY_SIGNED_URL_SECONDS,
    { download: row.original_name },
  ),
  "Supabase 원본 다운로드 URL 생성 실패",
);
```

Return `{ transferId, url, filename, mimeType, size, expiresAt }` and omit `tmp_path`.

- [x] **Step 8: Run the focused adapter tests to verify GREEN**

Run: `npm test -- --run src/adapters/supabaseAdapter.test.js`

Expected: PASS.

- [x] **Step 9: Commit the adapter slice**

```bash
git add src/adapters/supabaseAdapter.js src/adapters/supabaseAdapter.test.js
git commit -m "feat: prepare recipient original downloads"
```

---

### Task 2: Documentation and repository verification

**Files:**
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/superpowers/specs/2026-07-17-automatic-original-relay-design.md`
- Modify: `docs/superpowers/plans/2026-07-21-recipient-transfer-download.md`

**Interfaces:**
- Consumes: verified Task 1 behavior.
- Produces: an accurate Phase 3 status and explicit Local-only/user-verification gates.

- [x] **Step 1: Document only the completed recipient-download contract**

Record that the adapter can list unexpired transfers for the active logical recipient and issue a five-minute download URL on demand. Keep the following explicitly unimplemented: Web/Mobile UI, operating-system save confirmation, `photo_copies`, `landed`/`deleted` transitions, relay deletion, and scheduled expiry cleanup.

- [x] **Step 2: Run full verification**

```bash
npm test -- --run
npm run build
git diff --check
```

Expected: all commands exit 0.

- [x] **Step 3: Self-review the complete branch diff**

Run:

```bash
git diff --check main...HEAD
git diff --stat main...HEAD
rg -n "TODO|FIXME|TBD|placeholder|not implemented" src/adapters/supabaseAdapter.js src/adapters/supabaseAdapter.test.js docs/ROADMAP.md README.md docs/superpowers/specs/2026-07-17-automatic-original-relay-design.md docs/superpowers/plans/2026-07-21-recipient-transfer-download.md
```

Confirm that no service-role key, secret, permanent-original path, UI change, or `photo_copies` mutation was added.

- [x] **Step 4: Commit documentation and plan completion**

```bash
git add README.md docs/ROADMAP.md docs/superpowers/specs/2026-07-17-automatic-original-relay-design.md docs/superpowers/plans/2026-07-21-recipient-transfer-download.md
git commit -m "docs: record recipient download contract"
```

- [x] **Step 5: Prepare a draft PR without merging**

Push `feature/recipient-transfer-download` and create a draft PR targeting `main`. Include automated verification results and state that live Supabase, browser download, mobile OS save behavior, and physical-device checks remain Local-only.

## Self-Review

- Spec coverage: this plan implements only recipient listing and signed download preparation from the approved Recipient and Cleanup Flow steps 1-2.
- Deferred scope: save confirmation, `photo_copies`, transfer status mutation, Storage deletion, expiry cleanup, and UI are intentionally left for later independently testable slices.
- Placeholder scan: commands, method names, return fields, failure cases, and verification expectations are explicit.
- Type consistency: both adapter methods consume logical owner strings; returned objects use camelCase and never expose `tmp_path`.
