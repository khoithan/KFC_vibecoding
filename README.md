# KFC Promo Landing Page — Project Brief & User Guide

> **Lưu ý quan trọng (Disclaimer):** Đây là website landing page mô phỏng ý tưởng quảng cáo món ăn nhanh theo chủ đề KFC phục vụ mục đích **học tập và thực hành lập trình Web Frontend**. Đây **không phải** website chính thức của KFC, không liên kết, không đại diện và không được KFC/Nhà hàng KFC bảo trợ. Không có chức năng đặt hàng thật hoặc thanh toán thương mại.

---

## 1. Mục tiêu dự án

Xây dựng một landing page hiện đại, chuẩn UI/UX, responsive trên mọi kích thước màn hình nhằm quảng bá các món gà rán, combo ưu đãi và hỗ trợ form đặt món mô phỏng (demo) bằng **HTML5, CSS3 và JavaScript thuần (Vanilla JS)**.
Toàn bộ dữ liệu thực đơn và chương trình ưu đãi được quản lý qua các tệp tĩnh **CSV (UTF-8)**, không phụ thuộc vào backend hay database.

---

## 2. Cấu trúc thư mục dự án

```text
KFC/
├── index.html                           # Cấu trúc HTML5 ngữ nghĩa, chuẩn SEO & Accessibility
├── README.md                            # Hướng dẫn dự án và cách vận hành
├── 01_PROJECT_REQUIREMENTS.md           # Yêu cầu nghiệp vụ & phạm vi
├── 02_UI_UX_GUIDE.md                    # Hướng dẫn màu sắc, layout, micro-interactions
├── 03_TECHNICAL_SPEC.md                 # Kiến trúc kỹ thuật và tiêu chuẩn code
├── 04_CSV_DATA_SCHEMA.md                # Quy chuẩn và cấu trúc dữ liệu CSV
├── 05_IMPLEMENTATION_PLAN.md            # Các giai đoạn triển khai và kiểm thử
├── 06_ANTIGRAVITY_MASTER_PROMPT.md      # Quy chuẩn nghiệm thu dự án
├── assets/
│   ├── css/
│   │   └── style.css                    # CSS thuần, biến màu, responsive, animation
│   ├── js/
│   │   ├── csv-parser.js                # Parser chuẩn RFC 4180 (xử lý quote, phẩy, xuống dòng)
│   │   ├── ui.js                        # Render giao diện an toàn (DOM API, chống XSS)
│   │   └── app.js                       # Controller: lọc danh mục, mobile menu, form demo, modal
│   └── images/                          # Vector SVG tự tạo, dung lượng nhẹ
│       ├── hero-chicken.svg             # Minh họa đùi gà giòn rụm cho Hero
│       ├── chicken-bucket.svg           # Xô gà rán đặc trưng
│       ├── burger.svg                   # Burger gà giòn
│       ├── fries.svg                    # Khoai tây chiên
│       └── drink.svg                    # Nước ngọt mát lạnh
├── data/
│   ├── products.csv                     # Danh sách món ăn và combo (UTF-8)
│   └── promotions.csv                   # Danh sách chương trình ưu đãi (UTF-8)
└── images/                              # Tài nguyên hình ảnh người dùng cung cấp
    ├── KFC_logo-image.png               # Logo hiển thị tại Header (kèm badge Demo)
    └── products/
        └── khoai-tay-chien.jpg          # Hình ảnh món khoai tây chiên thực tế
```

---

## 3. Các tính năng nổi bật đã hoàn thành

1. **Header & Navigation:**
   - Hiển thị logo thương hiệu kèm nhãn nhận diện "Bản Demo Học Tập".
   - Menu điều hướng mượt mà: Trang chủ, Thực đơn, Ưu đãi, Về chúng tôi, Đặt món demo.
   - Menu mobile dạng hamburger trực quan, có thể đóng mở linh hoạt.
   - Nút kêu gọi hành động (CTA) "Khám phá combo".

2. **Hero Section:**
   - Tiêu đề thông điệp: "Giòn rụm từng miếng — Vui trọn từng khoảnh khắc".
   - Các điểm nổi bật: 100% gà tươi, gia vị bí quyết, giao nhanh tiện lợi.
   - Hình minh họa đùi gà rán vàng giòn chuẩn SVG sắc nét và nhẹ nhàng.

