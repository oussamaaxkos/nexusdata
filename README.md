# NexusData — Data Intelligence Platform

NexusData is an **ontology-driven enterprise data intelligence platform** where business concepts and relationships provide a semantic layer across operational data, policies, GraphRAG, and agentic decision-making — with provenance, validation, risk governance, and human approval built in.

The platform enables AI agents to investigate business operations, query structured data, retrieve policy evidence, reason over enterprise knowledge, verify their own claims, assess risk, and route sensitive actions to humans before execution.

> **All customer, order, ticket and invoice data in this environment is synthetic.**

```text
                         USER
                           ↓
                    AI COPILOT
                           ↓
                Semantic Understanding
                           ↓
                    ┌───────────┐
                    │ ONTOLOGY  │
                    └─────┬─────┘
                          ↓
              Business Concepts
              + Relationships
              + Rules
                          ↓
              ┌───────────┴───────────┐
              ↓                       ↓
       KNOWLEDGE GRAPH            METADATA
              ↓                       ↓
              └───────────┬───────────┘
                          ↓
                       PLANNER
                          ↓
          ┌───────────────┼───────────────┐
          ↓               ↓               ↓
         SQL             RAG             API
          ↓               ↓               ↓
          └───────────────┼───────────────┘
                          ↓
                     REASONING
                          ↓
                  EVIDENCE VERIFY
                          ↓
                     RISK ENGINE
                          ↓
             ┌────────────┴────────────┐
             ↓                         ↓
          AUTO ACTION             HUMAN APPROVAL
             ↓                         ↓
             └────────────┬────────────┘
                          ↓
                       AUDIT
```

---

## Semantic Enterprise Layer

The ontology provides a formal representation of the business domain, connecting operational records, policies, and AI reasoning through shared business concepts and relationships.

**Core concepts:** Customer, Order, Shipment, Ticket, Invoice, Product, Policy, Compensation, Risk, Segment, Agent.

The semantic layer connects concepts such as:

```text
Customer
   │
   ├── places → Order
   ├── has → Ticket
   └── receives → Invoice

Order
   │
   ├── contains → Product
   ├── has → Shipment
   └── belongsTo → Customer

Shipment
   │
   ├── hasStatus → ShipmentStatus
   ├── causedBy → DelayCause
   └── mayTrigger → Compensation

Policy
   │
   ├── appliesTo → BusinessConcept
   ├── defines → BusinessRule
   └── hasVersion → PolicyVersion
```

This semantic model provides the shared context used by the planner, retrieval layer, reasoning engine, and governance layer.

### Business Concepts and Semantic Mapping

Business concepts provide a stable semantic representation independent of individual database names, e.g.:

```text
Business Concept
      │
      ↓
   Customer
      │
      ├── customer_id
      ├── client_number
      └── account_id

Order
  │
  ├── belongsTo → Customer
  ├── contains → Product
  └── hasShipment → Shipment
```

This lets the agent reason using business meaning rather than relying exclusively on raw table and column names.

---

## UI Walkthrough

### 1. Dashboard — AI Operations Overview

![Dashboard](readme_images/Dashboard.png)

The landing page gives a live operational pulse of the platform at a glance.

**Top KPI cards**
- **Agent Runs** — 26 completed investigations (100% completed)
- **Avg Handling Time** — 4.2 min vs. an 18 min manual baseline (**76.7% reduction**)
- **Human Intervention** — 0% awaiting decision
- **Avg Latency** — 10,606 ms avg, 17,341 ms p95

**Charts and panels**
- **Run volume and cost** — area chart of daily agent activity, rolling 3-day window
- **Risk mix** — donut chart of LOW / MEDIUM / HIGH / CRITICAL run proportions
- **Automation impact** — bar chart, manual vs. agent-assisted time; 76.7% time saved, 6.0 hours saved, 83 total tool calls
- **Evidence quality** — 79 docs retrieved, 0 grounding failures, 3.19 avg tools/run, 163,608 tokens consumed, $0.3324 estimated cost, 0 failed runs
- **Operations backlog** — 500 customers, 1,500 orders, 214 delayed orders, 207 open tickets, 620 total tickets, 52 overdue invoices; alert banner: *"Delayed shipments are the top driver of inbound requests."*

### 2. AI Copilot — Investigation Chat

**Step 1 — Ask a question, get a grounded answer**

