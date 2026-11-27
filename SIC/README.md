# ESP32 – Cảm biến siêu âm + PIR + Nút bấm + 3 LED + MQTT (Pi 5)

## Sơ đồ chân

| Linh kiện | Chân | ESP32 |
|---|---|---|
| HY-SRF05 | TRIG | GPIO 5 |
| HY-SRF05 | ECHO | GPIO 18 (nên qua cầu chia áp 1k/2k nếu cấp 5V) |
| PIR HC-SR501 | OUT | GPIO 35 |
| Nút bấm | 1 chân | GPIO 32 (chân kia xuống GND) |
| LED xanh | + | GPIO 27 |
| LED vàng | + | GPIO 26 |
| LED đỏ | + | GPIO 25 |

## Các file

| Thư mục | Dùng để |
|---|---|
| `01_test_sieu_am` | Test cảm biến siêu âm theo đợt 20 lần, tự kết luận còn tốt hay không |
| `02_do_lien_tuc` | Đo siêu âm liên tục, không dừng |
| `03_sieu_am_3_led` | Đo liên tục + đèn: gần = đỏ, trung bình = vàng, xa = xanh |
| `04_pir_nut_bam_led` | Thêm PIR (chỉ đo khi có người) + nút bấm đổi chế độ, **không WiFi** |
| `05_mqtt_pi5` | Bản đầy đủ: như 04 + gửi dữ liệu lên Raspberry Pi 5 qua MQTT |
| `06_test_pir` | Chẩn đoán PIR khi nó báo có người liên tục |
| `pi5/cai_mqtt_pi5.sh` | Script cài MQTT broker (Mosquitto) trên Pi 5 |

Mở file `.ino` trong Arduino IDE (mỗi sketch phải nằm trong thư mục cùng tên – đã sắp sẵn).

## Chế độ (nút bấm GPIO 32)

AUTO → LUÔN BẬT → TẮT → AUTO … (3 đèn nháy 1/2/3 lần để báo)

- **AUTO**: chỉ đo khi PIR thấy người; không còn người 10 giây → tắt đèn
- **LUÔN BẬT**: đo liên tục, bỏ qua PIR
- **TẮT**: tắt hết

## MQTT (sketch 05)

1. Cài thư viện **PubSubClient** (Nick O'Leary) trong Library Manager.
2. Sửa `MQTT_PASS` trong code thành mật khẩu thật.
3. Trên Pi: `bash cai_mqtt_pi5.sh`, nhập cùng mật khẩu đó.

| Topic | Nội dung |
|---|---|
| `esp01/status` | `online` / `offline` |
| `esp01/state` | JSON: mode, pir, distance, led, rssi, uptime |
| `esp01/mode` | `auto` / `on` / `off` |
| `esp01/cmd/mode` | Pi gửi lệnh: `auto` / `on` / `off` / `next` |

Lỗi thường gặp: `rc=5` sai user/mật khẩu MQTT · `rc=-2` không tới được IP/cổng của Pi.

## PIR báo có người liên tục?

1. Vặn biến trở **Tx** ngược chiều kim đồng hồ hết cỡ (~3 giây), Sx để giữa, jumper ở **H**.
2. Đặt PIR cách ESP32 20–30 cm (nhiễu WiFi), thêm tụ 100µF + 0.1µF giữa VCC–GND của PIR.
3. Thêm điện trở 10kΩ từ GPIO 35 xuống GND (GPIO 35 không có pull-up/pull-down nội).
4. Chờ 30–60 giây sau khi cấp điện; PIR phải cấp 5V.
5. Dùng sketch `06_test_pir` để xem PIR thật sự đang làm gì.
