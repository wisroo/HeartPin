# HeartPin Phase 1 Supabase Setup

Phase 1의 목표는 Phase 0 로컬 서버를 Supabase 기반 영속화로 바꾸는 것이다. 아직 로컬 데모 경로는 기본값으로 유지한다.

## 1. 프로젝트 만들기

1. Supabase 프로젝트를 만든다.
2. 가능하면 서울 리전을 선택한다.
3. SQL editor에서 `supabase/schema.sql`을 실행한다.
4. Authentication에서 공유 계정 1개를 만든다.
5. Storage에 `photos` private bucket이 생성됐는지 확인한다.

## 2. 환경변수

`.env.example`을 기준으로 로컬 `.env.local`을 만든다.

```bash
VITE_HEARTPIN_API_MODE=local
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

현재 앱은 `local` 모드가 기본값이다. Supabase SDK 연결이 들어간 뒤 `VITE_HEARTPIN_API_MODE=supabase`로 전환한다.

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

1. `@supabase/supabase-js` 설치
2. `src/api.js`에 SupabaseAdapter 구현
3. 로그인 화면 추가
4. 클라이언트 업로드 파이프라인 추가: EXIF, 해시, WebP display/thumb 생성
5. `record.json` 마이그레이션 스크립트 작성
6. 외장하드 보관함 연결: FS Access API scan/copy/discard queue
