# GitHub App stateless installation tokens

Status: preventive compatibility change; candidate pending exact-HEAD CI and live dual-format validation. This is a platform change notice, not a confirmed repository incident.

## Trigger and scope

GitHub completed the rollout on 2026-10-02. New installation tokens are variable-length, about 520 characters, rather than the former 40; the prefix is unchanged (`ghs_`). The new form includes the App ID and a JWT with separators. Permissions, repository scoping and one-hour expiration remain unchanged. The temporary override header stops being respected on 2026-11-30.

## Root cause and minimal remediation

Baseline main: 675dd6f901f961f3215b4d905fb557956b869e06. The controller already passes the token to the GitHub CLI via its environment as an opaque, non-empty string; no length, regex validation or JWT decoding is needed there. The old tracked-file secret detector assumes a contiguous alphanumeric suffix and can miss tokens with early separators. Add GitHub's recommended installation-token detection pattern while preserving all existing signatures and environment-file checks. Detection is not authentication. No credential, workflow permission, deployment or merge-policy changes.

## Regression and evidence

Tests: `tests/branch-auth.test.mjs` checks exact opaque pass-through at 40, 520, 1024 and 2048 characters and missing-token fail-closed behavior. `tests/security-check.test.mjs` checks both formats, other existing signatures, clean placeholders, failure on tracked secrets and environment files, and no token disclosure in output. Both run through `npm run test:engineering`.

Baseline observed: [reconcile run 43577452554](https://github.com/duykhang68/khoahoctienghan/actions/runs/43577452554), job 132394740732, token creation and controller succeeded. This does not prove which format was issued. Post-change exact CI SHA and production verification: pending.

Before 2026-11-30, if dual-format verification is needed, an authorized maintainer should request short-lived installation tokens using the App JWT against `POST /app/installations/:installation_id/access_tokens`, with `X-GitHub-Stateless-S2S-Token` set to `enabled` and `disabled` in separate requests. Verify both using the same read-only repository API request, without logging credentials or persisting token values; revoke each token after use. Record only pass/fail and run references. Do not add a permanent override or change production workflow permissions. Live verification not performed by this PR.

## Official references

- https://github.blog/changelog/2026-05-15-github-app-installation-tokens-per-request-override-header/
- https://github.blog/changelog/2026-10-02-stateless-github-app-installation-tokens-rolled-out/
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app
