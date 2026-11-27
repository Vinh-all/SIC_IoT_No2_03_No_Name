# PHASE STATUS - TRẠNG THÁI CÁC GIAI ĐOẠN

| Giai đoạn | Nội dung | Trạng thái | Ghi chú nghiệm thu |
|:---:|:---|:---:|:---|
| **GĐ 1** | Firmware & Đọc tín hiệu cảm biến | ✅ **HOÀN THÀNH** | Đã triển khai theo bảng GPIO thống nhất, lọc EMA/Median, chống rung nhiễu 3s. |
| **GĐ 2** | Kết nối & Truyền dữ liệu (Wi-Fi, MQTT) | ✅ **HOÀN THÀNH** | Đã bổ sung Wi-Fi, MQTT PubSubClient, LWT, định dạng JSON chuẩn. |
| **GĐ 3** | Xây dựng Backend (FastAPI, MQTT Client) | ✅ **HOÀN THÀNH** | Tiếp nhận MQTT background, kiểm duyệt Pydantic, Storage Interface, REST API chuẩn. |
| **GĐ 4** | Xây dựng Database (SQLite) | ✅ **HOÀN THÀNH** | Khởi tạo file `database/security.db`, 3 bảng chuẩn hóa, chế độ WAL, Repository SQLiteStorage. |
| **GĐ 5** | Xây dựng chức năng AI (Isolation Forest) | ✅ **HOÀN THÀNH** | Mô hình 7 đặc trưng, StandardScaler, tự động phân tích thời gian thực qua MQTT, REST API cho AI. |
| **GĐ 6** | **Xây dựng Dashboard (React, Vite, Recharts)**| ✅ **HOÀN THÀNH** | 7 Card cảm biến, 3 biểu đồ Recharts, thanh đo Anomaly Score AI, 5 Tab điều hướng, cảnh báo mất kết nối. |
| **GĐ 7** | **Tích hợp & Kiểm thử toàn hệ thống** | ✅ **HOÀN THÀNH** | Đã thực hiện bộ kiểm thử liên hoàn 12/12 Test Cases ĐẠT 100%, xuất TEST_REPORT.md. |
| **GĐ 8** | **Hoàn thiện & Tài liệu báo cáo** | ✅ **HOÀN THÀNH** | Tối ưu mã nguồn, rà soát bảo mật (.gitignore, .env), phát hành README.md & PROJECT_REPORT.md. |

---

### Biên bản nghiệm thu chi tiết Giai đoạn 8 (Hoàn thiện và Tài liệu báo cáo):
- [x] **Rà soát cấu trúc dự án:** Kiểm tra toàn diện 4 module (`firmware`, `backend`, `database`, `frontend`), đảm bảo không có file rác, file trùng lặp hoặc đường dẫn sai lệch.
- [x] **Rà soát chất lượng mã nguồn:** Kiểm tra xử lý ngoại lệ, logging đồng bộ, dọn dẹp các đoạn code thừa, tối ưu hóa các hàm truy vấn.
- [x] **Tăng cường bảo mật toàn diện:**
  - Cập nhật `.gitignore` loại trừ hoàn toàn `.env`, `credentials.h`, `.venv/`, `node_modules/`, `database/*.db*`.
  - Tạo `.env.example` và tích hợp `python-dotenv` tự động nạp cấu hình.
  - Chống can thiệp phần cứng tùy ý: ESP32 từ chối hoàn toàn lệnh điều khiển GPIO trực tiếp qua MQTT, chỉ chấp nhận lệnh hệ thống chuẩn (`TEST_ALARM`, `RESET_ALARM`).
- [x] **Hoàn thiện tài liệu tổng thể:** Soạn thảo tệp `README.md` tại thư mục gốc với sơ đồ kiến trúc Mermaid, bảng GPIO, hướng dẫn cài đặt và chạy từng thành phần, kịch bản kiểm thử và khắc phục sự cố.
- [x] **Hoàn thiện tài liệu 4 phân hệ:**
  - `firmware/README.md`: Hướng dẫn đấu nối, an toàn điện 3.3V, cầu phân áp siêu âm, nạp code PlatformIO.
  - `database/README.md`: Hướng dẫn cấu trúc 3 bảng, chế độ WAL, khóa ngoại, sao lưu nóng `VACUUM INTO` và phục hồi.
  - `backend/README.md`: Hướng dẫn FastAPI, môi trường ảo Python, 11 API endpoints, AI Service.
  - `frontend/README.md`: Hướng dẫn React 18, Vite, Polling, Recharts và đóng gói production `npm run build`.
- [x] **Soạn thảo báo cáo kỹ thuật tổng kết dự án:** Hoàn thành `PROJECT_REPORT.md` với 12 chương chi tiết từ mô tả bài toán, thiết kế kiến trúc, phần cứng, phần mềm, giải thuật AI đến kết quả kiểm thử và định hướng tương lai.
- [x] **Kiểm tra và nghiệm thu cuối cùng:** Toàn bộ hệ thống sẵn sàng bàn giao và vận hành thực tế.

