# TÀI LIỆU HƯỚNG DẪN DASHBOARD FRONTEND - REACT & VITE
## DỰ ÁN: SMART AIoT SECURITY – HỆ THỐNG AN NINH & GIÁM SÁT THÔNG MINH

---

## 1. TỔNG QUAN GIAO DIỆN NGƯỜI DÙNG
Dashboard Frontend là trung tâm giám sát an ninh trực quan của hệ thống SMART AIoT SECURITY, được phát triển trên nền tảng **React 18** và công cụ đóng gói siêu tốc **Vite**.

### Công nghệ sử dụng:
- **Core:** React 18, React DOM, JavaScript JSX.
- **Build Tool:** Vite (Cổng mặc định: `3000`, Hỗ trợ Hot Module Replacement).
- **Trực quan hóa dữ liệu:** Recharts (Vẽ biểu đồ chuỗi thời gian 2 trục Y, biểu đồ vùng Area).
- **Biểu tượng giao diện:** Lucide React (Bộ icon bảo mật chuyên nghiệp).
- **HTTP Client:** Axios (Tích hợp Proxy tự động định tuyến sang Backend).
- **Phong cách thiết kế:** Dark Modern Theme, tối ưu hiển thị trên các màn hình trung tâm giám sát (SOC).

---

## 2. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY

### Bước 1: Mở Terminal tại thư mục `frontend`
```powershell
cd E:\SMART_AIoT_SECURITY\frontend
```

### Bước 2: Cài đặt các gói phụ thuộc (Dependencies)
```powershell
npm install
```

### Bước 3: Khởi chạy máy chủ phát triển (Development Server)
```powershell
npm run dev
```
- Mở trình duyệt web và truy cập: **`http://localhost:3000`**
- *Lưu ý: Vite đã được cấu hình Proxy chuyển tiếp tự động các yêu cầu `/api` sang Backend FastAPI tại `http://localhost:8000`.*

### Bước 4: Đóng gói bản phát hành sản xuất (Production Build)
```powershell
npm run build
```
- Gói ứng dụng tối ưu hóa được xuất ra thư mục `frontend/dist/`.
- Tệp sinh ra bao gồm: `dist/index.html` và các gói bundle CSS/JS đã được minify và nén gzip, sẵn sàng triển khai trên Nginx, Caddy hoặc Docker.

---

## 3. CẤU TRÚC THƯ MỤC MÃ NGUỒN FRONTEND

```text
frontend/
├── index.html                     # Tệp HTML mẫu gốc
├── package.json                   # Danh mục thư viện và scripts npm
├── vite.config.js                 # Cấu hình Vite Dev Server và Proxy Backend
├── README.md                      # Tài liệu hướng dẫn giao diện
└── src/
    ├── main.jsx                   # Điểm gắn kết React DOM
    ├── App.jsx                    # Bộ điều phối chính, Polling và chuyển Tab
    ├── App.css                    # Thiết kế giao diện Dark Theme responsive
    ├── services/
    │   └── api.js                 # Lớp dịch vụ giao tiếp REST API qua Axios
    └── components/
        ├── Header.jsx             # Thanh tiêu đề, chọn trạm ESP32 & trạng thái kết nối
        ├── SensorCard.jsx         # Thẻ hiển thị dữ liệu và trạng thái của từng cảm biến
        ├── SensorGrid.jsx         # Lưới 7 thẻ cảm biến theo dõi thời gian thực
        ├── SensorCharts.jsx       # Bộ 3 biểu đồ Recharts phân tích xu hướng
        ├── AIAnomalySection.jsx   # Thanh đo Anomaly Score AI và nút huấn luyện lại
        ├── AlertsList.jsx         # Phân định rõ 2 bảng cảnh báo: Phần cứng vs AI
        ├── HistoricalTable.jsx    # Bảng tra cứu lịch sử cảm biến có bộ lọc tìm kiếm
        └── DeviceList.jsx         # Quản lý danh mục thiết bị và trạng thái Online
```

---

## 4. TÍNH NĂNG VÀ THÀNH PHẦN NỔI BẬT

### 4.1. Cơ chế cập nhật dữ liệu tự động (Smart Polling)
Để đảm bảo dữ liệu luôn mới nhất mà không gây nghẽn tài nguyên:
- **Fast Polling (2.5 giây/chu kỳ):** Đồng bộ dữ liệu cảm biến mới nhất (`/api/sensors/latest`), trạng thái sức khỏe Backend/Broker (`/api/health`) và kết quả nhận định AI mới nhất (`/api/ai/latest`).
- **Slow Polling (6.0 giây/chu kỳ):** Tải chuỗi lịch sử phục vụ biểu đồ (`/api/sensors/history`), danh sách sự kiện cảnh báo (`/api/alerts`) và danh sách trạm thiết bị (`/api/devices`).

### 4.2. Khả năng tự phát hiện lỗi mạng (Network Resilience Banner)
Khi máy chủ Backend bị dừng hoặc mạng gián đoạn, giao diện không bị treo mà tự động hiển thị thanh thông báo màu đỏ ở đỉnh màn hình:  
`"MẤT KẾT NỐI VỚI MÁY CHỦ BACKEND (FASTAPI). ĐANG TỰ ĐỘNG KẾT NỐI LẠI..."`  
Khi Backend hoạt động trở lại, thông báo tự động biến mất và dữ liệu tiếp tục cập nhật bình thường.

### 4.3. Phân biệt rạch ròi 2 lớp cảnh báo an ninh
1. **Bảng Cảnh báo vi phạm ngưỡng (Threshold Alerts):** Hiển thị các sự cố phần cứng tức thời được lưu trong SQLite (cháy nổ gas, chạm phá hoại, chuyển động trong vùng cấm).
2. **Bảng Nhận định dị thường AI (AI Outliers):** Hiển thị các điểm dữ liệu bất thường do mô hình Isolation Forest phát hiện kèm điểm số `Anomaly Score` và giải thích nguyên nhân suy luận.
