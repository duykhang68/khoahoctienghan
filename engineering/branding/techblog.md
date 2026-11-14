# Engineering Blog editorial design system

Reference: https://aws.amazon.com/blogs/architecture/how-tui-scales-threat-modeling-for-100-teams-with-amazon-bedrock/ (indexed article content and blog listing inspected; exact live computed styles and pixel-level comparison unavailable). Preserve independent Tri thức Hàn Quốc branding; do not copy AWS logos, proprietary artwork, CSS or font binaries.

## Typography

Amazon Ember and Amazon Ember Display are preferred only when already installed by the reader. Public site delivers Open Sans under SIL OFL 1.1, with Vietnamese support. Unmodified upstream Light (300), Regular (400), Bold (700) self-hosted TTF from https://github.com/googlefonts/opensans/tree/bd7e37632246368c60fdcbd374dbf9bad11969b6/fonts/ttf . License in public/techblog-fonts/OFL.txt. No external font requests, no package dependency. Font-display swap; TTF is larger than WOFF2, future subset optimization requires verified Vietnamese glyph coverage. Technical code uses local monospace. Do not represent Open Sans as the actual font on the reference page.

References: https://developer.amazon.com/en-US/alexa/branding/echo-guidelines/identity-guidelines/typography ; https://cloudscape.design/foundation/visual-foundation/typography/ .

## Visual tokens and article anatomy

Navy #232f3e / #161e2d, orange #ff9900 / #ec7211, white, muted gray #545b64, link #006ce0, separators #d5dbdb. Typography: article title 32–42px light, section heading 22–28px bold, body 16–18px regular, metadata 13–14px. Responsive reading column, masthead and breadcrumb; title followed by date/time, category, permalink and share on detail and listing. Justify narrative prose; references, metadata, figure captions and table cells naturally aligned; preserve natural word wrapping. Optional article figures, blockquotes, tables and code have visual rules; no new authored content or schema introduced by this PR.

Source supports editorial structure, not precise measurements; sizes and colors are our adapted design tokens. No AWS endorsement claimed. Scope: Tech Blog only, no KB, publishing or CI/CD changes.
