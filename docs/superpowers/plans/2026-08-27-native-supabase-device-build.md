# Native Supabase Device Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the active Mobile upload sheet through HeartPin's native-aware media picker, preserve normalized metadata in both storage modes, prepare installable Supabase-backed Galaxy and iPhone development builds, and record redacted real-device evidence.

**Architecture:** `UploadSheet` owns selection UX but delegates acquisition to `pickPhotos()`. Platform adapters return one normalized media-item contract, which is passed intact to `api.uploadPhotos()`; the Supabase adapter consumes metadata and original bytes while the Local adapter unwraps `item.file`. Repository tests protect routing and native configuration, while schema application, signing, installation, and photo verification remain explicit local-only gates.

**Tech Stack:** React 18, Vite 6, Vitest 4, Testing Library, Capacitor 7, Capacitor Camera/Filesystem, custom Android `HeartPinMedia` plugin, Supabase JS, Android Gradle/JDK 21, Xcode/CocoaPods.

**Spec:** `docs/superpowers/specs/2026-08-27-native-supabase-device-build-design.md`

## Global Constraints

- Work on a new `feature/native-supabase-device-build` branch in an isolated worktree for repository changes. Do not copy `.env.local`, signing material, test photos, or `android/local.properties` into that worktree.
- Preserve the current Web/Mobile shell boundaries. UI code must not choose Supabase paths, tables, or RPCs.
- Keep the media-item contract consistent: `{ file, bytes, name, mimeType, size, lastModified, takenAt, lat, lng, source }`.
- Keep Android library selection single-item. Repeated picker calls in `UploadSheet` provide accumulation; do not expand the native plugin to multi-select.
- Do not add dependencies, store distribution, OTA updates, received-photo saving, cleanup jobs, external-drive logic, or duplicate-upload UX.
- Never commit `.env.local`, a database password, a Supabase secret/service-role key, Apple signing identities, provisioning profiles, `android/local.properties`, test photos, filenames, or coordinates.
- Run each task's focused test before continuing. After all repository changes, run `npm test -- --run`, `npm run build`, and `git diff --check`.
- Local-only work happens from the integrated main checkout after repository changes have been reviewed. Do not expose local secrets to an isolated worktree or command output.

---

## Task 1: Make web cancellation and platform routing explicit

**Files:**

- Modify: `src/platform/media/webMediaPicker.js`
- Modify: `src/platform/media/mediaPicker.test.jsx`
- Modify: `src/platform/media/mediaPickerRuntime.test.jsx`

- [ ] **Step 1: Write the failing web cancellation test**

  Extend `src/platform/media/mediaPicker.test.jsx` to spy on `document.createElement`, capture the generated file input, call `pickWebPhotos()`, invoke `input.oncancel()`, and assert that the promise resolves to `[]`.

  ```js
  it("resolves an empty selection when the browser picker is cancelled", async () => {
    const input = document.createElement("input");
    vi.spyOn(document, "createElement").mockReturnValue(input);
    vi.spyOn(input, "click").mockImplementation(() => {});

    const selection = pickWebPhotos({ source: "library", multiple: true });
    input.oncancel();

    await expect(selection).resolves.toEqual([]);
  });
  ```

- [ ] **Step 2: Run the focused test and confirm RED**

  Run:

  ```bash
  npm test -- --run src/platform/media/mediaPicker.test.jsx
  ```

  Expected: the new cancellation test fails because `input.oncancel` is not assigned.

- [ ] **Step 3: Implement cancellation without changing selection behavior**

  In `pickWebPhotos()`, assign `input.oncancel = () => resolve([])` before `input.click()`. Keep `onchange` normalization and error rejection unchanged.

- [ ] **Step 4: Add missing routing tests**

  Extend `src/platform/media/mediaPickerRuntime.test.jsx` with:

  - Web runtime routes `{ source: "library", multiple: true }` to `pickWebPhotos()`.
  - Native Android camera routes `{ source: "camera", multiple: false }` to `pickCapacitorPhotos()` and never calls `pickAndroidOriginalPhotos()`.
  - Existing Android library and iOS native expectations remain unchanged.

- [ ] **Step 5: Run focused tests and confirm GREEN**

  Run:

  ```bash
  npm test -- --run src/platform/media/mediaPicker.test.jsx src/platform/media/mediaPickerRuntime.test.jsx
  ```

  Expected: both files pass, with cancellation returning `[]` and all three runtime branches protected.

- [ ] **Step 6: Commit the picker contract change**

  ```bash
  git add src/platform/media/webMediaPicker.js src/platform/media/mediaPicker.test.jsx src/platform/media/mediaPickerRuntime.test.jsx
  git diff --cached --check
  git commit -m "fix(media): make picker cancellation and routing explicit"
  ```