---

### Biên bản nghiệm thu chi tiết Giai đoạn 7 (Tích hợp và Kiểm thử toàn hệ thống):
- [x] **Xây dựng kịch bản kiểm thử E2E liên hoàn:** Viết kịch bản kiểm thử tích hợp chuyên sâu trong `backend/test_integration_e2e.py`.
- [x] **Kiểm thử tính toàn vẹn cơ sở dữ liệu:** Khởi tạo và xác minh 3 bảng `devices`, `sensor_logs`, `security_alerts` trong SQLite với ràng buộc khóa ngoại (TC-01, TC-09).
- [x] **Kiểm thử luồng dữ liệu cảm biến chuẩn:** Xác minh dữ liệu cảm biến từ MQTT -> Pydantic -> SQLite (TC-02).
- [x] **Kiểm thử mô hình học máy AI:** Đánh giá điểm bất thường với mẫu dữ liệu bình thường (TC-03) và phát hiện dị thường kết hợp đa chiều Gas + Sound (TC-04).
- [x] **Kiểm thử xử lý cảnh báo ngưỡng phần cứng:** Kiểm tra luồng ghi nhận sự cố phần cứng vào bảng `security_alerts` (TC-05).
- [x] **Kiểm thử khả năng chịu lỗi (Resilience & Fault Tolerance):**
  - Chống chịu gói tin JSON rác, sai kiểu dữ liệu mà không làm sập Backend (TC-06).
  - Tự động phát hiện khi Broker Mosquitto Disconnect và phục hồi Reconnect (TC-10).
- [x] **Kiểm thử 8 REST API Endpoints:** Xác minh Root, Health, Devices, Sensors Latest/History, Alerts, AI Status/Latest (TC-07).
- [x] **Kiểm thử tính bền vững dữ liệu:** Đảm bảo dữ liệu `security.db` vẫn nguyên vẹn sau khi khởi động lại Backend (TC-08).
- [x] **Kiểm thử đóng gói Frontend Production:** Kiểm tra Vite build `dist/index.html` và assets bundle (TC-11).
- [x] **Phân định rõ ranh giới cảnh báo:** Tách biệt rõ Cảnh báo ngưỡng phần cứng (SQLite) và Nhận định ngoại lai AI (RAM cache) (TC-12).
- [x] **Xuất báo cáo nghiệm thu:** Đã hoàn thiện tài liệu `TEST_REPORT.md` chi tiết tại thư mục gốc.

---

### Biên bản nghiệm thu chi tiết Giai đoạn 6 (Xây dựng Dashboard):
- [x] **Thiết lập Frontend React & Vite:** Cấu hình chuẩn `package.json`, `vite.config.js` với Proxy `/api` trỏ về port 8000 của FastAPI.
- [x] **Giao diện tổng quan & Điều hướng:**
  - Header với thương hiệu, hộp chọn thiết bị, các chip trạng thái (Backend Online, MQTT Broker OK) và nút làm mới.
  - 5 Tab điều hướng: *Tổng quan, Biểu đồ, Cảnh báo & AI, Lịch sử dữ liệu, Quản lý thiết bị*.
- [x] **Hiển thị đầy đủ 7 cảm biến:** Thẻ Card trực quan cho Nhiệt độ, Độ ẩm, Khí gas MQ-2, Âm thanh, Chuyển động PIR, Chạm TTP223 và Khoảng cách HC-SR04. Giữ nguyên giá trị ADC thô, không tự ý chuyển thành ppm hay dB.
- [x] **Hệ thống biểu đồ Recharts:**
  - Biểu đồ Nhiệt độ & Độ ẩm 2 trục Y.
  - Biểu đồ Khí gas & Âm thanh ADC dạng Area.
  - Biểu đồ Khoảng cách siêu âm dạng Area.
  - Tùy chọn xem 15, 30, 50, 100 điểm mẫu.
- [x] **Trực quan hóa Trí tuệ Nhân tạo:** Thanh đo `Anomaly Score` [0.0 - 1.0], nhận định phân tích đa chiều và nút kích hoạt huấn luyện lại AI từ giao diện.
- [x] **Phân định rõ ranh giới cảnh báo:** Bảng cảnh báo theo ngưỡng vật lý (SQLite) tách biệt hoàn toàn với bảng cảnh báo ngoại lai AI.
- [x] **Chịu lỗi & Xử lý mạng:** Tự động phát hiện khi Backend mất kết nối và hiển thị banner cảnh báo trên đầu giao diện.
- [x] **Biên dịch thử nghiệm:** `npm run build` thành công 100% trong 5.09s.
- [x] **Tài liệu bàn giao:** Đã cập nhật `frontend/README.md`, `PROJECT_CONTEXT.md`, `PHASE_STATUS.md`, `CHANGELOG.md`.
