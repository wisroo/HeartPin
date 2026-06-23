# Capacitor Mobile Upload Design

작성일: 2026-06-23

## 배경

HeartPin 모바일 업로드는 Android 브라우저 사진 선택기에서 위치 EXIF가 제거되는 문제가 확인됐다. 같은 사진이라도 카카오톡처럼 사진 권한을 받은 앱의 갤러리 선택 경로에서는 위치정보가 전달된다.

따라서 모바일 업로드 신뢰성을 확보하려면 웹 `<input type="file">` 경로만 개선하는 것이 아니라, Capacitor dev app에서 native photo picker 권한 경로를 먼저 검증해야 한다.

## 결정

Supabase 업로드 구현 전에 **Capacitor dev app spike**를 진행한다.

목표는 Play Store/App Store 배포가 아니다. Android debug APK와 iOS Xcode 실기기 설치로 갤럭시/iPhone에서 native picker가 EXIF/GPS를 보존하는지 확인한다.

## 목표

- 기존 React/Vite 앱과 Mobile shell을 재사용한다.
- Android/iOS dev app을 설치 가능한 상태로 만든다.
- native photo picker에서 선택한 사진의 metadata/EXIF/GPS 보존 여부를 확인한다.
- web input 경로와 native picker 경로의 결과를 비교한다.
- Supabase upload adapter가 사용할 media picker 계약을 확정한다.

## 비목표

- Play Store/App Store 배포
- 푸시 알림
- 폰에서 사진 삭제
- 전체 카메라롤 자동 스캔
- SupabaseAdapter 전체 구현

## 접근

단일 레포를 유지한다.

```text
Web/PWA
  -> webMediaPicker
  -> browser file input
  -> Android에서 lat/lng null 가능

Capacitor app
  -> capacitorMediaPicker
  -> native photo permission / picker
  -> metadata/EXIF/GPS 보존 검증
```

`MobileUploadFlow`는 장기적으로 직접 `<input type="file">`을 열지 않고 media picker adapter를 호출한다. 이 spike에서는 adapter 경계를 먼저 만들고, 실제 연결은 최소 범위로 검증한다.

## Media Picker 계약

목표 interface:

```js
async function pickPhotos(options) {
  return [
    {
      name,
      mimeType,
      size,
      lastModified,
      bytes,
      takenAt,
      lat,
      lng,
      source
    }
  ];
}
```

필드 의미:

- `name`: 원본 파일명 또는 플랫폼 제공 이름
- `mimeType`: 이미지 MIME type
- `size`: 원본 바이트 크기
- `lastModified`: 파일 수정 시각
- `bytes`: hash/upload에 사용할 원본 바이트
- `takenAt`: EXIF 촬영 시각
- `lat`, `lng`: EXIF GPS 좌표. 없으면 `null`
- `source`: `web-input`, `capacitor-camera`, `capacitor-photos` 등

## 검증 절차

Android:

1. 갤럭시에 dev build 설치
2. 원본에 GPS가 있는 같은 사진을 준비
3. 웹 input 경로로 선택해 lat/lng 결과 확인
4. native picker 경로로 선택해 lat/lng 결과 확인
5. 결과를 문서에 기록

iOS:

1. iPhone에 Xcode dev install
2. HEIC/JPEG 각각 1장 이상 선택
3. native picker 경로에서 takenAt/lat/lng 결과 확인
4. 결과를 문서에 기록

## 완료 기준

- Android dev app 설치 가능
- iOS dev app 설치 가능
- native picker에서 EXIF/GPS 보존 여부 기록
- web input과 native picker 결과 비교
- Supabase 업로드 전에 사용할 media picker 계약 확정

## 다음 단계

1. Capacitor 스캐폴딩 계획 작성
2. Android/iOS dev build 설정
3. `src/platform/media/` adapter 추가
4. 실기기 검증 결과 기록
5. SupabaseAdapter 구현으로 이동
