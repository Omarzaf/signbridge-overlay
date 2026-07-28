# ADR 0001: Use a clean independent repository

## Decision

Build SignBridge as an independent repository governed by the Workspace control
plane.

## Rationale

Existing projects contain useful process patterns but no compatible
sign-language core. Starting clean prevents unrelated personal data, licenses,
dependencies, histories, and operator assumptions from entering the product.

## Consequences

- External code and assets require explicit provenance and licensing.
- Workspace registration is a separate control-plane change.
- Product agents use repository-specific branches and worktrees.
