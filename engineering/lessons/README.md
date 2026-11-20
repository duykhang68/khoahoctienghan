# Bug knowledge base

Read before implementation. Add one file per verified root cause, including incident, trigger, version, official reference, minimal fix, regression and verification SHA. Candidate lessons must not be promoted until CI confirms the fix; production and owner UAT are separate gates.

## Established entry

- [Starlight sidebar 0.39](starlight-sidebar-039.md) — issue #2.

## Candidate preventive and investigation records

- [GitHub App stateless installation tokens](github-app-stateless-token.md) — compatibility notice; no confirmed incident.
- [Issue investigation map and Google Sheets Writeback regressions (20/11/2026)](incident-investigation-20261120.md) — #227/#228: confirmed historical source/test causes; main CI/CD passed, Google Sheets live UAT pending.

## Complete lesson catalogue

This is a discoverability index, **not a list of verified fixes**. Each file owns its own evidence and status. Do not close an issue merely because it has a lesson entry.

### CI/CD, GitHub và merge (10)

- [actions runtime node24](actions-runtime-node24.md)
- [app branch auth](app-branch-auth.md)
- [auto merge ui regression policy](auto-merge-ui-regression-policy.md)
- [branch sync](branch-sync.md)
- [content library release catalog](content-library-release-catalog.md)
- [github app stateless token](github-app-stateless-token.md)
- [incident investigation 20261120](incident-investigation-20261120.md)
- [intelligent conflict resolver](intelligent-conflict-resolver.md)
- [missing release trigger](missing-release-trigger.md)
- [stale release](stale-release.md)

### Back Office, bảo mật và Google Sheets (5)

- [back office jwks redirect mode](back-office-jwks-redirect-mode.md)
- [scheduler fixture clock](scheduler-fixture-clock.md)
- [scheduler secret format](scheduler-secret-format.md)
- [sheet publication writeback](sheet-publication-writeback.md)
- [sheets preview consent reopen](sheets-preview-consent-reopen.md)

### Trình duyệt, UI và kiểm thử (9)

- [content library mobile hit target](content-library-mobile-hit-target.md)
- [course management level locator](course-management-level-locator.md)
- [curriculum native drag scroll](curriculum-native-drag-scroll.md)
- [embedded script replacement](embedded-script-replacement.md)
- [media association label locator](media-association-label-locator.md)
- [search result dom order](search-result-dom-order.md)
- [source sans variable font identity](source-sans-variable-font-identity.md)
- [starlight mobile popover](starlight-mobile-popover.md)
- [starlight sidebar 039](starlight-sidebar-039.md)

### Khác (1)

- [engineering foundation footer](engineering-foundation-footer.md)

**Tổng cộng: 25 hồ sơ** (không tính README). Mục lục tĩnh; cập nhật khi thêm lesson mới.
