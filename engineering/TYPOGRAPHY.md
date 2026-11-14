# Tech Blog typography — approved design contract
Source Sans 3 (Adobe) for editorial prose and UI, IBM Plex Mono for code. Self-host official WOFF2 files, no CDN requests or locally installed font requirement. Original OFL 1.1 licenses in public/techblog-fonts. Source Sans 3 variable upright and italic from release 3.052R, commit ed1808970eb3c7301c9a523bee26473ba0bb62fa; IBM Plex Mono Regular from commit bc6a7e4b37634eb79785d59781893db63ee3edcb. No modification to upstream font binaries.

| Component | Desktop px | Weight |
|---|---:|---:|
| Blog masthead | 64 | 300 |
| H1 | 42 | 600 |
| H2 | 30 | 600 |
| H3 | 24 | 600 |
| Body | 19 | 400 |
| Navigation | 16 | 500 |
| Button | 15 | 600 |
| Breadcrumb | 14 | 400 |
| Caption | 14 | 400 |
| Code | 15 | 400 |

Body 1.75 line-height, zero tracking, Vietnamese justified prose and natural reference alignment. Masthead/H1/H2 scale on narrow viewports. Keep AWS reading layout, Anthropic listing, Figma-inspired image treatment, colors and functionality. Scope Tech Blog only. Remove obsolete Ember and Open Sans binaries from current tree and retire Ember import script; Git history is not rewritten. Browser regression checks actual Vietnamese glyph rendering via Chromium CDP and WOFF2 resource origin.
