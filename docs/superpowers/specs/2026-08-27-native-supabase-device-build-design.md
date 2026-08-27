# Native Supabase Device Build Design

Date: 2026-08-27
Status: Approved for implementation planning

## Goal

Produce Supabase-backed HeartPin development builds that can be installed on a Galaxy and an iPhone, route the Mobile upload screen through the existing platform media-picker boundary, preserve native photo metadata through upload, and record real-device verification results.

This is a development-build milestone, not a store-release milestone. The output is a repeatable local build and install workflow plus evidence from the two target devices.

## Fixed Decisions

- Keep the single React/Vite repository and the existing Web/Mobile dual-shell structure.
- Use the existing couple-owned Supabase project as a disposable development environment; the current schema may be reapplied and test records may be recreated.
- Keep the shared Supabase account and logical owners `bara` and `nyong`.
- Build mobile apps in `VITE_HEARTPIN_API_MODE=supabase` so they do not depend on a Mac local server or shared Wi-Fi.
- Use only the Supabase project URL and publishable key in the Vite client. Never use a database password, secret key, or `service_role` key in the app.
- Keep permanent storage limited to record data plus display/thumb derivatives. Keep originals only in the existing seven-day recipient relay.
- Treat Galaxy and iPhone as one milestone, but verify Galaxy first because its debug APK toolchain is already proven on this Mac.
- Do not implement store submission, OTA/live updates, native camera-roll receipt, scheduled relay cleanup, external-drive synchronization, or duplicate-upload UX in this milestone.

## Current Gap

The media picker boundary and native implementations already exist under `src/platform/media/`, including the Android `HeartPinMedia` plugin that reads original bytes and GPS metadata. The active Mobile upload surface, `src/mobile/overlays/UploadSheet.jsx`, bypasses that boundary and opens hidden HTML file inputs directly.

As a result, installing the current Capacitor shell does not prove the intended native upload path. On Android, the browser-style picker may still strip location EXIF even though the native plugin can preserve it. The iOS project also lacks the privacy usage strings required before native photo-library and camera access can be treated as supported.

The native projects contain no committed web bundle by design. Every device build must run `npm run cap:sync` so the current `dist/` output is copied into Android and iOS.

## Architecture

### Mobile picker boundary

`UploadSheet` calls one platform-neutral interface:

```js
pickPhotos({
  source: "library" | "camera",
  multiple: boolean,
})
```

The returned item contract is:

```js
{
  file: File,
  bytes: Uint8Array,
  name: string,
  mimeType: string,
  size: number,
  lastModified: number,
  takenAt: string | null,
  lat: number | null,
  lng: number | null,
  source: string,
}
```

Platform selection remains inside `src/platform/media/mediaPicker.js`:

```text
Web/PWA library or camera
  -> webMediaPicker

Android Capacitor library
  -> HeartPinMedia native plugin
  -> original MediaStore bytes and ACCESS_MEDIA_LOCATION

Android Capacitor camera
  -> Capacitor Camera

iOS Capacitor library or camera
  -> Capacitor Camera + Filesystem
```

The first Android native implementation intentionally selects one original at a time. `UploadSheet` continues accumulating selections, so a user can invoke the library picker repeatedly before starting an upload. Expanding the native plugin to a multi-select contract is deferred until the single-photo metadata path is proven on the target Galaxy.

### Upload item preservation

`UploadSheet` stores normalized media items instead of immediately reducing them to `File`. Preview rendering still uses `item.file` and object URLs, while `api.uploadPhotos()` receives the full item objects.

`SupabaseAdapter.uploadPhotos()` already accepts either plain `File` values or objects with `file`, `bytes`, `takenAt`, `lat`, and `lng`. The browser upload preparer prefers the explicit native values and falls back to parsing the original bytes. This keeps plugin-provided GPS and capture time intact through hashing, derivative creation, `inbox_items`, and `transfer_queue` creation.

`localAdapter.uploadPhotos()` is updated to unwrap `item.file || item` before adding multipart fields. This preserves local demo compatibility while allowing the shared UI to use the normalized contract in both API modes. The desktop Web upload surface may continue passing plain `File` values.

### Supabase development runtime

The existing `.env.local` retains its configured URL and publishable key. Only the local API mode changes to:

```text
VITE_HEARTPIN_API_MODE=supabase
```

The value remains uncommitted. Credentials are embedded into the development bundle by Vite, so only the public project URL and publishable key are permitted.

The latest `supabase/schema.sql` is reapplied through the authenticated Supabase dashboard or another operator-controlled SQL channel. The implementation does not add a service key, database password, or client-side schema administration path. After application, the operator verifies that the private `photos` bucket, RLS policies, recipient RPC, and required tables exist.

### Native configuration

Android keeps the existing app id `com.heartpin.app`, `minSdkVersion = 23`, target SDK 35, and registered `HeartPinMedia` plugin. `android/local.properties` remains ignored and supplies this Mac's SDK path.

