# Architecture

## Components

- **Next.js UI (`src/app`)** — dashboard, case detail, demo controls. Thin client; only knows how to call the API routes.
- **Next.js API routes (`src/app/api`)** — `seed-ticket`, `workflows`, `workflows/[id]/query`, `workflows/[id]/signal`, `demo/fail-next-bigquery-write`. They use the Temporal client to start workflows, send signals, and run queries.
- **Temporal worker (`src/temporal/worker.ts`)** — long-running process that polls the `support-ops-demo` task queue and executes activities.
- **Workflow (`src/temporal/workflows.ts`)** — `SupportEscalationWorkflow`. Holds `SupportEscalationState`, exposes the `currentCaseState` query, and accepts four signals: `markExecVisible`, `changePriority`, `assignOwner`, `resolveCase`.
- **Activities (`src/temporal/activities.ts`)** — wrap the four adapters (Pylon, Salesforce, Slack, BigQuery). Activity retry policy: 5 attempts, 2s → 30s exponential backoff.
- **Adapters (`src/adapters/*`)** — every adapter has a real-API code path gated on env vars and falls back to deterministic mock data. The BigQuery adapter additionally watches a sentinel file (`.bigquery-fail-next`) for failure injection, which is how the UI causes a one-shot failure in the worker process.

## Failure injection — why the sentinel file

The Next.js process and the Temporal worker are separate Node processes. A simple in-memory flag wouldn't cross the boundary. The fail-injection API route writes a sentinel file; the BigQuery activity consumes it on the next write. That's also how a real ops system would do feature-flag-style chaos toggles — out of band, durable, and observable.

## Workflow phases

```
received → enriched → classified → case_created → notified → analytics_written → waiting_for_resolution → resolved
```

The workflow blocks at `waiting_for_resolution` using `condition(() => state.resolved)` until the `resolveCase` signal fires. Signals received before that point mutate state and may fire follow-up activities (Slack + BigQuery for `markExecVisible` and `changePriority`).

## Why this shape

- **Workflow == state machine.** Putting the entire escalation lifecycle inside a single workflow means there's exactly one place to look for "what's happening to this case." That's the support-ops equivalent of having one source of truth.
- **Activities == side effects.** Each downstream call is an activity with its own retry policy. When BigQuery fails, the workflow doesn't roll back the Slack post — it just retries the BigQuery write, because that's the failure boundary.
- **Signals == human-in-the-loop.** A CSM marking a case exec-visible isn't a webhook — it's a Temporal signal. That gives us replayable, ordered, durable human input.
- **Queries == read model.** The UI doesn't store workflow state. It queries the workflow directly via `currentCaseState`. There is no second database to keep in sync.
