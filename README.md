Hệ thống Giám sát & Cảnh báo IoT Đa Kênh (ESP32 + Raspberry Pi 5)Hệ thống thu thập dữ liệu cảm biến môi trường và an ninh theo thời gian thực từ ESP32, truyền qua giao thức MQTT tới Raspberry Pi 5 để xử lý ngưỡng cảnh báo và gửi thông báo tự động tới Nhóm Telegram cùng Danh sách Email (Gmail).1. Kiến trúc hệ thống & Tính năng chínhNode Cảm biến (ESP32 DevKitC - ESP32-WROOM-32):Đọc định kỳ mỗi 2 giây các thông số: Nhiệt độ & Độ ẩm (DHT11), Khoảng cách vật cản (HC-SR04), Chuyển động hồng ngoại (HC-SR501), Cường độ âm thanh (Sound Sensor).Đóng gói dữ liệu dưới dạng chuỗi JSON và gửi lên MQTT Broker qua topic sic/iot/sensors.Gateway Xử lý & Cảnh báo (Raspberry Pi 5):Chạy Mosquitto MQTT Broker nội bộ và dịch vụ Python (alert_gateway.py) lắng nghe dữ liệu từ ESP32.Tự động đối chiếu với các ngưỡng an toàn trong config.py kèm cơ chế chống spam (COOLDOWN_SECONDS).Cảnh báo đa kênh:Telegram Bot: Gửi thông báo chi tiết định dạng HTML trực tiếp vào nhóm Telegram chỉ định.Gmail SMTP (SSL): Gửi email cảnh báo đồng loạt tới nhiều người nhận (TO_EMAILS).2. Cấu trúc thư mục dự ániot-alert-system/
├── esp32_node/
│   ├── main/
│   │   └── main.ino             # Firmware đọc cảm biến và gửi MQTT cho ESP32
│   └── platformio.ini           # Cấu hình board và thư viện PlatformIO
└── rpi5_gateway/
    ├── config.py                # Tập trung cấu hình MQTT, ngưỡng, Token Telegram & Gmail
    ├── alert_gateway.py         # Dịch vụ nhận MQTT và phát cảnh báo Telegram/Email
    └── test_alert.py            # Script kiểm thử nhanh kết nối Telegram & Email
