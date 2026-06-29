# HeartPin Mobile Design Shell — Design Spec

작성일: 2026-06-29
브랜치: `feature/mobile-design-shell`
디자인 출처: Claude Design 프로젝트 `ba7e4e10-7c96-4aee-9424-493fdc2a2892` · 파일 `HeartPin Mobile.html`
(구성 파일: `hpm-app/ui/journey/map/inbox/profile/upload.jsx`, `heartpin-data.js`)

> 참고: 디자인 원본 파일은 **수정하지 않는다**. 읽기만 하고, 구현은 레포의 새 React 코드로 한다.

## 1. 목표

Claude Design의 `HeartPin Mobile.html` 모바일 앱 디자인 전체(5탭 + 오버레이 + 색 테마)를 현재 MVP 모바일에 실데이터로 구현한다. 현재 런치 화면은 브랜드 스플래시로 유지하고, 디자인의 나머지 화면을 탭바 앱으로 붙인다.

## 2. 확정 결정 (사용자 합의)

1. **런치 = 버튼 없는 브랜드 스플래시.** 로고 + 바라♥뇽이 + D+N + 태그라인 유지. 기존 3개 버튼(오늘 사진 올리기 / 내 여정 둘러보기 / 정리함 N) **전부 제거**.
2. **스플래시 전환 = 자동.** 앱 열면 스플래시 ~1.5s 후 여정(Journey) 탭으로 자동 슬라이드. 화면 탭하면 즉시 스킵.
3. **owner 선택 이동.** 런치의 "누구의 폰인가요?"(owner pick) 제거 → Couple/Settings의 "내 캐릭터(myChar)"로 이동. 기본값 바라. 업로드 owner = `settings.myChar`.
4. **전체 앱 + 실데이터.** 5탭 + 오버레이 모두 구현, `useHeartPinState`에 연결. 백엔드 없는 부분만 데모.
5. **프리뷰 전용 크롬은 실앱에 미구현** (원본 삭제 아님): iOS/Android 토글, `TweaksPanel`, 하단 캡션, 가짜 폰 베젤/노치/가짜 상태바/홈인디케이터.
6. **색 테마 시스템 구현.** 디자인의 7테마(coral 기본 · trace · vivid · calm · mapfn · pop · dark)를 Settings 색 옵션으로 제공, localStorage 영속. `data-theme`로 적용.
7. **반응형 + 플랫폼 자동 적응.** 수동 OS 토글 없음. 뷰포트를 채우는 유동 레이아웃 + `env(safe-area-inset-*)` + iOS/Android 자동 감지(UA / Capacitor).
8. **업로드 = 디자인 시트 + 실백엔드.** 디자인 업로드 시트 UI를 실 파이프라인(`api.uploadPhotos` + EXIF/HEIC + `suggest` + `placePhotos`)에 연결. **진입은 FAB만**(런치 CTA 제거). 기존 `hpu-*` pick/reading/confirm/done 화면 은퇴.
9. **지도 탭 = 교체.** `MobileMapShell`(MapBoard + Rnb) + 옛 `hpm-*` CSS 제거, 디자인 `MapScreen`(3스냅 시트 + 스팟 레일 + 애니 핀)을 실데이터로 구현.
10. **이름 기본값 바라 / 뇽이** (Couple에서 편집 가능). **새 브랜치** `feature/mobile-design-shell`.

## 3. 데이터 정합성 (핵심)

실데이터 모델(`src/data.js` + 서버 `record.json`)이 디자인 데모 데이터와 사실상 동일:

- `regions.{domestic,intl}.trips[]` 동일 (`HP_DATA` ↔ 실 `regions`)
- trip: `{id, region, start, title, dateLabel, cover, tags[], days[]}`
- spot: `{id, name, time, lat, lng, mood, guide, reaction, photos[]}` — 실 스팟도 `guide`/`reaction`/`mood` 보유 (확인: `buildTrip.js`, `Rnb.jsx`, `Journey.jsx`)
- photo: 실데이터 `{src, label, ratio, tint}` (디자인은 `src` 없는 플레이스홀더)
- 헬퍼: `ordered()` ≡ `HP_ORDERED`, `suggest()` ≡ `HP_SUGGEST`, `autoLine()` ≡ `HP_AUTOLINE`

→ 화면 포팅 = 전역 `window.HP_*`를 실 `regions`/`ordered`/`suggest`/`inboxItems`로 치환 + 플레이스홀더 `Photo`를 실이미지 `Photo`로 치환. 로직 재작성 아님.

## 4. 파일 구조 (AGENTS.md: 모바일 셸은 `src/mobile/`)

