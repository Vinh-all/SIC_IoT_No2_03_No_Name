# TÀI LIỆU HƯỚNG DẪN BACKEND FASTAPI & AI SERVICE
## DỰ ÁN: SMART AIoT SECURITY – HỆ THỐNG AN NINH & GIÁM SÁT THÔNG MINH

---

## 1. TỔNG QUAN KIẾN TRÚC BACKEND
Backend được phát triển bằng ngôn ngữ **Python 3.10+**, xây dựng trên nền tảng framework hiệu năng cao **FastAPI** và kiến trúc bất đồng bộ (Asynchronous I/O).

### Các phân hệ chính:
1. **MQTT Ingestion Worker:** Chạy tiến trình nền thông qua `paho-mqtt`, tự động lắng nghe 3 topic (`sensors`, `status`, `alerts`), kiểm duyệt tính toàn vẹn dữ liệu qua Pydantic.
2. **Data Storage Layer:** Triển khai Design Pattern Repository qua `SQLiteStorage`, kết nối trực tiếp đến SQLite với chế độ WAL và khóa ngoại.
3. **AI Anomaly Detection Service:** Ứng dụng mô hình học máy **Isolation Forest** từ thư viện `scikit-learn` kết hợp bộ chuẩn hóa đặc trưng `StandardScaler`, tính toán chỉ số bất thường thời gian thực và quản lý qua bộ nhớ cache RAM.
4. **RESTful API Service:** Cung cấp 11 endpoints chuẩn hóa phục vụ bảng điều khiển Dashboard React và các ứng dụng tích hợp bên ngoài.

---

## 2. HƯỚNG DẪN CÀI ĐẶT & THIẾT LẬP MÔI TRƯỜNG

### Bước 1: Khởi tạo và kích hoạt môi trường ảo Python (Virtualenv)
Mở PowerShell tại thư mục `backend`:
```powershell
cd E:\SMART_AIoT_SECURITY\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Bước 2: Cài đặt các gói phụ thuộc
```powershell
pip install -r requirements.txt
```

### Bước 3: Cấu hình biến môi trường qua tệp `.env`
Sao chép tệp cấu hình mẫu và chỉnh sửa nếu cần:
```powershell
copy .env.example .env
```
Nội dung tệp `.env`:
```env
PROJECT_NAME="SMART AIoT SECURITY"
VERSION="1.0.0"
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
MQTT_CLIENT_ID=FastAPI_Backend_Service
DATABASE_PATH=database/security.db
SCHEMA_PATH=database/schema.sql
AI_CONTAMINATION=0.05
AI_N_ESTIMATORS=100
```

### Bước 4: Khởi động máy chủ FastAPI
```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- Máy chủ sẽ lắng nghe tại: `http://localhost:8000`
- Trang tài liệu tương tác tự động Swagger UI: `http://localhost:8000/docs`
- Trang tài liệu ReDoc: `http://localhost:8000/redoc`

---

## 3. CẤU TRÚC THƯ MỤC MÃ NGUỒN BACKEND

```text
backend/
├── main.py                        # Điểm khởi chạy FastAPI, cấu hình CORS và Lifespan
├── requirements.txt               # Danh sách thư viện Python cần thiết
├── test_integration_e2e.py        # Bộ kịch bản kiểm thử tích hợp liên hoàn 12 Test Cases
├── README.md                      # Tài liệu kỹ thuật Backend
├── .env.example                   # Mẫu cấu hình môi trường bảo mật
└── app/
    ├── api/
    │   └── endpoints/             # Các bộ định tuyến REST API
    │       ├── health.py          # Kiểm tra nhịp tim Broker & Uptime
    │       ├── devices.py         # Quản lý danh mục trạm ESP32
    │       ├── sensors.py         # Dữ liệu cảm biến mới nhất & lịch sử
    │       ├── alerts.py          # Nhật ký sự kiện cảnh báo an ninh
    │       └── ai.py              # Huấn luyện & suy luận Isolation Forest
    ├── core/
    │   └── config.py              # Quản lý cấu hình tập trung và nạp .env
    ├── db/
    │   └── session.py             # Kết nối SQLite, chế độ WAL và khởi tạo bảng
    ├── models/                    # Mô hình ánh xạ dữ liệu nội bộ
    ├── schemas/                   # Pydantic Schemas kiểm duyệt đầu vào/đầu ra
    └── services/
        ├── storage.py             # Repository trừu tượng hóa thao tác SQLite
        ├── mqtt_service.py        # Dịch vụ MQTT Ingestion và xử lý đa luồng
        ├── ai_service.py          # Lớp nghiệp vụ học máy Isolation Forest
        └── ai_model.joblib        # Tệp trọng số mô hình AI đã huấn luyện
```

