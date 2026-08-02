# ReNew MVP 구현 계획

## 1. 문서 목적

- Notion의 제품 기획서와 개발 명세를 실제 개발 순서로 변환한다.
- 현재 저장소의 React 프론트엔드와 Express 백엔드 분리 구조를 유지한다.
- 디자인 레퍼런스가 전달되기 전까지 화면의 시각적 결정은 보류한다.
- 프론트엔드, 백엔드, 오프라인 저장소, AI 어댑터가 같은 데이터 규칙을 사용하도록 공통 계약을 먼저 정의한다.

## 2. 핵심 구현 루프

MVP의 중심은 다음 하나의 반복 흐름이다.

```text
Life Vision
-> Life Route
-> Check-In
-> 규칙 기반 추천
-> Mission
-> Reflection
-> 다음 추천과 Weekly Insight
```

다음 조건을 만족해야 핵심 루프가 완성된 것으로 본다.

- Gemini 호출에 실패해도 검수된 Seed 데이터와 규칙 엔진만으로 동작한다.
- 네트워크가 없어도 Check-In과 Reflection을 작성할 수 있다.
- 미수행을 실패로 표시하지 않고 행동의 크기와 환경을 다시 조정한다.
- 장기 목표와 오늘 행동의 연결 근거를 항상 확인할 수 있다.

## 3. MVP 범위

### 반드시 구현

- 인증과 기본 프로필
- Onboarding 선호 및 현실 조건 입력
- Life Vision 생성, 수정, 일시정지, 재개
- Life Route 생성과 단계 편집
- Quick Check-In과 Standard Check-In
- 규칙 기반 상태 분류와 Adaptive Recommendation
- Mission 선택, 변경, 축소와 Activity Ladder
- Reflection과 다음 추천 반영
- Life Dashboard
- Seed 기반 지역 장소 추천
- 검수된 Community Step 목록과 참가
- 기본 Weekly Insight
- Check-In Rhythm 설정
- Trusted Contact와 사용자 승인 기반 `sms:` fallback
- IndexedDB 로컬 저장과 기본 동기화 큐

### MVP 이후로 분리

- 실시간 장소 API 고도화
- Partner Place 포털과 수익 기능
- 장기 Goal-Based Circle 운영
- 사용자 생성 Community Step
- 고급 Personal Baseline 모델
- 완전한 다국어 지원
- 지역기관용 관리자 계정
- 자동화된 운영용 SMS Gateway

## 4. 저장소 아키텍처

Notion 명세는 Next.js 단일 저장소를 권장하지만, 이 프로젝트는 기존 요청에 따라 프론트엔드와 백엔드를 분리한다. 기능 경계와 안전 원칙은 동일하게 유지한다.

```text
frontend/
  React, Vite, PWA, IndexedDB, 기능 화면, API 클라이언트

backend/
  Express API, 인증 경계, 애플리케이션 서비스,
  규칙 엔진, 영속성, 외부 공급자 어댑터

shared/
  Zod 스키마, API 계약, 도메인 enum, 동기화 메타데이터

docs/
  구현 계획과 변경할 수 없는 제품 안전 원칙
```

### 프론트엔드 책임

- Onboarding, Vision, Route, Check-In, Mission, Place, Community, Insight, Support 흐름을 제공한다.
- 로컬 또는 서버 저장 전에 공통 스키마로 입력을 검증한다.
- 오프라인 사용이 필요한 레코드를 IndexedDB에 저장한다.
- 서버 전송 대기 목록과 동기화 상태를 관리한다.
- Gemini, 장소 API, SMS Gateway를 브라우저에서 직접 호출하지 않는다.

### 백엔드 책임

- 사용자 소유 데이터에 인증과 권한 검사를 적용한다.
- 서버의 기준 데이터를 저장하고 오프라인 동기화 요청을 처리한다.
- 결정적인 도메인 규칙으로 추천 후보를 만들고 필터링한다.
- Gemini 호출 전에 민감 데이터를 제거하고 필요한 값만 전달한다.
- AI 응답을 스키마와 후보 ID로 검증하고 실패 시 규칙 결과를 반환한다.
- 장소, 알림, SMS 공급자는 어댑터 인터페이스 뒤에 둔다.
- Check-In 원문, 민감 메모, 연락처와 정확한 위치를 로그에 남기지 않는다.

