# Google Sheet thiếu commit xuất bản — Issue #99

Status: candidate; chờ CI exact HEAD và worker production, không đóng incident.

Baseline SHA: a953d802ffdc9ec32d4e3bfe7c2427cc29ee49fd. Node 24; Astro 7.4.10; Starlight 0.42.10; Playwright 1.65.1. Không đổi dependency/lockfile.

Trigger: bài từ Sheet được FIFO xuất bản và VERIFIED (#93, merge a22e8f0003581552b56eb92ad5606d6f9e408b1b), nhưng cột A `content id_vn` chưa được điền. Root cause: Google browser chỉ đọc, submission không lưu liên kết nguồn, worker không triển khai bước writeback. GitHub token Contents write không cấp quyền Google.

Fix: submission mới gắn fingerprint nguồn, worker chỉ ghi SHA merge sau xác minh production; Sheets service account ở Actions secret, browser giữ read-only. Tìm đúng dòng kể cả khi di chuyển; chặn nguồn thay đổi, ID có sẵn, công thức, nguồn trùng; một ô RAW, đọc lại, idempotent; lỗi đồng bộ có trạng thái riêng và retry transient tối đa ba lượt. Không suy đoán nguồn của submission cũ. Sheets không cung cấp conditional values.update: tài liệu nêu giới hạn chỉnh/sắp xếp đồng thời trong khoảng đọc-ghi.

Regression: tests/sheet-writeback.test.mjs chạy trong test:engineering: verification gate, moved/changed/duplicate rows, ID/formula protection, JWT signature/audience/scope, safe diagnostics/retry bound, immutable source validation/backward compatibility. E2E desktop/mobile kiểm tra trạng thái đã ghi Sheet tách khỏi production verified.

Official references: https://developers.google.com/identity/protocols/oauth2/service-account ; https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/update.

Điền bù đã kiểm chứng bằng service account sau đối chiếu immutable draft, PR merge, ancestry, release có prepare/deploy/verify thành công và route public: VN!A2 = a22e8f0003581552b56eb92ad5606d6f9e408b1b (#93); VN!A3 = a953d802ffdc9ec32d4e3bfe7c2427cc29ee49fd (#94). Release đối chiếu: run 43618064234, SHA a953d802ffdc9ec32d4e3bfe7c2427cc29ee49fd. Đọc lại qua API và connector xác nhận đúng hai ô, B:E giữ nguyên. Đây là backfill thủ công có kiểm tra, chưa phải bằng chứng workflow tự động đã được triển khai.

PR/run/job/final SHA và production evidence của bản sửa tự động: pending. Không xuất bản retrospective cho incident chưa hoàn tất.
