#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// Tự động nạp thông tin Wi-Fi và Broker từ file bí mật nếu có, nếu chưa thì dùng cấu hình mặc định
#if __has_include("credentials.h")
  #include "credentials.h"
#else
  #define WIFI_SSID           "YOUR_WIFI_SSID"
  #define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"
  #define MQTT_BROKER_IP      "192.168.1.100"
  #define MQTT_BROKER_PORT    1883
#endif

// ==============================================================================
// 1. ĐỊNH DANH THIẾT BỊ & THÔNG SỐ MQTT (HỢP ĐỒNG GIAI ĐOẠN 2)
// ==============================================================================
#define DEVICE_ID               "ESP32_001"
#define MQTT_CLIENT_ID          "ESP32_001_Client"

// MQTT Topics chuẩn hóa thống nhất
#define MQTT_TOPIC_SENSORS      "aiot/security/sensors"
#define MQTT_TOPIC_STATUS       "aiot/security/status"
#define MQTT_TOPIC_ALERTS       "aiot/security/alerts"
#define MQTT_TOPIC_COMMAND      "aiot/security/command"

// ==============================================================================
// 2. BẢNG PHÂN BỔ GPIO THỐNG NHẤT (ESP32 DevKit V1)
// ==============================================================================
// Cảm biến môi trường & khí gas
#define PIN_DHT22               4       // GPIO 4: DHT22 DATA (Trở kéo pull-up 10k lên 3.3V)
#define DHT_TYPE                DHT22
#define PIN_MQ2_ANALOG          34      // GPIO 34: MQ-2 AO (ADC1_CH6 - Input Only)

// Cảm biến âm thanh & xâm nhập
#define PIN_SOUND_ANALOG        35      // GPIO 35: KY-037/KY-038 AO (ADC1_CH7 - Input Only)
#define PIN_PIR                 27      // GPIO 27: PIR HC-SR501 OUT (Digital In 3.3V)
#define PIN_TOUCH               32      // GPIO 32: TTP223 OUT (Digital In 3.3V)

// Cảm biến khoảng cách siêu âm HC-SR04
#define PIN_TRIG                26      // GPIO 26: HC-SR04 TRIG (Digital Out 3.3V)
#define PIN_ECHO                25      // GPIO 25: HC-SR04 ECHO (Digital In - QUA CẦU PHÂN ÁP 5V -> 3.3V)

// Thiết bị cảnh báo (Actuators)
#define PIN_LED_RED             18      // GPIO 18: LED Đỏ (Cảnh báo nguy hiểm / Xâm nhập)
#define PIN_LED_GREEN           19      // GPIO 19: LED Xanh (Hệ thống an toàn / Hoạt động tốt)
#define PIN_BUZZER              23      // GPIO 23: Buzzer (Active Buzzer cảnh báo)

// ==============================================================================
// 3. CHU KỲ LẤY MẪU & TRUYỀN DỮ LIỆU KHÔNG NGHẼN (Non-blocking millis)
// ==============================================================================
#define INTERVAL_DHT_MS         2000    // DHT22 yêu cầu tối thiểu 2s giữa các lần đọc
#define INTERVAL_PIR_MS         100     // Quét chuyển động PIR mỗi 100ms
#define INTERVAL_MQ2_MS         200     // Đọc ADC khí gas & lọc EMA mỗi 200ms
#define INTERVAL_SOUND_MS       150     // Lấy mẫu âm thanh Peak-to-Peak mỗi 150ms
#define INTERVAL_ULTRASONIC_MS  250     // Đo khoảng cách siêu âm & lọc Median mỗi 250ms
#define INTERVAL_TOUCH_MS       50      // Quét cảm biến chạm mỗi 50ms
#define INTERVAL_SERIAL_LOG_MS  1000    // Cập nhật bảng Serial Monitor mỗi 1s

// Chu kỳ truyền MQTT và thử kết nối lại
#define INTERVAL_MQTT_PUB_MS    3000    // Chu kỳ gửi dữ liệu cảm biến lên MQTT (3 giây/lần)
#define INTERVAL_NET_RETRY_MS   5000    // Chu kỳ thử kết nối lại Wi-Fi / MQTT khi mất mạng (5 giây)

// ==============================================================================
// 4. NGƯỠNG CẢNH BÁO BAN ĐẦU & THỜI GIAN GIỮ CẢNH BÁO (Anti-chattering)
// ==============================================================================
#define THRESHOLD_TEMP_MAX      40.0f   // Nhiệt độ cao bất thường (°C)
#define THRESHOLD_TEMP_MIN      10.0f   // Nhiệt độ quá thấp (°C)
#define THRESHOLD_HUMI_MAX      85.0f   // Độ ẩm quá cao (%)
#define THRESHOLD_GAS_ADC       1800    // Ngưỡng ADC thô 12-bit MQ-2 (0 - 4095)
#define THRESHOLD_SOUND_ADC     1500    // Ngưỡng biên độ Peak-to-Peak âm thanh (0 - 4095)
#define THRESHOLD_DISTANCE_CM   40.0f   // Ngưỡng vật cản / tiếp cận quá gần (cm)
#define ALARM_HOLD_TIME_MS      3000    // Giữ cảnh báo tối thiểu 3 giây chống rung giật (anti-chattering)

// ==============================================================================
// 5. CẤU TRÚC DỮ LIỆU ĐỒNG BỘ VỚI HỢP ĐỒNG HỆ THỐNG
// ==============================================================================
struct SensorData {
    char  device_id[16];
    float temperature;
    float humidity;
    bool  dht_valid;

    int   gas_raw;          // Giá trị ADC thô chưa lọc
    int   gas_adc;          // Giá trị ADC sau khi lọc EMA

    int   sound_raw;        // Giá trị mẫu tức thời
    int   sound_adc;        // Giá trị đặc trưng biên độ Peak-to-Peak

    int   motion;           // 0 hoặc 1
    int   touch;            // 0 hoặc 1

    float distance_cm;      // Khoảng cách (cm)
    bool  distance_valid;   // Tính hợp lệ của khoảng cách
};

struct AlarmState {
    bool is_triggered;      // Trạng thái tổng thể kích hoạt báo động
    bool temp_alert;
    bool humi_alert;
    bool gas_alert;
    bool sound_alert;
    bool motion_alert;
    bool touch_alert;
    bool distance_alert;
    unsigned long triggered_time; // Thời điểm kích hoạt gần nhất để chống rung
};

#endif // CONFIG_H