```
src/mobile/
  MobileApp.jsx          (수정) 스플래시 vs 탭셸 라우팅 (app.screen)
  LaunchSplash.jsx       (신규) 버튼 없는 브랜드 스플래시 + 자동 전환(탭 스킵)
  MobileShell.jsx        (신규) 탭바 앱 루트: tab/detail/overlay 상태 + TabBar + FAB + 테마 적용
  screens/
    JourneyScreen.jsx    여정 홈 (trip 갤러리 + 통계 스트립 + 지역 필터)
    TripDetail.jsx       trip → days → spot 카드 (여정 재생 진입)
    MapScreen.jsx        Leaflet + 3스냅 바텀시트 + 스팟 레일
    InboxScreen.jsx      정리함 (그리드 + suggest "담기")
    ProfileScreen.jsx    우리 (커플/통계/메뉴)
  overlays/
    MomentViewer.jsx     사진 뷰어 + 반응 말풍선
    JourneyPlayer.jsx    시네마틱 재생 + 미니맵
    SettingsScreen.jsx   설정 (색 테마 picker 포함)
    CoupleScreen.jsx     이름·기념일·내 캐릭터(myChar=owner)
    UploadSheet.jsx      디자인 업로드 시트 UI + 실 업로드 파이프라인
  ui/MobileAtoms.jsx     hpm Photo/Avatar/Speech/Chip/Ico (실이미지 Photo)
  useMobileSettings.js   localStorage: theme, tone, mapSkin, showChars, nameBara, nameNyong, anniv, myChar, alerts
```

제거: `MobileMapShell.jsx` + 관련 옛 `hpm-*` CSS, `MobileUploadFlow.jsx`(런치는 LaunchSplash로, 업로드는 UploadSheet로 분해 후).

## 5. 내비게이션 모델

- **진입 = 스플래시**(`LaunchSplash`). `app.screen === "home"`. 버튼 없음. ~1.5s 후 `app.openMain()`, 탭하면 즉시. (저감 모션 사용자 위해 모션 최소화 고려)
- **탭셸**(`MobileShell`). `app.screen === "main"`. 로컬 상태 `tab`(journey/map/inbox/profile) · `detail`(trip drill-in) · `overlays[]`. 데이터/뮤테이션은 `app`(useHeartPinState) prop. 테마는 셸 루트 `data-theme={settings.theme}`.
  - 탭: 여정 · 지도 · **＋(FAB)** · 정리함 · 프로필
  - FAB(＋) → `UploadSheet` 오버레이 (**유일한 업로드 진입**)
  - 오버레이 스택: Moment / Player / Settings / Couple / Upload
  - `MapScreen` back → 여정 탭

## 6. 화면별 명세 (디자인 → 실 wiring)

| 화면 | 실 wiring | 데모/보류 |
|---|---|---|
| **여정**(JourneyScreen) | `regions` trips, 스팟/사진 수 집계, 지역 필터 전체/국내/국외 | "가장 가까운 추억" 한 줄은 정적 카피 |
| **TripDetail** | 실 `trip.days`, `ordered()`, 실 사진, 라인=`spot.guide/reaction`(없으면 `autoLine`) | — |
| **지도**(MapScreen) | 실 단일 trip + `ordered()`, `mapUtil.js`(TILES/ATTR/smooth) 재사용, 시트/레일/핀은 디자인 | — |
| **정리함**(InboxScreen) | `inboxItems`, `suggest()`, `inboxKeep/Discard/Purge`, `placePhotos`; "정리 필요" + 실 "완료" 카운트 | "흐릿(blurry)" 탭은 실데이터 분류 없음 → 우선 제외(데이터 태깅 시 부활) |
| **프로필/Couple/Settings** | D+N=`settings.anniv`(없으면 `api.ANNIVERSARY`=2024-06-29, 현재 날짜 기준), 통계=실 trips, 토글·이름·myChar=localStorage, **색 테마 picker** | — |
| **MomentViewer** | 실 `spot.photos` + 반응 라인 | — |
| **JourneyPlayer** | 실 스팟/사진 + 미니맵(Leaflet) + 라인 | 시네마틱, 실데이터. "큰 화면은 PC에서" 유지 |

## 7. 색 테마 시스템 (결정 6)

- 디자인 CSS의 `.hpm` 토큰 + `.hpm[data-theme="..."]` 7세트 + color-mix 파생 틴트를 그대로 사용.
- 셸 루트(`MobileShell`)에 `data-theme={settings.theme}` 적용. 기본 `coral`.
- Settings "화면 테마" 2열 그리드(7개 스와치) = 선택 UI. `dark` 포함.
- `settings.theme`는 `useMobileSettings`로 localStorage 영속.

