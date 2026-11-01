# 01 — Project Requirements

## 1. Tổng quan

Tạo landing page quảng cáo gà rán với phong cách trẻ trung, nổi bật, tập trung vào sản phẩm, combo và ưu đãi. Chủ đề nội dung là KFC, nhưng bản triển khai mặc định phải được ghi rõ là **fan-made/demo học tập, không phải website chính thức**.

## 2. Mục tiêu người dùng

Người truy cập có thể:
- Nhìn thấy thông điệp quảng cáo chính ngay khi mở trang.
- Xem các món gà rán và combo nổi bật.
- Lọc sản phẩm theo danh mục.
- Xem giá và mô tả ngắn.
- Xem ưu đãi đang được giới thiệu.
- Nhấn nút CTA để mở khu vực đặt món demo.
- Gửi form demo và nhận thông báo xác nhận trên giao diện.

## 3. Đối tượng

Người dùng phổ thông, chủ yếu truy cập bằng điện thoại; giao diện cần responsive trên mobile, tablet và desktop.

## 4. Các khu vực bắt buộc

### Header / Navigation
- Tên trang dạng chữ, không dùng logo KFC chính thức.
- Menu: Trang chủ, Thực đơn, Ưu đãi, Liên hệ.
- Nút CTA “Khám phá combo”.
- Menu mobile dạng nút mở/đóng.

### Hero section
- Tiêu đề quảng cáo ngắn, ví dụ: “Giòn rụm từng miếng — vui trọn từng khoảnh khắc”.
- Mô tả ngắn và CTA.
- Hình minh họa gà rán đơn giản, nhẹ; ưu tiên SVG tự tạo hoặc CSS illustration.

### Featured products
- Hiển thị sản phẩm từ `data/products.csv`.
- Mỗi card gồm tên, mô tả, giá, danh mục và hình minh họa.
- Có bộ lọc danh mục.
- Nếu CSV không tải được, hiển thị thông báo lỗi thân thiện.

### Promotions
- Hiển thị ưu đãi từ `data/promotions.csv`.
- Mỗi ưu đãi gồm tiêu đề, mô tả, nhãn và thời hạn.
- Không tự tạo tuyên bố khuyến mãi có thật. Dùng dữ liệu demo, ghi rõ nội dung minh họa.

### About / Brand story
- Một đoạn giới thiệu ngắn về trải nghiệm gà rán.
- Không khẳng định đây là nội dung chính thức của KFC.

### Order demo
- Form gồm tên hiển thị (không bắt buộc), lựa chọn combo và số lượng.
- Kiểm tra dữ liệu bằng JavaScript.
- Không gửi dữ liệu ra internet.
- Có thể lưu bản demo vào `localStorage` để minh họa, kèm thông báo đây không phải đơn hàng thật.

### Footer
- Điều hướng nhanh.
- Thông tin liên hệ giả lập hoặc placeholder.
- Dòng thông báo demo/không chính thức.

## 5. Yêu cầu phi chức năng

- Responsive từ màn hình 360px trở lên.
- Tải nhanh, ít tài nguyên.
- Không dùng ảnh nền dung lượng lớn.
- Không dùng thư viện JavaScript nặng.
- Có trạng thái loading, empty và error cho dữ liệu CSV.
- Có semantic HTML, label cho input và trạng thái focus rõ ràng.
- Tôn trọng `prefers-reduced-motion`.
- Màu chữ/nền có độ tương phản dễ đọc.

## 6. Ngoài phạm vi

- Backend/API.
- Database SQL/NoSQL.
- Đăng nhập/đăng ký.
- Thanh toán trực tuyến.
- Gửi đơn hàng thật.
- Quản lý đơn hàng từ xa.
- CMS hoặc trang quản trị.
