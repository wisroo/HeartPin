# HeartPin App Structure Plan

작성일: 2026-06-19

이 문서는 HeartPin을 웹, 모바일 웹, iOS, Android까지 확장할 때의 레포 구조와 개발 원칙을 정의한다.

## 결정

현재 단계에서는 레포를 나누지 않는다.

대신 단일 레포 안에서 Web UI와 Mobile UI를 독립적인 앱 셸로 분리하는 방향을 채택한다. PC 화면과 모바일 화면은 크기만 다른 같은 UI가 아니라, 서로 다른 내비게이션과 작업 흐름을 가진다.

## 왜 단일 레포인가

HeartPin은 다음 로직을 여러 플랫폼에서 공유해야 한다.

- Trip, Day, Spot, Moment 데이터 모델
- 사진 메타데이터와 EXIF/GPS 처리
- 여행 자동 조립 로직
- StorageAdapter
- 지도 좌표와 경로 유틸
- 업로드 파이프라인
- 캐릭터, 대사, 기록 도메인 규칙

레포를 웹/모바일로 나누면 이 로직이 중복되기 쉽다. 지금은 제품과 데이터 모델이 빠르게 바뀌는 단계이므로, 단일 레포에서 공유 영역을 먼저 안정화하는 편이 낫다.

## Dual Shell 원칙

공유할 것과 분리할 것을 명확히 나눈다.

공유할 것:

- 도메인 모델
- 데이터 변환 로직
- 저장소 어댑터 인터페이스
- EXIF/GPS 처리
- 지도 유틸
- 업로드 핵심 로직
- 순수 UI primitives

분리할 것:

- PC용 레이아웃
- 모바일용 내비게이션
- 모바일 화면 전환
- 모바일 업로드 UX
- 모바일 지도/바텀시트 구성
- iOS/Android 네이티브 권한과 파일 접근

## 목표 구조

현재 코드를 즉시 전부 이동하지 않는다. 다른 컴퓨터의 로컬 변경사항을 반영한 뒤, 다음 구조를 기준으로 점진적으로 분리한다.

```text
src/
  app/
    web/
      WebApp.jsx
      WebShell.jsx
    mobile/
      MobileApp.jsx
      MobileShell.jsx

  features/
    trips/
    upload/
    inbox/
    gallery/
    journey/
    map/

  components/
    common/
    web/
    mobile/

  domain/
    tripModel.js
    buildTrip.js

  services/
    exif/
    storage/
    filesystem/
    map/
    llm/

  platform/
    web/
    capacitor/
```

## WebApp

WebApp은 데스크톱과 큰 화면을 위한 앱이다.

기준:

- 지도와 기록 패널을 동시에 보여준다.
- 넓은 화면에서 정보 밀도를 높인다.
- 마우스, 키보드, 패널 도킹, 사이드바에 최적화한다.
- 긴 기록 탐색과 정리 작업에 유리해야 한다.

예상 화면:

- Home
- Map board
- Right navigation/record panel
- Gallery dock
- Inbox panel
- Journey fullscreen

## MobileApp

MobileApp은 모바일 브라우저, PWA, iOS/Android 앱의 기준 UI다.

기준:

- 데스크톱 UI를 단순 축소하지 않는다.
- 하단 탭바 또는 네이티브 앱에 가까운 내비게이션을 사용한다.
- 한 화면에 하나의 주요 작업만 둔다.
- 지도는 풀스크린과 바텀시트 조합을 우선한다.
- 업로드, 확인, 정리 흐름을 터치 중심으로 설계한다.

예상 화면:

- Home
- Map tab
- Upload tab
- Inbox tab
- Gallery detail
- Journey playback
- Settings

## iOS/Android 전략

초기 앱 전략은 Capacitor 기반을 우선한다.

이유:

- React/Vite 코드와 도메인 로직을 재사용할 수 있다.
- 모바일 웹 UI를 PWA와 앱에서 함께 발전시킬 수 있다.
- 나중에 카메라롤, 파일 권한, 푸시 알림 등 네이티브 기능을 얇게 붙일 수 있다.

Capacitor 앱은 MobileApp을 엔트리로 사용한다.

```text
Web browser, desktop width -> WebApp
Mobile browser / PWA       -> MobileApp
iOS / Android app          -> MobileApp + platform/capacitor
```

## Platform Adapter 원칙

브라우저와 네이티브 앱의 차이는 feature 코드 안에 흩뿌리지 않는다.

예:

```text
services/filesystem
- Web: File System Access API
- Capacitor: native filesystem/photo permissions

services/storage
- Local prototype: in-memory data
- MVP: SupabaseAdapter
- Future: DriveAdapter

services/media
- Web: browser file input
- Capacitor: camera roll/photo library
```

기능 코드는 "사진을 선택한다", "원본을 저장한다", "권한을 요청한다" 같은 의도를 호출하고, 실제 플랫폼별 구현은 adapter가 맡는다.

## 언제 레포를 나눌 것인가

지금은 나누지 않는다.

레포 분리는 아래 조건 중 여러 개가 동시에 만족될 때 다시 검토한다.

- 네이티브 앱이 Capacitor 수준을 넘어 별도 네이티브 UI를 상당 부분 갖는다.
- 웹과 앱의 릴리스 주기, 팀, 테스트 체계가 분리된다.
- 공유 패키지를 독립 버전으로 배포할 필요가 생긴다.
- 단일 레포 빌드 시간이 개발 속도를 크게 방해한다.

그 전까지는 단일 레포에서 dual shell 구조를 유지한다.

## 다음 리팩터링 순서

다른 컴퓨터의 로컬 변경사항을 반영한 뒤 다음 순서로 진행한다.

1. 현재 `App.jsx`가 맡은 화면 전환과 상태 wiring을 파악한다.
2. 데스크톱 현재 UI를 `WebApp` 개념으로 보존한다.
3. 모바일용 `MobileApp` 셸을 별도로 만든다.
4. 공통 도메인 로직과 UI primitives를 먼저 이동한다.
5. 업로드, 지도, 정리함처럼 플랫폼 차이가 큰 기능은 adapter 경계를 만든 뒤 분리한다.
6. PWA/Capacitor 설정은 MobileApp 구조가 안정된 뒤 추가한다.

## 자동화와의 관계

Cloud-friendly 자동화는 공유 코드와 WebApp 빌드가 깨지지 않는지 확인한다.

Local-only 검증은 MobileApp, PWA, Capacitor, 사진/외장하드 권한처럼 실제 기기 상태가 필요한 흐름을 확인한다.

자동화 문서는 `docs/AUTOMATION.md`를 따른다.
