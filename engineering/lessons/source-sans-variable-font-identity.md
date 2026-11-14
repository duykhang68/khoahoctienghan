# Candidate lesson — Source Sans 3 variable font identity in Chromium

Incident: #30; PR #29; run 43580986039, job 132405457548, failed SHA b98d316e864607ba48e32b8a563cc66f76a03d81.
Both Chromium projects passed WOFF2 loading checks but failed the CDP glyph-rendering identity assertion at line 43. All 16 other E2E cases passed; build and security checks passed.

Root-cause evidence: Adobe Source Sans 3 release 3.052R (ed1808970eb3c7301c9a523bee26473ba0bb62fa), VF/SourceSans3VF-Upright.otf, parsed SFNT name records: IDs 1 and 4 = SourceSans3VF, ID 6 = SourceSans3VF-ExtraLight. The Unicode cmap maps every character in the Vietnamese test sample. The previous matcher required the spaces in the marketing name and excluded VF. The exact runtime font identity was not printed by the old assertion, so confirmation is pending the new native CI.

Fix: normalize only spaces/hyphens and accept exact SourceSans3 or SourceSans3VF family names; continue requiring every renderer-reported face to be a custom font. Include actual CDP report on failure. Do not skip the glyph test, accept fallback faces or alter font binaries. Regression: desktop/mobile test plus same-origin WOFF2, typography and overflow assertions.

References: https://github.com/adobe-fonts/source-sans/tree/3.052R/VF ; https://chromedevtools.github.io/devtools-protocol/tot/CSS/#method-getPlatformFontsForNode

Verification: pending exact-head CI. Do not publish a resolved-incident article or close #30 until confirmed.
