#include <Arduino.h>
#include <string.h>
#include "config.h"
#include "sensors/dht_sensor.h"
#include "sensors/pir_sensor.h"
#include "sensors/mq2_sensor.h"
#include "sensors/sound_sensor.h"
#include "sensors/touch_sensor.h"
#include "sensors/ultrasonic_sensor.h"
#include "actuators/alarm_actuator.h"
#include "network/wifi_module.h"
#include "network/mqtt_module.h"

// ==============================================================================
// KHỞI TẠO CÁC MODULE PHẦN CỨNG & MẠNG TRUYỀN THÔNG
// ==============================================================================
DHTSensorModule         dhtSensor;
PIRSensorModule         pirSensor;
MQ2SensorModule         mq2Sensor;
SoundSensorModule       soundSensor;
TouchSensorModule       touchSensor;
UltrasonicSensorModule  ultrasonicSensor;
AlarmActuator           alarmActuator;
WiFiModule              wifiModule;
MQTTModule              mqttModule;

// Cấu trúc dữ liệu và cảnh báo toàn cục
SensorData currentData;
AlarmState currentAlarm;

// Trạng thái phục vụ phát hiện chuyển giao cảnh báo (để gửi bản tin alerts)
bool lastTriggerState = false;

// Bộ đếm thời gian non-blocking cho từng tác vụ
unsigned long lastDhtTime        = 0;
unsigned long lastPirTime        = 0;
unsigned long lastMq2Time        = 0;
unsigned long lastSoundTime      = 0;
unsigned long lastUltrasonicTime = 0;
unsigned long lastTouchTime      = 0;
unsigned long lastLogTime        = 0;
unsigned long lastMqttPubTime    = 0;

// Thống kê số lượng gói tin gửi thành công
unsigned long totalMqttSent      = 0;

// ==============================================================================
// CALLBACK NHẬN LỆNH TỪ TOPIC COMMAND (BẢO VỆ AN TOÀN - CHỐNG ĐIỀU KHIỂN GPIO TÙY Ý)
// ==============================================================================
void onCommandReceived(char* topic, byte* payload, unsigned int length) {
    if (length == 0 || length > 256) {
        Serial.println(F("[MQTT COMMAND] Goi tin lenh khong hop le hoac vuot qua 256 bytes."));
        return;
    }
    char cmdBuf[257];
    memcpy(cmdBuf, payload, length);
    cmdBuf[length] = '\0';
    Serial.printf("\n[MQTT COMMAND] Nhan lenh tu topic [%s]: %s\n", topic, cmdBuf);

    // NGUYÊN TẮC AN TOÀN BẢO MẬT:
    // Tuyệt đối không cho phép điều khiển GPIO tùy ý từ MQTT.
    // Chỉ chấp nhận các lệnh hệ thống có cấu trúc rõ ràng đã được định nghĩa trước.
    if (strstr(cmdBuf, "TEST_ALARM") != NULL) {
        Serial.println(F("[SECURITY] Chấp nhận lệnh TEST_ALARM: Kích hoạt còi/đèn kiểm tra..."));
        alarmActuator.trigger();
    } else if (strstr(cmdBuf, "RESET_ALARM") != NULL) {
        Serial.println(F("[SECURITY] Chấp nhận lệnh RESET_ALARM: Đặt lại trạng thái báo động."));
        alarmActuator.forceOff();
    } else {
        Serial.println(F("[SECURITY WARNING] Lệnh không xác định hoặc vi phạm chính sách an toàn. Bỏ qua!"));
    }
}