---

## Task 2: Accept normalized items in the Local adapter

**Files:**

- Modify: `src/adapters/localAdapter.js`
- Modify: `src/adapters/localAdapter.test.js`

- [ ] **Step 1: Write failing unit tests for the adapter seam**

  Export a small pure helper named `localUploadFile` from `localAdapter.js`, then first write tests that define its required behavior:

  ```js
  expect(localUploadFile(file)).toBe(file);
  expect(localUploadFile({ file, bytes: new Uint8Array([1]) })).toBe(file);
  ```

  Add a multipart test using mocked `XMLHttpRequest` and a `FormData.prototype.append` spy. Call `localAdapter.uploadPhotos([normalizedItem], "bara")` and assert the `photos` field receives the underlying `File`, its name, and that `lastModified` uses the underlying file value.

- [ ] **Step 2: Run the focused test and confirm RED**

  Run:

  ```bash
  npm test -- --run src/adapters/localAdapter.test.js
  ```

  Expected: import or payload assertions fail because `localUploadFile` does not exist and the adapter treats the wrapper as a `File`.

- [ ] **Step 3: Implement the narrow compatibility helper**

  Add:

  ```js
  export function localUploadFile(item) {
    return item?.file || item;
  }
  ```

  In `localAdapter.uploadPhotos()`, call the helper for every input before appending `photos` and `lastModified`. Do not change desktop callers or the Local HTTP API.

- [ ] **Step 4: Run the focused test and confirm GREEN**

  Run:

  ```bash
  npm test -- --run src/adapters/localAdapter.test.js
  ```

  Expected: existing URL tests and new plain/wrapped file tests pass.

- [ ] **Step 5: Commit the adapter seam**

  ```bash
  git add src/adapters/localAdapter.js src/adapters/localAdapter.test.js
  git diff --cached --check
  git commit -m "refactor: accept normalized local upload items"
  ```

---

## Task 3: Route the active Mobile upload sheet through `pickPhotos()`

**Files:**

- Modify: `src/mobile/overlays/UploadSheet.jsx`
- Modify: `src/mobile/overlays/UploadSheet.test.jsx`

- [ ] **Step 1: Replace file-input tests with media-picker behavior tests**

  Mock `../../platform/media/mediaPicker.js` and build normalized fixtures whose `file` is a browser `File` and whose metadata fields are all present. Add tests for these user-visible contracts:

  - Clicking `카메라롤` calls `pickPhotos({ source: "library", multiple: true })`.
  - Clicking `바로 찍기` calls `pickPhotos({ source: "camera", multiple: false })`.
  - A returned item creates a preview, selects it, and enables the upload CTA.
  - Reopening the picker accumulates a second item.
  - Returning the same `name|size` again does not add a duplicate preview.
  - Resolving `[]` keeps the picker open without an error banner or upload call.
  - Rejecting with `new Error("사진 접근 권한이 필요해요")` renders that inline message and does not upload.
  - Starting upload passes the full normalized item array as argument zero and owner `bara` as argument one.
  - Closing the sheet revokes every created preview object URL.

- [ ] **Step 2: Run the focused test and confirm RED**

  Run:

  ```bash
  npm test -- --run src/mobile/overlays/UploadSheet.test.jsx
  ```

  Expected: picker calls and normalized upload assertions fail because the sheet still uses hidden HTML file inputs and sends plain files.

- [ ] **Step 3: Implement one picker handler**

  In `UploadSheet.jsx`:

  - Replace the `useRef` import with an import of `pickPhotos`.
  - Remove `rollRef`, `camRef`, and both hidden inputs.
  - Store selections as `{ id, item, file, url }`, where `file` is `item.file` and `item` is retained unchanged.
  - Implement `openPicker(source)` that clears the old error, calls `pickPhotos({ source, multiple: source === "library" })`, ignores an empty result, and forwards items to one accumulation function.
  - Preserve the existing image/HEIC filter and `name|size` deduplication using normalized item fields.
  - Set `src` to the existing visual values `roll` or `cam` when a button is pressed.
  - On rejection, render `error.message` in the existing `.hpm-err` element and leave current selections intact.
  - In `start()`, pass `chosen.map((choice) => choice.item)` to `api.uploadPhotos()`.
  - Keep object URL revocation in `closePick()` and do not add a new removal UX.

- [ ] **Step 4: Run the focused UI test and confirm GREEN**

  Run:

  ```bash
  npm test -- --run src/mobile/overlays/UploadSheet.test.jsx
  ```

  Expected: all picker, accumulation, cancellation, error, payload, and cleanup assertions pass.

