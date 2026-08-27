# Capacitor Mobile Upload Spike Results

작성일: 2026-06-24 · workflow 갱신: 2026-08-27

## 목적

Android 모바일 브라우저 사진 선택 경로에서 GPS EXIF가 `null`로 들어오는 문제를 우회할 수 있는지 확인한다.

검증 대상은 Capacitor dev app의 native photo picker다. Store 배포가 아니라 Galaxy debug install, iPhone Xcode dev install 기준으로 확인한다. 실제 검증은 레거시 임시 업로드가 아니라 HeartPin의 Supabase 앱 경로 전체를 확인한다.

## 현재 구현 상태

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| Web media picker adapter | 완료 | `src/platform/media/webMediaPicker.js` |
| Capacitor media picker adapter | 완료 | `src/platform/media/capacitorMediaPicker.js` |
| Android original media picker plugin | 완료 | `HeartPinMediaPlugin` + `ACCESS_MEDIA_LOCATION` + `MediaStore.setRequireOriginal(...)` |
| Mobile upload flow adapter 연결 | 완료 | `src/mobile/overlays/UploadSheet.jsx`가 `pickPhotos()` 호출 |
| Android native project | 완료 | `android/` |
| Android debug APK build | 진단상 성공 | 과거 `cd android && ./gradlew assembleDebug` 성공. 이 feature 브랜치는 아직 sync·APK 재빌드·Galaxy 설치·실기기 테스트 전 |
| iOS native project | 생성됨 | `ios/` + CocoaPods 의존성 |
| iOS simulator/runtime 진단 | 차단됨 | 로컬 Xcode 26.6 (build 17F113)의 플랫폼/CoreSimulator service/version mismatch. 저장소 코드 누락이 아니라 로컬 toolchain 문제이며, local signing도 실기기 설치 전 필요 |

활성 시트는 `src/mobile/overlays/UploadSheet.jsx`다. 카메라롤 버튼은 `pickPhotos({ source: "library", multiple: true })`를 호출한다. Android에서는 원본과 위치정보를 읽는 native library picker가 한 번에 원본 한 장만 반환하므로, 사용자가 picker를 반복 호출하면 시트가 선택 목록에 누적한다. 카메라 버튼은 Capacitor Camera picker를 사용한다.

`npm run cap:sync`는 웹 코드를 바꿀 때마다 native rebuild 전에 반드시 실행한다. 이 명령은 Vite build도 수행한다.

Supabase 검증 모드에는 커밋하지 않는 `.env.local`의 프로젝트 URL과 publishable key만 필요하다. 로그인 비밀번호, service role key, 실사진 정보는 파일이나 문서에 넣지 않는다.

