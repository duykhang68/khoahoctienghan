# Intelligent Conflict Resolver 2.0 — candidate

Case: #131 conflicted after #141 merged an integration snapshot. #143 was closed as SUPERSEDED after exact source comparison, retained Worker/browser tests and green main CI 43659745752; public release 43659849349 verified. Private Cloudflare owner UAT is not implied. No duplicate merge.

## Automated policy
- Run the existing trusted-main reconciliation on its existing events. Analyze immutable merge-base, HEAD and current-main Git trees, reject truncated/ambiguous paths, renames, deletions, executable/symlink changes. No checkout or execution of PR code in privileged job.
- Exact identical regular blobs on green current main can close a non-protected owner PR and conflict incident (SUPERSEDED, not merged). Protected duplicates and non-identical semantic cases are Researcher review candidates, never guessed. A REST close has no atomic expected-HEAD lease; recheck HEAD and main before closure and validate returned head. Branch remains recoverable.
- Only automatic semantic transformation currently enabled: additive independent records in the single Tech Blog posts JSON file; old entries and order preserved, new slugs unique, conflicting same-slug edits rejected, main order retained. Queue-owned branches and explicit DO NOT MERGE excluded. Commit with both parents, App token, non-forced branch update; no main writes. Existing native CI and review rules remain. Exact repair HEAD/current base and full native CI are required before closing a repair incident; if main advances or CI fails, defer to Researcher.
- Structured incident includes pinned SHAs and classification, one automatic attempt per exact main/head pair. Researcher compares source, tests and integration provenance for unknown cases, proposes narrow reviewed fix or documented supersession; no blanket ours/theirs, no arbitrary LLM code execution, no credentials/log dumps. New automatic transform requires tests and explicit review.
- This PR is a candidate until native CI and explicit governance review; no claim that arbitrary semantic conflicts are automatically solvable.

Regression: tests/conflict-resolver.test.mjs, included in npm run test:engineering. References: https://docs.github.com/en/rest/git/trees#get-a-tree ; https://docs.github.com/en/rest/git/commits#create-a-commit ; https://docs.github.com/en/rest/pulls/pulls#update-a-pull-request .