- [ ] **Step 5: Run picker and upload-preparation regression tests**

  Run:

  ```bash
  npm test -- --run src/platform/media src/mobile/overlays/UploadSheet.test.jsx src/adapters/supabaseUploadPrep.test.js src/adapters/localAdapter.test.js
  ```

  Expected: platform normalization, Android/iOS routing, normalized Supabase metadata preference, Local compatibility, and Mobile UI tests all pass.

- [ ] **Step 6: Commit the active-flow integration**

  ```bash
  git add src/mobile/overlays/UploadSheet.jsx src/mobile/overlays/UploadSheet.test.jsx
  git diff --cached --check
  git commit -m "feat(mobile): route uploads through media picker"
  ```

---

## Task 4: Declare and protect native permission configuration

**Files:**

- Create: `src/platform/media/nativeConfig.test.js`
- Modify: `ios/App/App/Info.plist`
- Read-only contract inputs: `android/app/src/main/AndroidManifest.xml`
- Read-only contract inputs: `android/app/src/main/java/com/heartpin/app/MainActivity.java`

- [ ] **Step 1: Write a failing native-source contract test**

  Create `nativeConfig.test.js` with these exact source paths:

  ```js
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";

  const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  const infoPlist = readSource("../../../ios/App/App/Info.plist");
  const androidManifest = readSource("../../../android/app/src/main/AndroidManifest.xml");
  const mainActivity = readSource("../../../android/app/src/main/java/com/heartpin/app/MainActivity.java");
  ```

  Assert:

  - `Info.plist` includes `NSPhotoLibraryUsageDescription`.
  - `Info.plist` includes `NSCameraUsageDescription`.
  - `Info.plist` does not include `NSPhotoLibraryAddUsageDescription` in this milestone.
  - Android Manifest still includes `READ_MEDIA_IMAGES` and `ACCESS_MEDIA_LOCATION`.
  - `MainActivity` still calls `registerPlugin(HeartPinMediaPlugin.class)`.

- [ ] **Step 2: Run the focused test and confirm RED**

  Run:

  ```bash
  npm test -- --run src/platform/media/nativeConfig.test.js
  ```

  Expected: iOS usage-description assertions fail; existing Android contract assertions pass.

- [ ] **Step 3: Add only the two required iOS descriptions**

  Add these keys inside the root dictionary of `Info.plist`:

  ```xml
  <key>NSPhotoLibraryUsageDescription</key>
  <string>여행 사진의 촬영 시간과 위치를 읽어 HeartPin 기록으로 정리하기 위해 사진 접근이 필요해요.</string>
  <key>NSCameraUsageDescription</key>
  <string>새 여행 사진을 촬영해 HeartPin 기록에 추가하기 위해 카메라 접근이 필요해요.</string>
  ```

  Do not add a photo-library add/save description until native recipient save is implemented.

- [ ] **Step 4: Validate plist syntax and run the focused test**

  Run:

  ```bash
  plutil -lint ios/App/App/Info.plist
  npm test -- --run src/platform/media/nativeConfig.test.js
  ```

  Expected: `plutil` reports `OK` and the contract test passes.

- [ ] **Step 5: Commit native configuration**

  ```bash
  git add ios/App/App/Info.plist src/platform/media/nativeConfig.test.js
  git diff --cached --check
  git commit -m "fix(ios): declare photo and camera usage"
  ```

---

## Task 5: Update the repeatable development workflow and run repository verification

**Files:**

- Modify: `docs/CAPACITOR-MOBILE-UPLOAD-SPIKE.md`
- Modify only if its commands are stale: `README.md`
- Modify only if milestone state needs correction: `docs/ROADMAP.md`

- [ ] **Step 1: Correct the active integration description**

  Replace the stale `src/mobile/MobileUploadFlow.jsx` reference with `src/mobile/overlays/UploadSheet.jsx`. Document that:

  - the active sheet now calls `pickPhotos()`;
  - Android library selection is one original per invocation and the sheet accumulates repeated selections;
  - camera uses the Capacitor picker;
  - `npm run cap:sync` is required after each web-code update before a native rebuild;
  - Supabase mode requires only the project URL and publishable key in uncommitted `.env.local`;
  - the present iOS blocker is the local Xcode 26.6 platform/CoreSimulator mismatch plus local signing, not missing repository code.

- [ ] **Step 2: Replace temporary-spike verification with the real application path**

  Update Galaxy and iPhone procedures to verify `inbox_items`, `transfer_queue`, the private `photos` bucket's display/thumb/relay objects, organization completion, and visibility on the other signed-in device. Preserve the existing results table until real-device results are available.

