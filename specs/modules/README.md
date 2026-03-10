# Module Specifications (SSOT)

This directory contains the **Single Source of Truth** for all module specifications.

## Module Structure

Each module directory should contain:

```
specs/modules/<module>/
├── spec.md           # Module specification
├── data-model.md     # Entity and DTO definitions
├── contracts/
│   ├── openapi.yaml  # OpenAPI specification
│   └── interfaces.md # Internal interfaces
└── adr/
    └── README.md     # Architecture Decision Records
```

## Rules

1. **Authoritative**: All contracts defined here are the source of truth
2. **No Duplication**: Feature specs reference these definitions
3. **Version Control**: Breaking changes require documentation

## Current Modules

| Module   | Description                          | Key APIs                                   |
| -------- | ------------------------------------ | ------------------------------------------ |
| plugins  | Plugin system, hooks, tool filtering | `before_tools_resolve`, `before_tool_call` |
| platform | Shared schemas                       | N/A                                        |

> Add new modules as they are documented.
