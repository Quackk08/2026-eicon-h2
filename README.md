# 26e Icon

## 프로젝트 구성

- 루트: npm workspaces 관리
- `frontend`: React + Vite + TypeScript 클라이언트
- `backend`: Express + TypeScript API 서버
- 프론트 개발 서버는 `/api` 요청을 백엔드로 프록시

## 개발 환경

- Node.js와 npm 필요
- 패키지 매니저: npm
- 프론트 개발 포트: `5173`
- 백엔드 개발 포트: `4000`
- 백엔드 환경 변수 예시는 `backend/.env.example` 참고

## 설치

```bash
npm install
```

## 실행

- 프론트와 백엔드 동시 실행

```bash
npm run dev
```

- 프론트만 실행

```bash
npm run dev:frontend
```

- 백엔드만 실행

```bash
npm run dev:backend
```

## 확인 URL

- 프론트: `http://localhost:5173`
- 백엔드 헬스 체크: `http://localhost:4000/api/health`

## 검증

- 타입 체크

```bash
npm run typecheck
```

- 전체 빌드

```bash
npm run build
```

## 주요 스크립트

- `npm run dev`: 프론트와 백엔드를 함께 개발 모드로 실행
- `npm run dev:frontend`: 프론트 개발 서버 실행
- `npm run dev:backend`: 백엔드 개발 서버 실행
- `npm run build`: 프론트와 백엔드 빌드
- `npm run typecheck`: 프론트와 백엔드 타입 체크
- `npm run start`: 빌드된 백엔드 서버 실행

## Git 준비

- `node_modules`, `dist`, `.env`, 로그 파일, TypeScript 빌드 캐시는 커밋 대상에서 제외
- 원격 저장소는 직접 추가 필요

```bash
git remote add origin <repository-url>
git push -u origin main
```
