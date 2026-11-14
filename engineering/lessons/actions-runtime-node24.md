# GitHub Actions runtime and runner migration

Status: candidate remediation; CI and production verification pending.

Observed in successful reconcile run 43572631023, job 132380094769. These are platform deprecation notices, not a failed CI incident. Node.js configured by setup-node is separate from the runtime declared in each action manifest. Checkout and setup-node v4 use Node 20; the verified v6 manifests declare Node 24. Use Node 24 actions; do not suppress warnings or opt into an insecure runtime. Pin Ubuntu 24.04 LTS to avoid the rolling ubuntu-latest migration to 26.04; test future OS upgrades separately. Also migrate official artifact and Pages actions to Node 24-compatible releases. Disable automatic package manager caching explicitly, especially on privileged engineering workflows.

References:
- https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
- https://github.blog/changelog/2026-09-17-ubuntu-26-generally-available-and-latest-migration/
- https://github.com/actions/checkout/blob/v6/action.yml
- https://github.com/actions/setup-node/blob/v6/action.yml
- https://github.com/actions/upload-artifact/blob/v6/action.yml
- https://github.com/actions/upload-pages-artifact/blob/v5/action.yml
- https://github.com/actions/deploy-pages/blob/v5/action.yml

Regression: inspect CI, reconcile and CD logs for the new exact SHA; validate no Node 20/ubuntu-latest migration annotation for changed actions, verify builds and exact production SHA, and retain all security gates. Historical warnings remain in historical runs.
