# Recipient Transfer API Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the implemented recipient-transfer adapter operations callable through HeartPin's shared `src/api.js` boundary without adding Web or Mobile UI.

**Architecture:** Preserve the existing adapter factory behavior and add the two missing methods to the lazy default `supabaseAdapter` export. Expose matching `src/api.js` functions that reject non-Supabase mode with a product-level error before a shell can reach a missing local adapter method.

**Tech Stack:** JavaScript, Vite 6, Vitest 4, Supabase JS 2.

## Global Constraints

- Keep the shared Supabase account and logical owners `bara` and `nyong`.
- Keep private Storage paths inside `SupabaseAdapter`.
- Do not add Web/Mobile UI, save confirmation, `photo_copies`, transfer status changes, Storage deletion, or expiry cleanup.
- Do not add dependencies or require a live `.env.local`.
- Preserve the two user-owned untracked files.
- Real Supabase, browser download, operating-system save, and physical-device checks remain Local-only.

---

### Task 1: Public recipient-transfer seam

**Files:**
- Create: `src/api.test.js`
- Modify: `src/adapters/supabaseAdapter.js`
- Modify: `src/api.js`

**Interfaces:**
- Consumes: `listIncomingTransfers(owner)` and `createIncomingTransferDownload(transferId, owner)` from the existing adapter factory.
- Produces: the same two operations through the lazy default `supabaseAdapter` and `src/api.js`.

- [x] **Step 1: Write failing shared API tests**

Create a test client whose auth session is valid, whose `transfer_queue` query returns one uploaded recipient row, and whose private Storage signer returns a fixed URL. Import `src/api.js` in Supabase mode and assert:

```js
await expect(api.listIncomingTransfers("nyong")).resolves.toEqual([
  expect.objectContaining({ id: "tr_hash-123", destinationOwner: "nyong" }),
]);
await expect(api.createIncomingTransferDownload("tr_hash-123", "nyong"))
  .resolves.toEqual(expect.objectContaining({
    transferId: "tr_hash-123",
    url: "https://signed.example/original",
    filename: "gps.jpg",
  }));
```

Also import the API in local mode and assert both operations reject with the explicit Supabase-only message instead of a missing-method `TypeError`.

- [x] **Step 2: Run the focused tests to verify RED**

Run:

```bash
npm test -- --run src/api.test.js
```

Expected: FAIL because `src/api.js` and the lazy default adapter do not expose the recipient-transfer operations.

- [x] **Step 3: Implement the minimal seam**

Add these lazy forwards to `supabaseAdapter`:

```js
listIncomingTransfers: (...args) => getDefaultAdapter().listIncomingTransfers(...args),
createIncomingTransferDownload: (...args) => getDefaultAdapter().createIncomingTransferDownload(...args),
```

Add matching functions to `src/api.js`. Each function must check Supabase mode and method availability before forwarding. Do not change local adapter behavior.

- [x] **Step 4: Run the focused tests to verify GREEN**

Run:

```bash
npm test -- --run src/api.test.js
```

Expected: PASS.

- [x] **Step 5: Run repository verification**

Run:

```bash
npm test -- --run
npm run build
git diff --check
```

Expected: all commands exit 0.

- [x] **Step 6: Self-review and commit**

Review `git diff main...HEAD` and confirm no shell, Storage path, secret, original-retention, or Local-only behavior changed. Stage only the plan, API seam, adapter export, and test. Commit as `feat: expose recipient transfer API`.

## Self-Review

- Spec coverage: this plan implements only the approved shared seam required before either download UI can call the recipient adapter.
- Placeholder scan: file paths, method names, test behavior, commands, and exclusions are explicit.
- Type consistency: both public functions preserve the adapter factory's existing arguments and return values.
