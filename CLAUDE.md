# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

АСУ-Оптимизация (AsuOpt) — a web application for managing industrial automation devices (АСУ ТП), organizing them into hierarchical structures, and generating documentation/questionnaires. The system supports КИП (instrumentation) and ЗРА (valves/actuators) device categories.

## Development Commands

### Server (Node.js/Express/TypeScript)
```bash
cd server
npm run dev          # Start with nodemon (watches src/)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled dist/server.js
npm test             # Run Jest tests
npm run test:watch   # Jest in watch mode
npm run test:coverage # Jest with coverage report
npm run lint         # ESLint src/**/*.ts
npm run lint:fix     # ESLint with auto-fix
```

### Client (React/TypeScript)
```bash
cd client
npm start            # Dev server on http://localhost:3000
npm run build        # Production build
npm test             # React scripts test (interactive)
npm run lint         # ESLint src/
```

### Running a single server test
```bash
cd server && npx jest tests/signalController.test.ts
```

## Architecture

### Overview
- **Frontend**: React 19 + Ant Design 5 + MUI (dual UI library), TypeScript, no routing (single-page with tabs)
- **Backend**: Express 4 + TypeScript, REST API on port 3001
- **Database**: SQLite via Sequelize ORM (file: `server/database.sqlite`); uses in-memory SQLite for tests
- **Auth**: JWT tokens, `bcryptjs` for password hashing, roles: `admin` / `user`

### Backend Structure (`server/src/`)
```
config/          env.ts, database.ts, initializeModels.ts, swagger.ts
controllers/     Business logic handlers (deviceController, kipController, etc.)
middleware/      errorHandler.ts, requestContext.ts (attaches requestId)
models/          Sequelize models: Device, Kip, Zra, Signal, DeviceSignal, DeviceReference, Project, User
routes/          Express routers (1:1 with controllers)
services/        ImportService.ts — CSV import logic for KIP/ZRA/Devices
validation/      schemas.ts — Zod validation schemas
errors/          ApiError.ts — typed error class
```

**Error handling pattern**: Throw `ApiError(statusCode, code, message)` in controllers; the `errorHandler` middleware catches it and returns `{ error: { code, message, requestId }, message }`.

**Database initialization**: On startup, `initializeDatabase()` runs an inline migration (`ensureProjectMigration`) that adds `project_id` columns and indexes to all tables if missing. In production this is skipped — use proper migration scripts.

**All entities are scoped to a Project** (`project_id` FK). The default project has `id=1` and code `'DEFAULT'`.

### Frontend Structure (`client/src/`)
```
contexts/        AuthContext.tsx (JWT auth state), ProjectContext.tsx (current project)
components/      All UI components; no sub-folders
services/        API client calls (axios)
interfaces/      TypeScript interfaces
utils/           Utility functions
```

**App layout**: Single `App.tsx` with a tabbed layout — tabs: Устройства, Сигналы, Экспорт данных, Импорт данных, Управление БД. Auth is handled by `AuthContext`; unauthenticated users see Login/Register.

**State coordination**: `App.tsx` owns `selectedDeviceId`, `treeUpdateCounter`, and passes callbacks down. `treeUpdateCounter` is incremented to force `DeviceTree` re-fetches after mutations.

### Key Data Models
- **Device**: hierarchical (`parentId` self-reference), belongs to Project
- **DeviceReference** (`device_references`): master catalog entry with `posDesignation`; unique per `(project_id, posDesignation)`
- **Kip** / **Zra**: KIP/ZRA-specific detail records linked to DeviceReference
- **Signal** / **DeviceSignal**: signal definitions and per-device signal assignments
- **DeviceTypeSignal**: default signals for a device type

### API Routes
All routes under `/api/`. Key prefixes:
- `/api/auth` — login/register (stricter rate limit: 50/15min)
- `/api/devices` — CRUD + tree fetch
- `/api/device-references` — master device catalog
- `/api/kip`, `/api/zra` — KIP/ZRA detail records
- `/api/signals`, `/api/device-type-signals` — signal management
- `/api/exports` — Excel/Word/PDF export generation
- `/api/import` — CSV import with column mapping
- `/api/projects` — project CRUD
- `/api/database` — DB management actions (clear tables, etc.)
- `/api-docs` — Swagger UI (JSDoc annotations on routes)

### Environment
- `PORT` — server port (default: 3001)
- `JWT_SECRET` — required in production; falls back to a hardcoded dev value otherwise
- `NODE_ENV` — `development` / `test` / `production`; `test` uses in-memory SQLite and skips rate limiting

### Export / Document Generation
`exportController.ts` and `pdfPuppeteer.ts` use ExcelJS, docx, pdfkit, and Puppeteer to generate questionnaire documents (опросные листы) for KIP and ZRA devices. The `QuestionnaireModal` / `QuestionnaireExport` components on the frontend drive this.
