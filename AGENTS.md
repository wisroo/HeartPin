# AGENTS.md

HeartPin에서 Codex가 작업할 때 따르는 프로젝트 운영 규칙이다. 사용자의 명시 지시가 항상 우선한다.

## Default Work Loop

사용자가 단순 질문만 한 경우가 아니라면, Codex는 매번 아래 순서로 스스로 작업을 구분하고 진행한다.

1. **상황 파악**
   - `git status --short --branch`로 현재 변경사항을 먼저 확인한다.
   - 기존 로컬 변경은 사용자 작업으로 간주하고 되돌리지 않는다.
   - 관련 문서(`README.md`, `docs/ROADMAP.md`, `docs/APP-STRUCTURE.md`, `docs/AUTOMATION.md`, 활성 계획 문서)를 먼저 읽는다.

2. **작업 분류**
   - 문서/설정만 바꾸는 작업인지, 코드 동작을 바꾸는 작업인지 구분한다.
   - Web, Mobile, shared core, Local-only workflow, Cloud-friendly workflow 중 어느 영역인지 명시한다.
   - 외장하드, 사진 원본, 브라우저 권한, 로컬 `.env`가 필요한 검증은 Cloud-friendly 작업과 분리한다.

3. **계획**
   - 2단계 이상이거나 코드 동작이 바뀌면 짧은 계획을 세운다.
   - 이미 `docs/superpowers/plans/`에 관련 계획이 있으면 그 계획을 최신 `main` 기준으로 검토하고 필요한 경우 먼저 수정한다.
   - 계획은 작고 검증 가능한 단위로 나눈다.

4. **개발**
   - 변경은 요청 범위에 직접 필요한 파일에만 한다.
   - Web/Mobile shell 구조를 유지한다.
   - shared state는 `src/core/`, desktop shell은 `src/web/`, mobile shell은 `src/mobile/`, 공유 feature shell은 `src/features/` 아래에 둔다.
   - 플랫폼 차이는 feature 코드에 흩뿌리지 말고 adapter 또는 shell 경계로 분리한다.

5. **테스트**
   - 코드 동작을 바꾸면 먼저 테스트를 추가하거나 기존 테스트를 갱신한다.
   - 기본 검증 명령은 다음 순서로 사용한다.

     ```bash
     npm test -- --run
     npm run build
     git diff --check
     ```

   - 테스트가 없는 영역은 최소한 빌드와 수동 검증 절차를 남긴다.

6. **리뷰와 수정**
   - 완료 전 `git diff`를 보고 변경 범위가 요청과 맞는지 자체 리뷰한다.
   - 실패한 테스트, 빌드 오류, 불필요한 파일 변경, 사용하지 않는 코드가 있으면 최종 보고 전에 수정한다.
   - 보안/개인정보/사진 원본/외장하드 관련 변경은 리스크를 별도로 언급한다.

7. **검수 보고**
   - 최종 응답에는 변경 파일, 검증 명령 결과, 남은 리스크를 짧게 보고한다.
   - 커밋, push, PR 생성은 사용자가 요청했을 때만 수행한다.

## Planning Rules

- 사용자가 "다음 작업 진행"처럼 범위를 넓게 말하면, 활성 계획 문서와 최신 `main` 상태를 대조한 뒤 다음으로 검증 가능한 작업을 선택한다.
- 기존 계획이 실제 코드와 어긋나면 구현보다 계획 수정이 먼저다.
- 큰 기능은 한 번에 끝내려 하지 말고 `계획 → 작은 구현 → 테스트 → 리뷰` 단위로 끊는다.
- 단순 문서 수정에는 과한 테스트를 붙이지 않는다. 대신 `git diff --check`를 확인한다.

## App Structure Rules

- 단일 레포를 유지한다.
- 데스크톱 UI와 모바일 UI는 독립 shell로 취급한다.
- 데스크톱 UI를 CSS만으로 모바일에 억지로 축소하지 않는다.
- 현재 구조 기준:
  - `src/App.jsx`: app root, shell 선택, global modal wiring
  - `src/core/`: shared state, responsive mode, domain-facing hooks
  - `src/web/`: desktop shell
  - `src/mobile/`: mobile shell and mobile-first flows
  - `src/features/`: shared feature shells
  - `src/adapters/`: Local/Supabase 등 storage adapter