// ==============================================================================
// ĐÁNH GIÁ ĐIỀU KIỆN CẢNH BÁO (KHÔNG DÙNG GIÁ TRỊ LỖI ĐỂ BÁO ĐỘNG)
// ==============================================================================
void evaluateThresholds() {
    // 1. Cảnh báo nhiệt độ và độ ẩm (chỉ đánh giá khi dữ liệu DHT22 hợp lệ)
    if (currentData.dht_valid) {
        currentAlarm.temp_alert = (currentData.temperature > THRESHOLD_TEMP_MAX || 
                                   currentData.temperature < THRESHOLD_TEMP_MIN);
        currentAlarm.humi_alert = (currentData.humidity > THRESHOLD_HUMI_MAX);
    } else {
        currentAlarm.temp_alert = false;
        currentAlarm.humi_alert = false;
    }

    // 2. Cảnh báo khí gas / khói (dùng giá trị sau lọc EMA để tránh nhảy đột biến)
    currentAlarm.gas_alert = (currentData.gas_adc > THRESHOLD_GAS_ADC);

    // 3. Cảnh báo âm thanh bất thường (Peak-to-Peak vượt ngưỡng)
    currentAlarm.sound_alert = (currentData.sound_adc > THRESHOLD_SOUND_ADC);

    // 4. Cảnh báo chuyển động thân nhiệt (PIR)
    currentAlarm.motion_alert = (currentData.motion == 1);

    // 5. Cảnh báo chạm trái phép (TTP223)
    currentAlarm.touch_alert = (currentData.touch == 1);

    // 6. Cảnh báo khoảng cách tiếp cận quá gần (chỉ đánh giá khi siêu âm hợp lệ)
    if (currentData.distance_valid) {
        currentAlarm.distance_alert = (currentData.distance_cm > 0.0f && 
                                       currentData.distance_cm < THRESHOLD_DISTANCE_CM);
    } else {
        currentAlarm.distance_alert = false;
    }

    // Tổng hợp kích hoạt báo động
    currentAlarm.is_triggered = (currentAlarm.temp_alert ||
                                 currentAlarm.gas_alert  ||
                                 currentAlarm.motion_alert ||
                                 currentAlarm.touch_alert  ||
                                 currentAlarm.distance_alert);
}

// ==============================================================================
// BẢNG THEO DÕI SERIAL MONITOR (GIAI ĐOẠN 2 - BỔ SUNG TRẠNG THÁI MẠNG)
// ==============================================================================
void printSerialDashboard() {
    Serial.println(F("\n=================================================================="));
    Serial.printf(  "       SMART AIoT SECURITY - MONITOR [%s] (STAGE 2)       \n", currentData.device_id);
    Serial.println(F("=================================================================="));

    // 1. Nhiệt độ & Độ ẩm
    if (currentData.dht_valid) {
        Serial.printf(" [1. DHT22]      Nhiet do: %5.1f C | Do am: %5.1f %%  [Trang thai: OK]\n",
                      currentData.temperature, currentData.humidity);
    } else {
        Serial.printf(" [1. DHT22]      Nhiet do: --.- C | Do am: --.- %%  [Trang thai: LOI CAM BIEN]\n");
    }

    // 2. Khí gas / Khói (MQ-2)
    Serial.printf(" [2. MQ-2]       Gia tri ADC sau loc EMA: %4d | Tho: %4d  [Nguong: >%d]\n",
                  currentData.gas_adc, currentData.gas_raw, THRESHOLD_GAS_ADC);

    // 3. Âm thanh (KY-037/KY-038)
    Serial.printf(" [3. AM THANH]   Dac trung Peak-to-Peak ADC: %4d            [Nguong: >%d]\n",
                  currentData.sound_adc, THRESHOLD_SOUND_ADC);

    // 4. Chuyển động (PIR HC-SR501)
    Serial.printf(" [4. PIR]        Chuyen dong (motion): %d -> %s\n",
                  currentData.motion, 
                  (currentData.motion == 1) ? ">>> PHAT HIEN CHUYEN DONG <<<" : "Yen tinh");

    // 5. Cảm biến chạm (TTP223)
    Serial.printf(" [5. TOUCH]      Cam bien cham (touch): %d -> %s\n",
                  currentData.touch,
                  (currentData.touch == 1) ? ">>> CO TIEP XUC VA CHAM <<<" : "Khong cham");

    // 6. Khoảng cách siêu âm (HC-SR04)
    if (currentData.distance_valid) {
        Serial.printf(" [6. HC-SR04]    Khoang cach vat the: %5.1f cm             [Nguong: <%.0f cm]\n",
                      currentData.distance_cm, THRESHOLD_DISTANCE_CM);
    } else {
        Serial.printf(" [6. HC-SR04]    Khoang cach vat the: Ngoai tam/Timeout    [Trang thai: Cho vat the]\n");
    }

    // 7. Trạng thái kết nối Wi-Fi và MQTT
    Serial.println(F("------------------------------------------------------------------"));
    Serial.printf(" [KET NOI WI-FI] %s | IP: %s (RSSI: %d dBm)\n",
                  wifiModule.isConnected() ? "DA KET NOI [OK]" : "MAT KET NOI [RETRY]",
                  wifiModule.getIP().c_str(), wifiModule.getRSSI());
    Serial.printf(" [MQTT BROKER]   %s | Host: %s:%d | Sent: %lu pkts\n",
                  mqttModule.isConnected() ? "DA KET NOI [OK]" : "CHUA KET NOI [WAIT]",
                  MQTT_BROKER_IP, MQTT_BROKER_PORT, totalMqttSent);

    // 8. Trạng thái an ninh & Thiết bị phản hồi
    Serial.println(F("------------------------------------------------------------------"));
    if (currentAlarm.is_triggered) {
        Serial.print(F(" [HE THONG]     TRANG THAI: NGUY HIEM / CANH BAO! Ly do: "));
        if (currentAlarm.temp_alert)     Serial.print(F("[Nhiet do] "));
        if (currentAlarm.gas_alert)      Serial.print(F("[Khi Gas] "));
        if (currentAlarm.motion_alert)   Serial.print(F("[Chuyen dong] "));
        if (currentAlarm.touch_alert)    Serial.print(F("[Cham vao thiet bi] "));
        if (currentAlarm.distance_alert) Serial.print(F("[Tiep can gan] "));
        Serial.println();
    } else {
        Serial.println(F(" [HE THONG]     TRANG THAI: BINH THUONG (Khu vuc an toan)"));
    }
    Serial.printf(" [ACTUATORS]    %s\n", alarmActuator.getStatusDescription());
    Serial.println(F("=================================================================="));
}

