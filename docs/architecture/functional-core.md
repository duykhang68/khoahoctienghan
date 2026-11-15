# R0 — Functional Core, Imperative Shell (FCIS)

Trạng thái: đề xuất chuẩn kiến trúc, áp dụng dần qua PR được duyệt. Không thay thế AGENTS.md. Baseline: 3e5e7a966a5c528cccbb920d48e435ebf93a04bd (main, 15/11/2026 GMT+7).

## Mục tiêu
Giảm phạm vi mã AI và lập trình viên cần đọc để sửa một quy tắc nghiệp vụ; tăng khả năng kiểm thử độc lập. Giữ nguyên tính năng, URL, UI/UX, API, schema, quyền và quy trình phát hành hiện tại. Không chuyển toàn bộ hệ thống sang OOP hoặc TypeScript.

## Hợp đồng
- Functional Core: cùng đầu vào cho cùng kết quả (hoặc cùng lỗi), không I/O, không đọc/ghi trạng thái ngoài, không sửa đối số. Đầu vào bao gồm timestamp, ID, snapshot và dữ liệu cấu hình cần thiết. Chỉ import hàm thuần, kiểu hoặc hằng bất biến. Không phụ thuộc this/self, env, singleton, DOM, fetch, D1, filesystem, storage, timer, crypto runtime hay process.
- Imperative Shell: xác thực, đọc snapshot, gọi core, thực hiện effect, xử lý lỗi và phản hồi. Dùng composition qua object/factory hoặc class mỏng khi có lifecycle thực sự. Không tạo base class để kế thừa hàng loạt.
- Dữ liệu: ES modules + JSDoc typedef/Readonly và readonly arrays; dùng type TS tại module TS hiện hữu. Readonly nông không đảm bảo bất biến sâu; dùng kiểu lồng readonly, không mutate đối số và test deep-freeze. Local mutation của buffer/array tạo mới là hợp lệ nếu không thoát ra ngoài.
- Lỗi nghiệp vụ: có mã ổn định; giữ mã lỗi/HTTP contract cũ qua adapter. Không chuẩn hóa lỗi đến mức mất nguyên nhân. Không truyền secret, token, Request, database handle hoặc callback I/O vào core.
- Effect plan: là dữ liệu (ví dụ {kind, expectedVersion, changes}), không phải hàm có side effect. Sau khi chạy effect, shell đọc bằng chứng mới và đánh giá lại. Không tin snapshot cũ để authorize thao tác mới.

## Minh họa chữ ký đích (không phải mã được triển khai)
- planCurriculumUpdate(current, requested): Decision
- reduceEditor(state, action): EditorState
- decidePublication(queueState, evidence): Decision
- decideRetry(attempts, errorCode, nowMs): RetryDecision

Core không được thay thế optimistic concurrency: SQL phải giữ guard version/status/membership, atomicity, lease và đối chiếu kết quả ghi. GitHub merge phải giữ exact HEAD, base hiện tại, native CI, ruleset; verification không đồng nhất merge với deploy. Tách phần claim validation khỏi xác minh chữ ký; tuyệt đối không bỏ xác minh chữ ký hoặc chấp nhận claim chưa verified.

## Lộ trình
- R0: bốn tài liệu nền tảng; chưa đổi runtime.
- R1: cô lập generated Editor/Sheets bundles khỏi Worker; giữ asset allowlist, private gate, source sync --check, exact-SHA deployment.
- R2: tách HTTP/router/auth, view, D1/API shell theo vertical slice; giữ export compatibility.
- R3: course/curriculum/lesson/quiz/media/release pure rules; reducer và test.
- R4: Editorial Studio model, document/media/revision/draft.
- R5: Engineering Controller và policy.
- R6: FIFO và scheduler (state transition, retry, receipt).
- R7: Sheets Publisher.
- R8: Local Editor/overlay; submodule cần audit riêng trước sửa.
- R9: Public Blog/Knowledge Base, content validation.
- R10: architecture gates và benchmark.

Mỗi bước chia PR độc lập, theo thứ tự phụ thuộc; trước bước tiếp theo phải kiểm tra merge, exact-HEAD CI và các bằng chứng phát hành liên quan. Không tự đưa PR governance/security/automation qua review. Xem [module map](module-map.md), [dependency rules](dependency-rules.md), [context budget](context-budget.md).
