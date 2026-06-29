# Supabase Mobile Upload Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the Capacitor mobile upload flow to test real-device photo selection, EXIF/GPS extraction, and temporary original upload through Supabase instead of a local Mac server.

**Architecture:** Keep Web/Mobile shells separate and route persistence through `src/api.js` and `src/adapters/`. Supabase mode uses a client-side login, uploads temporary originals into a private `photos/test-originals/<auth.uid()>/<session_id>/...` prefix, and records smoke-test metadata in `public.test_uploads`.

**Tech Stack:** React, Vite, Vitest, Capacitor, Supabase JS client, Supabase Storage/RLS.

## Global Constraints

- Do not put Supabase secret/service_role keys or account passwords in Vite environment variables.
- Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` only for the browser/mobile client.
- Original photos are temporary test artifacts only in this spike.
- Preserve picker metadata (`lat`, `lng`, `takenAt`, `bytes`) across the mobile flow boundary.
- Keep changes surgical to Supabase spike files and related docs.

---

### Task 1: Preserve Mobile Picker Upload Items

**Files:**
- Modify: `src/mobile/MobileUploadFlow.jsx`
- Test: `src/mobile/MobileUploadFlow.test.jsx`

**Interfaces:**
- Consumes: `pickPhotos({ source, multiple })` returning media items with `{ file, bytes, lat, lng, takenAt }`.
- Produces: `api.uploadPhotos(selectedItems, owner, onProgress)` receives the full media items instead of losing metadata.

- [ ] **Step 1: Write the failing test**

Add a test that mocks `api.uploadPhotos`, selects a picked item, starts upload, and verifies the exact media item is passed to the API.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/mobile/MobileUploadFlow.test.jsx --run`

- [ ] **Step 3: Write minimal implementation**

Store media picker items in `files` as `{ id, file, mediaItem, url }` and pass `chosen.map((c) => c.mediaItem || c.file)` to `api.uploadPhotos`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/mobile/MobileUploadFlow.test.jsx --run`

### Task 2: Add Supabase Client And Adapter Upload

**Files:**
- Create: `src/adapters/supabaseClient.js`
- Modify: `src/adapters/supabaseAdapter.js`
- Test: `src/adapters/supabaseAdapter.test.js`

**Interfaces:**
- Produces: `createSupabaseClient()` returns a configured Supabase browser client.
- Produces: `buildTestOriginalPath(userId, sessionId, item)` returns `test-originals/<userId>/<sessionId>/<safe-name>`.
- Produces: `supabaseAdapter.uploadPhotos(items, owner, onProgress)` uploads bytes/files and inserts `test_uploads` rows.

- [ ] **Step 1: Write failing path/session tests**

Test path generation, missing session error, and upload calls against a fake client.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/adapters/supabaseAdapter.test.js --run`

- [ ] **Step 3: Install Supabase client**

Run: `npm install @supabase/supabase-js`

- [ ] **Step 4: Implement minimal adapter**

Create the Supabase client helper and implement fetchState as a minimal empty state, upload to `photos`, insert into `test_uploads`, and return queue-compatible added items with signed URLs.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/adapters/supabaseAdapter.test.js --run`

### Task 3: Document Schema And Setup

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `docs/PHASE1_SUPABASE.md`
- Modify: `README.md`

**Interfaces:**
- Produces: `public.test_uploads` table.
- Produces: scoped Storage policies for `photos/test-originals/<auth.uid()>/...`.

- [ ] **Step 1: Update schema**

Add `test_uploads`, RLS, and storage policies for temporary original upload/read/delete.

- [ ] **Step 2: Update docs**

Document login, private bucket prefix policy, temporary deletion policy, and real-device test steps.

- [ ] **Step 3: Validate whitespace**

Run: `git diff --check`

### Task 4: Full Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run unit tests**

Run: `npm test -- --run`

- [ ] **Step 2: Run production build**

Run: `npm run build`

- [ ] **Step 3: Review diff**

Run: `git diff --stat` and `git diff --check`
