# Tri thức Hàn Quốc

P0.01 — nền tảng Knowledge Base công khai (Astro + Starlight). Tên thương hiệu tạm thời.

- Starlight cung cấp sidebar, mục lục, tìm kiếm Pagefind và Markdown/MDX.
- Knowledge Core là nguồn cảm hứng cho trang tổng quan theo chủ đề và tổ chức component; không sao chép mã nguồn.
- Giao diện sáng, tiếng Việt, có nội dung tiếng Hàn.
- Không LMS, paywall, tài khoản hay thanh toán ở P0.

## Phát triển

```sh
npm install
npm run dev
npm run check
npm run build
npm run preview
```

Node 24. Mở địa chỉ localhost do Astro in ra. Tìm kiếm Pagefind hoạt động trên bản build/preview.

## Xuất bản

Cloudflare Workers static assets: thư mục đầu ra `dist`. Đặt `SITE_URL` thành URL production đầy đủ khi cấu hình hosting để tạo canonical và sitemap. Chưa định danh domain/deploy ở bước này. Không commit secrets.

## Phạm vi và quy tắc

PR vào main; chỉ merge sau CI xanh. Đây là bước P0.01, chưa phải toàn bộ P0. Các việc tiếp theo: khóa dependency bằng package-lock, kiểm thử UI, archive/pagination, metadata ngày giờ và breadcrumb, audit SEO, triển khai Cloudflare và xác minh production. Giai đoạn này chỉ nội dung miễn phí.
