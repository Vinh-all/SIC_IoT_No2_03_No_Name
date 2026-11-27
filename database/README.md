# TÀI LIỆU CƠ SỞ DỮ LIỆU SQLITE - SMART AIoT SECURITY
## DỰ ÁN: SMART AIoT SECURITY – HỆ THỐNG AN NINH & GIÁM SÁT THÔNG MINH

---

## 1. TỔNG QUAN HỆ CƠ SỞ DỮ LIỆU
Hệ thống sử dụng cơ sở dữ liệu nhúng **SQLite 3**, lưu trữ bền vững trên tệp vật lý độc lập tại đường dẫn:
- **Đường dẫn tệp:** `E:\SMART_AIoT_SECURITY\database\security.db`
- **Kịch bản DDL khởi tạo:** [database/schema.sql](file:///e:/SMART_AIoT_SECURITY/database/schema.sql)
- **Tầng giao tiếp phần mềm:** Mô hình Repository thông qua `SQLiteStorage` trong `backend/app/services/storage.py`.

---

## 2. CẤU TRÚC CHI TIẾT 3 BẢNG CHÍNH

### 2.1. Bảng `devices` (Quản lý danh mục thiết bị ESP32)
Lưu trữ thông tin định danh và trạng thái kết nối mạng của các trạm cảm biến.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Ý nghĩa / Mô tả |
|:---|:---|:---:|:---|
| `device_id` | `VARCHAR(50)` | `PRIMARY KEY` | Mã định danh thiết bị duy nhất (ví dụ: `ESP32_001`) |
| `device_name` | `VARCHAR(100)` | `NOT NULL` | Tên gợi nhớ của thiết bị (ví dụ: `Trạm Giám sát Phòng Server`) |
| `device_type` | `VARCHAR(50)` | `DEFAULT 'ESP32'` | Chủng loại vi điều khiển |
| `status` | `VARCHAR(20)` | `DEFAULT 'offline'` | Trạng thái hoạt động (`online` hoặc `offline`) |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm trạm được đăng ký vào hệ thống |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm cập nhật trạng thái hoạt động gần nhất |

### 2.2. Bảng `sensor_logs` (Nhật ký chuỗi thời gian dữ liệu cảm biến)
Lưu trữ toàn bộ lịch sử dữ liệu cảm biến 8 trường thu nhận định kỳ từ MQTT topic `aiot/security/sensors`.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Ý nghĩa / Mô tả |
|:---|:---|:---:|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Khóa chính tự tăng |
| `device_id` | `VARCHAR(50)` | `NOT NULL, FK -> devices(device_id)` | Mã thiết bị gửi dữ liệu (Ràng buộc toàn vẹn) |
| `temperature` | `REAL` | `NOT NULL` | Nhiệt độ môi trường (°C) |
| `humidity` | `REAL` | `NOT NULL` | Độ ẩm không khí (%) |
| `gas_adc` | `INTEGER` | `NOT NULL` | Giá trị ADC 12-bit MQ-2 sau bộ lọc EMA |
| `sound_adc` | `INTEGER` | `NOT NULL` | Biên độ âm thanh Peak-to-Peak 50ms |
| `motion` | `INTEGER` | `NOT NULL (0 hoặc 1)` | Trạng thái chuyển động hồng ngoại PIR |
| `touch` | `INTEGER` | `NOT NULL (0 hoặc 1)` | Trạng thái cảm biến chạm điện dung TTP223 |
| `distance_cm` | `REAL` | `NOT NULL` | Khoảng cách đo siêu âm HC-SR04 sau lọc Median |
| `recorded_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm ghi nhận vào Database |

### 2.3. Bảng `security_alerts` (Nhật ký sự kiện cảnh báo an ninh)
Ghi nhận các sự kiện vi phạm ngưỡng cứng do ESP32 hoặc Backend kích hoạt.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Ý nghĩa / Mô tả |
|:---|:---|:---:|:---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Khóa chính tự tăng |
| `device_id` | `VARCHAR(50)` | `NOT NULL, FK -> devices(device_id)` | Mã thiết bị phát hiện cảnh báo |
| `alert_type` | `VARCHAR(50)` | `NOT NULL` | Loại sự cố (`MOTION_DETECTED`, `GAS_LEAK`, `TAMPER`,...) |
| `severity` | `VARCHAR(20)` | `DEFAULT 'MEDIUM'` | Mức độ nghiêm trọng (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) |
| `description` | `TEXT` | | Nội dung mô tả sự cố hoặc chuỗi lý do |
| `is_resolved` | `INTEGER` | `DEFAULT 0` | Trạng thái xử lý: `0` (chưa xử lý), `1` (đã xác nhận) |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Thời điểm phát sinh cảnh báo |
| `resolved_at` | `TIMESTAMP` | `NULL` | Thời điểm người quản trị xử lý |

---

## 3. TỐI ƯU HÓA HIỆU NĂNG & AN TOÀN ĐỒNG THỜI

1. **Chế độ Write-Ahead Logging (WAL):**
   ```sql
   PRAGMA journal_mode = WAL;
   ```
   Cho phép luồng ghi dữ liệu MQTT Ingestion và luồng đọc dữ liệu từ REST API / Dashboard diễn ra đồng thời mà không bị khóa bảng (`database is locked`).
2. **Kích hoạt toàn vẹn khóa ngoại (Foreign Keys):**
   ```sql
   PRAGMA foreign_keys = ON;
   ```
   Bảo vệ tính toàn vẹn tham chiếu, từ chối việc ghi dữ liệu cảm biến từ các thiết bị chưa được cấp phép.
3. **Đánh chỉ mục kép (Compound Indexes):**
   - `idx_sensor_device_time` trên `(device_id, recorded_at)`: Giảm thời gian truy vấn 50 mẫu lịch sử vẽ biểu đồ xuống dưới 2ms.
   - `idx_alerts_device_time` trên `(device_id, created_at)`: Tăng tốc độ truy xuất bảng sự cố an ninh trên giao diện Dashboard.

---

## 4. HƯỚNG DẪN KHỞI TẠO VÀ TRUY VẤN DỮ LIỆU

### 4.1. Khởi tạo Database tự động qua Python
```powershell
cd E:\SMART_AIoT_SECURITY\backend
.\venv\Scripts\python.exe -c "from app.db.session import init_db; init_db()"
```

### 4.2. Các câu truy vấn bảo trì & thống kê thường dùng
Sử dụng công cụ SQLite CLI hoặc DB Browser for SQLite:

```sql
-- 1. Lấy 10 bản ghi cảm biến mới nhất của thiết bị ESP32_001
SELECT * FROM sensor_logs 
WHERE device_id = 'ESP32_001' 
ORDER BY recorded_at DESC 
LIMIT 10;

-- 2. Thống kê số lượng cảnh báo chưa xử lý theo từng mức độ
SELECT severity, count(*) as count 
FROM security_alerts 
WHERE is_resolved = 0 
GROUP BY severity;

-- 3. Tính nhiệt độ và độ ẩm trung bình theo giờ
SELECT strftime('%Y-%m-%d %H:00', recorded_at) as hour,
       AVG(temperature) as avg_temp,
       AVG(humidity) as avg_humi
FROM sensor_logs
WHERE device_id = 'ESP32_001'
GROUP BY hour
ORDER BY hour DESC
LIMIT 24;
```

---

## 5. SAO LƯU VÀ PHỤC HỒI DỮ LIỆU (BACKUP & RESTORE)

### 5.1. Sao lưu nóng (Online Hot Backup) không làm dừng Server
Sử dụng lệnh `VACUUM INTO` chuẩn của SQLite để tạo bản sao lưu an toàn ngay cả khi luồng Ingestion đang ghi dữ liệu liên tục:
```powershell
sqlite3 database\security.db "VACUUM INTO 'database\security_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db';"
```

### 5.2. Khôi phục dữ liệu từ bản sao lưu
1. Dừng dịch vụ Backend FastAPI.
2. Sao chép tệp sao lưu đè lên `database\security.db`:
   ```powershell
   copy database\security_backup_xxxx.db database\security.db
   ```
3. Khởi động lại dịch vụ Backend.

### 5.3. Kiểm tra tính toàn vẹn của Database
```sql
PRAGMA integrity_check;
```
Kết quả trả về `ok` biểu thị cơ sở dữ liệu hoàn toàn khỏe mạnh, không bị phân mảnh hay lỗi khối nhớ.
