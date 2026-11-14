# Visual Editorial authoring

Tech Blog uses structured JSON in src/data/techblog/posts.json. Existing paragraphs remain text. Each section can add a visuals array rendered after prose; split a long section when a visual belongs earlier. Use native Astro/CSS (no runtime chart framework). Available kinds: swatches, buttons, type, spacing, wireframe, table, flow, bars, code. Every block needs a meaningful caption. Swatches require items with label and six-digit HEX color; buttons also require value (button text), foreground and hover colors. Type uses numeric size and weight; spacing uses size. Flow uses ordered items with label and optional detail. Bars require nonnegative numeric strings as item values, unit and source (describe period and provenance). Tables require columns and rectangular rows of strings. Code requires language and code text. Wireframe layout is listing, article or responsive. All are static and safe by default; the only JS is local clipboard and harmless demo feedback. No raw HTML, arbitrary SVG or external script in JSON.

Example: {"kind":"swatches","caption":"Proposed palette","items":[{"label":"Primary","color":"#000000","detail":"Main action"}]}

Example: {"kind":"flow","caption":"Release sequence","items":[{"label":"CI"},{"label":"Deploy"},{"label":"Verify"}]}

New technical posts should use at least one meaningful visual when applicable; authors explain a deliberate text-only choice in the PR. Charts must not invent observations. UI/UX articles show actual colors and controls, not just HEX names. Use existing pastel cover system unchanged. Test at 375 and 1280 pixels, keyboard focus, and page overflow; code/table may scroll internally. Raster assets use WebP and alt text.

## Visual Editorial 2.0
Use a meaningful optional title for featured diagrams. Flow defaults to a connected vertical card sequence with optional allowlisted icon (file, pull, shield, merge, cloud, check); variant cycle renders a five-stage circular SVG with a text key. Bars variant summary renders metric totals and a proportional segmented bar; provide 2–5 categories with nonnegative values, HEX colors and a positive sum. Prefer these layouts for status snapshots and continuous improvement diagrams. Match the approved conversation reference visually, not merely semantically; inspect actual rendered desktop and mobile before claiming visual parity. Preserve color meaning, captions and scope. No new runtime dependencies.

## Knowledge Base (all lessons, Visual Editorial 2.0)

The same renderer and styles are shared with Tech Blog, with an isolated Markdown adapter. Store a visual in `src/data/knowledge-visuals.json` under a unique lower-kebab-case key; each value follows the same nine-kind schema above. In a lesson under `src/content/docs/ngon-ngu/`, use an MDX file with identical basename/frontmatter, and import the wrapper at the appropriate relative path. Example:

```mdx
import KnowledgeVisual from '../../../components/KnowledgeVisual.astro';

<KnowledgeVisual id="hangul-basic-letters" />
```

Place the visual immediately after the relevant explanatory paragraph. All nine kinds are available; use `flow` for processes, `flow` + `cycle` for five-step learning loops, and `bars` + `summary` for sourced proportional counts. For a cycle in Knowledge Base supply `"centerLabel":["Luyện tập","Hangul"]` (two short Vietnamese lines, max 18 characters each). Use tables for timelines or contrasts when useful. The renderer supplies accessible captions, labels and keyboard controls. No external scripts, raw HTML or SVG in the visual data. Raster images remain separate WebP assets. Keep all existing URLs, navigation, font/color system and the Tech Blog's visuals unchanged.

The content gate validates all visual records and literal ID references, including missing IDs and unused records. The build renders the same component server-side; no chart runtime package. The Hangul lesson demonstrates a sourced proportional chart, syllable-composition flow and illustrative study cycle. Check native CI, actual desktop/mobile readability, caption/source, and no horizontal page overflow before merge. Do not claim a mockup is a production screenshot.
