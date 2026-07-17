# Phase 3 Automatic Original Relay Design

Date: 2026-07-17
Status: Implemented, awaiting user verification

## Goal

When either `bara` or `nyong` records a photo, HeartPin permanently stores only the existing display and thumb derivatives, while also placing the original in private Supabase Storage for the other person to receive. The implemented upload slice creates that temporary relay with a server-enforced seven-day expiry. Successful recipient save, relay deletion, and scheduled expiry cleanup remain follow-up slices.

This moves the original-relay path ahead of the remaining Phase 1B external-drive and real-device validation work. Those deferred items remain valid but do not block this Phase 3 slice.

## Fixed Product Decisions

- Keep one shared Supabase authenticated account.
- Continue using `bara` and `nyong` as device-local logical identities.
- Every new recorded photo creates one transfer from its owner to the opposite identity.
- Store display and thumb derivatives permanently; store the original only under a temporary private relay prefix.
- Record recipient save in `photo_copies`, then delete the temporary original.
- Expire unclaimed originals after seven days without deleting the record or its derivatives.
- Web/PWA receives the original as a file download. Native camera-roll save remains a Phase 4 extension.

Because both people share one authenticated account, Supabase RLS protects the couple's data from other accounts but cannot distinguish `bara` from `nyong`. Source and destination checks are therefore application-level product rules, not an authorization boundary.

## Considered Approaches

### 1. Integrated upload and relay creation — selected

Extend the prepared `SupabaseAdapter.uploadPhotos` path so one upload operation creates the permanent derivatives, inbox record, temporary original, and transfer row. This reuses the bytes already read for hashing and compression, avoids asking the owner to locate the same file again, and gives the recipient a predictable queue entry.

The trade-off is that Storage and Postgres cannot be updated in one transaction. The adapter must compensate the inbox row and temporary original when queue persistence fails, then report the upload as failed. Existing orphaned derivative cleanup remains a separate known hardening item.

### 2. Request-based relay

Create a queue only when the recipient taps "원본 받기", then ask the owner to upload the original later. This minimizes temporary Storage use but contradicts the selected automatic-transfer behavior and can fail when the owner no longer has the file readily available.

### 3. Background or Edge Function orchestration

Upload first and let a worker create transfer state, retry, and clean up. This offers stronger operational control, but it adds deployment, scheduling, and observability work before the basic two-person flow is proven. It is deferred unless client-side retry and expiry cleanup become unreliable in practice.

## Architecture and Boundaries

The existing shell boundaries remain unchanged.

- `src/adapters/supabaseAdapter.js` owns Supabase Storage and table operations.
- `src/adapters/supabaseUploadPrep.js` continues to produce the content hash, original bytes metadata, and display/thumb derivatives.
- `src/api.js` remains the shell-facing adapter seam.
- Web and Mobile upload shells continue to call `api.uploadPhotos`; they do not construct Storage paths or transfer rows.
- Recipient download and confirmation will be exposed later as narrow adapter methods instead of direct Supabase calls from UI components.

No new dependency or server component is required for the first implementation slice.

## Data Contract

`transfer_queue` should identify both logical identities and carry enough metadata to download the original without looking up a local file:

```text
id
user_id            authenticated shared-account user
content_hash
source_owner       bara | nyong
dest_owner         bara | nyong, must differ from source_owner
tmp_path           private Storage object path
original_name
original_size
mime_type
status             uploaded | landed | deleted | failed
expires_at         server-owned created_at + 7 days
created_at         server-owned insertion time
updated_at
```

Fresh tables require `user_id` as a foreign key to `auth.users(id)`, and transfer RLS permits rows only when `user_id = auth.uid()`. Existing-table migration first refuses unsupported legacy `dest` values instead of silently mapping or deleting them. If legacy rows need a `user_id`, migration requires exactly one `auth.users` row and backfills that fixed shared account; an existing empty table receives rerunnable `NOT VALID` not-null and foreign-key constraints so future writes are enforced without requiring a legacy backfill.

For legacy status conversion, only `queued` rows with a non-empty `tmp_path` become `uploaded`. A `queued` or `uploaded` row without a usable path becomes `failed`, and a rerunnable check prevents future pathless `uploaded` rows. Valid `bara`/`nyong` destinations still backfill `dest_owner`, the opposite source is derived, and then the legacy `dest` column is removed. Every schema statement must tolerate repeated local Supabase setup.

