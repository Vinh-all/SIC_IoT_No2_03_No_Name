# TÀI LIỆU HƯỚNG DẪN FIRMWARE - ESP32 & RASPBERRY PI 5
## DỰ ÁN: IOT SMART MONITOR & SECURITY (NGẮT PHẦN CỨNG TỨC THÌ)

---

## 1. TỔNG QUAN HỆ THỐNG PHẦN CỨNG

Hệ thống được lập trình tối ưu hóa tiêu thụ tài nguyên với **ngắt phần cứng (Hardware Interrupt)** để bắt các sự kiện an ninh khẩn cấp tức thì (cấp độ microsecond):

* **2 Thiết bị trung tâm:**
  1. **ESP32 DevKit V1:** Xử lý ngắt phần cứng tại chỗ, đọc siêu âm, điều khiển 3 LED và truyền tin MQTT.
  2. **Raspberry Pi 5:** Máy chủ trung tâm (chạy Mosquitto Broker, Backend Node.js, CSDL PostgreSQL và AI).

* **6 Phụ kiện an ninh kết nối với ESP32:**
  1. **Cảm biến cửa từ mở tức thì (Reed Switch):** Kích hoạt **Ngắt phần cứng (GPIO 23)** khi cửa hé mở.
  2. **Cảm biến hồng ngoại (PIR HC-SR501):** Kích hoạt **Ngắt phần cứng (GPIO 27)** khi phát hiện thân nhiệt chuyển động.
  3. **Cảm biến siêu âm (HC-SR04):** Đo khoảng cách vật thể tiếp cận ($2\text{ cm} \to 400\text{ cm}$).
  4. **LED Đỏ (GPIO 18):** Báo nguy hiểm khi **Cửa bị mở** HOẶC vật thể tiếp cận **$< 10\text{ cm}$**.
  5. **LED Vàng (GPIO 21):** Cảnh báo khi vật thể ở cự ly trung bình **$10\text{ cm} – 30\text{ cm}$** (Cửa đóng).
  6. **LED Xanh (GPIO 19):** Báo an toàn khi không có vật cản hoặc ở xa **$> 30\text{ cm}$** (Cửa đóng).

---

## 2. BẢNG PHÂN BỔ CHÂN GPIO ESP32

| STT | Tên phụ kiện | Chân ESP32 | Cơ chế xử lý | Vai trò / Lưu ý đấu nối kỹ thuật |
|:---:|:---|:---:|:---:|:---|
| **1** | **Cảm biến cửa từ (Reed Switch)** | **GPIO 23** | **Ngắt phần cứng (CHANGE)** | Chân bật điện trở kéo `INPUT_PULLUP`. Cửa đóng nối GND (LOW), Cửa mở hở mạch (HIGH). |
| **2** | **Cảm biến hồng ngoại PIR** | **GPIO 27** | **Ngắt phần cứng (CHANGE)** | Bắt sườn xung thân nhiệt chuyển động (`1`: có người, `0`: yên tĩnh). |
| **3** | **Siêu âm HC-SR04 Trig** | **GPIO 26** | Digital Out (3.3V) | Phát xung kích hoạt siêu âm $10\mu\text{s}$. |
| **4** | **Siêu âm HC-SR04 Echo** | **GPIO 25** | Digital In (3.3V) | Bắt xung phản hồi (**Bắt buộc qua cầu phân áp $5\text{V} \to 3.3\text{V}$**). |
| **5** | **LED Đỏ (Danger / Door Open)** | **GPIO 18** | Digital Out | Bật khi **Cửa mở** hoặc khoảng cách **$< 10\text{ cm}$** (Trở $220\Omega$). |
| **6** | **LED Vàng (Warning)** | **GPIO 21** | Digital Out | Bật khi khoảng cách **$10\text{ cm} – 30\text{ cm}$** (Trở $220\Omega$). |
| **7** | **LED Xanh (Safe)** | **GPIO 19** | Digital Out | Bật khi khoảng cách **$> 30\text{ cm}$** và Cửa đóng (Trở $220\Omega$). |

---

## 3. CƠ CHẾ PHẢN HỒI NGẮT TỨC THÌ (MICROSECOND RESPONSE)

1. **Khi cửa bị hé mở:**
   * Ngắt phần cứng trên GPIO 23 kích hoạt tức thì thông qua trình phục vụ ngắt `IRAM_ATTR isrHandler()`.
   * **LED ĐỎ** trên mạch lập tức **BẬT SÁNG**.
   * ESP32 lập tức phát bản tin khẩn cấp qua MQTT lên Raspberry Pi 5 (`aiot/security/alerts`) **ngay trong vòng lặp tiếp theo mà không cần chờ hết chu kỳ 1 giây**.
2. **Khi có chuyển động hồng ngoại:**
   * Ngắt GPIO 27 ghi nhận chuyển động, kết hợp đo khoảng cách siêu âm để đánh giá nguy cơ xâm nhập cự ly gần.

---

## 4. HƯỚNG DẪN NẠP VÀO ESP32

1. Cắm cáp USB nối ESP32 với máy tính.
2. Trong VS Code / Antigravity IDE, nhấn nút **Upload (`→`)** ở thanh PlatformIO dưới đáy màn hình.
3. Nhấn nút **Serial Monitor (`🔌`)** tốc độ 115200 baud để theo dõi log ngắt thời gian thực.
