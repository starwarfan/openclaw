# Specs Layer Constraints for AI Agents

## SSOT Principles

- `specs/modules/*` is authoritative
- `specs/features/*` only propose deltas
- Do not duplicate full contracts or DTOs in features

## Where to Put Things

- Contracts: `specs/modules/<module>/contracts/`
- Data models: `specs/modules/<module>/data-model.md`
- Feature deltas: `specs/features/<NNN>-<slug>/`

## Feature Spec Requirements

- Must link to authoritative module SSOT
- Only describe what changes (add/modify/deprecate)
- Include acceptance criteria, not implementation details

## Module Spec Requirements

- Define complete contracts (OpenAPI, interfaces)
- Document all entities and DTOs
- Specify error codes and invariants
- Breaking changes require version bump documentation
