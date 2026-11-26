# --- CẤU HÌNH MQTT ---
MQTT_BROKER = "127.0.0.1"   # Chạy Mosquitto ngay trên Raspberry Pi 5
MQTT_PORT = 1883
MQTT_TOPIC = "sic/iot/sensors"

# --- NGƯỠNG CẢNH BÁO ---
TEMP_THRESHOLD = 38.0       # Nhiệt độ (°C) vượt ngưỡng -> cảnh báo
DIST_THRESHOLD_CM = 15.0    # Khoảng cách (cm) nhỏ hơn ngưỡng -> cảnh báo
SOUND_THRESHOLD = 2500      # Giá trị analog âm thanh (0-4095) vượt ngưỡng -> cảnh báo
COOLDOWN_SECONDS = 30       # Thời gian chờ tối thiểu giữa 2 lần gửi Telegram/Email

# --- CẤU HÌNH TELEGRAM BOT (NHÓM MỚI TẠO) ---
TELEGRAM_BOT_TOKEN = "8873383976:AAHfJY5lpsJblXwKNRYAR58mJ3UvOV4J4fo"
TELEGRAM_CHAT_ID = "-5243729310"  # Chat ID của nhóm (thường bắt đầu bằng -100...)

# --- CẤU HÌNH EMAIL (GMAIL APP PASSWORD - NHIỀU NGƯỜI NHẬN) ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465
SMTP_USER = "lebaolinh1007@gmail.com"
SMTP_PASS = "udtlwqwwaysdhxbv"
TO_EMAILS = [
    "lebaolinh1007@gmail.com",
    "thedestroy17995@gmail.com",
]