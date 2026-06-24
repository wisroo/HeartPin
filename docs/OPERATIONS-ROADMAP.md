# HeartPin 정식 운영 로드맵

작성일: 2026-06-24

이 문서는 HeartPin을 개인/커플 MVP에서 정식 출시 가능한 앱으로 확장할 때의 운영, 개인정보, 저장소 전략을 관리한다. 핵심 원칙은 **운영자가 사용자 사진과 개인 기록을 직접 보관하지 않는 것**이다.

## 운영 원칙

HeartPin은 사진 SaaS가 아니라, 사용자가 소유한 저장소를 예쁘게 정리하고 동기화하는 앱을 지향한다.

- 운영자는 원본 사진을 보관하지 않는다.
- 운영자는 가능한 한 사용자 기록 데이터도 보관하지 않는다.
- 불가피하게 서버를 제공할 경우, 서버에는 E2EE 암호화 데이터만 저장하는 방향을 우선한다.
- 사용자는 언제든 데이터를 내보낼 수 있어야 한다.
- 앱스토어 개인정보 고지와 실제 데이터 흐름이 일치해야 한다.

## 현재 MVP와 정식 운영의 차이

| 항목 | MVP | 정식 운영 |
|---|---|---|
| 인증 | 공유 계정 1개 | 개인 계정 또는 사용자 소유 클라우드 인증 |
| 저장소 | 개인/커플 Supabase | Local-first, BYO cloud, 또는 E2EE HeartPin Cloud |
| 데이터 소유 | 우리 커플 직접 관리 | 각 사용자/커플이 직접 소유 |
| 운영자 데이터 접근 | MVP 인스턴스 한정 가능 | 기본적으로 접근하지 않음 |
| 앱 배포 | 개발/개인 사용 | App Store / Play Store |
| 개인정보 고지 | 내부 사용 기준 | 스토어 privacy label / data safety와 일치 필요 |

## 출시 저장 모델 옵션

### Option A. Local-only

사용자 기기 안에만 기록을 저장한다.

장점:

- 운영자가 사용자 데이터를 전혀 보관하지 않는다.
- 개인정보 부담이 가장 작다.
- 오프라인 동작이 쉽다.

단점:

- 기기 간 동기화가 어렵다.
- 기기 분실/교체 시 백업 UX가 필요하다.
- 커플 공동 기록 경험이 약해진다.

적합한 용도:

- 개인 기록장
- privacy-first 모드
- 정식 서비스의 기본 안전 모드

### Option B. BYO Cloud

사용자가 자기 클라우드를 연결한다. HeartPin은 저장소 연결과 UI만 제공한다.

후보:

- Google Drive
- iCloud Drive / CloudKit
- Dropbox
- 사용자 소유 Supabase

장점:

- 운영자가 사용자 사진과 기록을 보관하지 않는다.
- 사용자는 자기 저장소 요금제와 정책 안에서 데이터를 관리한다.
- 서비스 비용과 유출 리스크가 낮다.

단점:

- 제공자별 API와 OAuth 구현이 필요하다.
- 비개발자에게 Supabase BYO는 어렵다.
- Google OAuth 검증, 개인정보처리방침, 시연 영상 등 행정 비용이 생긴다.
- JSON 기반 동기화는 동시 편집 충돌 처리가 필요하다.

적합한 용도:

- 정식 서비스 1차 후보
- “내 데이터는 내 클라우드에” 포지셔닝

### Option C. HeartPin Cloud With E2EE

운영자가 동기화 서버를 제공하되, 서버에는 암호화된 데이터만 저장한다. 복호화 키는 사용자 기기와 커플 초대 흐름에서만 관리한다.

장점:

- 사용자 경험이 가장 쉽다.
- 운영자는 원문 사진/기록을 볼 수 없다.
- 비개발자에게도 설치 후 바로 사용 가능한 경험을 제공할 수 있다.

단점:

- 키 복구, 기기 교체, 파트너 초대가 어렵다.
- 썸네일/검색/지도 미리보기 등 서버 기능이 제한된다.
- 그래도 암호화된 데이터 저장·전송에 대한 법적 고지와 운영 책임은 남는다.

적합한 용도:

- 정식 서비스의 유료 편의 옵션
- BYO cloud가 어려운 사용자를 위한 대안

### Option D. Operator-Hosted SaaS

운영자가 Supabase/Storage를 직접 운영하고 사용자 데이터를 평문으로 관리한다.

판단:

