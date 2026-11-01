# 05 — Implementation Plan

Thực hiện theo từng giai đoạn nhỏ. Sau mỗi giai đoạn, chạy trang và kiểm tra trước khi tiếp tục.

## Phase 1 — Khởi tạo
- [x] Tạo cấu trúc thư mục theo `03_TECHNICAL_SPEC.md`.
- [x] Tạo `index.html`, CSS và các file JS rỗng.
- [x] Tạo hai file CSV theo `04_CSV_DATA_SCHEMA.md`.
- [x] Tạo SVG minh họa đơn giản.

**Hoàn thành khi:** trang mở được bằng static server, không có lỗi 404.

## Phase 2 — HTML skeleton
- [x] Tạo header/navbar.
- [x] Tạo hero section.
- [x] Tạo section sản phẩm.
- [x] Tạo section ưu đãi.
- [x] Tạo giới thiệu, form demo và footer.
- [x] Thêm title, description, viewport.

**Hoàn thành khi:** mọi section xuất hiện đúng thứ tự, các anchor hoạt động.

## Phase 3 — CSS / responsive
- [x] Khai báo CSS variables cho palette.
- [x] Thiết kế header và hero.
- [x] Thiết kế product cards và promotion cards.
- [x] Thiết kế form và footer.
- [x] Responsive mobile/tablet/desktop.
- [x] Focus state, hover state và reduced motion.

**Hoàn thành khi:** không tràn ngang ở 360px, 768px và 1440px.

## Phase 4 — CSV loader
- [x] Viết hàm fetch CSV.
- [x] Viết parser hỗ trợ quoted fields.
- [x] Validate header và dữ liệu.
- [x] Render product cards từ CSV.
- [x] Render promotions từ CSV.
- [x] Có loading, empty và error state.

**Hoàn thành khi:** chỉnh nội dung CSV làm giao diện thay đổi sau khi reload.

## Phase 5 — Tương tác
- [x] Lọc sản phẩm theo category.
- [x] Menu mobile mở/đóng.
- [x] CTA cuộn đến khu vực phù hợp.
- [x] Validate form demo.
- [x] Hiển thị thông báo xác nhận demo.
- [x] Nếu dùng localStorage, ghi rõ dữ liệu chỉ nằm trong browser hiện tại.

**Hoàn thành khi:** không có nút giả hoặc tương tác không hoạt động.

## Phase 6 — Kiểm thử và hoàn thiện
- [x] Kiểm tra Console không có lỗi.
- [x] Kiểm tra Network không có file 404.
- [x] Kiểm tra CSV lỗi/thiếu dữ liệu.
- [x] Kiểm tra form với dữ liệu hợp lệ và không hợp lệ.
- [x] Kiểm tra keyboard navigation.
- [x] Kiểm tra mobile.
- [x] Kiểm tra dung lượng ảnh và tài nguyên.

## Checklist nghiệm thu

- [x] Chỉ dùng HTML, CSS, JavaScript thuần.
- [x] Không có backend hoặc API.
- [x] Dữ liệu sản phẩm/ưu đãi đọc từ CSV.
- [x] Hình ảnh nhẹ, ưu tiên SVG tự tạo.
- [x] Có disclaimer website demo, không chính thức.
- [x] Không có chức năng đặt hàng/thanh toán thật.
- [x] README hướng dẫn chạy bằng static server.