3. Sơ đồ đấu nối phần cứng (ESP32 38 chân)Cảm biếnChân trên cảm biếnChân GPIO ESP32Ghi chú kỹ thuậtDHT11 (Nhiệt độ/Độ ẩm)DATAGPIO 4 (G4)Nguồn 3.3V / GNDHC-SR04 (Siêu âm)TRIGGPIO 5 (G5)Chân phát xungHC-SR04 (Siêu âm)ECHOGPIO 18 (G18)Lưu ý: Dùng cầu phân áp 5V -> 3.3V nếu cấp nguồn 5VHC-SR501 (Chuyển động PIR)OUTGPIO 27 (G27)Trả về 1 khi có chuyển độngSound Sensor (Âm thanh)A0 (Analog)GPIO 34 (G34)Đọc giá trị ADC 0 - 40954. Hướng dẫn cài đặt & Cấu hìnhBước 1: Cài đặt cho ESP32 (PlatformIO)Mở thư mục esp32_node bằng VS Code có cài extension PlatformIO IDE.Cấu hình tệp platformio.ini cho mạch ESP32-WROOM-32:[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps =
    knolleary/PubSubClient
    adafruit/DHT sensor library
    adafruit/Adafruit Unified Sensor
Mở tệp main.ino, cập nhật thông tin Wi-Fi và địa chỉ IP LAN của Raspberry Pi 5:const char* WIFI_SSID     = "TEN_WIFI_CUA_BAN";
const char* WIFI_PASSWORD = "MAT_KHAU_WIFI";
const char* MQTT_BROKER   = "192.168.1.100"; // IP của Raspberry Pi 5
Kết nối ESP32 qua cáp USB Type-C và bấm Upload (→) trên thanh công cụ PlatformIO.Bước 2: Cài đặt môi trường trên Raspberry Pi 5Cài đặt Mosquitto MQTT Broker và các thư viện Python cần thiết:sudo apt update
sudo apt install -y mosquitto mosquitto-clients python3-pip
sudo systemctl enable --now mosquitto
pip3 install paho-mqtt requests
Mở cổng kết nối mạng LAN cho Mosquitto (để ESP32 có thể gửi dữ liệu tới):Chỉnh sửa cấu hình /etc/mosquitto/mosquitto.conf (hoặc tạo tệp trong /etc/mosquitto/conf.d/default.conf) và thêm:listener 1883
allow_anonymous true
Khởi động lại dịch vụ:sudo systemctl restart mosquitto
Bước 3: Lấy thông tin xác thực Telegram & GmailCấu hình Telegram Bot (Gửi vào nhóm):Chat với @BotFather dùng lệnh /newbot để lấy TELEGRAM_BOT_TOKEN.Thêm Bot vào nhóm Telegram của bạn (nên cấp quyền Admin cho Bot trong nhóm để đảm bảo nhận/gửi tin ổn định).Nhắn một tin bất kỳ vào nhóm, sau đó mở trình duyệt truy cập https://api.telegram.org/bot<TOKEN_CUA_BAN>/getUpdates để lấy TELEGRAM_CHAT_ID của nhóm (dạng số âm -100xxxxxxxxxx).Cấu hình Gmail (App Password):Truy cập Quản lý Tài khoản Google → Bảo mật (Security) → bật Xác minh 2 bước (2-Step Verification).Tìm mục Mật khẩu ứng dụng (App passwords), tạo mật khẩu mới (16 ký tự) và điền vào SMTP_PASS.Bước 4: Cập nhật tệp config.pyMở rpi5_gateway/config.py và điền đầy đủ thông tin của bạn:# --- CẤU HÌNH MQTT ---
MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883
MQTT_TOPIC = "sic/iot/sensors"

# --- NGƯỠNG CẢNH BÁO ---
TEMP_THRESHOLD = 38.0       # Cảnh báo khi nhiệt độ >= 38.0°C
DIST_THRESHOLD_CM = 15.0    # Cảnh báo khi vật thể lại gần <= 15.0 cm
SOUND_THRESHOLD = 2500      # Cảnh báo khi độ ồn >= 2500 (thang 0-4095)
COOLDOWN_SECONDS = 30       # Khoảng nghỉ tối thiểu giữa 2 lần gửi cảnh báo (giây)

# --- CẤU HÌNH TELEGRAM BOT ---
TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN"
TELEGRAM_CHAT_ID = "-1001234567890"

# --- CẤU HÌNH EMAIL ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465
SMTP_USER = "email_gui_canh_bao@gmail.com"
SMTP_PASS = "abcdefghijklmnop"
TO_EMAILS = [
    "nguoi_nhan_1@gmail.com",
    "nguoi_nhan_2@gmail.com",
]
5. Hướng dẫn vận hành & Kiểm thử1. Kiểm thử nhanh kênh Telegram và EmailChạy đoạn mã kiểm tra độc lập trước khi chạy toàn hệ thống:cd rpi5_gateway
python3 -c "import alert_gateway; alert_gateway.send_telegram('Test hệ thống IoT'); alert_gateway.send_email('Test IoT', 'Kết nối thành công!')"
2. Chạy Gateway cảnh báo chính thứcTại thư mục rpi5_gateway trên Raspberry Pi 5, khởi chạy dịch vụ:python3 alert_gateway.py
Màn hình terminal sẽ hiển thị trạng thái kết nối MQTT và liên tục in dữ liệu cảm biến nhận được từ ESP32:[MQTT] Đã kết nối (code=0). Đang lắng nghe sic/iot/sensors...
[DATA] {'temp': 29.5, 'hum': 68.0, 'dist': 45.2, 'pir': 0, 'touch': 0, 'sound': 410}
3. Giả lập bản tin vượt ngưỡng (không cần tác động cảm biến)Mở một cửa sổ terminal khác trên Raspberry Pi 5 và bắn thử bản tin giả lập vượt ngưỡng nhiệt độ và chuyển động:mosquitto_pub -h 127.0.0.1 -t "sic/iot/sensors" -m '{"temp":42.5,"hum":65.0,"dist":10.0,"pir":1,"sound":3000}'
Ngay lập tức, cảnh báo sẽ được gửi tới nhóm Telegram và toàn bộ địa chỉ trong TO_EMAILS.