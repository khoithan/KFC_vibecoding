# 04 — CSV Data Schema

## 1. Quy ước chung

- Encoding: UTF-8.
- Dòng đầu tiên là header.
- Dấu phân cách: dấu phẩy `,`.
- Giá tiền là số nguyên VND, không thêm dấu chấm phân cách hàng nghìn.
- Giá trị văn bản có dấu phẩy phải đặt trong dấu ngoặc kép.
- `id` là duy nhất và không thay đổi tùy tiện.
- Dữ liệu trong file là dữ liệu demo, không phải menu hoặc khuyến mãi chính thức.

## 2. `data/products.csv`

Header:

```csv
id,name,category,description,price,image,featured,available
```

Ý nghĩa:
- `id`: mã sản phẩm.
- `name`: tên hiển thị.
- `category`: `chicken`, `combo`, `burger`, `side`, `drink`.
- `description`: mô tả ngắn.
- `price`: giá VND dạng số.
- `image`: đường dẫn SVG tương đối trong `assets/images/`.
- `featured`: `true` hoặc `false`.
- `available`: `true` hoặc `false`.

Dữ liệu mẫu:

```csv
id,name,category,description,price,image,featured,available
P001,Gà rán giòn cay,chicken,Gà rán giòn với lớp vỏ đậm vị,45000,assets/images/chicken-bucket.svg,true,true
P002,Combo vui vẻ,combo,Phần ăn gồm gà rán và khoai tây,89000,assets/images/hero-chicken.svg,true,true
P003,Burger gà,burger,Burger gà cùng rau và sốt,59000,assets/images/burger.svg,false,true
P004,Khoai tây chiên,side,Khoai tây chiên vàng giòn,25000,assets/images/fries.svg,false,true
```


## 3. `data/promotions.csv`

Header:

```csv
id,title,description,label,valid_until,active
```

Ý nghĩa:
- `id`: mã ưu đãi.
- `title`: tiêu đề.
- `description`: mô tả.
- `label`: nhãn như `DEMO`, `COMBO`, `ƯU ĐÃI`.
- `valid_until`: ngày kết thúc dạng `YYYY-MM-DD` hoặc để trống.
- `active`: `true` hoặc `false`.

Dữ liệu mẫu:

```csv
id,title,description,label,valid_until,active
D001,Combo tiết kiệm,Mua combo demo để khám phá lựa chọn tiết kiệm,DEMO,2026-12-31,true
D002,Thêm món thêm vui,Khám phá món ăn kèm trong menu minh họa,DEMO,,true
```

## 4. Kiểm tra dữ liệu

JavaScript cần:
- Kiểm tra đủ các cột bắt buộc.
- Chuyển `price` sang Number và xác nhận là số không âm.
- Chuẩn hóa `featured`, `available`, `active` thành boolean.
- Bỏ qua hoặc báo lỗi rõ ràng với dòng thiếu ID.
- Không hiển thị sản phẩm `available=false`.
- Chỉ hiển thị khuyến mãi `active=true`.

## 5. Ghi chú

CSV không phải database có khả năng ghi đồng thời. Nếu cần nhân viên cập nhật dữ liệu qua giao diện hoặc nhận đơn thật, khi đó phải bổ sung backend hoặc một dịch vụ lưu trữ có API; việc đó nằm ngoài phạm vi dự án hiện tại.
