#include <Arduino.h>
#include <string.h>
#include "config.h"
#include "sensors/pir_sensor.h"
#include "sensors/door_sensor.h"
#include "sensors/ultrasonic_sensor.h"
#include "actuators/alarm_actuator.h"
#include "network/wifi_module.h"
#include "network/mqtt_module.h"

// ==============================================================================
// KHỞI TẠO CÁC MODULE THIẾT BỊ PHẦN CỨNG (HỖ TRỢ NGẮT PHẦN CỨNG TỨC THÌ)
// ==============================================================================
PIRSensorModule         pirSensor;          // Cảm biến hồng ngoại ngắt phần cứng (GPIO 27)
DoorSensorModule        doorSensor;         // Cảm biến cửa từ mở tức thì ngắt phần cứng (GPIO 23)
UltrasonicSensorModule  ultrasonicSensor;   // Cảm biến khoảng cách siêu âm (Trig 26, Echo 25)
LEDActuator             ledActuator;        // 3 LED: Đỏ (GPIO 18), Vàng (GPIO 21), Xanh (GPIO 19)
WiFiModule              wifiModule;         // Quản lý Wi-Fi tự phục hồi ngầm
MQTTModule              mqttModule;         // Kết nối MQTT Broker trên Raspberry Pi 5

// Dữ liệu cảm biến toàn cục
SensorData currentData;

// Bộ đếm thời gian non-blocking
unsigned long lastSensorTime   = 0;
unsigned long lastMqttPubTime  = 0;
unsigned long lastLogTime      = 0;
unsigned long totalMqttSent    = 0;

// Cờ phát hiện trạng thái nguy hiểm cự ly gần để tránh spam
bool lastDangerState = false;

// ==============================================================================
// CALLBACK NHẬN LỆNH TỪ RASPBERRY PI 5 QUA MQTT
// ==============================================================================
void onCommandReceived(char* topic, byte* payload, unsigned int length) {
    if (length == 0 || length > 256) return;
    char cmdBuf[257];
    memcpy(cmdBuf, payload, length);
    cmdBuf[length] = '\0';
    Serial.printf("\n[MQTT COMMAND] Nhan lenh tu Raspberry Pi 5 [%s]: %s\n", topic, cmdBuf);

    if (strstr(cmdBuf, "TEST_LED") != NULL) {
        Serial.println(F("[COMMAND] Kiem tra he thong 3 den LED..."));
        ledActuator.testSelfCheck();
    }
}

// ==============================================================================
// BẢNG THEO DÕI SERIAL MONITOR THEO THỜI GIAN THỰC
// ==============================================================================
void printSerialDashboard() {
    Serial.println(F("\n=================================================================="));
    Serial.printf(  "    IOT SMART MONITOR - ESP32 [INTERRUPT SECURITY STATION]        \n");
    Serial.println(F("=================================================================="));

    // 1. Cảm biến cửa từ (Ngắt phần cứng - Hardware Interrupt)
    Serial.printf(" [CẢM BIẾN CỬA (GPIO 23)]  %s (Trang thai: %s)\n",
                  (currentData.door_open == 1) ? "🚨 [CỬA ĐANG MỞ! NGUY HIỂM]" : "🔒 [CỬA ĐÓNG - AN TOÀN]",
                  (currentData.door_open == 1) ? "OPEN" : "CLOSED");

    // 2. Cảm biến hồng ngoại PIR (Ngắt phần cứng - Hardware Interrupt)
    Serial.printf(" [HỒNG NGOẠI PIR (GPIO 27)] %s\n",
                  (currentData.motion == 1) ? ">>> PHAT HIEN CHUYEN DONG <<<" : "Yen tinh");

    // 3. Cảm biến siêu âm (HC-SR04)
    if (currentData.distance_valid) {
        Serial.printf(" [SIÊU ÂM (Trig 26/Echo 25)] Khoang cach: %5.1f cm -> %s\n",
                      currentData.distance_cm, currentData.status_desc);
    } else {
        Serial.println(F(" [SIÊU ÂM (Trig 26/Echo 25)] Khoang cach: Ngoai tam do / Cho tin hieu"));
    }

    // 4. Trạng thái 3 LED màu
    Serial.println(F("------------------------------------------------------------------"));
    Serial.printf(" [LED STATUS]               %s\n", ledActuator.getStatusDescription());

    // 5. Kết nối Wi-Fi & Raspberry Pi 5
    Serial.println(F("------------------------------------------------------------------"));
    Serial.printf(" [WI-FI STA]                %s | IP: %s (RSSI: %d dBm)\n",
                  wifiModule.isConnected() ? "CONNECTED [OK]" : "DISCONNECTED",
                  wifiModule.getIP().c_str(), wifiModule.getRSSI());
    Serial.printf(" [RASPBERRY PI 5 MQTT]      %s | Host: %s:%d | Sent: %lu pkts\n",
                  mqttModule.isConnected() ? "ONLINE [OK]" : "CONNECTING...",
                  MQTT_BROKER_IP, MQTT_BROKER_PORT, totalMqttSent);
    Serial.println(F("=================================================================="));
}

