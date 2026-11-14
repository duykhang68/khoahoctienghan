# Candidate lesson — search result DOM ordering

Incident #34; PR #33; run 43583011882; job 132411574381; failing SHA d56680e4812a3c1372ff92d3448062b99e5b6c35.
All build/security/static checks passed. Playwright: 22 passed, 2 failed (desktop and mobile, site.spec.ts line 22). The locator [data-tech-post].first() resolved to a hidden nonmatch after submitting a valid query.

Cause: ranking moved matching cards to the end with append(), leaving nonmatching cards before them in DOM order. The search regression checks both visible output and the leading ranked card. Fix: prepend ranked matching nodes as a group in relevance order, keep nonmatches hidden and after matches. Preserve existing site regression, matching evidence and pagination. Add explicit first-DOM-card assertion for the sidebar title-only query.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/Element/prepend

Verification pending native exact-HEAD CI; do not close issue or publish a verified retrospective until successful.
