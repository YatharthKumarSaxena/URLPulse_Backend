# URLPulse Backend

Backend for **URLPulse — Async Job Queue Dashboard**, a TypeScript-based asynchronous job processing system built with Express, PostgreSQL, Prisma, Redis and BullMQ.

The system accepts a batch request, splits it into individual job items, processes them asynchronously using background workers, persists their state in PostgreSQL, and exposes live progress updates to the dashboard.

## Live Application

* **Frontend:** `<FRONTEND_DEPLOYED_URL>`
* **Backend API:** `<BACKEND_DEPLOYED_URL>`

---

## Setup & Run

### Prerequisites

* Node.js 20+
* PostgreSQL
* Redis

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/YatharthKumarSaxena/URLPulse_Backend.git
cd URLPulse_Backend
npm install
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="your-postgresql-connection-string"
REDIS_URL="your-redis-connection-string"
FRONTEND_URL="your-frontend-url"
WORKER_CONCURRENCY=5
```

### Database Setup

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

### Run Backend

Start the API server:

```bash
npm run dev
```

Start the background worker in a separate terminal:

```bash
npm run dev:worker
```

The API server and worker are separate processes but belong to the same backend codebase.

---

## Architecture

The backend follows a **modular monolith architecture** with clear separation of responsibilities:

```text
Routes
   ↓
Middleware
   ↓
Controllers
   ↓
Services
   ↓
Repositories
   ↓
Prisma
   ↓
PostgreSQL
```

For asynchronous processing:

```text
Service
   ↓
BullMQ
   ↓
Redis
   ↓
Worker
   ↓
Repository
   ↓
PostgreSQL
```

### Why this architecture?

* **Controllers** handle HTTP request/response concerns.
* **Services** contain business logic and orchestration.
* **Repositories** isolate database operations from business logic.
* **Prisma** provides type-safe database access.
* **BullMQ + Redis** handle asynchronous background processing.
* **Workers** process individual job items independently.
* **PostgreSQL** acts as the persistent source of truth for job state.

This keeps the system modular without introducing unnecessary microservice complexity for the scope of the assignment.

---

## Job Processing Flow

A batch request creates one batch and multiple individual job items.

```text
Batch Request
      ↓
Create Batch
      ↓
Create N Job Items
      ↓
Push N Jobs to BullMQ
      ↓
Redis Queue
      ↓
Worker Processes Job Items
      ↓
Update PostgreSQL
      ↓
Live Progress Update
      ↓
Dashboard
```

Each job item is processed independently.

A job can transition through:

```text
PENDING → PROCESSING → COMPLETED
                       ↘ FAILED
                       ↘ PARTIAL_COMPLETED
```

Failed items can be retried individually without resubmitting the complete batch.

---

## Persistence

PostgreSQL stores both batch and job-item state.

The database contains persistent records for:

* Batch status
* Total items
* Completed items
* Failed items
* Individual job-item status
* Processing timestamps
* Completion timestamps
* Error information
* HTTP status and response time for URL health checks

Because the state is stored in PostgreSQL rather than process memory, job information survives backend/server restarts.

---

## Queue

The project uses **BullMQ with Redis** for background processing.

BullMQ was selected because it provides a straightforward Redis-backed queue suitable for the scope of this assignment.

The queue payload primarily identifies the JobItem to process, while the complete job state remains in PostgreSQL.

Worker concurrency is configurable through:

```env
WORKER_CONCURRENCY=5
```

---

## Live Progress

The dashboard receives live progress updates through **Server-Sent Events (SSE)**.

Instead of repeatedly requesting the complete list of job items every second, the backend streams relevant progress updates to the frontend.

This allows the dashboard to display:

* Total jobs
* Completed jobs
* Failed jobs
* Processing jobs
* Individual job-item status

as background processing progresses.

---

## Retry

A failed JobItem can be retried individually.

```text
Failed JobItem
      ↓
Retry Request
      ↓
Same JobItem
      ↓
BullMQ
      ↓
Worker
      ↓
Processing
```

The retry does **not** create a new JobItem or require the entire batch to be resubmitted.

---

## API

### Create Batch

```http
POST /batches
```

Creates a simulation batch with the requested number of job items.

### URL Health Batch

```http
POST /batches/url-health
```

Creates a batch from uploaded URLs and processes their health/status asynchronously.

### Get Batch

```http
GET /batches/:batchId
```

Returns batch information and progress.

### Get Job Items

```http
GET /batches/:batchId/items?page=1&limit=50
```

Returns paginated job items for a batch.

### Retry Job Item

```http
POST /job-items/:jobItemId/retry
```

Retries a failed job item.

### Live Events

```http
GET /batches/:batchId/events
```

Streams live batch progress using SSE.

---

## Technology Stack

| Technology | Purpose                        |
| ---------- | ------------------------------ |
| Node.js    | Runtime                        |
| TypeScript | Application language           |
| Express.js | Backend API                    |
| PostgreSQL | Persistent relational database |
| Prisma     | ORM                            |
| Redis      | Queue backend                  |
| BullMQ     | Background job queue           |
| ioredis    | Redis client                   |
| Zod        | Input validation               |
| SSE        | Live progress updates          |

---

## Design Decisions

### Modular Monolith

A modular monolith was chosen instead of microservices because the assignment focuses on asynchronous job processing rather than distributed service management.

The API and worker can still run as independent processes while sharing the same backend codebase.

### Repository Pattern

Database operations are isolated in repositories:

```text
Service → Repository → Prisma → PostgreSQL
```

This prevents controllers and business logic from directly depending on database queries.

### PostgreSQL as Source of Truth

Redis is used for queue management, while PostgreSQL remains the authoritative source for persistent job state.

This ensures that job information remains available after a server restart.

### BullMQ

BullMQ was chosen because it provides a simple Redis-backed background queue appropriate for this project scope.

### SSE

SSE was selected for live progress updates so that the frontend does not need to repeatedly poll the complete job list.

---

## Time-Limit Trade-offs

The assignment had a **3-day implementation window**.

The implementation prioritized the core requirements:

* Batch creation
* Per-item background processing
* Persistent job state
* PostgreSQL schema
* Redis/BullMQ queue
* Worker-based processing
* Live dashboard updates
* Individual retry
* Public deployment

The backend was intentionally kept as a modular monolith rather than introducing additional microservices.

Authentication and other features outside the assignment's core requirements were not included so that development time could remain focused on the required asynchronous processing workflow.

---

## Project Structure

```text
src/
├── controllers/
├── services/
├── repositories/
├── routes/
├── middleware/
├── queues/
├── workers/
├── utils/
└── app.ts
```

The structure separates HTTP handling, business logic, persistence and asynchronous processing.

---

## Related Project

The frontend dashboard for this backend is available in the separate frontend repository:

```text
https://github.com/YatharthKumarSaxena/URLPulse_Frontend
```

---

## Author

**Yatharth Kumar Saxena**

Computer Engineering
Zakir Husain College of Engineering & Technology
Aligarh Muslim University
