# R10 — Architecture Gates & Benchmark (candidate)

Baseline R0: 3e5e7a966a5c528cccbb920d48e435ebf93a04bd, tree 05820f57b159407de3ba289376846b3b3e35ac5c. Candidate snapshot R9: 683aab877aed23e22c80f8972b45f75f17d94212, tree d973c7e6623e178b31ee102d20f977bfc5920136. Exact Git tree blob byte sizes, not deployed code, not tokenizer telemetry. R0/R1 merged; R2–R9 require current-base reconciliation and review. R10 adds a mandatory step to existing CI quality job with no changes to permissions, release or existing gates. Explicit review required.

## Reproducible source aperture

First six rows are fixed R0 tasks with selected source+test paths. Two supplemental tasks cover R8 and R9; local draft is source-only (adapted composer, not original submodule). See context-benchmark.json for exact path order, baseline blob SHA/size and budgets. No generated assets or gitlink in ordinary tasks except legacy inline Worker. Selected path sets estimate a full-file reading strategy; not the minimum context or all integration dependencies.

| Task | Before B | Candidate B | Reduction | Budget B |
|---|---:|---:|---:|---:|
| curriculum-409 | 395959 | 8728 | 97.80% | 25000 |
| editorial-rich-text | 46433 | 10990 | 76.33% | 15000 |
| ci-failure-policy | 29044 | 5900 | 79.69% | 12000 |
| fifo-transition | 22289 | 9550 | 57.15% | 12000 |
| scheduler-retry | 24556 | 5949 | 75.77% | 12000 |
| sheet-row-selection | 27654 | 10410 | 62.36% | 14000 |
| local-draft-source-only | 16574 | 3788 | 77.14% | 8000 |
| structured-document | 10672 | 16594 | -55.49% | 20000 |

Six original tasks: median reduction 76.05%, range 57.15–97.80%. Structured document costs more because the selected set includes the original tests plus R9's wider regression suite; do not remove tests to improve the metric. Budgets are explicit selected+transitive-pure-core bytes; full shell/test import closure is deliberately excluded and must be investigated when a task requires integration. Shared instructions reported separately, excluded from per-task totals. Git tree byte measurements in this table are direct selected sets (dependency expansion and native gate not executed at authoring). No aggregate total because tasks overlap.

## Run
- npm ci --no-audit --no-fund
- npm run check:architecture
- npm run benchmark:context -- --check
- npm run benchmark:context -- --json --verify-baseline (full clone containing baseline objects; ordinary shallow CI uses frozen manifest)
- npm run test:engineering
- npm run check && npm run build && node scripts/verify-build.mjs && npm run test:e2e

AST gate uses already-locked Babel parser 7.29.14, declared directly as devDependency; no package version or resolved dependency graph changes. Checks tracked root core/, browser core roots, local overlay core, and existing explicit transitional leaf media-validation.mjs. Allow only local core imports and the safe Node assert/util helpers (util named isDeepStrictEqual only). Detect syntax errors, missing/outside imports, re-exports, dynamic import, direct reserved effect identifiers, implicit Date/Math clock/random, this, import.meta, cycles and 8 KB module limit. Lexical identifiers are intentionally reserved (property keys and string literals are allowed); do not confuse this with semantic proof of determinism. Aliasing/computed expressions, callbacks, mutation, nonliteral ambient behavior and frontend/shell dependency closure are not fully proved. Frozen-input/effect-order regression tests and review remain authoritative. Generated asset drift stays enforced by the existing test:back-office sync --check; no arbitrary URL allowlist. Any exception needs reviewed rationale, scope and regression; do not disable tests or minify to meet budget.

## Optional tokenizer benchmark
In a separate Python environment install tiktoken==0.9.0 and run python scripts/benchmark-context-tokens.py from a full clone containing baseline. The first load of o200k_base may require network or a populated cache. Same task prompt, file framing and ordered path lists per phase; with-shared counts include identical current instructions. This is a pinned proxy tokenizer, not the actual GPT-6 tokenizer, context overhead, cost, or model input telemetry. Tokenizer unavailable in authoring environment; actual token counts not claimed. No dependency on Python or network in CI.

Native CI, protected review, exact integrated HEAD and private Worker/local editor owner UAT pending. Do not report Production complete merely because a draft was opened.