### 공통 패키지 책임

- API 전송과 로컬 저장에 쓰는 스키마와 타입을 정의한다.
- 누락값 `null`과 실제 점수 `0`을 구분한다.
- 오프라인에 저장하거나 API로 전달하는 계약에 버전을 둔다.
- 생활 영역, 상태 태그, Mission 상태, 동기화 상태를 한 곳에서 관리한다.

## 5. 도메인 모듈

| 모듈 | 책임 | 주요 데이터 |
| --- | --- | --- |
| Identity | 계정, 동의, 언어, 시간대 | User, Consent |
| Preferences | 시간, 비용, 거리, 장소, 사회적 부담, 접근성 조건 | UserPreference |
| Vision | 장기적인 삶의 방향과 우선순위 | LifeVision |
| Route | 장기 목표를 향한 순차 및 대체 행동 | LifeRoute, RouteStep |
| Check-In | 사용자가 직접 기록한 현재 상태 | CheckIn, StateVector |
| Recommendation | 안전한 후보 생성, 필터링, 순위 결정 | ActionTemplate, Recommendation |
| Mission | 사용자가 선택한 오늘 행동과 조정 기록 | Mission |
| Reflection | 수행 결과와 부담도 피드백 | Reflection |
| Insight | 개인 기준선과 최근 변화 설명 | Baseline, Insight |
| Place | Seed 및 공급자 기반 장소 정보 | Place, SavedPlace |
| Community | 검수된 저부담 활동과 참가 | CommunityActivity, Participation |
| Support | 신뢰 연락처와 메시지 미리보기 및 승인 | TrustedContact, SupportMessage |
| Sync | 로컬 변경 전송과 충돌 처리 | SyncOperation |

## 6. 데이터와 오프라인 전략

### 로컬 우선 기록

- Check-In, Mission 상태 변경, Reflection, 지원 메시지 초안, Route 편집에는 클라이언트가 만든 `localId`를 부여한다.
- 각 로컬 레코드는 `updatedAt`, `syncStatus`, `contractVersion`을 가진다.
- UI는 IndexedDB에 먼저 기록한 뒤 전송 대기 큐에 변경 작업을 추가한다.
- 네트워크가 복구되면 큐를 재시도한다.
- 모든 변경 요청은 idempotency key를 사용해 중복 레코드 생성을 막는다.

### 충돌 규칙

- Check-In과 Reflection 같은 추가형 레코드는 `localId`로 중복을 제거한다.
- 단순 설정 변경은 서버가 승인한 최신 버전을 사용한다.
- Life Route 구조 충돌은 버전을 비교하고 사용자에게 선택권을 제공한다.
- 삭제와 수정이 충돌하면 즉시 영구 삭제하지 않고 복구 가능한 상태를 유지한다.

### 초기 저장 방식

- 브라우저: 어댑터 인터페이스 뒤의 IndexedDB
- 서버: Repository 인터페이스 뒤의 PostgreSQL
- 개발 단계: 인증과 호스팅 공급자를 선택하기 전까지 메모리 및 Seed 어댑터 사용 가능

## 7. 추천 처리 순서

```text
Check-In 입력
-> 공통 스키마 검증
-> StateVector 정규화
-> 데이터가 충분할 때만 Personal Baseline 비교
-> 내부 StateTag 계산
-> 검수된 ActionTemplate 후보 조회
-> 안전 및 현실 조건 필터
-> 규칙 기반 점수 계산
-> 선택적 Gemini 순위 조정과 문장화
-> 출력 스키마 및 후보 ID 검증
-> 실패 시 규칙 기반 결과 사용
-> 사용자 최종 선택
```

### 규칙 엔진이 담당할 내용

