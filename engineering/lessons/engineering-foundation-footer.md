# Candidate lesson — liên kết Engineering Foundation và hợp đồng footer

Trạng thái: đã tái hiện local và xác minh bản sửa bằng CI native trên SHA `ba25956e001bc991a44d91c12d81d0f5878b3dd4`, [run 43645005833](https://github.com/duykhang68/khoahoctienghan/actions/runs/43645005833), job `132600696593`. Cả 90 E2E desktop/mobile, 40 engineering tests và các gate build/static/security đều qua. Chưa xác nhận merge, deploy hoặc production. Không đóng incident hoặc xuất bản hồi cứu hoàn tất ở giai đoạn này.

Incident: [#107](https://github.com/duykhang68/khoahoctienghan/issues/107), PR [#106](https://github.com/duykhang68/khoahoctienghan/pull/106). SHA lỗi: `afe038cdcb07534beee008b9c74fc9cf39ec98f1`. CI run `43644137504`, job `132598013784`; merge thử nghiệm của CI: `32f092f063eba4ce5acffa0b2d95493d110dedf9`, base `23b75be3ec8a3ddbe6f4a93a32463a840056ab8f`.

Chữ ký tối thiểu: `aws-brand-components.spec.ts:24`, `.engineering-footer` có 3 liên kết trong khi test yêu cầu 2; desktop và mobile cùng thất bại, 84 E2E khác thành công. Tái hiện local cùng hai lỗi trước khi sửa. Phiên bản: Node 24.22.2, Astro 7.4.10, Starlight 0.42.10, Playwright 1.65.1. Không thay đổi dependency hoặc lockfile.

Nguyên nhân: PR bổ sung liên kết hợp lệ tới dashboard công khai nhưng chưa cập nhật hai assertion đếm liên kết, ở trang danh sách và chi tiết bài viết. Đây là hợp đồng test cũ sau thay đổi điều hướng có chủ đích.

Sửa tối thiểu: giữ phép đếm chính xác, cập nhật từ 2 thành 3 và kiểm tra tên cùng href đầy đủ của liên kết mới tại cả hai trang. Giữ nguyên assertion header, CTA về kho tri thức, breadcrumb, nội dung và chống tràn ngang; không bỏ test, tăng timeout hoặc sửa gate CI.

Regression bổ sung: dùng API fixture, mở dashboard từ footer, xác nhận mẫu tối đa 100 lượt, GET không có Authorization, tỷ lệ loại cancelled/in_progress, thời lượng ước tính, bộ lọc workflow/thời gian, dữ liệu thay thế cho biểu đồ, liên kết run, refresh thủ công và giữ bộ lọc; kiểm tra lỗi HTTP ban đầu, mẫu rỗng, lỗi refresh và response thiếu workflow_runs. Chạy cả desktop và mobile, không phụ thuộc mạng GitHub thật.

Bằng chứng local: `npm ci --no-audit --no-fund`, `npm run check`, 40 engineering tests, `npm run build`, `node scripts/verify-build.mjs` và 90 E2E desktop/mobile thành công. Astro nhận diện agent và tự chạy preview nền nên Playwright local cần cấu hình tạm ngoài repo: cùng testDir, projects, assertions, timeout và retries; chỉ chạy preview foreground bằng `--ignore-lock` trên cổng 4322. Không thay đổi cấu hình CI. Đây không phải bằng chứng CI native hoặc production.

Tài liệu chính thức: [Playwright assertions](https://playwright.dev/docs/test-assertions), [API mocking](https://playwright.dev/docs/mock). Hành vi UI mới cần assertion đích đến tương ứng, đồng thời duy trì phép đếm hữu hạn để phát hiện liên kết thừa.

SHA sửa lỗi đã xác minh CI: `ba25956e001bc991a44d91c12d81d0f5878b3dd4`; run và job nêu ở đầu lesson. Bằng chứng merge/deploy/production: chưa có; không dùng CI để tuyên bố production đã xác minh. Sau khi hoàn tất incident, hồi cứu riêng phải dùng slug `bugfix-issue-107` qua PR/CI/CD chuẩn, kiểm tra trùng bài và PR trước khi tạo.