- HeartPin의 개인정보 원칙과 맞지 않는다.
- 초기 베타나 내부 실험 외에는 기본 모델로 채택하지 않는다.
- 선택하더라도 원본 사진 보관은 하지 않고 압축본/메타만 제한적으로 다룬다.

## 권장 운영 단계

### Stage 0. Personal MVP

목표:

- 우리 커플 사용성 검증
- 모바일 native picker/GPS 문제 해결
- Supabase 스키마와 adapter 경계 검증

저장 모델:

- 개인/커플 Supabase
- 공유 계정 1개
- 원본은 외장하드/기기

완료 기준:

- Capacitor dev app에서 Android/iOS 사진 업로드 가능
- Supabase 기록/압축본 저장 가능
- export/import 경로 존재

### Stage 1. Private Beta

목표:

- 소수 지인/테스터에게 배포
- 운영자가 원본을 보관하지 않는 구조 검증

저장 모델:

- BYO Supabase 또는 Local-only
- 가능하면 테스트 계정마다 별도 프로젝트/저장소

필요 작업:

- 첫 실행 setup wizard
- 저장소 연결 상태 점검
- 데이터 내보내기
- 개인정보처리방침 초안
- 앱스토어 privacy/data safety 초안

### Stage 2. BYO Cloud Public Beta

목표:

- 비개발자도 자기 클라우드를 쉽게 연결하게 만든다.

우선순위:

1. Google Drive adapter
2. iCloud/CloudKit 검토
3. 사용자 소유 Supabase 템플릿 유지

필요 작업:

- Drive folder 선택
- `heartpin-record.json` 동기화
- display/thumb 파일 저장
- 동시 편집 충돌 처리
- OAuth 앱 검증
- 공개 개인정보처리방침

### Stage 3. E2EE HeartPin Cloud

목표:

- BYO cloud가 어려운 사용자에게 쉬운 동기화 옵션을 제공하되, 운영자가 내용을 볼 수 없게 한다.

필요 작업:

- 클라이언트 키 생성
- 커플 초대 시 키 공유
- 기기 추가/복구 UX
- 암호화된 record blob 동기화
- 암호화된 media blob 저장
- 삭제/내보내기/키 분실 정책

## 데이터 분류 원칙

| 데이터 | 원칙 |
|---|---|
| 원본 사진 | 운영자 서버에 영구 저장하지 않음 |
| 압축본/썸네일 | BYO cloud 또는 E2EE 저장 우선 |
| GPS/촬영시각 | 사용자 기록 기능에 필수. 저장 위치와 고지 필요 |
| 커플 기록 트리 | Local-first 또는 사용자 소유 cloud 우선 |
| 계정 이메일 | 운영형 계정이 생길 경우 최소 수집 |
| 분석/광고 ID | 기본적으로 수집하지 않음 |

## App Store / Play Store 고지 방향

정식 출시 전 다음을 실제 구현과 맞춰 작성한다.

- 개인정보처리방침 URL
- 데이터 삭제 요청 방법
- 데이터 내보내기 방법
- App Store privacy details
- Google Play Data safety section

주의:

- 사진, 동영상, 정확한 위치, 이메일, 사용자 ID는 개인정보 고지 대상이 될 수 있다.
- 기기 안에서만 처리되고 서버로 전송되지 않는 데이터는 고지 부담이 낮다.
- 서버로 전송해 저장하면, 운영자가 내용을 볼 수 없더라도 암호화/보관/삭제 정책을 설명해야 한다.

## 아키텍처 요구사항

- StorageAdapter는 계속 유지한다.
- MediaPickerAdapter는 Web/Capacitor를 분리한다.
- 저장소별 adapter는 같은 domain model을 반환한다.
- 모든 데이터는 export 가능한 JSON과 media folder 구조로 표현 가능해야 한다.
- 정식 multi-user 모델이 필요해지면 `couple_id`, `user_id`, `member_role` 기반으로 확장한다.

## 다음 결정 지점

1. 정식 출시의 기본 모드를 Local-only로 둘지 BYO cloud로 둘지 결정한다.
2. BYO cloud 1순위를 Google Drive로 할지 iCloud/CloudKit으로 할지 결정한다.
3. E2EE HeartPin Cloud를 유료 편의 옵션으로 둘지 결정한다.
4. 개인정보처리방침 초안을 작성한다.
5. 앱스토어 제출 전 실제 데이터 흐름과 privacy label을 대조한다.