- 값 정규화와 누락값 처리
- 안전하지 않은 후보 제외
- 기능 수준, 시간, 비용, 거리, 사회적 부담, 접근성 필터
- 검수된 템플릿 기반 후보 생성
- Activity Ladder 단계 선택
- Support 선택지 노출 조건
- 외부 공유 데이터 제한

### Gemini가 담당할 수 있는 내용

- 사용자의 목표 문장을 구조화한다.
- 이미 검수된 후보의 순서를 보정한다.
- 비의료적인 추천 이유를 쉬운 문장으로 작성한다.
- 근거가 있는 주간 기록을 비의료적으로 요약한다.

Gemini는 새로운 행동 후보를 임의 생성하거나, 질환을 진단하거나, 긴급 여부를 단독 판단하거나, 다른 사람에게 연락할 수 없다.

## 8. API 구현 순서

### 기반

```text
GET    /api/health
GET    /api/me
PATCH  /api/me/preferences
```

### Vision과 Route

```text
GET    /api/visions
POST   /api/visions
PATCH  /api/visions/:id
POST   /api/visions/:id/generate-route
GET    /api/routes/:id
PATCH  /api/routes/:id
```

### 일상 핵심 루프

```text
POST   /api/check-ins
GET    /api/state/summary
POST   /api/recommendations/daily
POST   /api/recommendations/:id/select
GET    /api/missions/today
POST   /api/missions/:id/adapt
POST   /api/missions/:id/reflection
```

### 장소, 커뮤니티, 인사이트, 지원

```text
GET    /api/places/search
GET    /api/community/activities
POST   /api/community/activities/:id/join
GET    /api/insights/weekly
GET    /api/support/resources
POST   /api/support/message-preview
```

실제 SMS 전송 API는 미리보기, 사용자 승인, 감사 기록, 보관 정책이 결정된 뒤 추가한다.

## 9. 개발 단계

### Phase 0: 의사결정과 계약

- 12절의 미결정 항목을 확정한다.
- 공통 스키마와 API 오류 형식을 확정한다.
- 생활 영역, Activity Ladder, 장소, 커뮤니티, 지원기관 Seed 형식을 정의한다.
- Repository와 외부 Provider 인터페이스를 정의한다.

완료 기준: 공통 계약이 빌드되고 대표 입력을 검증하며 프론트와 백엔드에서 사용할 준비가 되어 있다.

### Phase 1: 기반 구축

- 인증 경계와 동의 모델
- PostgreSQL 스키마와 마이그레이션
- 사용자 설정
- IndexedDB 어댑터와 전송 대기 큐
- API 클라이언트와 표준 오류 처리
- PWA Manifest와 Service Worker 기본 구조

완료 기준: 인증된 사용자가 설정을 로컬에 저장하고 서버와 동기화할 수 있다.

### Phase 2: Vision과 Route

- Onboarding
- Life Vision CRUD
- Route 단계와 버전 관리
- ActionTemplate 및 Activity Ladder Seed
- 규칙 기반 Route 초안과 선택적 Gemini 문장화

완료 기준: 사용자가 Vision을 만들고 Route를 검토, 수정, 일시정지, 재개할 수 있다.

### Phase 3: Daily Core Loop

- Quick 및 Standard Check-In
- StateVector 정규화
- 규칙 기반 추천 엔진
- Mission 선택과 축소 및 대체
- Reflection
- 이전 부담도와 완료 결과 반영

완료 기준: Gemini를 비활성화한 상태에서 Check-In부터 Reflection까지 동작한다.

### Phase 4: Dashboard와 Insight

- Dashboard 통합 조회 API
- 오늘 Mission, Smaller Option, Route 진행, 동기화 상태
- 기본 7일 및 28일 요약
- 데이터 부족 상태 처리
- Check-In Rhythm 설정

완료 기준: 점수, 진단, 사용자 비교, 실패 표현 없이 현재 행동과 근거를 설명한다.

### Phase 5: Place와 Community

- Seed Place Provider
- 장소 점수 어댑터
- 검수된 Community Step
- 참가, 취소, 저장, 신고
- 사회적 부담과 미성년자 안전 필터

완료 기준: Mission을 적합한 Seed 장소 또는 검수된 커뮤니티 활동과 연결할 수 있다.