The expiry trigger owns retention timestamps: inserts overwrite any client `created_at` with database `now()` and derive `expires_at` from it; updates preserve both stored values regardless of the payload. Source-contract tests cover these rules, but runtime migration and live RLS behavior remain Local-only verification gates.

`photo_copies` keeps its current unique identity `(content_hash, location, owner)` and uses `status = 'present'` after the recipient confirms a successful save. Initial recipient locations are `bara_phone`, `nyong_phone`, and `personal_pc`. The first implementation slice does not write `photo_copies`; it only creates the transfer.

Temporary originals use a distinct private prefix inside the private `photos` bucket:

```text
photos/relay-originals/<auth.uid()>/<transfer-id>/<safe-original-name>
```

The legacy `test-originals` prefix remains available only for the completed upload spike until a separate cleanup change removes it.

## Upload Data Flow

For each prepared item:

1. Validate `owner` and derive the opposite `dest_owner`.
2. Prepare the SHA-256 hash, original metadata, display WebP, and thumb WebP once.
3. Upload display and thumb to their permanent hash paths.
4. Upload original bytes to the private `relay-originals` path.
5. Insert the normal `inbox_items` row.
6. Insert an `uploaded` `transfer_queue` row scoped to the authenticated `user_id`; the database owns its creation time and seven-day expiry.
7. Return the same upload result shape currently consumed by Web and Mobile shells.

If the temporary-original upload fails, do not create the inbox or transfer rows. If the inbox insert fails, best-effort delete the temporary original. If the transfer insert fails after the inbox insert, best-effort delete both the inbox row and temporary original, then surface an upload error. Permanent derivative cleanup remains the already-documented orphan cleanup follow-up; this slice must not silently report success without a transfer row.

Progress remains item-based so existing screens continue to work. A photo reaches 100% only after both database records are persisted.

## Recipient and Cleanup Flow

These are follow-up slices, not part of the first implementation:

1. List `uploaded` transfers whose `dest_owner` matches the active device identity.
2. Create a short-lived signed URL only when the recipient initiates download.
3. After explicit save confirmation, upsert a `photo_copies` row with `status = 'present'`.
4. Mark the transfer `landed`, delete the temporary Storage object, then mark it `deleted`.
5. An expiry cleanup path deletes objects past `expires_at` while preserving `inbox_items`, moments, display, and thumb data.

If download or save fails, the transfer stays `uploaded` and can be retried until expiry. A deletion failure must remain visible as cleanup work rather than falsely marking the transfer deleted.

## Implemented Relay-Creation Slice

The implemented code change is intentionally limited to automatic relay creation during prepared Supabase uploads:

- update the idempotent Supabase schema and Storage policies for `relay-originals`;
- add pure helpers for destination and relay-path construction;
- upload original bytes alongside display/thumb derivatives;
- persist the paired `transfer_queue` row with a seven-day expiry;
- compensate by removing the inbox row and temporary original when queue persistence fails;
- add adapter tests for the happy path, opposite-recipient mapping, expiry, and both persistence-failure cleanup paths.

Out of scope for that slice: transfer UI, signed recipient download, `photo_copies` confirmation, scheduled expiry cleanup, duplicate-upload UX, permanent derivative cleanup, external-drive work, and real-device validation. The implementation is therefore awaiting user verification in a configured Supabase project and on target devices; the automated checks below do not replace that work.

## Verification

Cloud-friendly verification:

```bash
npm test -- --run
npm run build
git diff --check
```

The adapter tests will use mocked Supabase table and Storage clients. They must prove that the original goes only to `relay-originals`, the transfer goes to the opposite identity, expiry is seven days, and queue failure removes the inbox row and temporary object.

Local-only verification after later recipient slices:

- upload real JPEG/HEIC originals from both identities using a configured `.env.local`;
- confirm private Storage and RLS behavior in the couple's Supabase project;
- download on mobile Safari/PWA and confirm the operating-system save behavior;
- validate Capacitor camera-roll save separately in Phase 4.

No automated run may claim these device, credential, or browser-permission checks were completed.

## Privacy and Operational Risks

- Originals temporarily exist in the couple-owned cloud, so Storage remains private and signed URLs must be short-lived.
- The seven-day value is a deletion deadline, not a backup promise.
- Shared authentication means a technically capable person using the shared session can inspect both logical queues.
- Client interruption can leave temporary originals or derivatives orphaned; visible queue status and expiry cleanup are required before the flow is considered operationally complete.
- Service-role keys and other secrets must never be shipped to the client or documentation examples.