// ==============================================================================
// SETUP
// ==============================================================================
void setup() {
    Serial.begin(115200);
    delay(1000); // Đợi ổn định nguồn và Serial

    // Gán Device ID chuẩn
    strncpy(currentData.device_id, DEVICE_ID, sizeof(currentData.device_id) - 1);
    currentData.device_id[sizeof(currentData.device_id) - 1] = '\0';

    Serial.println();
    Serial.println(F("=================================================================="));
    Serial.println(F("    KHOI DONG FIRMWARE GIAI DOAN 2 - WI-FI & MQTT CLIENT          "));
    Serial.println(F("=================================================================="));

    // Khởi tạo Actuators và tự kiểm tra
    alarmActuator.begin();
    Serial.println(F("[+] Khoi tao Actuators (LED Do: 18, LED Xanh: 19, Buzzer: 23)..."));
    alarmActuator.testSelfCheck();

    // Khởi tạo các module cảm biến
    Serial.println(F("[+] Khoi tao cam bien DHT22 (GPIO 4)..."));
    dhtSensor.begin();

    Serial.println(F("[+] Khoi tao cam bien PIR HC-SR501 (GPIO 27)..."));
    pirSensor.begin();

    Serial.println(F("[+] Khoi tao cam bien MQ-2 (GPIO 34 ADC1)..."));
    mq2Sensor.begin();

    Serial.println(F("[+] Khoi tao cam bien Am thanh KY-037 (GPIO 35 ADC1)..."));
    soundSensor.begin();

    Serial.println(F("[+] Khoi tao cam bien Cham TTP223 (GPIO 32)..."));
    touchSensor.begin();

    Serial.println(F("[+] Khoi tao cam bien Sieu am HC-SR04 (Trig: 26, Echo: 25)..."));
    ultrasonicSensor.begin();

    // Khởi tạo truyền thông mạng (Non-blocking: không bao giờ làm treo vòng lặp)
    Serial.println(F("[+] Khoi tao ket noi Wi-Fi..."));
    wifiModule.begin();

    Serial.println(F("[+] Khoi tao MQTT Module..."));
    mqttModule.begin();
    mqttModule.setCallback(onCommandReceived);

    Serial.println(F("[SUCCESS] Tat ca module san sang hoat dong!\n"));
}