![Copilot AI Step 1](readme_images/Copilot_AI_1.png)

Question: *"Why is order #40291 delayed and what compensation is the customer entitled to?"*

The agent returns clearly labelled sections:
- **Delay cause** — 6 business days late due to customs inspection; not yet delivered
- **Compensation** — not eligible per the compensation calculator; €0.00
- **Risk** — LOW (delayed, but no refundable amount)
- **Action** — no compensation action recommended from available evidence

**Agent activity trace:**
`Intent classification → Semantic understanding → Ontology → Planner → Tool: get_order → Tool: get_shipment → Tool: get_ticket → Tool: search_knowledge_base → Tool: calculate_compensation → Reasoning over evidence → Evidence verification → Risk assessment`

Each step displays its executor (`sql_agent`, `rag_agent`, `api_agent`) and duration in milliseconds.

**Step 2 — Aggregate query with a data table response**

![Copilot AI Step 2](readme_images/Copilot_AI_2.png)

Question: *"How many orders are currently delayed and which segments are most affected?"*

**Delayed Orders Overview**
- Total currently delayed: **214**
- By segment:
  | Segment | Orders | Share | Delayed Value |
  |---|---|---|---|
  | Enterprise | 72 | 33.6% | €422,506.8 |
  | SMB | 71 | 33.2% | €425,729.4 |
  | Mid-Market | 71 | 33.2% | €434,547.9 |
- **Most affected** — Enterprise leads by count; Mid-Market leads by delayed value
- **Policy context** (auto-retrieved): *"A shipment is considered delayed once it passes the promised delivery date without a delivery scan. Customer notification is required within 24h of classification."*

**Agent activity trace:**
`Semantic understanding → Ontology → query_database (sql_agent) → Mandatory policy retrieval (rag_agent) → Reasoning → Evidence verification → Risk assessment → Auto-completed (low risk) → Audit log written`

Run summary: **99% confidence**, **9,789 ms latency**, **2 tool calls**, **5,646 tokens**.

**Step 3 — Inline data visualisation**

![Copilot AI Step 3](readme_images/Copilot_AI_3.png)

A **"Visualise results"** button renders a bar chart directly in the conversation panel, plotting delayed value and delayed order counts per segment (Enterprise, SMB, Mid-Market).

The right panel shows the full **Run summary** and **Sources** — the exact policy document chunks that grounded the answer (e.g. *Shipping Compensation Policy, Section 4.1 Eligibility, v3.2, score 0.125*), making every claim auditable.

**Step 4 — Full run trace (Agent Runs detail page)**

![Copilot AI Step 4](readme_images/Copilot_AI_4.png)

