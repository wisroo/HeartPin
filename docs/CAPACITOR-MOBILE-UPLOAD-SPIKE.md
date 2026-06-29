# Capacitor Mobile Upload Spike Results

작성일: 2026-06-24

## 목적

Android 모바일 브라우저 사진 선택 경로에서 GPS EXIF가 `null`로 들어오는 문제를 우회할 수 있는지 확인한다.

검증 대상은 Capacitor dev app의 native photo picker다. Store 배포가 아니라 Galaxy debug install, iPhone Xcode dev install 기준으로 확인한다.

## 현재 구현 상태

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| Web media picker adapter | 완료 | `src/platform/media/webMediaPicker.js` |
| Capacitor media picker adapter | 완료 | `src/platform/media/capacitorMediaPicker.js` |
| Android original media picker plugin | 완료 | `HeartPinMediaPlugin` + `ACCESS_MEDIA_LOCATION` + `MediaStore.setRequireOriginal(...)` |
| Mobile upload flow adapter 연결 | 완료 | `src/mobile/MobileUploadFlow.jsx` |
| Supabase temporary upload path | 완료 | `photos/test-originals/<auth.uid()>/...`, `test_uploads` |
| Android native project | 완료 | `android/` |
| Android sync | 완료 | `npm run cap:sync` 성공 |
| Android debug APK build | 완료 | `cd android && ./gradlew assembleDebug` 성공. APK: `android/app/build/outputs/apk/debug/app-debug.apk` |
| iOS native project | 완료 | Xcode/CocoaPods 설정 후 `npx cap add ios`, `npm run cap:sync` 성공 |

## Android 환경 준비 필요 항목

현재 확인:

```text
./gradlew assembleDebug
BUILD SUCCESSFUL
```

Galaxy 실기기 검증 전 준비:

1. `android/local.properties`에 `sdk.dir=/Users/a11791/Library/Android/sdk` 설정
2. `cd android && ./gradlew assembleDebug`
3. 생성된 `android/app/build/outputs/apk/debug/app-debug.apk`를 Galaxy에 설치
4. 또는 Android Studio 설치 후 `npm run cap:android`로 실기기 실행

## iOS 환경 준비 필요 항목

현재 확인:

```text
xcodebuild -version
Xcode 26.5

pod --version
1.16.2
```

iPhone 실기기 검증 전 준비:

1. `npm run cap:sync`
2. `npm run cap:ios`
3. Xcode에서 signing team 선택
4. iPhone을 연결하고 dev install 실행

현재 회사 노트북에서는 iOS signing/dev install 검증이 제한된다. 과거 테스트에서 Capacitor iOS 사진 선택 경로가 위치정보를 보존하는 것으로 확인됐으므로, MVP 단계에서는 iOS는 기존 Capacitor Camera/Photos picker를 유지한다. iOS native picker는 정식 앱 UX 개선 단계에서 `PHPickerViewController` 기반으로 재검토한다.

## Test Photos

| Asset | Format | Has GPS Before Test | Notes |
| --- | --- | --- | --- |
| Android sample 1 | JPEG | yes | Same file tested in browser and dev app |
| iPhone sample 1 | HEIC | yes | Native picker path |
| iPhone sample 2 | JPEG | yes | Native picker path |

## Results

| Platform | Path | Format | takenAt | lat/lng | Result |
| --- | --- | --- | --- | --- | --- |
| Galaxy | Mobile browser file input | JPEG | Not tested yet | Not tested yet | Pending real-device test |
| Galaxy | Capacitor native picker | JPEG | Not tested yet | Not tested yet | Pending real-device test |
| iPhone | Capacitor native picker | HEIC | Not tested yet | Not tested yet | Blocked until iOS toolchain setup |
| iPhone | Capacitor native picker | JPEG | Not tested yet | Not tested yet | Blocked until iOS toolchain setup |

## Android Test Procedure

1. Set `.env.local` to Supabase mode.
2. Run `npm run cap:sync`.
3. Run `npm run cap:android`.
4. Open the generated Android project in Android Studio.
5. Connect Galaxy device with USB debugging enabled.
6. Install the debug app on device.
7. Sign in with the Supabase shared auth account.
8. Prepare one JPEG photo with known GPS metadata.
9. Select the photo through the Android original media picker path.
10. Confirm `test_uploads.lat`, `test_uploads.lng`, and `test_uploads.taken_at` in Supabase.
11. Confirm the original exists under `photos/test-originals/<auth.uid()>/...`, then delete the test object after verification.

## iOS Test Procedure

1. Prepare Xcode and CocoaPods.
2. Set `.env.local` to Supabase mode.
3. Run `npm run cap:sync`.
4. Run `npm run cap:ios`.
5. Install the dev app on iPhone from Xcode.
6. Sign in with the Supabase shared auth account.
7. Prepare one HEIC and one JPEG photo with known GPS metadata.
8. Select each photo in the Capacitor app.
9. Confirm `test_uploads.lat`, `test_uploads.lng`, and `test_uploads.taken_at` in Supabase.
10. Confirm the original exists under `photos/test-originals/<auth.uid()>/...`, then delete the test object after verification.

## Decision Rule

- If Galaxy Capacitor native picker preserves GPS, continue Supabase upload work through `pickPhotos()`.
- If Galaxy Android original media picker preserves GPS, keep `HeartPinMediaPlugin` as the Android library path and continue Supabase upload work through `pickPhotos()`.
- If Galaxy Android original media picker still strips GPS, keep the Android ZIP/original-file workaround and treat native Android upload as a deeper MediaStore/SAF task.
- Keep iOS on the existing Capacitor Camera/Photos picker for MVP because prior iOS testing preserved GPS metadata. Revisit a custom iOS native picker only when app-store UX polish becomes the priority.
