# Candidate — khởi động native drag trước khi cuộn tới vùng thả

Incident [#197](https://github.com/duykhang68/khoahoctienghan/issues/197), PR [#194](https://github.com/duykhang68/khoahoctienghan/pull/194). CI lỗi: [run 43676401660](https://github.com/duykhang68/khoahoctienghan/actions/runs/43676401660), job `132697395354`, HEAD `8ca09fd1129f4a01878ff7972ef06246b0a96f2b`, merge thử nghiệm `f2356583187179a061dcde8bb8424a52211ab7cb`, base `b4c191828f9275da1b86e78565e3889776597afa`.

Chữ ký tối thiểu: desktop `curriculum-workspace.spec.ts` chờ `.cb-drop-active` nhưng nhận `.cb-dropzone`; 143/144 E2E qua. Node 24.22.2, Playwright 1.65.1, Astro 7.4.10, Starlight 0.42.10; không đổi dependency hoặc lockfile.

Tái hiện local cùng assertion. Probe sự kiện trên fixture ghi nhận `mousedown` tại tay nắm, rồi `mousemove` tại vùng thả sau khi trang cuộn; hoàn toàn không có `dragstart`. Vùng thả của chương trống nằm ngoài viewport. `target.hover()` cuộn nguồn ra khỏi vị trí ban đầu trước chuyển động chuột đầu tiên, nên Chromium chưa khởi động native drag. Đây là lỗi mô phỏng tương tác trong test; bằng chứng này không xác nhận lỗi kéo thả của người dùng trên production.

Sửa tối thiểu: sau `mouse.down()`, di chuyển một đoạn ngắn tại tay nắm và xác nhận `.cb-dragging` trước khi `target.hover()` cuộn trang. Giữ hai lượt hover, xác nhận vùng thả active, `mouse.up()` trong finally, kiểm tra chuyển bài, đổi thứ tự bằng bàn phím, chặn điều hướng khi chưa lưu, phiên bản và ID trong DB sau lưu/tải lại. Bổ sung assertion vùng thả ngoài viewport để giữ tình huống hồi quy; nhánh mobile vẫn kiểm tra select. Không tăng timeout, synthetic drag event, force click hoặc bỏ assertion.

Probe sau sửa ghi nhận `dragstart` trước cuộn và `dragover` tại vùng thả. Local sau `npm ci`: content/security checks, 45 engineering tests, 37 Back Office tests, build/static smoke và 144/144 E2E desktop/mobile qua. Playwright local dùng config tạm ngoài repo để chạy Astro preview foreground trên cổng 4322 (`--ignore-lock`); giữ projects, assertions, timeout và retries như CI. Cần native CI trên HEAD sửa cuối cùng trước khi xác nhận incident đã sửa. Merge, deploy và xác minh production: chưa thực hiện. Không đóng issue hoặc xuất bản hồi cứu hoàn tất khi còn thiếu bằng chứng.

Tham chiếu: [Playwright — dragging manually](https://playwright.dev/docs/input#dragging-manually), [MDN — drag operations](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations). Không cần migration vì không đổi phiên bản dependency.
