# Domain Docs Layout & Consumer Rules

This repository follows a **single-context** architecture doc layout.

## Documentation Structure
- System Context: `AGENTS.md` and `design/` (containing architecture, API, database, engineering specs).
- Architectural Decision Records: `docs/adr/`.
- Domain Models: Defined in `backend/src/models/` and `design/database.md`.

## Consumer Rules
1. Before implementing material changes, agents must consult `AGENTS.md` and relevant files in `design/`.
2. Any architectural decisions must be recorded or updated in `design/` or `docs/adr/`.
