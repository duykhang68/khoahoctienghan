# R9 — Public Blog & Knowledge Base (candidate)

Stacked on R8 #216. R0/R1 are merged into main; the R2–R8 stack needs reconciliation against concurrent Course Studio and integrated asset changes. Keep independent changes; draft only until explicit review and exact integrated CI.

- Tech Blog's Astro module now binds static JSON and explicit TypeScript public types to a pure content index. Existing category and knowledge-feed exports are compatibility facades. Taxonomy scoring, stable newest-first sort, Vietnamese labels, GMT+7 date/seconds, reading time, URL/cover rules, archive and knowledge navigation remain unchanged. No HTML/CSS, authored article, taxonomy terms, route or metadata change.
- Move metadata and visual validators unchanged to core/editorial. Document schema produces deterministic generator requests for embedded images; shell processes base64/crypto and asset writes in original order, then resumes validation. WebP dimensions and image reference checks are pure; actual repository file lookup and SHA-256 remain outside core. No validator weakened.
- Content checker directs a filesystem adapter to collect source snapshots and bytes; pure rules validate titles/descriptions, links, sidebar, visual refs, reserved route, structured document refs and metadata. Rendered build verifier unchanged. Read each knowledge source once instead of twice; no claim about runtime or token savings.
- Protect extracted content gates. Four regression groups in existing engineering suite, native Node/Astro/Playwright and exact asset sync pending. No production or content mutation.
