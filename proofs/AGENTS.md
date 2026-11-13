# Working on the proofs

- Run `bend guide` before first writing Bend in a session.
- Keep specifications in `LAWS.bend` and proofs in `PROOF.bend`. Treat changes to
  existing laws as specification changes: explain them, never weaken a law just
  to make an implementation pass.
- Do not use unsafe definitions, proof holes, or foreign code inside proved code.
- Run `BEND_NO_TELEMETRY=1 bend PROOF.bend --check-only` and `node verify.mjs` in this directory
  before committing. Keep the negative controls working.
- Distinguish checked Bend laws from adapter tests and unverified assumptions.
  Preserve existing files and unknown fields; malformed or unsupported input
  must fail before any update is returned.
- A shortcut around checked logic stays off by default until a law covers it.
- `fixtures/` holds frozen copies of what the old plugin and the Hypothesis
  client did. They are references, not source: do not edit them.
