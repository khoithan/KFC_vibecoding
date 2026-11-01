# 03 — Technical Specification

## 1. Nguyên tắc kiến trúc

Ứng dụng là website tĩnh, chạy hoàn toàn ở trình duyệt. Không có backend. CSV được tải bằng `fetch()` và parse bằng JavaScript thuần.

## 2. Cấu trúc thư mục mục tiêu

```text
kfc-promo-landing/
├── index.html
├── README.md
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── csv-parser.js
│   │   └── ui.js
│   └── images/
│       ├── hero-chicken.svg
│       ├── chicken-bucket.svg
│       ├── burger.svg
│       └── fries.svg
└── data/
    ├── products.csv
    └── promotions.csv
```

## 3. Trách nhiệm từng file

- `index.html`: markup và các section.
- `style.css`: layout, typography, màu sắc, responsive.
- `csv-parser.js`: đọc và parse CSV.
- `ui.js`: render card, bộ lọc, thông báo trạng thái.
- `app.js`: khởi tạo ứng dụng, tải dữ liệu, gắn event listener.
- `products.csv`: dữ liệu món ăn/combo.
- `promotions.csv`: dữ liệu ưu đãi demo.
- `assets/images/*.svg`: vector minh họa tự tạo.

## 4. Quy tắc tải CSV

Ví dụ:

```javascript
const response = await fetch("./data/products.csv");
if (!response.ok) {
  throw new Error(`Không thể tải CSV: ${response.status}`);
}
const csvText = await response.text();
```

Lưu ý:
- Chỉ chạy qua HTTP static server; không mở trực tiếp `index.html` bằng `file://`.
- CSV phải được lưu UTF-8.
- Parse CSV đúng quy tắc dấu ngoặc kép; không dùng `split(",")` đơn giản vì mô tả có thể chứa dấu phẩy.
- Có thể viết parser nhỏ hỗ trợ dấu phẩy trong quoted field, escaped quote (`""`) và newline trong quoted field; hoặc giữ dữ liệu CSV đơn giản và dùng parser tự viết có kiểm thử.
- Không chèn dữ liệu CSV vào `innerHTML` trực tiếp. Dùng `textContent` hoặc tạo DOM node để tránh XSS.

## 5. CSV và dữ liệu form

CSV là nguồn dữ liệu chỉ đọc trong trình duyệt. Không thể dùng JavaScript frontend để ghi thay đổi vào file CSV trên hosting một cách an toàn.

Với form demo:
- Validate tên (nếu nhập), product ID và quantity.
- Lưu đơn demo vào `localStorage` nếu người học muốn minh họa.
- Không lưu thông tin thanh toán hoặc dữ liệu nhạy cảm.
- Thông báo rõ: “Đây là bản demo, đơn hàng chưa được gửi đến cửa hàng”.

## 6. JavaScript

- Dùng `const` và `let`; tránh biến global không cần thiết.
- Tách hàm theo nhiệm vụ.
- Dùng `try/catch` khi fetch CSV.
- Không dùng `eval`.
- Không dùng framework hoặc backend runtime.
- Gắn event listener sau khi DOM sẵn sàng hoặc dùng `defer`.

## 7. SEO cơ bản

- `title`, `meta description`, viewport.
- Một `h1` chính.
- Heading theo thứ bậc hợp lý.
- Link nội bộ đến section bằng anchor.
- Open Graph cơ bản có thể bổ sung sau.

## 8. Hiệu năng

- SVG tối ưu, không nhúng bitmap lớn.
- Không autoplay video.
- Hạn chế font ngoài.
- Dùng `loading="lazy"` cho ảnh dưới fold.
- Chỉ tải dữ liệu CSV cần thiết.
