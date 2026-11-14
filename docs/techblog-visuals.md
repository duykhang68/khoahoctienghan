# Visual Editorial authoring

Tech Blog uses structured JSON in src/data/techblog/posts.json. Existing paragraphs remain text. Each section can add a visuals array rendered after prose; split a long section when a visual belongs earlier. Use native Astro/CSS (no runtime chart framework). Available kinds: swatches, buttons, type, spacing, wireframe, table, flow, bars, code. Every block needs a meaningful caption. Swatches require items with label and six-digit HEX color; buttons also require value (button text), foreground and hover colors. Type uses numeric size and weight; spacing uses size. Flow uses ordered items with label and optional detail. Bars require nonnegative numeric strings as item values, unit and source (describe period and provenance). Tables require columns and rectangular rows of strings. Code requires language and code text. Wireframe layout is listing, article or responsive. All are static and safe by default; the only JS is local clipboard and harmless demo feedback. No raw HTML, arbitrary SVG or external script in JSON.

Example: {"kind":"swatches","caption":"Proposed palette","items":[{"label":"Primary","color":"#000000","detail":"Main action"}]}

Example: {"kind":"flow","caption":"Release sequence","items":[{"label":"CI"},{"label":"Deploy"},{"label":"Verify"}]}

New technical posts should use at least one meaningful visual when applicable; authors explain a deliberate text-only choice in the PR. Charts must not invent observations. UI/UX articles show actual colors and controls, not just HEX names. Use existing pastel cover system unchanged. Test at 375 and 1280 pixels, keyboard focus, and page overflow; code/table may scroll internally. Raster assets use WebP and alt text.
