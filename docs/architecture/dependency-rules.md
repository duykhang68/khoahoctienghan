# R0 — Dependency rules và tiêu chí nghiệm thu

Áp dụng dần sau review; R0 không sửa CI và không áp đặt gate mới lên mã legacy.

## Ranh giới
| Tầng | Được phụ thuộc | Không được |
| --- | --- | --- |
| core/ | pure modules, readonly contracts, immutable constants | shell, network, D1, environment, filesystem, DOM, runtime clock/random, global mutable state |
| Shell: back-office/routes, services, repositories, adapters; scripts | core, ports, runtime I/O thích hợp | bypass authorization, SQL concurrency, CI/CD policy |
| Presentation: src/, editor/ | core, browser-safe adapters | private secrets, D1 credentials, private server-only imports |
| generated/ | deterministic source packaging | manual logic edits, secrets, public admin asset leaks |

Không circular imports. Không tạo barrel export toàn bộ domain nếu khiến AI hoặc bundle phải tải nhiều module. Không tạo module chỉ để giảm LOC vô nghĩa. Giữ export cũ bằng facade trong giai đoạn chuyển tiếp, tránh duplicate business rule. Tách UI khỏi nghiệp vụ không yêu cầu thay UI.

## Bảo toàn hành vi
- Auth: server-side allowlist, signature/nonce/issuer/audience/expiry, origin, signed HttpOnly Secure cookies, CSP, bounded request, deny-by-default, private assets, anonymous/unauthorized direct routes. JWKS không follow redirect; xem engineering/lessons/back-office-jwks-redirect-mode.md.
- D1: optimistic concurrency 409, SQL guard trạng thái và version; transaction/batch, row-change validation, UUID/membership, media permissions.
- Generated: deterministic sync, --check, literal concatenation hoặc callback replacement; không sửa tay; xem engineering/lessons/embedded-script-replacement.md. Kiểm thử browser module import graph và authenticated page; không ship admin code ra Pages. Bundle runtime bằng pipeline đã được xác minh, không thay deployment contract ngầm.
- FIFO: accepted Issue theo ascending number; không nhảy head, không merge queue-owned PR bên ngoài worker. Exact SHA, native PR CI, current base, production verification trước đóng. Sheets writeback chỉ sau verified receipt; giữ nguồn fingerprint, idempotency và không nới lỏng retries.
- Scheduler: giữ lease CAS, FIFO ordering, max 3 attempts, explicit time, digest, app identity và permission checks. Không lưu credentials vào repo; fixture phải cùng clock. 
- Engineering: không thay merge eligibility, branch policy, privileged workflow token scoping, release artifact verification, conflict allowlist. Duy trì explicit review theo AGENTS.md.
- Public site: giữ URL, nội dung, tiếng Việt, Light Mode, navigation, layout và accessibility. Không thay taxonomy ngoài phạm vi.

## Quy trình test cho từng PR
1. Characterization/fixture test chứng minh hành vi trước khi tách. Không xóa, skip, giảm timeout/guard hoặc sửa expected chỉ để qua.
2. Pure unit tests: deterministic với cùng input; deep-freeze input; case biên/invalid, error code, explicit clock. Shell test dùng fake port, assert effect ordering và failure/no-write.
3. Integration: D1 race/409, release state, auth fail-closed, browser module graph, queue idempotency theo scope; giữ E2E desktop/mobile.
4. Chạy npm ci, npm run check, npm run test:engineering, npm run build, node scripts/verify-build.mjs, npm run test:e2e theo AGENTS.md; chạy thêm node --test các test trực tiếp liên quan nếu chưa được aggregate. Kiểm tra git diff --check.
5. Native PR CI exact HEAD + current base, không merge khi gate chưa đủ; sensitive PR cần review. Tách báo cáo Merged/Deployed/Verified. Back Office cần xác minh private production và owner UAT theo back-office/README.md, không coi public Pages success là Worker success.

R10 mới thêm enforceable checker/tests CI sau review: parser import graph, forbidden runtime globals, cycles, generated drift và context budgets. Không dùng regex đơn giản làm bằng chứng purity tuyệt đối. Mọi ngoại lệ phải có lý do, phạm vi, test và owner rõ ràng.