// ==============================================================================
// SETUP
// ==============================================================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    // Gán Device ID
    strncpy(currentData.device_id, DEVICE_ID, sizeof(currentData.device_id) - 1);
    currentData.device_id[sizeof(currentData.device_id) - 1] = '\0';

    Serial.println();
    Serial.println(F("=================================================================="));
    Serial.println(F("  FIRMWARE IOT SECURITY (HARDWARE INTERRUPTS: PIR & CỬA MỞ)       "));
    Serial.println(F("  TRUYỀN THÔNG TỨC THÌ: ESP32 <=======> RASPBERRY PI 5            "));
    Serial.println(F("=================================================================="));

    // 1. Khởi tạo 3 LED
    ledActuator.begin();
    ledActuator.testSelfCheck();
    Serial.println(F("[+] Khoi tao 3 LED: Do (GPIO 18), Vang (GPIO 21), Xanh (GPIO 19)..."));

    // 2. Khởi tạo ngắt phần cứng cảm biến cửa mở tức thì
    doorSensor.begin();
    currentData.door_open = doorSensor.isOpen() ? 1 : 0;
    Serial.println(F("[+] Da kich hoat NGAT PHAN CUNG cam bien Cua mo (GPIO 23 INPUT_PULLUP)..."));

    // 3. Khởi tạo ngắt phần cứng cảm biến hồng ngoại PIR
    pirSensor.begin();
    currentData.motion = pirSensor.read();
    Serial.println(F("[+] Da kich hoat NGAT PHAN CUNG cam bien Hong ngoai PIR (GPIO 27)..."));

    // 4. Khởi tạo cảm biến siêu âm HC-SR04
    ultrasonicSensor.begin();
    Serial.println(F("[+] Khoi tao cam bien sieu am HC-SR04 (Trig: 26, Echo: 25)..."));

    // 5. Khởi tạo kết nối mạng Wi-Fi và MQTT Broker
    Serial.println(F("[+] Khoi tao ket noi Wi-Fi non-blocking..."));
    wifiModule.begin();

    Serial.println(F("[+] Khoi tao MQTT Module ket noi Raspberry Pi 5..."));
    mqttModule.begin();
    mqttModule.setCallback(onCommandReceived);

    Serial.println(F("[SUCCESS] He thong san sang! Dang giam sat an ninh tuc thi...\n"));
}