## React Coding Rules

- 컴포넌트는 기본적으로 작고 목적이 분명해야 한다. 한 컴포넌트가 화면 배치, 데이터 로딩, 변이, 복잡한 계산을 모두 맡기 시작하면 hook 또는 하위 컴포넌트로 나눈다.
- UI shell 컴포넌트는 layout과 composition을 맡고, 서버 동기화와 도메인 변이는 `src/core/` hook 또는 adapter를 통해 처리한다.
- React state는 실제 렌더링 상태에만 사용한다. props나 기존 state에서 계산 가능한 값은 렌더 중 계산하거나 `useMemo`가 실질적으로 필요한 경우에만 memoize한다.
- `useEffect`는 외부 시스템과 동기화할 때만 사용한다. 단순 파생 상태 계산, 이벤트 핸들러 내부 처리, 렌더링용 데이터 가공을 effect로 옮기지 않는다.
- event handler는 명확한 사용자 의도를 이름으로 드러낸다. 예: `openInbox`, `saveNewTrip`, `changeRegion`.
- hook dependency 경고를 무시하지 않는다. dependency를 줄이고 싶으면 로직을 재구성한다.
- list rendering에는 안정적인 id key를 우선 사용한다. 순서가 바뀔 수 있는 데이터에 index key를 쓰지 않는다.
- DOM 접근은 마지막 수단으로 제한한다. 지도, 파일 input, 브라우저 권한처럼 imperative API가 필요한 경우에만 `ref`를 사용한다.
- 컴포넌트 props는 호출자가 이해하기 쉬운 interface로 유지한다. boolean props가 여러 개 늘어나면 mode, variant, 또는 하위 컴포넌트 분리를 검토한다.
- Web/Mobile 공통 로직은 공유 hook이나 pure helper로 빼고, Web/Mobile 전용 UX는 각 shell 안에 둔다.
- API 호출은 `src/api.js` 또는 `src/adapters/` 경계를 통과한다. 컴포넌트에서 fetch endpoint를 직접 흩뿌리지 않는다.
- 테스트는 사용자에게 보이는 동작과 shell 경계를 우선 검증한다. 구현 세부 state를 그대로 복제하는 테스트를 피한다.
- 새 의존성은 작은 코드로 해결하기 어렵고 유지보수 이점이 명확할 때만 추가한다.

## Automation Rules

- Cloud-friendly 자동화는 GitHub에 있는 코드만으로 가능한 검증에 한정한다.
  - 예: `npm ci`, `npm test -- --run`, `npm run build`, 문서/코드 구조 괴리 점검
- Local-only 검증은 실제 기기 상태가 필요한 흐름에 한정한다.
  - 예: 사진 업로드, EXIF/GPS, HEIC, 브라우저 권한, 외장하드/File System Access API
- 정기 자동화는 초기에 보고 전용으로 운영한다. 자동 수정은 결과 품질을 확인한 뒤 별도 지시가 있을 때만 허용한다.

## Git Rules

- 기존 unstaged 변경은 사용자 작업으로 보고 보존한다.
- 새 작업 브랜치는 `type/short-kebab-name` 형식을 사용한다.
  - 허용 type: `feature`, `fix`, `docs`, `chore`, `test`, `refactor`, `spike`
  - 예: `feature/capacitor-mobile-upload-spike`, `fix/mobile-upload-gps`, `docs/supabase-setup`
  - Codex 도구의 기본 `codex/` prefix는 이 프로젝트에서는 사용하지 않는다.
- 관련 없는 변경을 함께 stage/commit하지 않는다.
- 커밋 전에는 `git status --short`와 staged diff를 확인한다.
- pull이 필요하고 로컬 변경이 있으면 `git pull --rebase --autostash`를 선호한다.
- destructive 명령(`git reset --hard`, 강제 삭제 등)은 명시 지시 없이 실행하지 않는다.
