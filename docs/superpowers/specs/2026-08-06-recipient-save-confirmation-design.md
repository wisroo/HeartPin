# Phase 3 Recipient Save Confirmation Design

Date: 2026-08-06
Status: Implemented, awaiting user and Local-only verification

## Goal

After a recipient has explicitly confirmed that an original was saved, HeartPin records the recipient copy, advances the transfer through a durable `landed` state, deletes only the temporary relay original, and marks the transfer `deleted` only after Storage deletion succeeds.

This is an adapter-first Cloud-friendly Phase 3-3 slice. It does not claim that a browser, operating system, or physical device actually saved a file.

## Fixed Product Decisions

- The caller supplies the save location explicitly; HeartPin does not infer every save as a phone copy.
- Supported locations are `bara_phone`, `nyong_phone`, and `personal_pc`.
- `bara_phone` is valid only for recipient owner `bara`; `nyong_phone` is valid only for recipient owner `nyong`; `personal_pc` is valid for either recipient.
- The existing shared Supabase account and logical owners `bara` and `nyong` remain unchanged.
- A confirmed copy uses `photo_copies.status = 'present'`, the destination owner, a null path, and the confirmation time in `checked_at`.
- The temporary relay object is the only Storage object deleted. Permanent display/thumb derivatives and record rows remain untouched.

## Public Contract

Expose one new shared operation:

```text
confirmIncomingTransferSaved(transferId, owner, location)
```

The Supabase adapter and `src/api.js` share this signature. A successful call returns:

```text
{
  transferId,
  status: "deleted",
  location
}
```

Local mode rejects the operation with the same Supabase-only product boundary used by recipient listing and signed-download creation.

## Persistence Contract

`photo_copies` already has the logical identity `(content_hash, location, owner)`, but its existing unique index uses `coalesce(owner, 'shared')`. Supabase upsert conflict targets cannot name that expression. Add a rerunnable exact unique index on `(content_hash, location, owner)` so recipient copies with non-null owners can be upserted safely while preserving the existing shared-owner uniqueness behavior.

The copy upsert writes:

```text
content_hash = transfer.content_hash
owner        = transfer.dest_owner
location     = explicit validated location
status       = present
path         = null
checked_at   = current ISO timestamp
```

`transfer_queue.landed_location` stores the same explicit location when the transfer first becomes `landed`. This nullable, constrained column lets cleanup and idempotent retries verify that they refer to the original confirmation rather than accepting a different location after the copy was recorded.

## State and Cleanup Flow

1. Validate `owner`, `location`, and the owner/location combination before any mutation.
2. Require an authenticated Supabase session.
3. Call a security-invoker PostgreSQL function that selects the authenticated recipient transfer `for update`. Accept only `uploaded`, `landed`, or `deleted`.
4. If the transfer is already `landed` or `deleted`, require its stored `landed_location` to match the requested location.
5. If the transfer is already `deleted`, return the successful result without another mutation or Storage call.
6. If the transfer is `uploaded`, reject it when expired or when its exact relay path is invalid, then atomically upsert the recipient copy and change the transfer to `landed` with `landed_location`.
7. If the transfer is already `landed`, treat it as a retry after a prior confirmation and continue cleanup without writing a second copy.
8. Require `tmp_path` to be exactly `relay-originals/<auth user>/<transfer id>/<filename>`, then delete it from the private `photos` bucket.
9. Only after Storage deletion succeeds, conditionally change the matching `landed` row and location to `deleted`; require a returned row before reporting success.

This ordering intentionally separates the durable save acknowledgement from cloud cleanup. The browser or device remains responsible for telling HeartPin that the save succeeded; the adapter cannot independently prove operating-system persistence.

The schema refuses to continue when pre-existing `landed` or `deleted` rows have no `landed_location`. Because their physical destination cannot be inferred safely, live migration requires an operator to verify and backfill those rows first.

## Error and Retry Behavior

- Unsupported owners, locations, and mismatched phone locations fail before authentication or mutation.
- Missing, wrong-recipient, or unsupported-state transfers fail without writing `photo_copies` or deleting Storage.
- Blank, malformed, other-user, or other-transfer relay paths fail before copy persistence or deletion.
- `landed` or `deleted` retries with a different explicit location fail without cleanup or mutation.
- An expired `uploaded` transfer fails before copy persistence. A `landed` retry remains eligible for cleanup because its copy was already acknowledged before expiry.
- Copy-upsert or `landed` failure rolls back the same DB transaction and leaves the relay object intact.
- Storage deletion failure leaves the transfer `landed`; it must never be reported as `deleted`.
- Failure to mark `deleted` after object removal also leaves the row `landed`. A later retry or Phase 3-4 cleanup may repeat the idempotent remove and complete the transition.

## Test Strategy

Mocked adapter tests cover:

- successful `bara_phone`, `nyong_phone`, and `personal_pc` confirmations;
- RPC claim before Storage removal and a conditional `landed`/location transition before reporting `deleted`;
- rejected owner/location combinations, missing sessions, wrong recipients, expired uploads, blank paths, and unsupported statuses;
- atomic copy/`landed` RPC, Storage removal, and final conditional `deleted` update failures;
- `landed` cleanup retry and `deleted` idempotent retry;
- mismatched retry-location rejection using persisted `landed_location`;
- rejection of relay paths that do not belong to the authenticated user and selected transfer;
- no permanent display/thumb removal;
- lazy default adapter and shared `src/api.js` forwarding, including the local-mode rejection.

Schema source-contract tests assert the rerunnable exact recipient-copy index, transactional RPC, authenticated row lock, migration preflight, and state/owner/location invariants. Full verification remains:

```bash
npm test -- --run
npm run build
git diff --check
```

## Scope Boundaries

Included:

- Supabase schema index required for idempotent recipient-copy upsert;
- Supabase adapter confirmation and cleanup operation;
- lazy default adapter and shared API seam;
- mocked tests and Phase 3 documentation updates.

Excluded:

- Web or Mobile confirmation UI;
- real browser download or operating-system save detection;
- Capacitor camera-roll save;
- scheduled expiry cleanup and general `landed` retry jobs;
- external-drive handling, duplicate-upload UX, and permanent derivative cleanup;
- any service-role key, secret, or permanent cloud-original retention.

## Privacy and Operational Risks

- Confirmation is a user assertion, not cryptographic proof that the destination retained the file.
- A failed cleanup leaves the private original in the couple-owned relay bucket and the transfer visibly `landed`; Phase 3-4 must later sweep this state.
- Shared authentication protects the couple from other accounts but does not make logical owner checks an authorization boundary.
