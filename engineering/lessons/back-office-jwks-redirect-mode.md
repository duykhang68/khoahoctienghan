# Candidate lesson — AUTH_KEYS do redirect mode không hỗ trợ

Incident [#116](https://github.com/duykhang68/khoahoctienghan/issues/116). Trạng thái: đã tái hiện, bản sửa đề xuất cần CI và review trước triển khai; chưa merge/deploy/xác minh đăng nhập production. Bằng chứng CI và trạng thái mới nhất được lưu ở issue.

Baseline main `779da7ba8f7b7bfcbae109e6d71acae7945f478e`. Worker production `korean-backoffice`, version `a2c1b58c-cc13-4efa-9082-b2c9ec50735b`, deployment `8b3bff3e-c578-47c8-96fd-ce08181a08ac`, compatibility date `2026-11-14`. Đây là lỗi runtime production do người dùng báo cáo, không phải một CI run thất bại. Không lưu credential, cookie hoặc log thô.

`googleKeys()` gọi `fetch` tới JWKS Google với `redirect: 'error'`. Workers không hỗ trợ mode này và ném TypeError trước khi gửi request. Catch đổi lỗi thành `keys unavailable`, endpoint `/auth/session` trả `403 AUTH_KEYS`. Vì vậy tải lại trang không sửa được lỗi runtime. Discovery của Google vẫn công bố đúng URL đang dùng.

Tái hiện local trong workerd dùng RSA fixture: response `403 AUTH_KEYS`, outbound request count = 0. Năm test Node cũ vẫn qua do mock fetch bỏ qua `init`. Regression sửa mock để bắt hợp đồng manual/no-follow; chạy trước bản sửa thì session exchange thất bại với cùng chữ ký AUTH_KEYS.

Sửa tối thiểu: `redirect: 'manual'`; giữ `!res.ok` để từ chối redirect và mọi non-2xx. Không đổi endpoint, claims, issuer/audience, RS256, nonce, allowlist, secret, cookie hoặc session. Regression kiểm tra thành công với chữ ký RSA fixture; JWKS 302, 503, JSON sai, keys sai schema và kid không tồn tại phải trả AUTH_KEYS, xóa challenge và không phát session. Unknown kid được refresh đúng một lần, chỉ ở URL Google cố định.

Runtime local: Miniflare `5.20261104.0-beta`, workerd dependency `1.20261104.1` có sẵn trong cache; binary chỉ hỗ trợ compatibility date đến `2026-11-11`, nên probe dùng ngày đó và không có compatibility flags. Đây là kiểm tra runtime local, không thay thế xác minh production dùng ngày `2026-11-14`. Không thêm dependency hoặc thay lockfile của repo.

Sau sửa, cùng probe workerd trả `200 OK`, outbound request count = 1, session fixture vào admin được 200, truy cập ẩn danh vẫn chuyển về login bằng 303. Local `npm run test:engineering` qua 40 engineering tests và 6 Back Office tests; content check, build và static smoke đều qua. Các test chữ ký/claims, origin, allowlist và logout hiện có được giữ nguyên.

Tham chiếu: [Workers Request redirect](https://developers.cloudflare.com/workers/runtime-apis/request/), [Google OIDC discovery](https://accounts.google.com/.well-known/openid-configuration), [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

SHA/run/job xác minh bản sửa: cập nhật trong issue #116 sau native PR CI. Chỉ triển khai main sau CI và review bảo mật; báo merge, deploy và verified riêng. Giữ incident mở đến khi có bằng chứng phục hồi. Hồi cứu riêng `bugfix-issue-116` chỉ thực hiện khi incident hoàn tất, sau kiểm tra trùng và ưu tiên FIFO theo AGENTS.md.
