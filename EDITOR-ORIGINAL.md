# Original Reddit Editor — GitHub workspace

The original application remains pinned as a complete, unmodified submodule. The default local launcher adds a separate GitHub connection and native Draft PR panel via a local Vite overlay. It does not run the original Cloudflare Cashflow middleware or forward traffic to port 3000. Original Compose, blocks, diagrams, Drive panel and original UI remain. Old Blogger APIs are explicitly offline in this workspace; quick links open existing Cloudflare tools in a separate tab. The original source is also runnable via `npm run editor:original`, but its Google/Cashflow services require separate configuration.

Stop Wrangler first. From the repository root (Node 24, GitHub CLI installed):

```bash
npm run editor:setup
gh auth status --hostname github.com
# Only if not signed in: gh auth login --hostname github.com
npm run editor
```

Open http://localhost:5173/ (not 127.0.0.1, to match the origin). Click Kết nối GitHub. The CLI checks that the authenticated account is duykhang68 with push access to khoahoctienghan; credentials remain in the local CLI, not in browser storage. The session lives in the local process; Ngắt GitHub clears the app session and does not log out gh globally. The Draft PR panel submits new validated articles only, after explicit confirmation. The original Blogger publish/schedule controls are not wired to GitHub. Do not confuse a Draft PR with publication. Images must satisfy existing WebP validation; external images are not yet supported. The GitHub adapter preserves optional labels and Series (name, part, total_parts, target_date, derived status) as structured data in Tech Blog JSON and the Knowledge Base studio metadata index, without overriding automatic categories. Both article renderers show the metadata; original Blogger series refresh and scheduling remain separate. No secret or Cloudflare data migration. Do not expose localhost via a tunnel.
