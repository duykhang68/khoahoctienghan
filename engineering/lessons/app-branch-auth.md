# PR approval after built-in token update

PR #17: native PR CI run 43575741218 returned action_required after bot synchronization. Dispatch run 43575738861 succeeded but did not unblock required PR CI. GitHub documents this approval behavior. Proposed fix: private repository-specific GitHub App, ephemeral token for update-branch and known fixer writes; no default-token fallback. Require native exact PR CI. No shared PAT or owner impersonation. Regression: tests/branch-auth.test.mjs. Live activation pending owner setup and verification.

References: https://docs.github.com/en/actions/concepts/security/github_token ; https://docs.github.com/en/rest/pulls/pulls#update-a-pull-request-branch ; https://github.com/actions/create-github-app-token