// ==============================================================================
// LOOP (VÒNG LẶP ĐA NHIỆM KẾT HỢP XỬ LÝ NGẮT TỨC THÌ)
// ==============================================================================
void loop() {
    unsigned long currentMillis = millis();

    // 1. Duy trì kết nối mạng Wi-Fi và MQTT ngầm
    wifiModule.update();
    mqttModule.update();

    // 2. PHẢN HỒI NGẮT PHẦN CỨNG MỞ CỬA TỨC THÌ (MICROSECOND RESPONSE)
    if (doorSensor.hasDoorTriggered()) {
        currentData.door_open = doorSensor.isOpen() ? 1 : 0;
        
        // Cập nhật trạng thái đèn LED ngay lập tức
        ledActuator.update(currentData.distance_cm, currentData.distance_valid, currentData.motion, currentData.door_open, currentData);

        if (currentData.door_open == 1) {
            Serial.println(F("\n🚨 >>> [HARDWARE INTERRUPT] CANH BAO: CUA DA BI MO TUC THI! <<<"));
            // Bắn bản tin cảnh báo khẩn cấp lên Raspberry Pi 5 ngay lập tức
            mqttModule.publishAlert("CANH BAO KHAN CAP: PHAT HIEN CUA MO TRAI PHEP", currentData);
            mqttModule.publishSensorData(currentData);
        } else {
            Serial.println(F("\n🔒 >>> [HARDWARE INTERRUPT] Cua da duoc dong lai an toan. <<<"));
            mqttModule.publishSensorData(currentData);
        }
    }

    // 3. PHẢN HỒI NGẮT HỒNG NGOẠI PIR (PHÁT HIỆN THÂN NHIỆT NGƯỜI)
    if (pirSensor.hasNewMotion()) {
        currentData.motion = pirSensor.read();
        pirSensor.clearMotionFlag();

        if (currentData.motion == 1) {
            Serial.println(F("\n🚶 >>> [HARDWARE INTERRUPT] Phat hien chuyen dong hong ngoai! <<<"));
            // Nếu có chuyển động mà khoảng cách siêu âm đang gần -> Cảnh báo tiếp cận
            if (currentData.distance_valid && currentData.distance_cm < DISTANCE_THRESHOLD_SAFE) {
                mqttModule.publishAlert("PHAT HIEN CHUYEN DONG HONG NGOAI O CU LY GAN", currentData);
            }
        }
    }

    // 4. CHU KỲ ĐO SIÊU ÂM & ĐIỀU KHIỂN 3 LED THEO KHOẢNG CÁCH (Mỗi 100ms)
    if (currentMillis - lastSensorTime >= INTERVAL_ULTRASONIC_MS) {
        lastSensorTime = currentMillis;

        // Cập nhật khoảng cách siêu âm (lọc Median 5 mẫu)
        float dist;
        currentData.distance_valid = ultrasonicSensor.readDistance(dist);
        currentData.distance_cm = dist;

        // Cập nhật trạng thái 3 LED tự động
        ledActuator.update(currentData.distance_cm, currentData.distance_valid, currentData.motion, currentData.door_open, currentData);

        // Bắn cảnh báo nếu có đối tượng lọt vào phạm vi nguy hiểm (< 10cm)
        bool isDanger = (currentData.distance_valid && currentData.distance_cm < DISTANCE_THRESHOLD_DANGER);
        if (isDanger && !lastDangerState) {
            lastDangerState = true;
            mqttModule.publishAlert("VAT THE TIEP CAN CU LY NGUY HIEM (< 10cm)", currentData);
        } else if (!isDanger) {
            lastDangerState = false;
        }
    }

    // 5. GỬI ĐỊNH KỲ DỮ LIỆU LÊN RASPBERRY PI 5 QUA MQTT (Mỗi 1s)
    if (currentMillis - lastMqttPubTime >= INTERVAL_MQTT_PUB_MS) {
        lastMqttPubTime = currentMillis;
        if (mqttModule.publishSensorData(currentData)) {
            totalMqttSent++;
        }
    }

    // 6. IN THÔNG TIN BẢNG GIÁM SÁT RA SERIAL MONITOR (Mỗi 1s)
    if (currentMillis - lastLogTime >= INTERVAL_SERIAL_LOG_MS) {
        lastLogTime = currentMillis;
        printSerialDashboard();
    }
}
