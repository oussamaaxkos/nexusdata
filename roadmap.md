# OpsMind AI — Roadmap

## Phase 1 — Data layer
- [ ] Business schema (customers, companies, products, orders, order_items, shipments, tickets, invoices, payments, employees)
- [ ] Knowledge schema (documents, document_chunks with full-text index)
- [ ] Ops schema (agent_runs, agent_steps, tool_calls, approvals, audit_logs, evaluation_cases, evaluation_runs, evaluation_results, model_configs, prompt_versions, tool_registry)
- [ ] Seed synthetic data (500 customers, 1500 orders, 500 tickets, 100 products, 100 invoices, policies, 30+ eval cases)

## Phase 2 — Agent backend (server functions)
- [ ] Tool registry + tool implementations (SQL/RAG/API tools) with schemas, risk, permission
- [ ] LangGraph-style state machine: intent -> plan -> tools -> reason -> verify -> risk -> approval -> action -> audit
- [ ] Run/step/tool-call persistence, latency, tokens, cost
- [ ] Approval execution + audit logging
- [ ] Evaluation engine (retrieval + agent + system metrics)

## Phase 3 — Frontend
- [ ] Design system + app shell (dark/light)
- [ ] Dashboard, Copilot, Runs, Run detail, Approvals, Knowledge, Ingestion, Customers, Orders, Evaluation, Observability, Prompts, Models, Audit, Settings
- [ ] SEO head metadata per route

## Phase 4 — Docs
- [ ] README covering architecture, MCP exposure, Docker/CI notes
