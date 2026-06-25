# HeartPin · 하트핀

사진 기반으로 Trip → Day → Spot → Moment 단위의 여정을 자동 정리하고, 지도 + 게임 감성 인터페이스로 "우리들의 기록"을 보여주는 커플 전용 웹.

claude.ai/design 프로토타입(`HeartPin.html`)을 Vite + React로 구현한 버전입니다.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 미리보기
```

Vercel 배포: 저장소 연결만 하면 Vite 프리셋으로 자동 인식됩니다.

## Phase 1 Supabase 준비

Phase 1 전환용 스키마와 환경변수 계약은 레포에 포함되어 있습니다.

- `supabase/schema.sql`: 테이블, RLS, private `photos` 버킷 정책
- `.env.example`: `VITE_HEARTPIN_API_MODE`, `VITE_HEARTPIN_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `docs/PHASE1_SUPABASE.md`: Supabase 프로젝트 셋업 순서

현재 기본 실행 모드는 `local`입니다. Supabase SDK 연결이 들어간 뒤 `VITE_HEARTPIN_API_MODE=supabase`로 전환합니다.

## 모바일 앱 개발 환경

모바일 업로드 GPS/EXIF 검증은 Capacitor dev app으로 진행합니다. 웹 빌드는 `npm run build`, Capacitor 동기화는 `npm run cap:sync`를 사용합니다.

### Android

Android debug build에는 JDK 21과 Android Studio가 필요합니다.

```bash
brew install --cask temurin@21
java -version
npm run cap:sync
cd android
./gradlew assembleDebug
```

현재 Android scaffold는 Gradle 8.11.1, Android Gradle Plugin 8.7.2, Java 21 compatibility로 생성되어 있습니다. Java 24는 현재 Gradle wrapper와 맞지 않으므로 사용하지 않습니다.

Android SDK를 못 찾는 경우 Android Studio에서 SDK를 설치한 뒤 `android/local.properties`에 로컬 경로를 설정합니다. 일반적인 경로는 다음과 같습니다.

```properties
sdk.dir=/Users/a11791/Library/Android/sdk
```

Android Studio 전체 설치가 막히면 command line tools만으로도 SDK를 구성할 수 있습니다.

```bash
brew install --cask android-commandlinetools
yes | sdkmanager --sdk_root=/Users/a11791/Library/Android/sdk "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

Galaxy 실기기 설치는 Android Studio에서 `android/` 프로젝트를 열거나, 환경 준비 후 `npm run cap:android`로 진행합니다.

Capacitor dev app에서 Phase 0 로컬 서버를 쓰려면 APK 빌드 전에 `.env.local`의 `VITE_HEARTPIN_API_BASE_URL`을 폰에서 접근 가능한 Mac 서버 주소로 설정합니다.

```bash
VITE_HEARTPIN_API_BASE_URL=http://10.250.186.63:3300
```

### iOS

iOS dev install에는 full Xcode와 CocoaPods가 필요합니다. Xcode 앱은 `/Applications/Xcode.app`에 두고 CLI가 Xcode를 바라보게 설정합니다.

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcodebuild -version
brew install cocoapods
pod --version
npx cap add ios
npm run cap:sync
```

iPhone 실기기 설치는 `npm run cap:ios`로 Xcode를 열어 진행합니다.

## 구조

```
src/
├── main.jsx               엔트리 (leaflet css + styles.css)
├── App.jsx                화면 전환(Home/Main)·상태·키보드 내비 wiring
├── styles.css             코지 디자인 시스템 전체 (프로토타입 1:1)
├── data.js                샘플 여행(부산/오사카·교토)·정리함 데이터·배치 추천(suggest)·자동 대사(autoLine)
├── exif.js                의존성 없는 JPEG EXIF 파서 (촬영일시 + GPS)
├── buildTrip.js           새 여행 자동 조립 (날짜→Day, GPS ~300m 클러스터→Spot, 좌표→국내/국외)
├── chars.js               바라·뇽이 캐릭터 에셋
├── mapUtil.js             Leaflet 헬퍼 (Catmull-Rom 곡선, 핀/캐릭터/여행 divIcon)
└── components/
    ├── ui.jsx             Avatar · Photo(플레이스홀더/실사진) · Speech(인라인 편집) · Chip
    ├── Home.jsx           진입 화면 (히어로·국내외 토글·최근 여행·빠른 진입)
    ├── MapBoard.jsx       메인 지도 (코지 타일·곡선 타임라인·핀 상태 동기화)
    ├── Rnb.jsx            기록 패널 (전체 여정 목록 ↔ 카드뉴스 덱, 접기)
    ├── Gallery.jsx        모먼트 뷰어 (지도 영역 도킹, ‹ 사진 N/M › 페이저)
    ├── Journey.jsx        풀스크린 시네마틱 재생 (인트로→Spot 씬→엔딩)
    ├── Inbox.jsx          정리함 (미분류/위치없음/검토함, 배치 확인, 새 장소/새 여행)
    ├── Upload.jsx         다중 드래그&드롭 업로드 (EXIF 읽기 + 데모 메타 폴백)
    └── TripPreview.jsx    "이렇게 정리했어요" 새 여행 미리보기/저장
```

## 추후 작업 메모 (디자인 핸드오프 기준)

- **Mapbox 전환**: 마커가 전부 HTML divIcon이라 그대로 이식 가능. 타일을 Mapbox 스타일로 교체하고 `styles.css`의 `.skin-*` 색 필터 제거. 곡선/핀/캐릭터 로직(`mapUtil.js`)은 좌표 기반이라 재사용.
- **역지오코딩**: 새 장소 이름("장소 1·2…")을 좌표→실제 지명으로 자동 채우기 (Mapbox 전환 시 연결).
- **HEIC 메타**: 브라우저에서 파싱 불가 → 현재 데모 메타(강릉) 폴백. 실서비스는 백엔드 추출로 교체 (`Upload.jsx`의 `process()` 한 곳만 수정).
- **Settings 화면**: 캐릭터 선택·지도 스킨(cozy/sepia/forest CSS는 이미 있음)·표기 언어. 현재 기본값은 `App.jsx`의 `SKIN`/`SHOW_CHARS` 상수.
- **영속화**: 데이터가 메모리(`data.js`의 HP_DATA) 상태라 새로고침하면 초기화됨. localStorage 또는 백엔드 연동 필요.
- **LLM 대사 생성**: 현재는 시간대별 템플릿(`autoLine`). 위치명+사진 맥락 기반 생성으로 확장 가능.
