# 26e Icon

## Project Structure

- Root: managed with npm workspaces
- `frontend`: React + Vite + TypeScript client
- `backend`: Express + TypeScript API server
- The frontend dev server proxies `/api` requests to the backend

## Development Environment

- Requires Node.js and npm
- Package manager: npm
- Frontend dev port: `5173`
- Backend dev port: `4000`
- Refer to `backend/.env.example` for backend environment variable examples

## Installation

```bash
npm install
```

## Running the App

- Run the frontend and backend simultaneously

```bash
npm run dev
```

- Run the frontend only

```bash
npm run dev:frontend
```

- Run the backend only

```bash
npm run dev:backend
```

## Access URLs

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:4000/api/health`

## Verification

- Type checking

```bash
npm run typecheck
```

- Full build

```bash
npm run build
```

## Key Scripts

- `npm run dev`: run the frontend and backend together in development mode
- `npm run dev:frontend`: start the frontend development server
- `npm run dev:backend`: start the backend development server
- `npm run build`: build the frontend and backend
- `npm run typecheck`: run type checks for the frontend and backend
- `npm run start`: start the built backend server

## Git Setup

- Exclude `node_modules`, `dist`, `.env`, log files, and TypeScript build cache from commits
- Add the remote repository manually if needed

```bash
git remote add origin <repository-url>
git push -u origin main
```