```dotenv
VITE_HEARTPIN_API_MODE=supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Android 환경 준비 필요 항목

Android debug build에는 JDK 21과 Android SDK가 필요하다.

```text
./gradlew assembleDebug
BUILD SUCCESSFUL
```

Galaxy 실기기 검증 전 준비:

1. `android/local.properties`에 로컬 Android SDK 경로를 설정한다.
2. `.env.local`을 위 Supabase 모드로 설정한다.
3. `npm run cap:sync`를 실행한다.
4. `cd android && ./gradlew assembleDebug`로 이 브랜치의 APK를 다시 만든다.
5. 생성된 APK를 Galaxy에 설치하거나 Android Studio/`npm run cap:android`로 실행한다.

## iOS 환경 준비 필요 항목

현재 확인:

```text
xcodebuild -version
Xcode 26.6
Build version 17F113
```

현재 simulator/runtime 진단은 플랫폼/CoreSimulator service/version mismatch로 막혀 있다. iPhone dev install도 이 local toolchain 정리와 Xcode signing team 선택이 끝난 뒤에만 시도한다. 이 상태는 iOS build/install 성공을 의미하지 않는다.

iPhone 실기기 검증 전 준비:

1. Xcode platform/CoreSimulator 상태를 복구하고 CocoaPods 의존성을 준비한다.
2. `.env.local`을 위 Supabase 모드로 설정한다.
3. `npm run cap:sync`를 실행한다.
4. `npm run cap:ios`로 Xcode를 열고 local signing team을 선택한다.
5. iPhone을 연결하고 dev install을 실행한다.

## Test Photos

실제 검증에는 알려진 GPS 메타데이터를 가진 JPEG 한 장과, iPhone에서는 HEIC와 JPEG 각 한 장을 사용한다. 개인 파일명, 좌표, 스크린샷은 이 문서에 기록하지 않는다.

| Asset | Format | Has GPS Before Test | Notes |
| --- | --- | --- | --- |
| Android sample 1 | JPEG | yes | Same file tested in browser and dev app |
| iPhone sample 1 | HEIC | yes | Native picker path |
| iPhone sample 2 | JPEG | yes | Native picker path |

## Results

이 표는 과거 spike 결과를 보존한다. Galaxy의 GPS 보존 결과는 이전 진단에서의 결과이며, 현재 feature 브랜치가 Galaxy에 sync·설치·재검증됐다는 뜻은 아니다. iOS 결과는 아직 없다.

| Platform / path | Format | Observed MIME type | Byte-size class | Capture time preserved | GPS preserved | Display derivative | Thumb derivative | Relay row + object | Organization | Other-device visibility | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Galaxy / Mobile browser file input | JPEG | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending real-device test |
| Galaxy / Android original media picker | JPEG | Pending recheck | Pending recheck | Historical pass; pending recheck | Historical pass; pending recheck | Pending recheck | Pending recheck | Pending recheck | Pending recheck | Pending recheck | Historical metadata-only Supabase spike result; this feature branch still needs sync, install, and end-to-end device verification |
| iPhone / Capacitor native picker | HEIC | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Blocked by current local iOS toolchain diagnosis and pending signing/dev install |
| iPhone / Capacitor native picker | JPEG | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Blocked by current local iOS toolchain diagnosis and pending signing/dev install |

실기기 확인 후 각 format 행의 모든 필드를 개별적으로 갱신한다.

- MIME type은 picker가 반환한 관찰값만 기록한다.
- Byte-size class는 `small (<5 MB)`, `medium (5–15 MB)`, `large (>15–25 MB)` 중 하나로만 기록하고 정확한 byte 수는 남기지 않는다.
- Capture time과 GPS는 각각 `Preserved`, `Not preserved`, `Not present before test` 중 하나로 기록한다.
- Display derivative, Thumb derivative, relay row/object, organization, other-device visibility는 서로 독립적으로 `Pass` 또는 redacted failure로 기록한다. Metadata 보존 성공으로 derivative나 relay 성공을 대신하지 않는다.
- 파일명, 좌표, Storage object name, signed URL, 계정 정보, device identifier는 기록하지 않는다.

## Real application verification procedure

Use the same procedure on Galaxy and iPhone after the platform-specific install steps above. Repeat library selection on Android to collect multiple originals in the sheet, and also exercise the Capacitor camera path.

1. Sign in to the Supabase app with the shared auth account and select the logical owner.
2. Select the known test photo(s) through the active UploadSheet path. On Android, repeat the library selection once per original; confirm the sheet accumulates the choices before upload.
3. Upload and complete organization: keep each item, place it in an existing or new spot/trip as appropriate, and finish the flow.
4. Confirm the expected `inbox_items` rows and the created/updated record organization in the app.
5. Confirm `transfer_queue` has the opposite owner’s pending transfer with its server-managed expiry.
6. In the private `photos` bucket, confirm the display, thumb, and temporary relay objects exist on their intended paths. Do not expose signed URLs or object names in this document.
7. Sign in as the other logical owner on the other device. Confirm the organized record is visible and the pending original can be seen through the recipient flow.
8. Record only pass/fail and non-identifying metadata preservation observations here. Do not treat browser or device persistence, original deletion, or iOS install as verified unless each was actually observed.

The legacy `test_uploads` table and `photos/test-originals/...` prefix are not the real application acceptance path; they remain only for debug/legacy spike use.

## Decision Rule

- If Galaxy Capacitor native picker preserves GPS, continue Supabase upload work through `pickPhotos()`.
- If Galaxy Android original media picker preserves GPS, keep `HeartPinMediaPlugin` as the Android library path and continue Supabase upload work through `pickPhotos()`.
- If Galaxy Android original media picker still strips GPS, keep the Android ZIP/original-file workaround and treat native Android upload as a deeper MediaStore/SAF task.
- Keep iOS on the existing Capacitor Camera/Photos picker for MVP. Revisit a custom iOS native picker only when app-store UX polish becomes the priority.
