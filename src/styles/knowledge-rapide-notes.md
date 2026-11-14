# Knowledge Base documentation UX — Rapide reference

Reference: https://starlight-theme-rapide.vercel.app/examples/kitchen-sink/
Upstream: https://github.com/HiDeoo/starlight-theme-rapide

Scope: only Starlight knowledge pages. The inspected upstream Rapide 0.7.0 package declares Starlight >=0.43.0; this repository uses 0.42.10. Avoid introducing an incompatible dependency or framework upgrade. Adapt the navigation and component patterns locally on top of existing Starlight and shared editorial UI tokens.

- Compact grouped navigation with leading disclosure, vertical guide and current item.
- Desktop TOC with active heading guide; native mobile disclosure.
- Native Pagefind dialog and keyboard shortcuts; compact result presentation.
- Reading components (asides, cards, links, code, tabs, tables, details and file tree) retain native semantics.
- Minimal previous/next navigation.
- Brand palette, local font assets, Light Mode, home and Tech Blog stay unchanged.

Verification: desktop/mobile E2E, existing all-route visual parity test, native CI and exact production release. This is a local UX adaptation, not an installation of the upstream plugin or a pixel-identical reproduction.