---

## 4. BẢNG DANH MỤC 11 ENDPOINTS REST API

| Nhóm | Phương thức | Endpoint | Chức năng nghiệp vụ | Response Data |
|:---|:---:|:---|:---|:---|
| **System** | `GET` | `/` | Kiểm tra trạng thái máy chủ, Database & AI | `Object` |
| **System** | `GET` | `/api/health` | Kiểm tra Broker Mosquitto & Thời gian uptime | `BaseResponse[HealthResponse]` |
| **Devices** | `GET` | `/api/devices` | Danh sách trạm giám sát và trạng thái Online/Offline | `BaseResponse[List[DeviceStatus]]` |
| **Sensors** | `GET` | `/api/sensors/latest` | Lấy bản ghi cảm biến mới nhất của thiết bị | `BaseResponse[Optional[SensorDataRecord]]` |
| **Sensors** | `GET` | `/api/sensors/history` | Lấy chuỗi thời gian lịch sử phục vụ vẽ biểu đồ | `BaseResponse[List[SensorDataRecord]]` |
| **Alerts** | `GET` | `/api/alerts` | Danh sách sự kiện vi phạm ngưỡng phần cứng | `BaseResponse[List[AlertRecord]]` |
| **AI** | `POST`| `/api/ai/train` | Kích hoạt huấn luyện lại mô hình Isolation Forest | `BaseResponse[AITrainResponse]` |
| **AI** | `GET` | `/api/ai/status` | Lấy trạng thái mô hình AI (số mẫu, contamination) | `BaseResponse[AIStatusResponse]` |
| **AI** | `POST`| `/api/ai/detect` | Suy luận điểm bất thường cho 1 bản ghi tức thời | `BaseResponse[AIDetectionResult]` |
| **AI** | `GET` | `/api/ai/latest` | Lấy kết quả phân tích AI mới nhất từ cache RAM | `BaseResponse[AIDetectionResult]` |
| **AI** | `GET` | `/api/ai/history` | Lấy chuỗi lịch sử phân tích AI từ cache RAM | `BaseResponse[List[AIDetectionResult]]` |

---

## 5. THUẬT TOÁN HỌC MÁY ISOLATION FOREST

Mô hình AI được thiết kế chuyên biệt để giải bài toán **Phát hiện dị thường không giám sát (Unsupervised Anomaly Detection)** trong dữ liệu chuỗi thời gian AIoT:

- **7 đặc trưng đầu vào:**
  1. `temperature`: Nhiệt độ (°C)
  2. `humidity`: Độ ẩm (%)
  3. `gas_adc`: Giá trị ADC khí gas MQ-2
  4. `sound_adc`: Biên độ âm thanh Peak-to-Peak
  5. `motion`: Cờ chuyển động hồng ngoại (0 hoặc 1)
  6. `touch`: Cờ cảm biến chạm (0 hoặc 1)
  7. `distance_cm`: Khoảng cách siêu âm (cm)
- **Tiền xử lý:** Sử dụng `StandardScaler` để đưa các đại lượng có thang đo khác nhau về cùng phân phối chuẩn có kỳ vọng bằng 0 và phương sai bằng 1.
- **Tham số thuật toán:**
  - `n_estimators = 100`: Xây dựng 100 cây quyết định ngẫu nhiên để cô lập các điểm dữ liệu.
  - `contamination = 0.05`: Kỳ vọng tỷ lệ ngoại lai trong quần thể dữ liệu bình thường khoảng 5%.
- **Chỉ số bất thường (Anomaly Score):** Chuẩn hóa về thang đo liên tục $[0.0, 1.0]$. Giá trị $> 0.5$ được đánh giá là điểm bất thường cần lưu ý trên Dashboard.

---

## 6. CHẠY KIỂM THỬ TÍCH HỢP HỆ THỐNG
Bộ kịch bản kiểm thử tích hợp E2E tự động xác thực toàn bộ các chức năng từ Ingestion, SQLite, AI đến REST API:
```powershell
.\venv\Scripts\python.exe test_integration_e2e.py
```
Kết quả kiểm thử đạt **12/12 Test Cases (100.0% PASS)**.
