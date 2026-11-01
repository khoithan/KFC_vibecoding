# 02 — UI/UX Guide

## 1. Định hướng giao diện

Phong cách quảng cáo thức ăn nhanh: mạnh mẽ, vui tươi, dễ đọc, hình ảnh món ăn là trọng tâm. Tránh sao chép nguyên trạng website KFC hoặc dùng logo/tài sản thương hiệu chính thức khi chưa được cấp phép.

## 2. Bảng màu gợi ý

| Vai trò | Màu | Mã |
|---|---|---|
| Primary | Đỏ đậm | `#C8102E` |
| Primary dark | Đỏ sẫm | `#8F0D22` |
| Accent | Vàng ấm | `#FFC72C` |
| Background | Kem nhạt | `#FFF8F0` |
| Surface | Trắng | `#FFFFFF` |
| Text | Đen than | `#242424` |
| Muted | Xám | `#6B6B6B` |

Đây là palette gợi ý cho bản demo, không phải quy chuẩn nhận diện chính thức.

## 3. Typography

- Dùng font hệ thống: `Arial`, `Helvetica`, sans-serif.
- Heading đậm, ngắn, dễ quét mắt.
- Body line-height khoảng 1.5–1.7.
- Không dùng quá 3 cấp độ heading chính.

## 4. Layout đề xuất

1. Header: cao khoảng 64–76px, sticky tùy chọn.
2. Hero: hai cột trên desktop; một cột trên mobile.
3. Product grid: 3 cột desktop, 2 cột tablet, 1 cột mobile.
4. Promotion: các banner/card tương phản.
5. Story: nội dung ngắn + hình minh họa.
6. Order demo: form gọn, dễ thao tác.
7. Footer: nền tối, chữ sáng.

## 5. Hình ảnh nhẹ

Ưu tiên theo thứ tự:
1. SVG tự tạo, tối ưu và inline hoặc lưu trong `assets/images/`.
2. CSS illustration dùng gradient và hình khối.
3. WebP/AVIF nhỏ nếu có ảnh được phép sử dụng.

Không tải ảnh stock lớn hoặc dùng URL ảnh không rõ bản quyền. Mỗi ảnh raster nên cố gắng dưới 100–150 KB; tổng ảnh trang nên càng thấp càng tốt.

Đề xuất hình minh họa:
- Hero: hộp gà/đùi gà cách điệu bằng SVG.
- Product cards: icon SVG khác nhau cho từng món.
- Promotion: hình ngôi sao, tia sáng hoặc hộp combo dạng vector.

## 6. Micro-interactions

- Hover card: nâng nhẹ 2–4px.
- CTA: đổi sắc độ khi hover và có trạng thái focus.
- Bộ lọc: thể hiện rõ danh mục đang chọn.
- Form: thông báo lỗi ngay dưới trường liên quan.
- Không dùng animation liên tục gây mất tập trung.

## 7. Responsive

- Mobile: menu thu gọn, hero một cột, nút CTA rộng dễ bấm.
- Tablet: grid 2 cột.
- Desktop: container tối đa khoảng 1120–1200px.
- Không để nội dung tràn ngang ở viewport 360px.

## 8. Accessibility

- Dùng `header`, `nav`, `main`, `section`, `footer`.
- Mỗi ảnh có `alt` phù hợp; ảnh trang trí dùng `alt=""`.
- Nút phải là `<button>` hoặc `<a>` đúng ngữ nghĩa.
- Input có `<label>`.
- Có outline khi keyboard focus.
- Không chỉ dùng màu để biểu thị trạng thái.
