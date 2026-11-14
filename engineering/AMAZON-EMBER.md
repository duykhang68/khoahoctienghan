# Amazon Ember — Tech Blog typography

The repository owner states that they hold the right to use the supplied font archive. The archive contains 34 original font files. This change selects six original TTFs, verifies each SHA-256 and never fetches fonts from third-party hosts. Font redistribution/web serving must be covered by the owner's license; this document is not a license grant. Do not include the remaining archive or any unrelated fonts.

Import the owner's local archive on the feature branch: `python3 scripts/import-amazon-ember.py /path/to/amazon-ember.zip`. Commit the six generated assets with the prepared CSS and tests in one logical PR. Do not merge without successful CI.

Amazon's Echo typography guidance uses Display Light for titles, Ember Light for prose, Bold for short subheads/emphasis, zero tracking and roughly 1.33 leading. Regular navigation and Mono code are editorial adaptations. Retain the established justified Vietnamese article style and 1.65 body leading for readability (not an exact reproduction of Echo advertising typography). Preserve Open Sans for unsupported Vietnamese glyphs; the examined Ember files lack some precomposed Vietnamese vowels. Use no Amazon brand logo or claims of affiliation. Font loading is tested by requesting each actual webfont face, checking same-origin resources and preserving mobile layout.

Source: https://developer.amazon.com/en-US/alexa/branding/echo-guidelines/identity-guidelines/typography
