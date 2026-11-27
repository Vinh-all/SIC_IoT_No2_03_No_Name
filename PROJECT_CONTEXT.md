# PROJECT CONTEXT - SMART AIoT SECURITY

Hệ thống giám sát và phát hiện xâm nhập thông minh ứng dụng AIoT cho phòng học, phòng máy tính hoặc phòng thiết bị.

---

## 1. PHẦN CỨNG & BẢNG GPIO THỐNG NHẤT (ESP32 DevKit V1)

| Thiết bị | Chân ESP32 | Loại tín hiệu | Vai trò / Lưu ý kỹ thuật |
|:---|:---:|:---:|:---|
| **DHT22** | **GPIO 4** | Digital I/O | Nhiệt độ & Độ ẩm (Trở kéo pull-up 10k lên 3.3V) |
| **PIR HC-SR501**| **GPIO 27** | Digital In | Phát hiện chuyển động thân nhiệt (Nguồn cấp 5V, Out 3.3V) |
| **MQ-2** | **GPIO 34** | Analog In (ADC1) | Khí gas / Khói (ADC1_CH6 - Input Only, an toàn khi bật Wi-Fi) |
| **KY-037/038** | **GPIO 35** | Analog In (ADC1) | Cảm biến âm thanh (ADC1_CH7 - Lấy mẫu Peak-to-Peak) |
| **TTP223** | **GPIO 32** | Digital In | Cảm biến chạm chống phá hoại thiết bị (Out 3.3V) |
| **HC-SR04** | **GPIO 26** (Trig)<br>**GPIO 25** (Echo) | Digital Out<br>Digital In | Đo khoảng cách (Echo 5V **bắt buộc** qua cầu phân áp 1kΩ/2kΩ về 3.3V) |
| **LED Đỏ** | **GPIO 18** | Digital Out | Đèn cảnh báo nguy hiểm / Xâm nhập (Trở hạn dòng 220Ω-330Ω) |
| **LED Xanh** | **GPIO 19** | Digital Out | Đèn báo trạng thái hệ thống an toàn (Trở hạn dòng 220Ω-330Ω) |
| **Buzzer** | **GPIO 23** | Digital Out | Còi báo động (Active Buzzer kêu ngắt quãng 200ms) |

---

## 2. HỢP ĐỒNG DỮ LIỆU CẢM BIẾN (DATA CONTRACT)
```json
{
  "device_id": "ESP32_001",
  "temperature": 29.5,
  "humidity": 70.2,
  "gas_adc": 850,
  "sound_adc": 420,
  "motion": 1,
  "touch": 0,
  "distance_cm": 120.5
}
```

---

## 3. CƠ SỞ DỮ LIỆU SQLITE (DATABASE SCHEMA - GIAI ĐOẠN 4)
File lưu trữ: `E:\SMART_AIoT_SECURITY\database\security.db`
- **Bảng `devices`**: `device_id` (PK), `device_name`, `device_type`, `status`, `created_at`, `updated_at`.
- **Bảng `sensor_logs`**: `id` (PK), `device_id` (FK), `temperature`, `humidity`, `gas_adc`, `sound_adc`, `motion`, `touch`, `distance_cm`, `recorded_at`.
- **Bảng `security_alerts`**: `id` (PK), `device_id` (FK), `alert_type`, `severity`, `description`, `is_resolved`, `created_at`, `resolved_at`.

---

## 4. HỢP ĐỒNG TRÍ TUỆ NHÂN TẠO (AI CONTRACT - GIAI ĐOẠN 5)
- **Thuật toán:** Isolation Forest (Scikit-learn).
- **Bộ tiền xử lý:** `StandardScaler` chuẩn hóa 7 đặc trưng số.
- **File mô hình:** `backend/app/services/ai_model.joblib`.

---

## 5. HỢP ĐỒNG GIAO DIỆN DASHBOARD (DASHBOARD CONTRACT - GIAI ĐOẠN 6)
- **Công nghệ:** React 18, Vite (Port `3000`), Recharts, Lucide Icons, Axios.
- **Cơ chế cập nhật:** Polling thông minh (Fast poll 2.5s cho cảm biến/AI/sức khỏe, Slow poll 6.0s cho lịch sử/thiết bị).
- **Các thành phần giao diện:**
  - Header điều khiển & trạng thái kết nối.
  - 7 Card cảm biến hiện trường với chỉ báo an toàn/cảnh báo.
  - Thanh đo Anomaly Score AI và nhận định phân tích.
  - Bộ 3 biểu đồ Recharts (Nhiệt độ-Độ ẩm, Khí gas-Âm thanh, Khoảng cách-Chuyển động).
  - Phân loại rõ ràng 2 bảng cảnh báo: Cảnh báo theo ngưỡng (SQLite) và Cảnh báo dị thường AI (RAM).
  - Bảng lịch sử chuỗi thời gian có tìm kiếm lọc theo ngày/thiết bị.

---

## 6. BỘ KIỂM THỬ TÍCH HỢP & BÁO CÁO NGHIỆM THU (GIAI ĐOẠN 7)
- **Tập lệnh kiểm thử liên hoàn E2E:** `backend/test_integration_e2e.py`.
- **Báo cáo nghiệm thu hoàn chỉnh:** `TEST_REPORT.md` (12/12 Test Cases ĐẠT 100.0% PASS).
- **Các tiêu chuẩn đã kiểm chứng:**
  - Ingestion MQTT liên hoàn từ cảm biến -> Pydantic Schema Validation -> SQLite Database.
  - Phân tích ngoại lai đa chiều thời gian thực với Scikit-Learn Isolation Forest.
  - Toàn bộ 8 REST API Endpoints hoạt động ổn định và chính xác.
  - Tính năng chống chịu lỗi (Mất Broker, Reconnect, JSON rác, Vi phạm khóa ngoại Foreign Keys).
  - Phân định rõ ràng giữa Cảnh báo ngưỡng phần cứng (SQLite) và Cảnh báo dị thường AI (RAM cache).
  - Đóng gói Vite production build hoàn tất.

---

## 7. HOÀN THIỆN, BẢO MẬT & ĐÓNG GÓI TỔNG THỂ (GIAI ĐOẠN 8)
- **Tài liệu tổng thể Master:** `README.md` tại thư mục gốc.
- **Tài liệu báo cáo kỹ thuật toàn diện:** `PROJECT_REPORT.md` tại thư mục gốc.
- **Tài liệu kỹ thuật từng phân hệ:**
  - `firmware/README.md`: Hướng dẫn phần cứng, an toàn điện áp, lọc số tín hiệu, cấu hình PlatformIO.
  - `database/README.md`: Hướng dẫn cấu trúc 3 bảng, chỉ mục, sao lưu online nóng và phục hồi.
  - `backend/README.md`: Hướng dẫn FastAPI, môi trường ảo Python, 11 API endpoints, AI Service.
  - `frontend/README.md`: Hướng dẫn React 18, Vite, Polling, Recharts và đóng gói production.
- **Tăng cường bảo mật:**
  - Cấu hình `.gitignore` toàn diện, loại trừ `.env`, `credentials.h`, `.venv/`, `.db-wal`, `node_modules/`.
  - Cung cấp `.env.example` và tự động nạp cấu hình qua `dotenv`.
  - Chặn tuyệt đối điều khiển GPIO tùy ý từ MQTT, chỉ chấp nhận lệnh hệ thống hợp lệ (`TEST_ALARM`, `RESET_ALARM`).
- **Tổng kết dự án:** Toàn bộ 8/8 giai đoạn đã hoàn thành xuất sắc 100%.