## 8. 반응형 / 플랫폼 (결정 7)

- 셸은 뷰포트 풀: `height:100dvh`, 유동 폭(큰 폰/태블릿은 max-width 가드 검토). 디자인의 고정 384px 프레임 폭은 미사용.
- `index.html` viewport에 `viewport-fit=cover` 추가. 상단/탭바/오버레이 상단 패딩을 `env(safe-area-inset-top/bottom)`로 대체(디자인의 고정 46px/22px 패딩 대신).
- 플랫폼 감지: Capacitor면 `Capacitor.getPlatform()`, 아니면 UA(`/iPhone|iPad|iPod/`). 루트에 `data-platform` 부여. 주 용도는 safe-area·상태바 콘텐츠 색(지도 화면 라이트 텍스트) 정도; 대부분 env()가 자동 처리.
- 수동 iOS/Android 토글 없음.

## 9. 업로드 시트 재구성 (결정 8 상세)

디자인 시각 구조 + 기존 실 로직 병합. `UploadSheet.jsx`, FAB로만 진입:

- **pick:** 디자인 `hpm-overlay` + `hpm-sheet-modal` + `hpm-roll` 그리드. 실 카메라롤/카메라 `<input type=file>`(기존 `addFiles` 재사용), 실 선택.
- **업로드 진행:** 디자인엔 없음 → 톤 맞춘 reading 상태 추가(`api.uploadPhotos`의 `onProgress`).
- **confirm(한 장씩):** 디자인 `hpm-full` confirm UI에 기존 실 로직 이식: `suggest`, 세션 스팟 근접 매칭(`nearestSpot`), 새 장소 네이밍, GPS 없는 사진 처리, keep/discard/skip.
- **완료:** 디자인대로 토스트("N장 정리 완료") + close. 실 finish 연산(`placePhotos`/`opAddTrip`/`opInboxPurge`) 수행. 기존 done 요약 화면은 토스트로 대체.

## 10. 공유 atom & CSS

- `MobileAtoms.Photo`: `photo.src` 있으면 `hpm-photo`에 `backgroundImage`, 없으면 tint + 캡션(=`hp-photo` 방식).
- 디자인 CSS(토큰 + 7테마 + 모든 `hpm-*` 규칙에서 device-frame/controls/tweaks 블록 제외)를 `styles.css`에 추가. 옛 `MobileMapShell` `hpm-*` 규칙 제거(이름 충돌 해소).
- 폰트(Jua/Gowun Dodum/Quicksand): 현재 로딩 방식 확인 후 정렬(이미 로드 중이면 재사용, 아니면 `index.html`에 추가).

## 11. 설정 영속화

`useMobileSettings.js` — localStorage 훅. 키: theme, tone(담백/다정/장난), mapSkin(cozy/sepia/forest), showChars, nameBara, nameNyong, anniv, myChar(bara/nyong), alerts. D+N은 anniv 우선, 없으면 `api.ANNIVERSARY`. `setSettings(patch)`로 갱신.

## 12. 테스트 / 검증

- `MobileShell` 라우팅: 스플래시 자동 전환 → 탭 ↔ 오버레이, FAB → UploadSheet.
- 여정/정리함이 실 상태 렌더(빈 상태 포함, Phase 0 빈 기록 대응).
- 테마 전환 시 `data-theme` 반영.
- 기존 vitest + Testing Library 셋업 재사용. 명령: `npm test -- --run` · `npm run build` · `git diff --check`.

## 13. 리스크 / 주의

- 업로드 시트 재구성이 가장 위험. 기존 실 업로드 로직(세션 스팟, 네이밍, dup, place vs new trip) 손실 없이 디자인 UI에 이식. 이식 전 기존 동작 테스트로 고정.
- 옛 `hpm-*` 제거 시 `MobileMapShell` 의존 코드/CSS 누락 확인.
- 모바일은 실기기/사진/EXIF 의존 → 업로드 경로는 Local-only 수동 검증 별도(AGENTS.md).
- Leaflet 인스턴스 2개(MapScreen, JourneyPlayer 미니맵) 정리(`map.remove()`) 누락 주의.
- 스플래시 자동 전환은 저감 모션·접근성 고려(탭 스킵 항상 가능).

## 14. 범위 외 (이번 브랜치 아님)

- Capacitor 네이티브 업로드 spike (별도 `spike/capacitor-mobile-upload`)
- 데스크톱 웹(`src/web/`) 변경 — 손대지 않음
- 정리함 흐릿/AI 품질 분류, 역지오코딩(Phase 5)
- 커스텀 색 팔레트 편집(디자인 제공 7테마 외 사용자 정의 색)
