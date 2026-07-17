# Automatic Original Relay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend prepared Supabase uploads so every recorded photo creates a private seven-day original relay for the opposite HeartPin owner.

**Architecture:** Keep both UI shells behind `api.uploadPhotos`. Update the rerunnable Supabase schema and Storage policies, then extend `SupabaseAdapter.uploadPhotos` to upload the original, persist the inbox and transfer rows in sequence, and compensate the inbox row and relay object when persistence fails.

**Tech Stack:** React 18, Vite 6, Vitest 4, Supabase JS 2, PostgreSQL and Supabase Storage policies.

## Global Constraints

- Shared Supabase account; logical owners are only `bara` and `nyong`.
- Permanent display/thumb; temporary original at `relay-originals/<auth.uid()>/<transfer-id>/<safe-original-name>`.
- `expires_at` is exactly seven days after creation.
- Preserve the legacy `test-originals` spike path.
- No transfer UI, downloads, `photo_copies`, expiry job, duplicate handling, or derivative cleanup.
- Real Supabase, photo, browser, and device checks remain Local-only.

---

### Task 1: Supabase relay contract

**Files:**
- Create: `supabase/schema.test.js`
- Modify: `supabase/schema.sql`

**Interfaces:**
- Consumes: rerunnable `supabase/schema.sql`.
- Produces: explicit transfer owner/original columns and user-scoped `relay-originals` Storage access.

- [x] **Step 1: Write the failing schema contract test**

```js
// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const compactSql = (value) => value.replace(/\s+/g, " ").trim();

function policySql(name) {
  const match = schema.match(new RegExp(`create policy "${name}"[\\s\\S]*?;`));
  expect(match, `missing policy: ${name}`).not.toBeNull();
  return compactSql(match[0]);
}

describe("Phase 3 original relay schema", () => {
  it("defines explicit transfer owners and original metadata", () => {
    expect(schema).toContain("source_owner text not null");
    expect(schema).toContain("dest_owner text not null");
    expect(schema).toContain("original_name text not null");
    expect(schema).not.toContain("dest text not null");
  });

  it("enforces a server-derived seven-day expiry", () => {
    expect(schema).toContain("expires_at timestamptz not null default (now() + interval '7 days')");
    expect(schema).toContain("new.expires_at = new.created_at + interval '7 days';");
    expect(schema).toContain(
      "create trigger set_transfer_queue_expiry before insert or update on public.transfer_queue",
    );
  });

  it("scopes every original Storage policy to the authenticated user and relay depth", () => {
    const scopedOriginalsRule = compactSql(`
      (storage.foldername(name))[2] = (select auth.uid()::text)
      and (
        (storage.foldername(name))[1] = 'test-originals'
        or (
          (storage.foldername(name))[1] = 'relay-originals'
          and array_length(storage.foldername(name), 1) = 3
        )
      )
    `);
    const policies = [
      ["authenticated read photos", 1],
      ["authenticated write photos", 1],
      ["authenticated update photos", 2],
      ["authenticated delete photos", 1],
    ];

    for (const [name, expectedOccurrences] of policies) {
      expect(policySql(name).split(scopedOriginalsRule)).toHaveLength(expectedOccurrences + 1);
    }
  });
});
```

- [x] **Step 2: Verify RED**

Run: `npm test -- --run supabase/schema.test.js`

Expected: FAIL because the schema still uses `dest` and excludes `relay-originals`.

- [x] **Step 3: Implement the schema contract**

Use explicit `source_owner`, `dest_owner`, `tmp_path`, `original_name`, `original_size`, `mime_type`, `status`, and `expires_at` columns. Add idempotent migration statements for existing local projects. Permit both temporary prefixes only when path segment two equals `auth.uid()`.

- [x] **Step 4: Verify GREEN**

Run: `npm test -- --run supabase/schema.test.js`

Expected: PASS with 3 tests.

---

### Task 2: Prepared upload relay and compensation

**Files:**
- Modify: `src/adapters/supabaseAdapter.test.js`
- Modify: `src/adapters/supabaseAdapter.js`

**Interfaces:**
- Consumes: normalized upload item, prepared derivatives/hash, signed-in user, and `owner`.
- Produces: `relayDestinationFor(owner)`, `buildRelayOriginalPath(userId, transferId, item)`, paired `inbox_items` and `transfer_queue` rows.

- [x] **Step 1: Write failing adapter tests**

Extend the upload client double with table-aware insert errors, Storage `remove`, and table delete tracking. Assert a `bara` upload creates `dest_owner: "nyong"`, a `nyong` upload creates `dest_owner: "bara"`, expiry is `2026-07-02T01:02:03.000Z`, and failures remove the temporary object plus the inbox row when applicable.

- [x] **Step 2: Verify RED**

Run: `npm test -- --run src/adapters/supabaseAdapter.test.js`

Expected: FAIL because relay uploads, queue rows, and compensation do not exist.

- [x] **Step 3: Implement minimal relay behavior**

```js
const RELAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function relayDestinationFor(owner) {
  if (owner === "bara") return "nyong";
  if (owner === "nyong") return "bara";
  throw new Error("사진 owner는 bara 또는 nyong이어야 해요");
}

export function buildRelayOriginalPath(userId, transferId, item) {
  return `relay-originals/${userId}/${transferId}/${safeBaseName(item.name || item.file?.name)}.${extensionFor(item)}`;
}
```

For each prepared item, use `tr_<contentHash>` as the transfer ID, upload the original after display/thumb, insert the inbox row, then insert the transfer row. Report progress only after both inserts. Best-effort remove the relay after inbox failure; after transfer failure, also delete the inbox row. Keep `prepareUploadItem: null` unchanged.

- [x] **Step 4: Verify GREEN**

Run: `npm test -- --run src/adapters/supabaseAdapter.test.js`

Expected: PASS including both compensation paths.

---

### Task 3: Documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-17-automatic-original-relay-design.md`
- Modify: `docs/superpowers/plans/2026-07-17-automatic-original-relay.md`

- [x] **Step 1: Document the verified upload path**

Add `photos/relay-originals/<auth.uid()>/<transfer-id>/<safe-original-name>` as seven-day temporary Storage and mark the design implemented pending user verification.

- [x] **Step 2: Run full verification**

```bash
npm test -- --run
npm run build
git diff --check
```

Expected: all commands exit 0.

- [x] **Step 3: Review and commit**

Review the full `main...HEAD` diff, then stage only the README, spec, and plan files because the schema, adapter, and test changes are already committed in Tasks 1 and 2. Preserve the two user-owned untracked files. Commit as `feat: create automatic original relays` with verification in the body.