// ==============================================================================
// LOOP (VÒNG LẶP ĐA NHIỆM COOPERATIVE MULTITASKING KHÔNG NGHẼN)
// ==============================================================================
void loop() {
    unsigned long currentMillis = millis();

    // 1. Cập nhật trạng thái mạng Wi-Fi và MQTT (Chạy ngầm không nghẽn)
    wifiModule.update();
    mqttModule.update();

    // 2. Quét cảm biến chạm TTP223 (Chu kỳ 50ms)
    if (currentMillis - lastTouchTime >= INTERVAL_TOUCH_MS) {
        lastTouchTime = currentMillis;
        currentData.touch = touchSensor.read();
    }

    // 3. Quét cảm biến chuyển động PIR (Chu kỳ 100ms)
    if (currentMillis - lastPirTime >= INTERVAL_PIR_MS) {
        lastPirTime = currentMillis;
        currentData.motion = pirSensor.read();
    }

    // 4. Lấy mẫu đặc trưng âm thanh Peak-to-Peak (Chu kỳ 150ms)
    if (currentMillis - lastSoundTime >= INTERVAL_SOUND_MS) {
        lastSoundTime = currentMillis;
        currentData.sound_raw = analogRead(PIN_SOUND_ANALOG);
        currentData.sound_adc = soundSensor.readPeakToPeak(50);
    }

    // 5. Đọc cảm biến khí Gas/Khói MQ-2 có lọc EMA (Chu kỳ 200ms)
    if (currentMillis - lastMq2Time >= INTERVAL_MQ2_MS) {
        lastMq2Time = currentMillis;
        currentData.gas_raw = mq2Sensor.readRaw();
        currentData.gas_adc = mq2Sensor.readFiltered();
    }

    // 6. Đo khoảng cách siêu âm HC-SR04 có lọc Median & xử lý timeout (Chu kỳ 250ms)
    if (currentMillis - lastUltrasonicTime >= INTERVAL_ULTRASONIC_MS) {
        lastUltrasonicTime = currentMillis;
        float d;
        currentData.distance_valid = ultrasonicSensor.readDistance(d);
        currentData.distance_cm = d;
    }

    // 7. Đọc nhiệt độ và độ ẩm DHT22 (Chu kỳ 2000ms)
    if (currentMillis - lastDhtTime >= INTERVAL_DHT_MS) {
        lastDhtTime = currentMillis;
        float t, h;
        if (dhtSensor.read(t, h)) {
            currentData.temperature = t;
            currentData.humidity = h;
            currentData.dht_valid = true;
        } else {
            currentData.dht_valid = false;
        }
    }

    // 8. Đánh giá điều kiện cảnh báo theo ngưỡng
    evaluateThresholds();

    // 9. Cập nhật thiết bị phản hồi (chống rung giật 3s)
    alarmActuator.update(currentAlarm);

    // 10. Gửi bản tin cảnh báo qua MQTT Topic aiot/security/alerts khi có sự cố mới xuất hiện
    if (currentAlarm.is_triggered && !lastTriggerState) {
        lastTriggerState = true;
        char reasonBuffer[64] = "";
        if (currentAlarm.temp_alert)     strcat(reasonBuffer, "TEMP_HIGH ");
        if (currentAlarm.gas_alert)      strcat(reasonBuffer, "GAS_LEAK ");
        if (currentAlarm.motion_alert)   strcat(reasonBuffer, "MOTION ");
        if (currentAlarm.touch_alert)    strcat(reasonBuffer, "TOUCH_TAMPER ");
        if (currentAlarm.distance_alert) strcat(reasonBuffer, "PROXIMITY ");
        
        mqttModule.publishAlert(reasonBuffer, currentData);
    } else if (!currentAlarm.is_triggered) {
        lastTriggerState = false;
    }

    // 11. Gửi định kỳ dữ liệu cảm biến lên MQTT Topic aiot/security/sensors (Chu kỳ 3000ms)
    if (currentMillis - lastMqttPubTime >= INTERVAL_MQTT_PUB_MS) {
        lastMqttPubTime = currentMillis;
        if (mqttModule.publishSensorData(currentData)) {
            totalMqttSent++;
        }
    }

    // 12. Hiển thị báo cáo chi tiết lên Serial Monitor (Chu kỳ 1000ms)
    if (currentMillis - lastLogTime >= INTERVAL_SERIAL_LOG_MS) {
        lastLogTime = currentMillis;
        printSerialDashboard();
    }
}
