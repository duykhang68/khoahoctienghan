# Candidate lesson — native mobile sidebar popover in Starlight 0.42
Incident #58; PR #57; CI run 43590793703; job 132434912249; failing head a7e463a82e65922ba6658de3ff7839fdded94c15.
Evidence: 45 passed, one mobile Chromium timeout waiting for starlight-menu-button button in techblog-navigation.spec.ts. Build/static checks and desktop test passed. Upstream Starlight 0.42.10 MobileMenuToggle.astro renders button[popovertarget="starlight__sidebar"], not the old custom-element selector.
Fix: use the native popover trigger on mobile, assert sidebar :popover-open, then click Tech Blog and verify canonical URL. Preserve all route checks and desktop navigation. No timeout increase, no skipping mobile.
Reference: https://github.com/withastro/starlight/blob/@astrojs/starlight@0.42.10/packages/starlight/src/components/MobileMenuToggle.astro
Verification: pending exact-head native CI and production; do not close #58 until verified.