- [ ] **Step 3: Review documentation for private data**

  Confirm no URL, key, email, filename, coordinate, device identifier, signing-team identifier, or personal screenshot was added.

- [ ] **Step 4: Run the complete cloud-friendly verification gate**

  Run:

  ```bash
  npm test -- --run
  npm run build
  git diff --check
  ```

  Expected: the full Vitest suite passes, Vite emits `dist/`, and the diff check has no output.

- [ ] **Step 5: Self-review only the milestone diff**

  Run:

  ```bash
  git status --short
  git diff --stat main...HEAD
  git diff main...HEAD -- src/platform/media src/mobile/overlays/UploadSheet.jsx src/adapters/localAdapter.js ios/App/App/Info.plist docs/CAPACITOR-MOBILE-UPLOAD-SPIKE.md
  ```

  Confirm every changed line traces to the approved design and unrelated user files remain untouched.

- [ ] **Step 6: Commit workflow documentation**

  Stage only the documentation files actually changed:

  ```bash
  git add docs/CAPACITOR-MOBILE-UPLOAD-SPIKE.md
  git diff --cached --check
  git commit -m "docs: update native device verification workflow"
  ```

  If `README.md` or `docs/ROADMAP.md` was necessarily corrected, include that exact file in the same `git add`; otherwise leave it untouched.

---

## Task 6: Integrate reviewed repository changes and reapply the disposable Supabase schema

**Files:**

- Local-only modify, never commit: `.env.local`
- Operator-applied schema: `supabase/schema.sql`
- Read-only verification: Supabase dashboard tables, policies, functions, and Storage configuration

- [ ] **Step 1: Review and integrate the feature branch**

  Use the `superpowers:finishing-a-development-branch` skill. Require a clean focused diff and passing Task 5 verification before merging to local `main`. Do not push unless the user explicitly requests it.

- [ ] **Step 2: Switch the existing local runtime to Supabase mode**

  In the main checkout's existing `.env.local`, preserve the current URL and publishable key and change only:

  ```text
  VITE_HEARTPIN_API_MODE=supabase
  ```

  Verify `.env.local` remains ignored with `git status --short --ignored .env.local`. Do not print its contents.

- [ ] **Step 3: Apply the current schema through an authenticated operator channel**

  Open `supabase/schema.sql` locally, then run it in the existing project's authenticated Supabase SQL editor. Do not paste credentials into a shell command, client bundle, test, or documentation.

  If the schema stops on a legacy transfer preflight, inspect the reported incompatible disposable rows in the dashboard. Clear only those test rows after confirming their exact scope, then rerun the complete schema. Do not add destructive cleanup SQL to repository scripts.

- [ ] **Step 4: Verify the deployed schema read-only**

  In the dashboard, confirm these objects from `supabase/schema.sql` exist and match the file:

  - tables `trips`, `days`, `spots`, `moments`, `inbox_items`, `photo_copies`, `transfer_queue`, and legacy-spike `test_uploads`;
  - `inbox_items` metadata columns and `transfer_queue` owner, original metadata, status, location, and expiry columns;
  - the private `photos` Storage bucket;
  - authenticated table policies, `transfer_queue.user_id = auth.uid()` isolation, and authenticated Storage read/write/update/delete policies;
  - functions `touch_updated_at`, `set_transfer_queue_expiry`, and adapter RPC `confirm_incoming_transfer_landed`.

  Stop here if schema execution or any required object is unresolved; native builds should not be presented as end-to-end ready against a partial backend.

- [ ] **Step 5: Run a browser-level Supabase smoke test**

  Run `npm run dev`, sign in, load persisted state, and perform one non-photo reversible state change. Confirm it survives a reload and appears on the second signed-in client. Remove only the test record created for this smoke test.

  Expected: the app uses Supabase without depending on `server/index.js` or the Mac's LAN address.

---

## Task 7: Build, install, and verify Galaxy and iPhone development apps

**Files:**

- Local-only create, never commit: `android/local.properties`
- Local-only signing choice: Xcode Development Team
- Generated artifacts, never commit: `dist/`, Android APK outputs, Xcode DerivedData
- Modify after verification: `docs/CAPACITOR-MOBILE-UPLOAD-SPIKE.md`

- [ ] **Step 1: Synchronize the verified Supabase-mode web bundle**

  From the integrated main checkout run:

  ```bash
  npm run cap:sync
  ```

  Expected: Vite build succeeds and Capacitor sync completes for Android and iOS. Confirm generated bundles are not staged.

