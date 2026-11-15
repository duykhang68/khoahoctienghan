# R4 — Editorial Studio Functional Core (candidate)

Depends on R0 #200, R1 #201, R2 #203 and R3 #205. Draft targeting main; reconcile current base and review in dependency order. The browser-compatible pure core is at src/lib/editor-v2/core/ (not a second duplicate implementation at repository-root core/editorial). This keeps relative private asset URLs and existing browser/Node facade APIs intact.

- contracts, metadata, rich-text, blocks, document: explicit ID construction and typed readonly input contracts; pure text/markup-to-data projection, size checks.
- publication-plan: explicit Date and resolved document/assets, no clock, hash, network, or filesystem; retains original route/collision/metadata/index rules.
- revision-parser, revision-plan: explicit ID list, structural parse and data-only change plan; existing strict roundtrip check, exact main and draft GitHub PR safeguards remain in revision shell.
- draft-policy, editor-reducer: explicit timestamps/ID, due ordering, draft copy validation, workspace and block move selectors. Browser retains DOM, UUID, upload, localStorage/IndexedDB and consent. Further UI event/state migration is not required to use these helpers and is deferred.
- Existing R3 shared media validator retained. Hashing and drawing-source archive remain in model/drawio shell; no duplicate image validation, no changed WYSIWYG or publishing UI.
- The generated private asset allowlist includes exact new modules; no arbitrary file paths or public Pages assets. Sync --check remains mandatory. Existing tests retained; new editorial-core tests imported by Worker tests.

Verification required: native Node tests, build and desktop/mobile E2E, exact-head/current-base review and private Worker deployment acceptance. No production or tokenizer benchmark claim.
