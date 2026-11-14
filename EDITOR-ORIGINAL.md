# Original Reddit Editor — local checkout

The original application is pinned to [1a1c3f3efc72b530c1c76ce494bdebd8baa3f795](https://github.com/duykhang68/reddit-editor/commit/1a1c3f3efc72b530c1c76ce494bdebd8baa3f795) via a Git submodule containing the complete upstream repository. No layout, block, utility, or backend code was customized. This available GitHub snapshot is not independently verified byte-for-byte against the live Cloudflare production deployment.

From the root of khoahoctienghan, with Node 24:

```bash
npm run editor:setup
npm run editor
```

Open http://localhost:5173/. Stop with Control+C. Do not run the original auto-sync command in the detached submodule. Don't use public tunnels. The original local development launcher starts the original web app, and its optional backend only when its own local apps/server/.env exists. Set up any original OAuth/API connections as documented in editor-original/README.md; keep credentials outside Git. The original Blogger/Drive flows are unchanged and must not be mistaken for Korean site publishing. No database or session migration has been performed. The Korean blog and its previous adapter remain unchanged; feature adaptation is postponed.
