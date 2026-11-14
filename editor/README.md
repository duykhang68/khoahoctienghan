# Duy Nguyen Editorial Studio — Reddit migration

Source: [reddit-editor at 1a1c3f3efc72b530c1c76ce494bdebd8baa3f795](https://github.com/duykhang68/reddit-editor/tree/1a1c3f3efc72b530c1c76ce494bdebd8baa3f795). Ported ArticleBlocks, Callout, article styles, editor-kit styles and deterministic diagram suggestions together with the original locked React/TipTap dependency graph. The application shell is adapted to the target typography and light pastel design. No Blogger API, Drive OAuth, unrelated utilities, secrets, or PR #67 implementation was copied.

## Start

From repository root: `npm ci --prefix editor` then `npm run editor`. Open `http://127.0.0.1:4317/`. Node 24 recommended. Local Vite development server only; not public GitHub Pages. Browser drafts use a new independent storage key; previous editor drafts remain untouched.

## Migration scope

- Working WYSIWYG canvas, both destinations, inline category picker, title-derived route preview, native TipTap formatting/history, reused block library, local raster-to-WebP insertion, local autosave/backup and checkout article library. Existing public articles are read-only at this stage, deliberately not converted or overwritten. The preview is a styled TipTap preview, not the actual Astro release renderer. Diagram suggestions are local and do not send text to third parties.
- Next integration: lossless target-specific content adapters (existing Tech Blog JSON/Knowledge Markdown/MDX and structured Visual Editorial 2.0), content-addressed binary asset publishing, authenticated GitHub Draft PR and production status, real Astro preview, article lifecycle. No publishing button until the adapter passes the original content validation and real owner acceptance. Do not merge PR #67; no changes to public article files or routes in this phase.
