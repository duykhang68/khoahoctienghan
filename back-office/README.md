# P0.1 — Back Office & Security Foundation

Status: BLOCKED for activation until Cloudflare Access is enabled and a Google identity provider plus explicit administrator allowlist are configured. The Worker is an isolated fail-closed entrypoint, not a completed dashboard migration.

## Activation
1. Enable Access in the Cloudflare account dashboard. Do not change existing production apps.
2. In Google Cloud console configure a Web OAuth client for the Access callback URL shown by the Google IdP setup. Existing public Sheet client ID is in src/lib/sheet-blog/oauth-config.mjs; it is not a client secret. Prefer a separate identity-only client to avoid affecting Sheets consent and origins. Never obtain a secret from a public page or commit one.
3. Add Google as the Access identity provider and select only that provider for this application. Allow only the owner-confirmed exact administrator email(s), not all Google accounts.
4. Deploy back-office/worker.mjs as a separate Worker, protect production AND preview URLs with Workers Access; set ACCESS_AUD to the exact application audience and ADMIN_EMAILS to the confirmed allowlist in Worker configuration. No sensitive static assets can bypass the Worker. Do not expose a public origin. See https://developers.cloudflare.com/changelog/post/2026-08-14-workers-access/ and https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/google/.
5. Migrate Engineering Foundation (#106) and the existing Google Sheets publisher to guarded routes; retain separate, least-privilege Sheets authorization for sheet reads. Remove public admin pages and replace old routes with navigation to protected host, without packaging admin functionality in GitHub Pages. Verify the existing publisher is not broken.
6. Check anonymous, wrong account, forged headers, missing config, wrong audience, successful Google login, logout, direct URLs/API/assets, previews and public blog. Do not claim activation until all pass. Do not start P1 until verified.

Public Knowledge Base and Tech Blog remain on GitHub Pages. All new admin routes and APIs must be denied by default; student-facing interfaces are separate from administrative privileges.
