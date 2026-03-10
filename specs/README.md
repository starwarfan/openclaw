# OpenClaw Specifications

This directory contains the authoritative specifications for the OpenClaw project.

## Structure

| Directory       | Purpose                                                  |
| --------------- | -------------------------------------------------------- |
| `architecture/` | System architecture documentation                        |
| `code-style/`   | Coding standards and conventions                         |
| `data-model/`   | Global data model definitions                            |
| `modules/`      | **SSOT** - Module specifications (contracts, DTOs, APIs) |
| `features/`     | Feature proposals and change specifications              |
| `_archive/`     | Completed and merged features                            |

## Single Source of Truth (SSOT)

- **Module specs** (`specs/modules/`) are authoritative
- **Feature specs** (`specs/features/`) describe deltas only
- Do not duplicate contracts or DTOs in feature specs

## Workflow

1. Create feature spec: Use `/speckit-specify`
2. Generate technical plan: Use `/speckit-plan`
3. Break into tasks: Use `/speckit-tasks`
4. Implement: Use `/speckit-implement`

## Quick Links

- [SSOT Rules](./AGENTS.md)
- [Module Index](./modules/README.md)
- [Feature Index](./features/README.md)