Every investigation is recorded as a numbered run (e.g. **Run #29**), with a full execution trace.

- **Header metrics:** Status (Completed), Risk (MEDIUM), Confidence (99%), Latency (9,789 ms), Tokens (5,646), Cost ($0.0031)
- **Execution trace panel** — collapsible rows per node, each showing node name, executor type, duration, and Pass/Completed badge:
  `Semantic understanding → Ontology → Intent classification → Planner → Tool: query_database → Mandatory policy retrieval → Reasoning over evidence → Evidence verification → Risk assessment → Auto-completed (low risk) → Audit log written`
- **Final response panel** — mirrors the exact structured answer, segment table inline, confirming trace and answer are in sync
- **Tool calls section** — lists every tool invocation with input payload, output, permission level, and risk classification

### 3. AI Evaluation — Regression Benchmarking

![Evaluation](readme_images/Evaluation.png)

Runs the agent against a **golden dataset of 32 cases** covering retrieval, reasoning, refusal behaviour, risk routing, and tool selection. Designed for CI-gate usage — a benchmark can block a deploy if quality regresses.

- **Benchmark runs sidebar** — past runs with model slug, prompt version, case count
- **Active benchmark summary** (Regression benchmark, `openai/gpt-5.4-mini`, prompt v3, 6 cases):
  - Pass rate: 100%
  - Recall@5: 100%
  - Tool accuracy: 100%
  - Groundedness: 100%
  - Avg latency: 7,938 ms
  - Total cost: $0.0115
- **Pass rate by category** — bar chart (SQL reasoning vs. Simple lookup)
- **Case results table** — Case ID, category, input question, risk level, intent match, tool accuracy, groundedness score, latency, result badge (Passed / Pending / Failed)
- Live progress banner (*"Running case 5 of 6..."*) updates as the benchmark executes in batches

### 4. Model Management

![Models](readme_images/Models.png)

Lists every LLM in the registry as a card. Switching the active model is a **configuration change, not a code change** — the gateway layer is provider-agnostic.

Each card shows: model name/slug, provider, role (Primary / Secondary / Fallback / Candidate), temperature, max output tokens, input/output pricing per 1K tokens, and status (Active / Activatable / Unavailable).

| Model | Provider | Role | Status |
|---|---|---|---|
| Claude (external) | Anthropic | Candidate | Unavailable |
| Gemini 3.8 Flash | Google | Fallback | Activatable |
| Gemini 3.1 Pro | Google | Candidate | Activatable |
| Llama 3 70B (self-hosted) | Local | Candidate | Unavailable |
| GPT-5.4 | OpenAI | Primary | Activatable |
| GPT-5.4 Mini | OpenAI | Secondary | **Active** |

### 5. Observability

![Observability](readme_images/Observability.png)

Instruments every run end-to-end: node timings, tool volume, token usage, cost, and verification outcomes.

**Top KPI cards**
- Total runs: 35 (100% success)
- P95 latency: 17,433 ms (avg 10,680 ms)
- Total cost: $0.3606 across 228,223 tokens
- Grounding failures: 1 (verification rejected a claim)

**Charts**
- **Latency trend** — line chart, avg latency per day, rolling 3-day window (peaks ~13,000 ms on 09-16, dips to 9,767 ms on 09-17, then stabilises)
- **Cost per day** — bar chart of estimated gateway spend (USD)

**Throughput and reliability**
- Completed: 35 | Failed: 0
- Tool calls: 114 | Avg tools/run: 3.26
- Docs retrieved: 122 | Pending approvals: 1

**Human intervention:** 2.9% of runs required a manager decision. Lower is more autonomous; zero means the risk engine never escalates.

**Top intents**
1. `analyze_delayed_orders_by_segment` — 9 runs
2. `late_delivery_refund_request` — 5 runs
3. `check_order_status` — 2 runs
4. `investigate_order_delay_and_compensation` — 2 runs
5. `count_orders` — 2 runs
6. `analyze_customer_order_value` — 1 run

---

## Architecture

```text
Browser (TanStack Start / React 19)
  │
  └── Server functions (typed RPC, server-only)
        │
        ├── semantic.server.ts
        │     ├── business concepts
        │     ├── relationships
        │     ├── ontology rules
        │     └── semantic mappings
        │
        ├── knowledge-graph.server.ts
        │     └── business entities + relationships
        │
        ├── metadata.server.ts
        │     └── data source and provenance metadata
        │
        ├── agent.server.ts
        │     └── state machine orchestrator
        │
        ├── tools.server.ts
        │     └── tool registry
        │           ├── schema
        │           ├── permission
        │           └── risk
        │
        ├── gateway.server.ts
        │     └── provider-agnostic LLM interface
        │
        └── evaluation.functions.ts
              └── benchmark engine
                    │
                    └── Postgres
                          ├── business data
                          ├── semantic metadata
                          ├── knowledge index
                          ├── run telemetry
                          └── audit logs
```

### Semantic Architecture

```text
Operational Data
      │
      ├── Customers
      ├── Orders
      ├── Shipments
      ├── Tickets
      └── Invoices
             │
             ↓
          Metadata
             │
             ↓
          Ontology
             │
      ┌──────┴──────┐
      ↓             ↓
Business        Relationships
Concepts
      │             │
      └──────┬──────┘
             ↓
      Knowledge Graph
             │
             ↓
        Agent Planner
             │
      ┌──────┼──────┐
      ↓      ↓      ↓
     SQL    RAG     API
      │      │      │
      └──────┼──────┘
             ↓
          Reasoning
             ↓
      Evidence Verification
             ↓
        Risk Assessment
             ↓
      Human / Automated Action
             ↓
           Audit
```

### Agent State Machine

```text
request
   ↓
semantic understanding
   ↓
ontology / business concept resolution
   ↓
intent classification
   ↓
planning
   ↓
tool loop (SQL | RAG | API | logic)
   ↓
reasoning
   ↓
evidence verification
   ↓
risk engine
   ↓
human approval (HIGH/CRITICAL)
   or
auto action
   ↓
audit log
```

Every node writes an `agent_steps` row; every tool invocation writes a `tool_calls` row with input, output, status, duration, risk, and permission level; every run records latency, tokens, and estimated cost. The run trace page replays all of it.

---

## Grounding Rules

- Policy statements may only cite chunks actually returned by `search_knowledge_base`.
- The verification node strips citations that do not match retrieved evidence and fails the run when a policy claim has no supporting chunk; confidence is then capped.
- When a record or policy section is missing, the answer is exactly `Insufficient evidence to determine this.`
- Ontology relationships provide semantic context for retrieving and connecting relevant operational records and policy evidence.
- Provenance is maintained from the final answer back to the underlying record, graph relationship, or policy evidence.

---

## Risk and Human-in-the-Loop

| Risk | Handling |
|---|---|
| LOW / MEDIUM | Executed immediately, audited |
| HIGH | Approval required (emails, refunds above €250) |
| CRITICAL | Approval required (refunds above €1,000) |

`issue_refund` and `create_email_draft` never execute inside the agent loop — calling them only records a proposed action for a manager.

The ontology and risk layer can represent business rules and relationships that help determine how an action should be governed.

---

## RBAC

```text
viewer < operator < manager < admin
```

Each tool declares the minimum role required. The registry refuses execution below that role and records a `denied` tool call.

---

## Provenance and Auditability

An AI decision can be traced through the complete reasoning and evidence chain:

```text
AI Answer
   ↓
Business Concept
   ↓
Ontology Relationship
   ↓
Knowledge Graph / Operational Record
   ↓
Policy Evidence
   ↓
Source Document / Database Record
```

Every run stores: agent steps, tool calls, inputs/outputs, permissions, risk levels, evidence, latency, token usage, estimated cost, verification outcomes, and audit events. This makes the system's decisions inspectable rather than treating the final LLM response as a black box.

---

## MCP Compatibility

Each tool is declared once as a named contract:
- JSON-schema input
- Typed result
- Category
- Permission level
- Risk level
- Approval requirement

That is exactly the shape the Model Context Protocol expects, so exposing the registry over an MCP server is a transport change — `TOOLS` in `src/lib/ops/tools.server.ts` becomes the `tools/list` response, and the existing guarded `execute` entry point backs `tools/call`. Validation, permission checks, risk gating, and audit logging stay untouched.

---

## AI Evaluation — Regression Benchmarking (Details)

The evaluation system uses a golden dataset covering: retrieval, reasoning, refusal behaviour, risk routing, tool selection, SQL reasoning, and simple lookup.

Each case can evaluate: intent match, tool accuracy, retrieval recall, groundedness, risk handling, latency, cost, and overall task success.

The benchmark is designed to operate as a **CI gate**, blocking deployments when quality falls below an agreed threshold.

Example benchmark results:

| Metric | Result |
|---|---:|
| Pass rate | 100% |
| Recall@5 | 100% |
| Tool accuracy | 100% |
| Groundedness | 100% |
| Avg latency | 7,938 ms |
| Total cost | $0.0115 |

---

## Local Development

```bash
bun install
bun run dev     # http://localhost:8080
bunx tsgo --noEmit
```

**Server-side environment variables:**
- AI gateway key
- Database credentials

Nothing secret is exposed to the browser.

---

## Docker

```dockerfile
FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build


FROM oven/bun:1-slim

WORKDIR /app

COPY --from=build /app/.output ./.output

ENV PORT=8080

CMD ["bun", "run", ".output/server/index.mjs"]
```

---

## CI

```text
install
   ↓
typecheck (tsgo --noEmit)
   ↓
lint
   ↓
build
   ↓
evaluation benchmark
   ↓
deploy
```

The evaluation benchmark fails the build when task success, tool accuracy, retrieval recall, groundedness, or other agreed quality thresholds regress.

---

## Project Positioning

NexusData demonstrates how **ontology, metadata, knowledge graphs, GraphRAG, AI agents, enterprise policies, and governance** can work together as a single decision-support architecture.

Core principle:

> **Business knowledge should be structured, traceable, validated, and usable by AI — not isolated across databases, documents, and applications.**

The platform treats the ontology as a semantic layer connecting enterprise data to AI reasoning and operational decision-making, while provenance, verification, risk controls, RBAC, human approval, and auditability provide the governance required for sensitive enterprise workflows.
