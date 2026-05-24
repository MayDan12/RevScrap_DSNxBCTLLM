# DSN x BCT LLM Agent Challenge Submission

This repository contains a minimal, reproducible implementation of:

- **Task 1 (User Modeling Agent):** takes a **user persona + item details** and generates a **star rating + review text**
- **Task 2 (Recommendation Agent):** takes a **user persona** and returns **ranked personalized recommendations**

The implementation includes:

- API endpoints for Task 1 and Task 2
- A simple demo UI at `/hack-demo`
- A small, reproducible Yelp mini-pipeline (download subset → build index → run eval)

## Live Demo

- Web UI: https://reviewllmagent.vercel.app/hack-demo

## Quick Start (Local)

### 1) Install

```bash
pnpm install
```

### 2) Configure AI

Create `.env.local`:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=YOUR_KEY
```

### 3) Start the server

```bash
pnpm dev
```

Open:

- http://localhost:3000/hack-demo

## Task 1: User Modeling API

- Endpoint: `POST /api/task-a/review`
- Code: `app/api/task-a/review/route.ts`

### Payload (direct mode)

```json
{
  "persona": {
    "personaText": "Young professional in Lagos, picky about value for money.",
    "pastReviews": [{ "rating": 4, "text": "Nice spot." }]
  },
  "item": { "title": "New burger place", "description": "Casual dining" },
  "context": { "locale": "Nigeria" }
}
```

### Payload (Yelp mode)

```json
{
  "mode": "yelp",
  "userId": "USER_ID",
  "businessId": "BUSINESS_ID",
  "context": { "locale": "Nigeria" }
}
```

## Task 2: Recommendation API

- Endpoint: `POST /api/task-b/recommend`
- Code: `app/api/task-b/recommend/route.ts`

### Payload (direct mode)

```json
{
  "persona": { "personaText": "Student, likes budget-friendly places." },
  "candidates": [{ "id": "a1", "title": "Suya Spot", "categories": ["food"] }],
  "k": 10
}
```

### Payload (Yelp mode)

```json
{
  "mode": "yelp",
  "userId": "USER_ID",
  "k": 10
}
```

## Yelp Mini Pipeline (Reproducible Subset)

This project uses a small subset downloaded from a public Yelp Phoenix academic dataset mirror.

### 1) Download a subset

```bash
YELP_BUSINESS_LINES=20000 YELP_USER_LINES=1000 YELP_REVIEW_LINES=50000 pnpm -s yelp:download
```

### 2) Build the processed index

```bash
YELP_MIN_USERS=20 YELP_MIN_BUSINESSES=40 pnpm -s yelp:build
```

### 3) Get sample IDs (for testing)

- `GET /api/yelp-mini/sample?limit=25`

## Evaluation

This repo includes a lightweight evaluation runner that produces a JSON report:

- Task 1: Rating RMSE + ROUGE-1 F1 + ROUGE-L F1
- Task 2: HitRate@K + NDCG@K (single holdout per user)

Run:

```bash
pnpm -s yelp:eval
```

Optional (if your dev server is running and you want to call the LLM endpoints during eval):

```bash
YELP_EVAL_MODE=both pnpm -s yelp:eval
```

The report is saved at:

- `data/yelp/processed/eval-report.json`

And can be viewed in the demo UI (Eval tab) via:

- `GET /api/yelp-mini/eval-report`

## Demo UI

- Page: `/hack-demo`
- Code: `app/hack-demo/page.tsx`

The UI lets you:

- Load valid Yelp `userId` / `businessId`
- Run Task 1 and Task 2
- View the latest evaluation report

## Containerization (Docker)

This repository includes a Docker setup so judges can run the app as a container.

Build:

```bash
docker build -t dsn-bct-agents .
```

Run:

```bash
docker run --rm -p 3000:3000 \
  -e GOOGLE_GENERATIVE_AI_API_KEY=YOUR_KEY \
  dsn-bct-agents
```

Note: the Yelp subset is ignored by git. For a fully offline run, generate the dataset locally first (`yelp:download` + `yelp:build`) and mount `./data` into the container.
