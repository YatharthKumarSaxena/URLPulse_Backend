# URLPulse

URLPulse is a full-stack TypeScript application for asynchronously processing batches of simulated jobs or URLs from CSV, XLS, and XLSX files. The backend uses Express, PostgreSQL/Prisma, Redis, and BullMQ. The frontend is a self-contained Next.js application with live progress updates over Server-Sent Events (SSE).

## Requirements

- Node.js 20 or newer
- PostgreSQL
- Redis

## Setup

### Backend

From the repository root:

```bash
npm install
cp .env.example .env
```

Set `DATABASE_URL` and `REDIS_URL` in `.env`. The remaining backend settings have defaults defined in `src/config/env.ts`.

Initialize Prisma and the database:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

### Frontend

Install the frontend dependencies:

```bash
cd frontend
npm install
```

Create `frontend/.env.local` with the backend URL:

```bash
BACKEND_API_URL=http://localhost:5000
```

The browser communicates with Next.js API routes and tRPC procedures. Those server-side handlers forward requests to the Express backend, so the backend URL is not required in browser code.

## Run Locally

Start the backend API from the repository root:

```bash
npm run dev
```

Start the BullMQ worker in a second terminal from the repository root:

```bash
npm run dev:worker
```

Start the Next.js frontend in a third terminal:

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173>. The API runs on port `5000` by default and the frontend runs on port `5173`.

## Architecture

The backend request path is:

`routes -> middleware -> controllers -> services -> repositories -> Prisma/PostgreSQL`

The frontend uses Next.js API routes and tRPC procedures as its server-side boundary. These handlers call the Express API, while the browser subscribes to the proxied SSE stream for live batch and item updates.

PostgreSQL is the authoritative store for batches and JobItems. Redis is used for BullMQ coordination and progress event delivery. A worker processes each queued JobItem independently, which allows large batches to run concurrently and lets failed items be retried without creating a new item.

Controllers do not access Prisma directly; repositories own database operations. Validation and file parsing are kept in reusable middleware/factory layers.

## API

- `POST /batches` - simulation mode, JSON `{ "count": 100 }` (maximum 1000).
- `POST /batches/url-health` - multipart field `file`; accepts `.csv`, `.xls`, or `.xlsx`, extracting HTTP/HTTPS URLs.
- `GET /batches/:batchId` - totals, completed, failed, pending, and processing counts.
- `GET /batches/:batchId/items?page=1&limit=50` - paginated JobItems.
- `POST /job-items/:jobItemId/retry` - resets and requeues the same failed item.
- `GET /batches/:batchId/events` - SSE stream with `item` and `progress` events.

Simulation jobs use random 0.5-4 second delays and an 80% completion rate. URL health jobs use native HTTP/HTTPS fetch with `URL_CHECK_TIMEOUT_MS`; non-2xx results, timeouts, DNS failures, and connection errors become failed items without crashing the worker. A batch with any failed item finishes as `FAILED`; otherwise it finishes as `COMPLETED`.

## Verification

With the backend running, execute the integration suite from the repository root:

```bash
npm run test:integration
```

Build both applications before submission:

```bash
npm run build
cd frontend && npm run build
```

The integration tests cover health, batch creation, batch detail, JobItem listing, SSE availability, and validation responses.

## Time-Limit Trade-offs

- SSE was chosen for one-way live progress updates because it is simpler than WebSockets for this workflow and reconnects automatically in the browser.
- PostgreSQL remains authoritative instead of storing progress only in Redis, so batch state survives worker or API restarts.
- URL checking uses the native Node.js fetch implementation and a configurable timeout rather than adding a separate crawling library.
- The implementation includes CSV/XLS/XLSX parsing, retries, and concurrent workers, but does not include authentication, deployment configuration, advanced filtering, or a production observability stack because those were outside the assignment scope.
