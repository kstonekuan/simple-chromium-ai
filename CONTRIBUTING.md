# Contributing

## Project Layout

- `src/` is the published TypeScript library (`simple-chromium-ai`).
- `demo/` is the Chrome extension workspace package (`demo-extension`) that consumes the library.

## Code Quality

### Root package

```bash
pnpm check
pnpm run build
```

### Demo extension (`demo/`)

```bash
pnpm --filter ./demo run check
pnpm --filter ./demo run build
```

## Library Conventions

- Keep the dual API contract stable: `Safe.*` functions return `ResultAsync<_, Error>`, and top-level API functions throw on failure.
- Use exhaustive matching (for example, `ts-pattern`) when branching on finite Chromium API states.
- Use descriptive function and variable names; add comments only for non-obvious behavior or constraints.
