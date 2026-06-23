# HeartPin Phase 1 Supabase Setup

Phase 1의 목표는 Phase 0 로컬 서버를 Supabase 기반 영속화로 바꾸는 것이다. 아직 로컬 데모 경로는 기본값으로 유지한다.

## 1. 프로젝트 만들기

1. Supabase 프로젝트를 만든다.
2. 가능하면 서울 리전을 선택한다.
3. SQL editor에서 `supabase/schema.sql`을 실행한다.
4. Authentication에서 공유 계정 1개를 만든다.
5. Storage에 `photos` private bucket이 생성됐는지 확인한다.

### 1-1. Supabase 프로젝트 생성

1. Supabase 대시보드에 로그인한다.
2. **New project**를 누른다.
3. Organization을 선택한다.
4. Project name은 예: `heartpin`.
5. Database password를 만든 뒤 안전한 곳에 보관한다.
6. Region은 가능하면 **Northeast Asia / Seoul** 계열을 고른다.
7. 프로젝트 생성이 끝날 때까지 기다린다.

### 1-2. SQL 실행

1. 왼쪽 메뉴에서 **SQL Editor**를 연다.
2. **New query**를 누른다.
3. 이 레포의 `supabase/schema.sql` 전체 내용을 붙여 넣는다.
4. **Run**을 누른다.
5. 왼쪽 **Table Editor**에서 `trips`, `days`, `spots`, `moments`, `inbox_items`, `photo_copies`, `transfer_queue`가 생겼는지 확인한다.

이 SQL은 다음을 함께 만든다.

- 기록용 테이블
- RLS 활성화
- authenticated 사용자용 기본 정책
- `photos` private Storage bucket
- `storage.objects` 정책

### 1-3. Auth에서 공유 계정 만들기

HeartPin은 2인 전용 MVP에서 **공유 계정 1개 + owner 토글(바라/뇽이)** 방식을 쓴다.

1. 왼쪽 메뉴에서 **Authentication**을 연다.
2. **Users** 또는 **Add user** 화면으로 간다.
3. **Add user**를 누른다.
4. Email은 둘이 공유할 주소를 넣는다. 예: `heartpin-couple@example.com`.
5. Password를 설정한다.
6. 가능하면 **Auto Confirm User** 또는 email confirmed 옵션을 켠다.
7. 생성 후 Users 목록에 계정이 보이면 완료.

주의:

- 이 계정은 앱 로그인용이다.
- 바라/뇽이 구분은 계정 2개로 하지 않고 앱 내부 owner 선택값으로 기록한다.
- 나중에 권한 모델이 필요해질 때만 계정 분리를 검토한다.

### 1-4. Storage `photos` private bucket 확인

`supabase/schema.sql`이 정상 실행되면 bucket은 자동 생성된다.

1. 왼쪽 메뉴에서 **Storage**를 연다.
2. bucket 목록에 `photos`가 있는지 확인한다.
3. `photos` bucket이 **Public**이 아닌지 확인한다.
4. 없으면 **New bucket**을 눌러 직접 만든다.
   - Name: `photos`
   - Public bucket: off

경로 규칙:

```text
photos/display/<content_hash>.webp
photos/thumb/<content_hash>.webp
```

원본 사진은 기본적으로 Supabase에 영구 보관하지 않는다. Supabase Storage는 표시용 압축본과 썸네일을 맡는다.

## 2. 환경변수

`.env.example`을 기준으로 로컬 `.env.local`을 만든다.

```bash
VITE_HEARTPIN_API_MODE=supabase
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

현재 앱은 `local` 모드가 기본값이다. Supabase SDK 연결이 들어간 뒤 `VITE_HEARTPIN_API_MODE=supabase`로 전환한다.

### 2-1. URL과 anon key 찾기

1. Supabase 프로젝트에서 **Project Settings**를 연다.
2. **API** 메뉴로 간다.
3. 다음 값을 복사한다.
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

`service_role` key는 클라이언트 `.env.local`에 넣지 않는다. 브라우저에 노출되면 안 된다.

### 2-2. `.env.local` 만들기

프로젝트 루트에 `.env.local`을 만든다. 이 파일은 git에 커밋하지 않는다.

```bash
VITE_HEARTPIN_API_MODE=supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

아직 SupabaseAdapter 구현 전이면 `VITE_HEARTPIN_API_MODE=local`로 둔다.

```bash
VITE_HEARTPIN_API_MODE=local
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

설정 후 앱을 재시작한다.

```bash
npm run dev
```

Vite 환경변수는 dev server 시작 시 읽히므로 `.env.local` 수정 후 재시작이 필요하다.

## 3. Adapter 구조

화면 코드는 `src/api.js`만 호출한다.

- `src/adapters/localAdapter.js`: Phase 0 로컬 Express 서버
- `src/adapters/supabaseAdapter.js`: Phase 1 구현 자리

Supabase 계정 설정 전에는 `local` 모드로 계속 개발한다.

```bash
npm run build
npm run demo
```

## 4. 데이터 계약

Phase 0의 `record.json`은 다음 구조로 Supabase에 풀어 넣는다.

- `regions.*.trips[]` → `trips`
- `trip.days[]` → `days`
- `day.spots[]` → `spots`
- `spot.photos[]` → `moments`
- `inbox[]` → `inbox_items`
- `photos_index` → `photo_copies`의 초기 소재 추적 데이터

사진 파일은 Supabase Storage `photos` bucket에 둔다.

- `display/<hash>.webp`
- `thumb/<hash>.webp`

원본은 MVP에서 클라우드 영구 보관 대상이 아니다. 원본 위치와 상태는 `content_hash`, `owner`, `original_status`, `photo_copies`로 추적한다.

## 5. record.json export

Supabase 설정 전에도 Phase 0 데이터를 import 준비 형태로 변환할 수 있다.

```bash
npm run export:record
```

기본 입력은 `vault/HeartPin/record.json`, 기본 출력은 `tmp/supabase-import.json`이다. 경로를 직접 넘길 수도 있다.

```bash
npm run export:record -- /Volumes/YourDrive/HeartPin/record.json tmp/supabase-import.json
```

## 6. 다음 구현 순서

Android 브라우저 사진 선택기가 위치 EXIF를 제거하는 문제가 확인됐으므로, 모바일 업로드는 SupabaseAdapter 구현 전에 Capacitor dev app spike로 검증한다.

1. Capacitor dev app spike: Android/iOS 네이티브 사진 선택에서 EXIF/GPS 보존 확인
2. `@supabase/supabase-js` 설치
3. `src/api.js`에 SupabaseAdapter 구현
4. 로그인 화면 추가
5. 클라이언트 업로드 파이프라인 추가: EXIF, 해시, WebP display/thumb 생성
6. `record.json` 마이그레이션 스크립트 작성
7. 외장하드 보관함 연결: FS Access API scan/copy/discard queue

Capacitor spike 설계는 `docs/superpowers/specs/2026-06-23-capacitor-mobile-upload-design.md`를 따른다.
