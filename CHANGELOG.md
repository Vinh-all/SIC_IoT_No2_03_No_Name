# CHANGELOG - NHẬT KÝ THAY ĐỔI DỰ ÁN

---

## [1.0.0] - 2026-11-23

### Hoàn thành Giai đoạn 8 (Hoàn thiện & Tài liệu báo cáo) - PHÁT HÀNH PHIÊN BẢN CHÍNH THỨC v1.0.0
- **Rà soát bảo mật & Quản lý cấu hình:**
  - Cập nhật `.gitignore` toàn diện: ngăn chặn rò rỉ `.env`, `credentials.h`, `.venv/`, `.db-wal`, `node_modules/`.
  - Cung cấp tệp mẫu cấu hình môi trường `.env.example` tại thư mục gốc và `backend/`.
  - Tích hợp thư viện `python-dotenv` tự động nạp cấu hình bảo mật vào `backend/app/core/config.py`.
  - Nâng cấp cơ chế an toàn Firmware: Chặn tuyệt đối việc điều khiển chân GPIO tùy ý từ xa qua MQTT; chỉ chấp nhận các lệnh hệ thống kiểm soát chặt chẽ (`TEST_ALARM`, `RESET_ALARM`).
- **Tài liệu tổng thể & Báo cáo kỹ thuật:**
  - Phát hành tệp `README.md` chính tại thư mục gốc với sơ đồ kiến trúc Mermaid, bảng GPIO, hướng dẫn thiết lập từ A-Z, bảng xử lý sự cố.
  - Phát hành báo cáo kỹ thuật toàn diện `PROJECT_REPORT.md` (12 chương đầy đủ: Bài toán, Mục tiêu, Phân tích yêu cầu, Kiến trúc hệ thống, Phần cứng, Phần mềm, Database, AI Isolation Forest, Dashboard, Kết quả kiểm thử, Đánh giá và Lộ trình).
  - Hoàn thiện tài liệu kỹ thuật đồng bộ cho từng phân hệ: `firmware/README.md`, `database/README.md`, `backend/README.md`, `frontend/README.md`.
- **Tổng kết dự án:**
  - Hoàn tất 100% cả 8 giai đoạn của dự án SMART AIoT SECURITY.
  - Tỷ lệ kiểm thử tích hợp liên hoàn đạt 12/12 Test Cases (100.0% PASS).

---

## [0.7.0] - 2026-11-23

### Hoàn thành Giai đoạn 7 (Tích hợp và Kiểm thử toàn hệ thống)
- **Bộ kiểm thử tích hợp liên hoàn (End-to-End Suite):**
  - Triển khai kịch bản `backend/test_integration_e2e.py` bao quát 12 ca kiểm thử trọng yếu.
  - Tỷ lệ nghiệm thu: 12/12 Test Cases ĐẠT (100.0% PASS).
- **Kiểm tra khả năng chịu lỗi và tự phục hồi (Fault Tolerance & Resilience):**
  - Xác nhận Backend an toàn trước các gói tin JSON rác/sai kiểu nhờ lớp lọc Pydantic Validation.
  - Xác nhận cơ chế tự phục hồi Broker Disconnect / Reconnect nhịp nhàng, thông báo kịp thời cho Health API.
  - Xác minh chế độ SQLite WAL và tính bảo vệ toàn vẹn khóa ngoại (Foreign Keys).
- **Phân định ranh giới cảnh báo:**
  - Cảnh báo cứng theo ngưỡng lưu trữ bền vững trong bảng `security_alerts` (SQLite).
  - Phân tích dị thường đa chiều AI tính toán theo thời gian thực và quản lý qua RAM cache.
- **Báo cáo và Tài liệu:**
  - Biên soạn và phát hành `TEST_REPORT.md` tại thư mục gốc dự án.
  - Cập nhật đồng bộ `PROJECT_CONTEXT.md` và `PHASE_STATUS.md`.

---

## [0.6.0] - 2026-11-23

### Hoàn thành Giai đoạn 6 (Xây dựng Dashboard React & Vite)
- **Tầng Dịch vụ Frontend:**
  - `frontend/src/services/api.js`: Khởi tạo Axios client với baseURL `/api`, ánh xạ toàn bộ endpoint Backend: Health, Devices, Sensors, Alerts và AI.
- **Thành phần Giao diện (Components):**
  - `frontend/src/components/Header.jsx`: Thanh điều khiển trên cùng, hộp chọn thiết bị ESP32, chỉ báo trạng thái kết nối Backend & MQTT Broker.
  - `frontend/src/components/SensorCard.jsx` & `SensorGrid.jsx`: Hiển thị lưới 7 thẻ cảm biến với màu sắc và trạng thái cảnh báo thời gian thực.
  - `frontend/src/components/SensorCharts.jsx`: Bộ 3 biểu đồ Recharts (Nhiệt độ - Độ ẩm, Khí gas - Âm thanh, Khoảng cách) kèm bộ lọc số điểm mẫu.
  - `frontend/src/components/AIAnomalySection.jsx`: Thanh đo Anomaly Score AI, nhận định đặc trưng và nút huấn luyện lại mô hình.
  - `frontend/src/components/AlertsList.jsx`: Phân biệt rạch ròi Cảnh báo theo ngưỡng vật lý (SQLite) và Cảnh báo dị thường AI.
  - `frontend/src/components/DeviceList.jsx`: Quản lý danh sách thiết bị và trạng thái kết nối.
  - `frontend/src/components/HistoricalTable.jsx`: Bảng tra cứu lịch sử cảm biến với tính năng tìm kiếm nhanh.
- **Trang điều phối chính & Giao diện:**
  - `frontend/src/App.jsx`: Điều phối 5 Tab chức năng, cơ chế Polling thông minh (Fast poll 2.5s, Slow poll 6s), banner cảnh báo mất kết nối Backend.
  - `frontend/src/App.css`: Thiết kế Dark Theme hiện đại, responsive, hiệu ứng chuyển động mượt mà.
- **Kiểm thử đóng gói:**
  - Chạy `npm run build` thành công 100% (Bundle Vite đạt chuẩn sản xuất).
- **Tài liệu quản trị:**
  - `frontend/README.md`: Hướng dẫn chạy, tính năng và tài liệu giao diện.
  - Cập nhật `PROJECT_CONTEXT.md` và `PHASE_STATUS.md`.

---

## [0.5.0] - 2026-11-23
- Hoàn thành Giai đoạn 5: Trí tuệ Nhân tạo - Isolation Forest Anomaly Detection.

---

## [0.4.0] - 2026-11-23
- Hoàn thành Giai đoạn 4: Database SQLite vật lý, 3 bảng chuẩn hóa và Repository SQLiteStorage.

---

## [0.3.0] - 2026-11-23
- Hoàn thành Giai đoạn 3: Backend FastAPI, Pydantic Schemas, Paho-MQTT Ingestion và REST API.

---

## [0.2.0] - 2026-11-23
- Hoàn thành Giai đoạn 2: Kết nối Wi-Fi & MQTT Client trên ESP32.

---

## [0.1.2] - 2026-11-23
- Hoàn thiện Giai đoạn 1: Đọc cảm biến, lọc EMA/Median, còi/đèn và Serial Monitor.

---

## [0.1.0] - 2026-11-22
- Khởi tạo kiến trúc 4 thư mục: `firmware/`, `backend/`, `database/`, `frontend/`.
