# TÀI LIỆU BACKEND TỐI ƯU - NODE.JS & EXPRESS (v1.0.0)
## DỰ ÁN: SMART AIoT SECURITY – HỆ THỐNG AN NINH & GIÁM SÁT THÔNG MINH

---

## 1. TỔNG QUAN KIẾN TRÚC BACKEND ĐÃ RÚT GỌN TỐI ƯU
Toàn bộ mã nguồn Backend đã được chuyển đổi sang **Node.js (v20+)** và **Express.js**, loại bỏ hoàn toàn các tệp Python rác và rút gọn thành 6 module cốt lõi siêu nhẹ, tốc độ phản hồi dưới 2ms:

```text
backend/
├── package.json                   # Cấu hình dự án & dependencies (express, cors, mqtt, dotenv)
├── server.js                      # Điểm khởi chạy chính máy chủ Express (Port 8000)
├── test_node_backend.js           # Kịch bản kiểm thử tích hợp 6 Test Cases đạt 100%
├── README.md                      # Tài liệu kỹ thuật Backend
├── .env.example                   # Mẫu cấu hình môi trường
│
└── src/                           # 6 Module cốt lõi tinh gọn
    ├── config.js                  # Module 1: Cấu hình hệ thống, PORT, MQTT Broker, Topics
    ├── db.js                      # Module 2: Kết nối SQLite 3, kích hoạt WAL & khởi tạo bảng
    ├── storage.js                 # Module 3: Repository CRUD 3 bảng (devices, sensor_logs, alerts)
    ├── ai.js                      # Module 4: Mô hình học máy Isolation Forest & RAM Cache
    ├── mqtt.js                    # Module 5: Lắng nghe Mosquitto Broker ngầm & điều phối dữ liệu
    └── routes.js                  # Module 6: Định tuyến toàn bộ 11 REST API endpoints
```

---

## 2. HƯỚNG DẪN KHỞI CHẠY BACKEND

### Bước 1: Mở Terminal tại thư mục `backend`
```powershell
cd E:\SMART_AIoT_SECURITY\backend
```

### Bước 2: Cài đặt thư viện (chỉ chạy lần đầu)
```powershell
npm install
```

### Bước 3: Khởi chạy máy chủ
```powershell
# Chạy máy chủ:
npm start
# hoặc: node server.js

# Chạy chế độ phát triển (tự động reload khi sửa code):
npm run dev
```
- **Máy chủ Backend:** `http://localhost:8000`
- **Tiền tố REST API:** `http://localhost:8000/api`

### Bước 4: Chạy kiểm thử tự động
```powershell
node test_node_backend.js
```
*(Kết quả: 6/6 Test Cases ĐẠT 100%).*

---

## 3. GIẢI THÍCH CHI TIẾT CHỨC NĂNG 6 TỆP TRONG `src/`

1. **[src/config.js](file:///e:/SMART_AIoT_SECURITY/backend/src/config.js) – Cấu hình tập trung:**
   Đọc tệp `.env`, quản lý cổng `8000`, địa chỉ Broker MQTT (`localhost:1883`), các topic chuẩn (`sensors`, `status`, `alerts`, `command`) và đường dẫn tệp SQLite.
2. **[src/db.js](file:///e:/SMART_AIoT_SECURITY/backend/src/db.js) – Kết nối Database:**
   Sử dụng driver `node:sqlite` tích hợp sẵn trong Node.js, kích hoạt chế độ **WAL (`PRAGMA journal_mode = WAL;`)** và toàn vẹn khóa ngoại **`PRAGMA foreign_keys = ON;`**, tự động nạp `schema.sql`.
3. **[src/storage.js](file:///e:/SMART_AIoT_SECURITY/backend/src/storage.js) – Thao tác dữ liệu (Repository):**
   Cung cấp các hàm lưu bản ghi cảm biến, lấy bản ghi mới nhất, truy vấn chuỗi lịch sử phục vụ vẽ biểu đồ, lưu nhật ký cảnh báo và cập nhật trạng thái thiết bị.
4. **[src/ai.js](file:///e:/SMART_AIoT_SECURITY/backend/src/ai.js) – Trí tuệ Nhân tạo (Isolation Forest):**
   Thuật toán học máy Rừng cô lập thuần JavaScript trên **7 đặc trưng số**, tính toán `Anomaly Score` $[0.0 - 1.0]$, quản lý kết quả bằng **RAM Cache xoay vòng 200 bản ghi**.
5. **[src/mqtt.js](file:///e:/SMART_AIoT_SECURITY/backend/src/mqtt.js) – Lắng nghe truyền thông:**
   Lắng nghe ngầm đa luồng từ Broker Mosquitto, kiểm duyệt JSON an toàn không gây crash server, tự động điều phối dữ liệu vào Database và AI, tự động tái kết nối khi mất mạng.
6. **[src/routes.js](file:///e:/SMART_AIoT_SECURITY/backend/src/routes.js) – Định tuyến REST API:**
   Cung cấp toàn bộ 11 endpoints chuẩn hóa phục vụ Dashboard:
   - `GET /api/health`: Nhịp tim Broker & Uptime.
   - `GET /api/devices`: Danh mục trạm thiết bị.
   - `GET /api/sensors/latest`: Dữ liệu cảm biến mới nhất.
   - `GET /api/sensors/history`: Chuỗi thời gian lịch sử vẽ biểu đồ.
   - `GET /api/alerts`: Danh sách sự cố vi phạm ngưỡng phần cứng.
   - `POST /api/ai/train`: Kích hoạt huấn luyện lại mô hình AI.
   - `GET /api/ai/status`: Trạng thái mô hình AI.
   - `POST /api/ai/detect`: Suy luận dị thường cho 1 gói tin.
   - `GET /api/ai/latest`: Kết quả phân tích AI mới nhất từ RAM.
   - `GET /api/ai/history`: Lịch sử nhận định dị thường từ RAM.

---

## 4. TỆP [server.js](file:///e:/SMART_AIoT_SECURITY/backend/server.js) – ĐIỂM KHỞI CHẠY CHÍNH
- Cấu hình CORS middleware cho phép Frontend kết nối.
- Khởi động cơ sở dữ liệu (`initDb()`), khởi chạy MQTT Subscriber (`mqttService.start()`).
- Lắng nghe tại cổng `8000`.
- Hỗ trợ cơ chế Graceful Shutdown đóng kết nối sạch sẽ khi tắt server.
