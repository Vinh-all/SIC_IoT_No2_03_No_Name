# TÀI LIỆU HƯỚNG DẪN FIRMWARE - ESP32 DevKit V1
## DỰ ÁN: SMART AIoT SECURITY – HỆ THỐNG AN NINH & GIÁM SÁT THÔNG MINH

---

## 1. TỔNG QUAN PHẦN CỨNG & CƠ TỬ
Firmware được xây dựng cho vi điều khiển **ESP32 DevKit V1 (30 chân)** trên nền tảng **PlatformIO / Arduino Framework**. Hệ thống tích hợp đa cảm biến và cơ cấu chấp hành báo động tại chỗ, truyền thông không dây kép Wi-Fi và MQTT Broker Mosquitto.

### Bảng phân bổ chân GPIO thống nhất:

| Thiết bị | Chân ESP32 | Loại tín hiệu | Vai trò / Lưu ý kỹ thuật an toàn |
|:---|:---:|:---:|:---|
| **DHT22** | **GPIO 4** | Digital I/O | Đo nhiệt độ và độ ẩm không khí. Trở kéo pull-up 10kΩ lên 3.3V. |
| **PIR HC-SR501** | **GPIO 27** | Digital In | Cảm biến chuyển động thân nhiệt hồng ngoại thụ động (Nguồn 5V, Out logic 3.3V). |
| **MQ-2** | **GPIO 34** | Analog In (ADC1_CH6) | Khí gas / Khói. Chân Input-Only thuộc ADC1 (an toàn tuyệt đối khi bật Wi-Fi). |
| **KY-037/KY-038** | **GPIO 35** | Analog In (ADC1_CH7) | Cảm biến âm thanh. Lấy mẫu Peak-to-Peak trên ADC1 (không bị xung đột Wi-Fi). |
| **TTP223** | **GPIO 32** | Digital In | Cảm biến điện dung phát hiện chạm/tháo gỡ thiết bị trái phép (Out logic 3.3V). |
| **HC-SR04 Trig** | **GPIO 26** | Digital Out | Chân phát xung kích hoạt siêu âm 10µs. |
| **HC-SR04 Echo** | **GPIO 25** | Digital In | Chân nhận xung siêu âm (**BẮT BUỘC qua mạch chia áp 5V -> 3.3V**). |
| **LED Đỏ** | **GPIO 18** | Digital Out | Đèn báo nguy hiểm / cảnh báo xâm nhập (Trở hạn dòng 220Ω - 330Ω). |
| **LED Xanh** | **GPIO 19** | Digital Out | Đèn báo trạng thái hệ thống hoạt động an toàn (Trở hạn dòng 220Ω - 330Ω). |
| **Buzzer** | **GPIO 23** | Digital Out | Còi báo động Active Buzzer (Kêu ngắt quãng 200ms khi có sự cố). |

---

## 2. NGUYÊN TẮC AN TOÀN ĐIỆN VÀ ĐẤU NỐI PHẦN CỨNG

> [!WARNING]
> - **Điện áp logic ESP32:** Các chân GPIO của ESP32 chỉ chịu được mức điện áp logic tối đa **3.3V**. Tuyệt đối không đưa trực tiếp tín hiệu 5V vào GPIO ESP32 để tránh nguy cơ cháy hỏng vi điều khiển!
> - **Mạch chia áp cho HC-SR04 Echo:** Module HC-SR04 hoạt động ở nguồn 5V nên chân Echo xuất mức 5V. Bắt buộc sử dụng cầu phân áp gồm điện trở $R_1 = 1\text{k}\Omega$ và $R_2 = 2\text{k}\Omega$ (hoặc $2.2\text{k}\Omega$) để hạ áp về $3.3\text{V}$:
>   $$\text{V}_{\text{out}} = 5\text{V} \times \frac{R_2}{R_1 + R_2} = 5 \times \frac{2}{1 + 2} \approx 3.33\text{V}$$
> - **Thời gian sấy cảm biến MQ-2:** Cảm biến MQ-2 có bộ gia nhiệt bên trong, cần cấp nguồn 5V ổn định và sấy nóng khoảng 15 - 30 phút trước khi đo để các phản ứng hóa học trên bề mặt cảm biến ổn định.
> - **Điểm nối đất chung (Common GND):** Tất cả các cảm biến, nguồn 5V ngoài và ESP32 phải được nối chung chân GND.
> - **Quy ước đơn vị ADC:** Giá trị đọc từ MQ-2 và module âm thanh là giá trị thô ADC 12-bit (0 - 4095), không tự ý quy đổi thành ppm hoặc dB khi chưa thực hiện hiệu chuẩn trong phòng thí nghiệm tiêu chuẩn.

---

## 3. CẤU TRÚC THƯ MỤC MÃ NGUỒN FIRMWARE