### Phase 6: Support와 안정화

- Trusted Contact 저장
- 메시지 미리보기와 명시적 승인
- `sms:` 및 `tel:` fallback
- 오프라인 재시도와 충돌 처리 강화
- 보안, 접근성, 안전, 장애 상황 테스트
- MVP 운영에 필요한 최소 관리자 기능

완료 기준: 사용자 승인 없이 어떤 연락도 실행되지 않고 모든 MVP 완료 조건을 통과한다.

## 10. 테스트 전략

### 단위 테스트

- 공통 스키마 경계값과 누락값
- Personal Baseline과 데이터 부족 처리
- StateTag와 Temporal Pattern 전이
- 행동 후보 필터와 Ladder 조정
- 장소 및 커뮤니티 점수
- Support 미리보기의 데이터 최소화

### 통합 테스트

- Life Vision에서 수정 가능한 Route 생성
- Check-In에서 Recommendation, Mission, Reflection 연결
- 오프라인 작성 후 서버 동기화
- AI 장애 시 규칙 엔진 fallback
- 장소 API 장애 시 Seed 데이터 fallback
- 메시지 미리보기 후 승인된 handoff

### E2E 테스트

- 신규 사용자 Onboarding과 첫 Route
- 기존 사용자의 일상 핵심 루프
- 위치 및 Push 권한을 거부한 사용자
- 오프라인 Check-In과 Reflection
- 모바일, 태블릿, 데스크톱 브라우저

### 안전 테스트

- 진단, 치료, 약물, 위험 확률 표현 차단
- AI가 후보 목록 밖의 ID를 선택할 때 응답 폐기
- 민감 데이터가 로그, 장소 파트너, 커뮤니티, AI 요청에 포함되지 않는지 확인
- SMS, 전화, 신고가 자동 실행되지 않는지 확인

## 11. 첫 개발 배치

디자인 레퍼런스가 없어도 다음 작업은 바로 시작할 수 있다.

- Preferences, Vision, Route, Check-In, Recommendation, Mission, Reflection, Sync 공통 스키마 확정
- 생활 영역과 최소 10개 Activity Ladder의 버전 있는 Seed 형식 추가
- 운영 공급자를 선택하지 않은 상태에서 Backend Repository 및 Provider 인터페이스 정의
- IndexedDB 어댑터 인터페이스와 메모리 테스트 구현 추가
- 순수 함수 형태의 규칙 엔진과 단위 테스트 구현
- Seed 데이터만 사용하는 Daily Core Loop Mock API 제공
- 페이지는 동작 중심의 중립적인 구조만 만들고 시각 디자인은 레퍼런스 수령 후 적용

## 12. 실제 연동 전 결정할 항목

- 초기 운영 지역과 지원 언어
- 인증 공급자와 로그인 방식
- PostgreSQL 호스팅 공급자
- 프론트엔드, 백엔드, 스케줄 작업의 배포 환경
- Gemini 모델과 AI 요청 및 응답 보관 기간
- 지도 및 장소 API 공급자
- SMS Gateway 또는 MVP에서 fallback만 사용할지 여부
- 만 18세 미만 사용자의 가입과 커뮤니티 정책
- 위치 데이터의 정밀도와 보관 기간
- Check-In 메모와 신뢰 연락처의 보관 및 삭제 기간
- 커뮤니티 운영자 검증과 신고 처리 주체
- 서비스 운영 주체가 관리할 공식 지원기관 목록

이 결정들은 공통 계약, Seed 데이터, 규칙 엔진, 로컬 Daily Core Loop 개발을 막지 않는다. 운영용 인증, 실시간 장소, 커뮤니티 운영, 실제 지원 전달을 시작하기 전에 확정해야 한다.

## 13. 기준 문서

- ReNew 최종 서비스 기획 및 MVP 구조: https://app.notion.com/p/3b075ab5debe80e7be84fe687f628693
- ReNew 개발 명세서: https://app.notion.com/p/3b075ab5debe80d4b987cb8f620db23f
- 검토일: 2026-08-02