- [ ] **Step 2: Build the Galaxy debug APK**

  Ensure ignored `android/local.properties` contains this machine's confirmed SDK path:

  ```text
  sdk.dir=/Users/a11791/Library/Android/sdk
  ```

  Then run:

  ```bash
  cd android
  ./gradlew assembleDebug
  ```

  Expected: `BUILD SUCCESSFUL` and `android/app/build/outputs/apk/debug/app-debug.apk` exists. Record the build result and artifact size, not a hash tied to a private distribution channel.

- [ ] **Step 3: Install and verify the Galaxy path first**

  Install the debug APK on the target Galaxy using Android Studio or approved `adb install -r`. With a JPEG whose Gallery details show capture time and location:

  1. Sign in and select an owner.
  2. Open the Mobile upload sheet and choose `카메라롤`.
  3. Approve photo and location access.
  4. Select the original, upload it, and complete organization.
  5. Repeat the picker once to prove accumulation before uploading a second disposable item.
  6. Confirm capture time/GPS are present in the relevant Supabase row, display/thumb objects render, and a seven-day opposite-owner relay row/object exists.
  7. Confirm the other signed-in device observes the persisted state.
  8. Compare the same photo through Web/PWA selection only to record whether browser metadata remains stripped.

  Record only pass/fail, format, byte-size class, metadata-preserved flags, and redacted failure text. Do not record the filename or coordinates.

- [ ] **Step 4: Repair the local iOS toolchain before claiming an iOS build**

  Install the iOS platform version required by Xcode 26.6 and resolve the CoreSimulator mismatch reported by the previous diagnostic. Verify:

  ```bash
  xcodebuild -version
  xcrun simctl list runtimes
  ```

  Expected: Xcode can locate a matching iOS platform without `iOS 26.5 Platform Not Installed` or CoreSimulator version errors.

- [ ] **Step 5: Build and install the iPhone development app**

  Run `npm run cap:ios`, select the local Apple Development Team in Xcode, connect the target iPhone, trust the developer profile if required, and run the `App` scheme on the device. Keep the team selection and provisioning data local.

  Also run an unsigned compile check appropriate to the installed SDK:

  ```bash
  xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -sdk iphoneos CODE_SIGNING_ALLOWED=NO build
  ```

  Expected: the unsigned build succeeds, then Xcode's signed device Run installs and launches the app.

- [ ] **Step 6: Verify HEIC and JPEG on iPhone**

  For one HEIC and one JPEG whose Photos details show capture time and location, repeat the end-to-end checks from the Galaxy step. Separately record:

  - picker and permission success;
  - capture-time/GPS preservation;
  - display/thumb WebP derivative success;
  - relay row/object creation and seven-day expiry;
  - organization and opposite-device visibility.

  A metadata pass with a derivative failure is a partial failure, not a pass.

- [ ] **Step 7: Record redacted evidence and rerun final checks**

  Update `docs/CAPACITOR-MOBILE-UPLOAD-SPIKE.md` with actual Galaxy/iPhone results, exact build commands, toolchain versions, and any remaining blocker. Exclude filenames, coordinates, credentials, account emails, device IDs, and screenshots containing private photos.

  Run:

  ```bash
  npm test -- --run
  npm run build
  git diff --check
  git status --short
  ```

  Expected: automated checks pass; only the intended redacted results document is modified; `.env.local`, `android/local.properties`, native build products, signing data, and test media remain untracked/ignored and unstaged.

- [ ] **Step 8: Commit only the redacted verification result**

  ```bash
  git add docs/CAPACITOR-MOBILE-UPLOAD-SPIKE.md
  git diff --cached --check
  git commit -m "docs: record native Supabase device results"
  ```

  Do not push or begin store distribution without a separate user request.

---

## Completion Criteria

- [ ] `UploadSheet` invokes platform-native library/camera paths and uploads full normalized items.
- [ ] Web cancellation, Local compatibility, native permission contracts, and Supabase metadata preservation have focused tests.
- [ ] Full Vitest, Vite build, plist lint, and diff checks pass.
- [ ] The disposable Supabase project matches `supabase/schema.sql` and passes a two-client persistence smoke test.
- [ ] A Galaxy debug APK builds, installs, and passes redacted JPEG metadata/relay verification.
- [ ] An iPhone development build installs and passes redacted HEIC and JPEG metadata/derivative/relay verification.
- [ ] Development update workflow is proven: change code, run tests/build, `npm run cap:sync`, rebuild, and reinstall/update the dev app.
- [ ] No secret, signing material, local path file, photo, filename, coordinate, or unrelated user change is committed.