iOS keeps bundle id `com.heartpin.app` and deployment target 14.0. `Info.plist` adds plain-language descriptions for reading the photo library, using the camera, and adding a saved photo. The Apple Development Team remains a local Xcode signing choice and is not committed as a shared project secret.

The current Mac must install the iOS platform matching Xcode 26.6 and resolve its CoreSimulator version mismatch before command-line or Xcode device builds can be considered verified.

## User Flow

1. The user opens the Mobile upload sheet and chooses camera roll or camera.
2. `pickPhotos()` selects the platform implementation.
3. The platform implementation returns normalized items with original bytes and any available capture/GPS metadata.
4. The sheet displays previews and allows repeated selection, removal, and confirmation using the existing UX.
5. Starting upload passes normalized items through `api.uploadPhotos()`.
6. Supabase mode hashes the original, generates display/thumb WebP derivatives, uploads the seven-day relay original, and persists the inbox and transfer rows.
7. The existing one-photo-at-a-time organization flow assigns each new inbox item to an existing spot, a new spot, a new trip, discard, or skip.
8. Another signed-in device observes the persisted state through the existing polling flow.

## Error Handling

- Picker cancellation returns an empty selection and leaves the sheet open without an error banner.
- Permission denial and original-read failure show a retryable inline message in the upload sheet.
- Unsupported or oversized Android originals retain the native plugin's explicit Korean error message.
- A failed selection never calls `api.uploadPhotos()`.
- An upload failure returns the sheet to its pick state with the selected items preserved for retry.
- Normalized item validation stays at adapter boundaries; UI code does not construct Supabase paths or database rows.
- Object URLs created for previews are revoked when items are removed or the sheet closes.
- A native metadata field may be `null`; missing GPS routes through the existing location-missing/organization behavior rather than inventing coordinates.

## Automated Verification

Cloud-friendly checks cover:

- Web picker normalization and cancellation;
- platform picker routing;
- `UploadSheet` library/camera actions, item accumulation, cancellation, permission errors, and normalized upload payload;
- Local adapter compatibility with both plain `File` and normalized item input;
- iOS privacy usage-string and Android plugin-registration source contracts;
- existing Supabase upload preparation and relay behavior;
- the full Vitest suite, Vite build, and whitespace checks.

Local native checks cover:

```text
npm run cap:sync
Android: ./gradlew assembleDebug
iOS: xcodebuild unsigned device build after platform installation
```

The native bundle checks prove compilation and packaging only. They do not prove photo permissions, GPS preservation, Supabase RLS, operating-system storage, or device installation.

## Real-Device Verification

Galaxy verification uses at least one JPEG whose original Gallery details show a location. It records source name, MIME type, byte size, `takenAt`, `lat`, `lng`, Supabase rows, and Storage objects. The same image should be compared with Web/PWA selection to preserve evidence of the Android browser metadata gap.

iPhone verification uses at least one HEIC and one JPEG with known capture time and location. It records the same fields and confirms that the selected bytes can generate display/thumb derivatives and a relay object.

For each owner, the operator verifies:

- login and owner selection;
- upload and organization completion;
- `inbox_items` metadata and private display/thumb paths;
- an opposite-owner `transfer_queue` row with seven-day expiry;
- state visibility on the other device.

Device results are recorded in `docs/CAPACITOR-MOBILE-UPLOAD-SPIKE.md` without filenames, coordinates, credentials, or screenshots that expose private user data.

## Scope Boundaries

Included:

- Supabase-mode local development configuration;
- schema reapplication and read-only verification checklist;
- Mobile upload routing through the existing media picker;
- normalized media item preservation through the storage adapter seam;
- iOS privacy usage descriptions;
- Android and iOS development builds;
- Galaxy/iPhone manual verification protocol and result recording.

Excluded:

- Play Store, TestFlight, or App Store distribution;
- committed signing identities, provisioning profiles, or local SDK paths;
- Android native multi-select expansion;
- automatic photo-library save for received originals;
- background upload and push notifications;
- scheduled relay expiry/failed-cleanup jobs;
- external-drive copy and safety indicators;
- duplicate-upload UX and permanent derivative cleanup;
- proof that a user-confirmed recipient download remains on the operating system.

## Risks and Follow-Up

- Reapplying a live schema can stop on legacy transfer preflight checks. Because this project is approved as disposable development data, the operator may clear incompatible test rows through the Supabase dashboard before rerunning, but no destructive database command is embedded in the client or automated test suite.
- Android's original plugin currently bridges at most 25 MB and one item per picker call. Real-device results determine whether to raise the limit or implement multi-select.
- iOS HEIC decoding may depend on browser/WebKit image APIs even when metadata extraction succeeds. The device test must distinguish selection/metadata success from WebP derivative success.
- Xcode platform and signing changes are machine/account operations; repository tests cannot complete them.
- Supabase schema changes and installed app builds can evolve independently. Later releases must maintain adapter/schema compatibility and apply schema changes before distributing a build that requires them.

After this milestone, the next bounded projects are scheduled relay cleanup, native recipient camera-roll save, external-drive ledger integration, and formal internal/store distribution.
