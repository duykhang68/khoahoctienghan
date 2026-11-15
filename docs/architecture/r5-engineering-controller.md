# R5 — Engineering Controller (candidate)

Depends on R0 #200, R1 #201, R2 #203, R3 #205, R4 #207. Draft against main; reconcile exact integrated HEAD/current base before explicit engineering review. All prior phases remain unmerged at authoring.

Pure policy modules under core/engineering: constants, failure, CI, branch, merge review, release, conflict, incident and labels. Existing scripts remain compatibility facades. The existing pure FIFO marker parser moves unchanged into core/publication/issue-state.mjs to avoid pulling publication hashing and document modules into engineering policy. Queue exports and behavior stay unchanged; R6 owns queue transitions.

Imperative shell: scripts/adapters/github-cli.mjs isolates gh/credentials with injected execution; scripts/engineering/ separates labels, failure, retrospectives, release and conflict orchestration. Controller preserves original synchronization and merge loop verbatim, including native PR CI, fresh SHA, expected-head update and match-head squash, issue FIFO priority, App-only branch writes, exact release artifact and review rules. No workflow, permission, trigger, retry or merge-branch allowlist change. Preserve required review for relocated policy code by explicitly protecting core/engineering/ and core/publication/issue-state.mjs; these protected paths also cannot be automatically closed as duplicate conflicts. Existing UI test exception remains unchanged.

Tests: existing engineering suite plus four new groups for immutable policy inputs, relocated review boundary, release/FIFO guards and fake CLI token separation. No real GitHub actions are triggered by tests. No production claim and no tokenizer benchmark. Explicit review required.
