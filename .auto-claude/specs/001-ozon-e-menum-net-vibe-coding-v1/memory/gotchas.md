# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-13 18:23]
Pre-existing test file lib/__tests__/price-ledger-immutability.test.ts has ESLint errors (unused variables) that block npm run build but do not affect actual code compilation

_Context: Build verification during subtask-6-3_
