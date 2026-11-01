# 06 — Antigravity Master Prompt

Bạn là Senior Frontend Developer kiêm UI/UX Designer. Hãy xây dựng một landing page quảng cáo gà rán theo chủ đề KFC dựa trên các tài liệu Markdown trong project.

## Mục tiêu

Tạo website tĩnh, hiện đại, responsive, quảng bá sản phẩm gà rán, combo và ưu đãi demo. Đây là project học tập, không phải website chính thức của KFC.

## Ràng buộc bắt buộc

1. Chỉ sử dụng HTML5, CSS3 và Vanilla JavaScript.
2. Dữ liệu sản phẩm và khuyến mãi phải được đọc từ CSV trong thư mục `data/`.
3. Không tạo backend, server API, database server, đăng nhập hoặc thanh toán.
4. Không dùng React, Vue, Angular, Node.js runtime hoặc framework JavaScript.
5. Không dùng hình ảnh dung lượng lớn. Ưu tiên SVG tự tạo hoặc CSS illustration.
6. Không sao chép logo/tài sản thương hiệu chính thức. Hiển thị disclaimer demo/không liên kết chính thức.
7. Không dùng `innerHTML` với dữ liệu CSV chưa được kiểm soát; ưu tiên `textContent` và DOM APIs.
8. Không giả vờ gửi đơn hàng thật. Form chỉ là demo và phải thông báo rõ.

## Đọc tài liệu trước khi code

Đọc lần lượt:
- `01_PROJECT_REQUIREMENTS.md`
- `02_UI_UX_GUIDE.md`
- `03_TECHNICAL_SPEC.md`
- `04_CSV_DATA_SCHEMA.md`
- `05_IMPLEMENTATION_PLAN.md`

Nếu có mâu thuẫn, ưu tiên ràng buộc công nghệ trong prompt này và yêu cầu nghiệp vụ trong `01_PROJECT_REQUIREMENTS.md`.

## Cách làm việc

- Trước tiên kiểm tra cấu trúc project hiện có.
- Nếu chưa có file, tạo cấu trúc theo Technical Spec.
- Triển khai theo từng phase trong Implementation Plan.
- Không viết toàn bộ code vào một file JavaScript.
- Tạo các hàm nhỏ, tên rõ ràng, có comment ở phần xử lý CSV.
- Sau mỗi phase, chạy kiểm tra và sửa lỗi trước khi tiếp tục.
- Không tự ý thêm backend hoặc thư viện lớn.
- Nếu cần dùng thư viện ngoài, phải hỏi trước; mặc định không cần thư viện nào.

## Yêu cầu giao diện

- Header có navigation và menu mobile.
- Hero có headline, mô tả và CTA.
- Product grid đọc dữ liệu từ `products.csv`.
- Bộ lọc danh mục hoạt động.
- Promotion section đọc dữ liệu từ `promotions.csv`.
- Có phần giới thiệu, form đặt món demo và footer.
- Responsive mobile/tablet/desktop.
- Giao diện có trạng thái loading, empty và error khi tải CSV.

## Yêu cầu dữ liệu

- CSV UTF-8.
- Parser xử lý được dấu phẩy trong quoted field và dấu ngoặc kép escaped.
- Validate dữ liệu đầu vào.
- Giá hiển thị theo định dạng VND.
- Chỉ render sản phẩm/ưu đãi đang active/available.
- Không ghi dữ liệu ngược vào CSV.

## Nghiệm thu

Khi hoàn thành:
1. Liệt kê các file đã tạo.
2. Mô tả chức năng từng file.
3. Hướng dẫn chạy local bằng `python -m http.server 5500`.
4. Báo cáo kết quả kiểm tra responsive và Console.
5. Nêu rõ các giới hạn: CSV chỉ đọc; form không tạo đơn thật.
6. Không tuyên bố đã kiểm thử nếu chưa thực sự chạy kiểm thử.

Bắt đầu bằng việc đọc các file Markdown và đề xuất kế hoạch triển khai ngắn trước khi tạo code.