```text
firmware/
├── platformio.ini                 # Cấu hình biên dịch PlatformIO (ESP32 DevKit V1)
├── README.md                      # Hướng dẫn đấu dây và vận hành Firmware
├── include/
│   ├── config.h                   # Khai báo chân GPIO, chu kỳ đọc, ngưỡng cảnh báo
│   ├── credentials.h.example      # File mẫu cấu hình Wi-Fi và MQTT an toàn
│   └── credentials.h              # File cấu hình thật (được bảo vệ bởi .gitignore)
└── src/
    ├── main.cpp                   # Vòng lặp chính non-blocking và điều phối
    ├── sensors/
    │   ├── dht_sensor.h/.cpp      # Đọc nhiệt độ, độ ẩm DHT22
    │   ├── pir_sensor.h/.cpp      # Đọc chuyển động thân nhiệt hồng ngoại PIR
    │   ├── mq2_sensor.h/.cpp      # Đọc khí gas MQ-2 kèm bộ lọc trung bình động EMA
    │   ├── sound_sensor.h/.cpp    # Đọc âm thanh KY-037 lấy mẫu Peak-to-Peak 50ms
    │   ├── touch_sensor.h/.cpp    # Đọc cảm biến chạm chống phá hoại TTP223
    │   └── ultrasonic_sensor.h/.cpp # Đo khoảng cách HC-SR04 kèm bộ lọc Median 5 mẫu
    ├── actuators/
    │   └── alarm_actuator.h/.cpp  # Điều khiển còi/đèn non-blocking, chống rung 3s
    └── network/
        ├── wifi_module.h/.cpp     # Quản lý kết nối Wi-Fi tự phục hồi
        └── mqtt_module.h/.cpp     # Quản lý kết nối MQTT Mosquitto, LWT, đóng gói JSON
```

---

## 4. THIẾT LẬP MÔI TRƯỜNG & BIÊN DỊCH PLATFORMIO

### Bước 1: Cài đặt PlatformIO
- Cài đặt Visual Studio Code.
- Mở mục Extensions (`Ctrl+Shift+X`), tìm kiếm **PlatformIO IDE** và nhấn **Install**.

### Bước 2: Thiết lập cấu hình bảo mật
1. Mở thư mục `firmware/include/`.
2. Sao chép tệp `credentials.h.example` thành `credentials.h`:
   ```powershell
   copy firmware\include\credentials.h.example firmware\include\credentials.h
   ```
3. Mở tệp `credentials.h` và cập nhật thông tin mạng:
   ```cpp
   #define WIFI_SSID           "TEN_WIFI_2.4GHZ"
   #define WIFI_PASSWORD       "MAT_KHAU_WIFI"
   #define MQTT_BROKER_IP      "192.168.1.15"  // Địa chỉ IP của máy tính chạy Mosquitto Broker
   #define MQTT_BROKER_PORT    1883
   ```
*(Tệp `credentials.h` đã được cấu hình trong `.gitignore`, tuyệt đối an toàn và không bị commit lên kho mã nguồn).*

### Bước 3: Biên dịch và Nạp Firmware
1. Kết nối ESP32 DevKit V1 với máy tính qua cáp Micro-USB / Type-C.
2. Trên thanh trạng thái bên dưới của VS Code:
   - Nhấn biểu tượng **Check (PlatformIO: Build)** để biên dịch.
   - Nhấn biểu tượng **Arrow (PlatformIO: Upload)** để nạp code vào board.
3. Nhấn biểu tượng **Plug (PlatformIO: Serial Monitor)** hoặc mở cổng COM ở tốc độ **115200 baud**.

---

## 5. THUẬT TOÁN XỬ LÝ TÍN HIỆU & CHỐNG BÁO ĐỘNG GIẢ

1. **Bộ lọc trung bình động EMA cho khí gas (MQ-2):**
   $$S_t = \alpha \times X_t + (1 - \alpha) \times S_{t-1} \quad (\alpha = 0.2)$$
   Loại bỏ các gai nhiễu điện áp tức thời khi bật/tắt thiết bị điện lân cận.
2. **Bộ lọc trung vị Median 5 mẫu cho siêu âm (HC-SR04):**
   Lấy 5 mẫu liên tiếp, sắp xếp và lấy giá trị trung vị giúp loại bỏ hoàn toàn các lỗi dội âm hoặc nhiễu sóng bề mặt.
3. **Lấy mẫu Peak-to-Peak 50ms cho cảm biến âm thanh:**
   Tính độ chênh lệch cực đại giữa đỉnh sóng và đáy sóng ($V_{\text{max}} - V_{\text{min}}$) phản ánh chính xác cường độ âm thanh thay vì giá trị tức thời ngẫu nhiên.
4. **Cơ chế chống rung còi báo động (Anti-chattering):**
   Khi kích hoạt cảnh báo, còi và đèn duy trì tối thiểu **3000ms** để tránh hiện tượng còi kêu ngắt quãng gây khó chịu và giảm tuổi thọ relay/transistor.

---

## 6. AN TOÀN TRUYỀN THÔNG & ĐIỀU KHIỂN TỪ XA

- **Chống can thiệp GPIO tùy ý từ xa:** Hệ thống **từ chối hoàn toàn** các lệnh điều khiển chân GPIO trực tiếp qua MQTT để phòng ngừa tấn công chiếm quyền.
- **Lệnh điều khiển được phép:** ESP32 chỉ tiếp nhận 2 lệnh hệ thống được định nghĩa sẵn trên topic `aiot/security/command`:
  - `{"command": "TEST_ALARM"}`: Kích hoạt còi và đèn trong 1 chu kỳ để kiểm tra thiết bị.
  - `{"command": "RESET_ALARM"}`: Đặt lại trạng thái báo động, tắt còi/đèn cưỡng bức.
- **Thông điệp di chúc LWT (Last Will and Testament):** Tự động gửi bản tin `{"device_id":"ESP32_001","status":"offline"}` với cờ `retained=true` lên topic `aiot/security/status` ngay khi ESP32 bị mất nguồn hoặc mất mạng đột ngột.
