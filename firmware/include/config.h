#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// Tự động nạp thông tin Wi-Fi và Broker từ credentials.h nếu có
#if __has_include("credentials.h")
  #include "credentials.h"
#else
  #define WIFI_SSID           "YOUR_WIFI_SSID"
  #define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"
  #define MQTT_BROKER_IP      "192.168.1.100"      // Địa chỉ IP Raspberry Pi 5 / Máy chủ Backend
  #define MQTT_BROKER_PORT    1883
#endif

// ==============================================================================
// 1. ĐỊNH DANH THIẾT BỊ & THÔNG SỐ MQTT
// ==============================================================================
#define DEVICE_ID               "esp32_station_01"
#define MQTT_CLIENT_ID          "ESP32_SmartMonitor_Client"

// MQTT Topics chuẩn hóa thống nhất
#define MQTT_TOPIC_SENSORS      "aiot/security/sensors"
#define MQTT_TOPIC_STATUS       "aiot/security/status"
#define MQTT_TOPIC_ALERTS       "aiot/security/alerts"
#define MQTT_TOPIC_COMMAND      "aiot/security/command"

// ==============================================================================
// 2. BẢNG PHÂN BỔ CHÂN GPIO THỐNG NHẤT (ESP32 DevKit V1)
// ==============================================================================
// Cảm biến hồng ngoại PIR HC-SR501 (Ngắt phần cứng - Hardware Interrupt)
#define PIN_PIR                 27      // GPIO 27: Cảm biến hồng ngoại thân nhiệt (Hardware Interrupt)

// Cảm biến cửa từ Reed switch mở tức thì (Ngắt phần cứng - Hardware Interrupt)
#define PIN_DOOR                23      // GPIO 23: Cảm biến cửa từ (Hardware Interrupt - INPUT_PULLUP)

// Cảm biến khoảng cách siêu âm (HC-SR04)
#define PIN_TRIG                26      // GPIO 26: HC-SR04 TRIG (Digital Out 3.3V)
#define PIN_ECHO                25      // GPIO 25: HC-SR04 ECHO (Digital In - qua cầu phân áp 5V -> 3.3V)

// Hệ thống 3 đèn LED trạng thái thông minh (IoT Smart Monitor)
#define PIN_LED_RED             18      // GPIO 18: LED ĐỎ   (Dưới 10cm hoặc Cửa mở - Nguy hiểm)
#define PIN_LED_YELLOW          21      // GPIO 21: LED VÀNG (10cm - 30cm - Khoảng cách trung bình)
#define PIN_LED_GREEN           19      // GPIO 19: LED XANH (Trên 30cm & Cửa đóng - Vùng an toàn)

// ==============================================================================
// 3. NGƯỠNG KHOẢNG CÁCH SIÊU ÂM (ĐỒNG BỘ GIAO DIỆN IOT SMART MONITOR)
// ==============================================================================
#define DISTANCE_THRESHOLD_DANGER   10.0f   // Dưới 10 cm: LED ĐỎ BẬT (Cực gần / Nguy hiểm)
#define DISTANCE_THRESHOLD_SAFE     30.0f   // 10 - 30 cm: LED VÀNG BẬT (Khoảng cách trung bình)
                                            // Trên 30 cm: LED XANH BẬT (Khu vực an toàn)

// ==============================================================================
// 4. CHU KỲ LẤY MẪU & TRUYỀN DỮ LIỆU KHÔNG NGHẼN (Non-blocking millis)
// ==============================================================================
#define INTERVAL_ULTRASONIC_MS  100     // Đo khoảng cách siêu âm & cập nhật LED mỗi 100ms
#define INTERVAL_MQTT_PUB_MS    1000    // Bắn dữ liệu cảm biến lên Raspberry Pi 5 mỗi 1s
#define INTERVAL_SERIAL_LOG_MS  1000    // In bảng trạng thái Serial Monitor mỗi 1s
#define INTERVAL_NET_RETRY_MS   5000    // Tự động kết nối lại mạng mỗi 5s nếu mất Wi-Fi/MQTT

// ==============================================================================
// 5. CẤU TRÚC DỮ LIỆU ĐỒNG BỘ
// ==============================================================================
struct SensorData {
    char  device_id[24];
    float distance_cm;      // Khoảng cách đo được từ siêu âm (cm)
    bool  distance_valid;   // Tính hợp lệ tín hiệu siêu âm
    int   motion;           // Cảm biến hồng ngoại PIR (0: yên tĩnh, 1: có chuyển động)
    int   door_open;        // Cảm biến cửa mở tức thì (0: Cửa đóng, 1: Cửa MỞ)
    bool  led_red;          // Trạng thái LED Đỏ (true: ON, false: OFF)
    bool  led_yellow;       // Trạng thái LED Vàng (true: ON, false: OFF)
    bool  led_green;        // Trạng thái LED Xanh (true: ON, false: OFF)
    char  status_desc[64];  // Chuỗi mô tả trạng thái
};

#endif // CONFIG_H
