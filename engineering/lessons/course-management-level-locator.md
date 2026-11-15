# Candidate — selector bộ lọc trình độ Course Management (#208)

Incident [#208](https://github.com/duykhang68/khoahoctienghan/issues/208), PR [#206](https://github.com/duykhang68/khoahoctienghan/pull/206). CI lỗi ban đầu: [run 43678329310](https://github.com/duykhang68/khoahoctienghan/actions/runs/43678329310), job `132703286331`, HEAD `9d338079f5f766c3975e12321737833e0627c940`. Sau owner cập nhật nhánh từ main, HEAD `360fb26275dc2562a6d1e166efd47f440a49796c` vẫn giữ selector này. Đây là cùng incident, không tạo issue trùng.

Chữ ký tối thiểu: `course-management-studio.spec.ts` timeout 30 giây trên desktop và mobile; `page.unrouteAll: Target page, context or browser has been closed` ở cleanup che bước chờ thực. Trace của cả hai project dừng tại `.cm-toolbar >> internal:label="Trình độ"s`, thao tác `selectOption('advanced')`. Đã tái hiện local hai lỗi trước khi sửa.

Nguyên nhân: select được bọc trong label chứa cả text của các option, nên `getByLabel('Trình độ', {exact:true})` không khớp toàn bộ text label. Accessibility snapshot vẫn có combobox mang tên chính xác “Trình độ”. Việc chỉ giới hạn selector trong toolbar chưa giải quyết khác biệt giữa label text và accessible name.

Sửa tối thiểu: lấy combobox theo role và tên chính xác, trong cùng `.cm-toolbar`, rồi dùng lại locator cho `advanced` và `all`. Giữ assertion kết quả lọc, tạo/sửa/lưu trữ, slug, dirty confirmation, đối chiếu 409, DB, offline và sáu chiều rộng. Không tăng timeout, bỏ assertion hoặc đổi hành vi Worker.

Phiên bản local: Node 24.22.2, Playwright 1.65.1, Astro 7.4.10, Starlight 0.42.10. Không đổi dependency hoặc lockfile; không cần migration. Tham chiếu chính thức: [Playwright locators](https://playwright.dev/docs/locators#locate-by-role), [Page.unrouteAll](https://playwright.dev/docs/api/class-page#page-unroute-all).

Bằng chứng local trên HEAD `360fb26275dc2562a6d1e166efd47f440a49796c` cộng bản sửa selector: `npm ci --no-audit --no-fund`, content validation, 45 engineering tests, 38 Back Office tests, full build, static smoke, secret-pattern check và 150/150 E2E desktop/mobile qua. Kiểm thử riêng Course Management cũng qua 2/2. Full E2E dùng config tạm ngoài repo kế thừa config gốc, chỉ đổi đường dẫn tuyệt đối và chạy Astro preview foreground trên cổng 4323 (`--ignore-lock`); giữ project devices, assertions, timeout 30 giây, retries 0 và workers 2. Không thay đổi config CI.

Trạng thái: mới xác minh local; cần native pull_request CI trên SHA sửa cuối cùng. Chưa merge, deploy hoặc xác minh production. Không đóng incident hoặc xuất bản hồi cứu hoàn tất khi còn thiếu bằng chứng tích hợp. SHA bản sửa và CI tiếp theo phải được ghi vào issue #208.