3. **Thực đơn món ăn linh hoạt (Products Section):**
   - Đọc và phân tích trực tiếp từ file tĩnh `data/products.csv`.
   - Bộ lọc danh mục theo thời gian thực (Tất cả, Gà rán giòn, Combo ưu đãi, Burger, Món ăn kèm, Thức uống).
   - Card món ăn đầy đủ: Tên, mô tả, huy hiệu danh mục, giá định dạng tiền Việt (VND), nút "Đặt món ngay".
   - Tự động bỏ qua các món `available = false`.
   - Xử lý đầy đủ trạng thái: Đang tải (Loading), Trống (Empty) và Báo lỗi thân thiện (Error).

4. **Khu vực Ưu đãi (Promotions Section):**
   - Đọc trực tiếp từ file tĩnh `data/promotions.csv`.
   - Hiển thị nhãn ưu đãi (`ƯU ĐÃI`, `GIẢM GIÁ`, `FREESHIP`), thời hạn sử dụng và mô tả.
   - Tự động lọc chỉ hiển thị khuyến mãi đang hoạt động (`active = true`).

5. **Giới thiệu & Minh bạch thông tin (About Section):**
   - Câu chuyện cảm hứng về khoảnh khắc gắn kết qua bữa ăn.
   - Hộp cảnh báo pháp lý và bản quyền rõ ràng, khẳng định tính chất học tập.

6. **Form đặt món mô phỏng (Order Demo Section):**
   - Ô chọn món ăn được cập nhật tự động từ dữ liệu CSV.
   - Bấm "Đặt món ngay" từ bất kỳ card nào sẽ tự động cuộn đến form và chọn sẵn món ăn.
   - Xác thực dữ liệu đầu vào (bắt buộc chọn món, số lượng từ 1 đến 99).
   - Xác nhận đơn qua Modal popup đẹp mắt với thông điệp cảnh báo demo nổi bật.
   - Lưu trữ tạm thời tối đa 10 đơn hàng gần nhất vào `localStorage` của trình duyệt.
   - Hỗ trợ xem lại lịch sử đơn demo hoặc xóa sạch lịch sử khi cần.

---

## 4. Hướng dẫn chạy dự án

Do trình duyệt bảo mật chặn các yêu cầu `fetch()` đọc file cục bộ bằng giao thức `file://` (lỗi CORS), bạn cần khởi chạy thông qua một static HTTP server:

### Cách 1: Sử dụng Python (Khuyên dùng)
Mở Terminal hoặc Command Prompt tại thư mục dự án và chạy:

```bash
python -m http.server 5500
```
Sau đó truy cập: [http://localhost:5500](http://localhost:5500)

### Cách 2: Sử dụng VS Code Live Server
Nếu bạn dùng Visual Studio Code:
1. Cài đặt tiện ích mở rộng **Live Server** (của Ritwick Dey).
2. Nhấp chuột phải vào file [index.html](file:///d:/Vibe%20Coding/vibe_viethai/KFC/index.html) và chọn **"Open with Live Server"**.

### Cách 3: Sử dụng Node.js (npx)
```bash
npx serve . -p 5500
```
Sau đó mở trình duyệt tại `http://localhost:5500`.

---

## 5. Giới hạn kỹ thuật và lưu ý an toàn

- **Tính chất chỉ đọc của CSV:** Dữ liệu trong CSV chỉ đóng vai trò nguồn đọc tĩnh từ phía client. JavaScript chạy trên trình duyệt không thể ghi ngược vào tệp CSV trên hosting/máy chủ.
- **Tính chất đơn hàng:** Không có API gửi đơn hàng thật ra ngoài Internet. Toàn bộ thao tác gửi đơn chỉ hiển thị xác nhận và lưu vào bộ nhớ cục bộ `localStorage` của máy khách.
- **Bảo mật XSS:** Dữ liệu trích xuất từ CSV được nạp vào DOM bằng `textContent` và các API tiêu chuẩn của `document.createElement`, ngăn chặn nguy cơ chèn mã độc (XSS).
