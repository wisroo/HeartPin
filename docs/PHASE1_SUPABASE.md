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
5. 왼쪽 **Table Editor**에서 `trips`, `days`, `spots`, `moments`, `inbox_items`, `photo_copies`, `transfer_queue`, `test_uploads`가 생겼는지 확인한다.

이 SQL은 다음을 함께 만든다.

- 기록용 테이블
- RLS 활성화
- authenticated 사용자용 기본 정책
- `photos` private Storage bucket
- `storage.objects` 정책
- Supabase mobile upload spike용 `test_uploads` 테이블

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
photos/test-originals/<auth.uid()>/<upload_session_id>/<safe_file_name>
```

원본 사진은 기본적으로 Supabase에 영구 보관하지 않는다. Supabase Storage는 표시용 압축본과 썸네일을 맡는다. `test-originals/`는 Galaxy/iPhone 실기기 업로드 검증을 위한 임시 prefix다.

Supabase Storage의 폴더는 실제 파일시스템 디렉터리가 아니라 object key prefix다. 앱은 다음 규칙으로 path를 만든다.

- `test-originals/<auth.uid()>/...`: 현재 로그인 사용자만 읽기/쓰기/삭제 가능
- `display/`, `thumb/`: authenticated 사용자 읽기/쓰기 가능
- 삭제는 Storage API로 수행한다. `storage.objects` metadata를 SQL로 직접 지우지 않는다.

## 2. 환경변수

`.env.example`을 기준으로 로컬 `.env.local`을 만든다.

```bash
VITE_HEARTPIN_API_MODE=supabase
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

현재 앱은 `local` 모드가 기본값이다. Supabase 실기기 업로드 테스트를 할 때 `VITE_HEARTPIN_API_MODE=supabase`로 전환한다.

### 2-1. URL과 Publishable API Key 찾기

1. Supabase 프로젝트에서 **Project Settings**를 연다.
2. **API** 메뉴로 간다.
3. 다음 값을 복사한다.
   - Project URL → `VITE_SUPABASE_URL`
   - Publishable API Key → `VITE_SUPABASE_PUBLISHABLE_KEY`

`Secret API Key`와 `service_role` key는 클라이언트 `.env.local`에 넣지 않는다. 브라우저에 노출되면 안 된다.

### 2-2. `.env.local` 만들기

프로젝트 루트에 `.env.local`을 만든다. 이 파일은 git에 커밋하지 않는다.

```bash
VITE_HEARTPIN_API_MODE=supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

로컬 Express 서버 테스트를 계속하려면 `VITE_HEARTPIN_API_MODE=local`로 둔다.

```bash
VITE_HEARTPIN_API_MODE=local
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

설정 후 앱을 재시작한다.

```bash
npm run dev
```

Vite 환경변수는 dev server 시작 시 읽히므로 `.env.local` 수정 후 재시작이 필요하다.

Supabase 로그인 계정의 비밀번호는 `.env.local`에 넣지 않는다. Supabase 모드로 실행하면 앱 부팅 시 로그인 화면이 나오며, Authentication에서 만든 공유 계정 이메일/비밀번호를 직접 입력한다.

## 3. 모바일 Supabase 업로드 테스트

이 경로는 Mac 로컬 서버나 같은 Wi-Fi에 의존하지 않는다.

1. Supabase SQL editor에서 최신 `supabase/schema.sql`을 실행한다.
2. `.env.local`을 Supabase 모드로 설정한다.
3. `npm run cap:sync`를 실행한다.
4. Galaxy는 Android Studio 또는 debug APK로 설치한다. iPhone은 Xcode dev install로 설치한다.
5. 앱을 열고 Supabase 공유 계정으로 로그인한다.
6. 카메라롤에서 GPS가 있는 사진을 고른다.
7. 업로드 후 Supabase Table Editor에서 `test_uploads.lat`, `test_uploads.lng`, `test_uploads.taken_at`을 확인한다.
8. Storage에서 `photos/test-originals/<auth.uid()>/...` object가 생성됐는지 확인한다.

임시 원본 삭제는 Storage API 또는 Supabase dashboard의 Storage 화면에서 진행한다. 삭제 후 `test_uploads.deleted_at`은 추후 cleanup 도구에서 채운다.

## 4. Adapter 구조

화면 코드는 `src/api.js`만 호출한다.

- `src/adapters/localAdapter.js`: Phase 0 로컬 Express 서버
- `src/adapters/supabaseAdapter.js`: Phase 1 구현 자리

Supabase 계정 설정 전에는 `local` 모드로 계속 개발한다.

```bash
npm run build
npm run demo
```

## 5. 데이터 계약

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

## 6. record.json export

Supabase 설정 전에도 Phase 0 데이터를 import 준비 형태로 변환할 수 있다.

```bash
npm run export:record
```

기본 입력은 `vault/HeartPin/record.json`, 기본 출력은 `tmp/supabase-import.json`이다. 경로를 직접 넘길 수도 있다.

```bash
npm run export:record -- /Volumes/YourDrive/HeartPin/record.json tmp/supabase-import.json
```

## 7. 다음 구현 순서

Android 브라우저 사진 선택기가 위치 EXIF를 제거하는 문제가 확인됐으므로, 모바일 업로드는 Capacitor dev app과 Supabase 임시 업로드 경로로 먼저 검증한다.

1. Galaxy/iPhone Capacitor 앱에서 `test_uploads.lat/lng` 보존 확인
2. 임시 원본 cleanup 도구 추가
3. 클라이언트 업로드 파이프라인 확장: 해시, WebP display/thumb 생성
4. `record.json` 마이그레이션 스크립트 작성
5. 외장하드 보관함 연결: FS Access API scan/copy/discard queue

Capacitor spike 설계는 `docs/superpowers/specs/2026-06-23-capacitor-mobile-upload-design.md`를 따른다.
