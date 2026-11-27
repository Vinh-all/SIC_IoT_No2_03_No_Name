#include "mqtt_module.h"

MQTTModule::MQTTModule()
    : _mqttClient(_wifiClient), _brokerIp(MQTT_BROKER_IP), _port(MQTT_BROKER_PORT),
      _clientId(MQTT_CLIENT_ID), _lastMqttReconnectAttempt(0), _wasConnected(false) {}

void MQTTModule::begin(const char* brokerIp, int port, const char* clientId) {
    _brokerIp = brokerIp;
    _port = port;
    _clientId = clientId;

    _mqttClient.setServer(_brokerIp, _port);
    _mqttClient.setBufferSize(512); // Tăng kích thước buffer chứa chuỗi JSON
    Serial.printf("[MQTT] Khoi tao Client ID: %s | Broker: %s:%d\n", _clientId, _brokerIp, _port);
}

void MQTTModule::setCallback(CommandCallback callback) {
    _mqttClient.setCallback(callback);
}

void MQTTModule::reconnectNonBlocking() {
    // Chỉ thử kết nối MQTT khi Wi-Fi đã sẵn sàng
    if (WiFi.status() != WL_CONNECTED) {
        return;
    }

    unsigned long now = millis();
    if (now - _lastMqttReconnectAttempt < INTERVAL_NET_RETRY_MS) {
        return;
    }
    _lastMqttReconnectAttempt = now;

    Serial.printf("[MQTT] Dang ket noi den Mosquitto Broker (%s:%d)...\n", _brokerIp, _port);

    // Cấu hình LWT (Last Will and Testament): Thông báo trạng thái nếu ESP32 mất nguồn đột ngột
    const char* willTopic = MQTT_TOPIC_STATUS;
    const char* willPayload = "{\"device_id\":\"ESP32_001\",\"status\":\"offline\"}";
    int willQoS = 1;
    bool willRetain = true;

    if (_mqttClient.connect(_clientId, willTopic, willQoS, willRetain, willPayload)) {
        Serial.println(F("[MQTT] >>> DA KET NOI BROKER MOSQUITTO THANH CONG! <<<"));

        // Gửi thông báo trực tuyến khi vừa kết nối (Retained message)
        const char* onlinePayload = "{\"device_id\":\"ESP32_001\",\"status\":\"online\"}";
        _mqttClient.publish(MQTT_TOPIC_STATUS, onlinePayload, true);

        // Đăng ký nhận lệnh từ topic command
        _mqttClient.subscribe(MQTT_TOPIC_COMMAND);
        Serial.printf("[MQTT] Da Subscribe topic: %s\n", MQTT_TOPIC_COMMAND);
        _wasConnected = true;
    } else {
        Serial.printf("[MQTT] Ket noi that bai, ma loi state = %d. Se thu lai sau 5s...\n", _mqttClient.state());
        _wasConnected = false;
    }
}

void MQTTModule::update() {
    if (_mqttClient.connected()) {
        _mqttClient.loop();
        _wasConnected = true;
    } else {
        if (_wasConnected) {
            _wasConnected = false;
            Serial.println(F("[MQTT] >>> CANH BAO: MAT KET NOI BROKER! Se tu dong ket noi lai..."));
        }
        reconnectNonBlocking();
    }
}

bool MQTTModule::isConnected() {
    return _mqttClient.connected();
}

bool MQTTModule::publishSensorData(const SensorData &data) {
    if (!_mqttClient.connected()) {
        return false;
    }

    // Đóng gói JSON theo đúng chuẩn hợp đồng đã thống nhất:
    // {
    //   "device_id": "ESP32_001",
    //   "temperature": 29.5,
    //   "humidity": 70.2,
    //   "gas_adc": 850,
    //   "sound_adc": 420,
    //   "motion": 1,
    //   "touch": 0,
    //   "distance_cm": 120.5
    // }
    StaticJsonDocument<256> doc;
    doc["device_id"]   = data.device_id;
    doc["temperature"] = serialized(String(data.temperature, 1));
    doc["humidity"]    = serialized(String(data.humidity, 1));
    doc["gas_adc"]     = data.gas_adc;
    doc["sound_adc"]   = data.sound_adc;
    doc["motion"]      = data.motion;
    doc["touch"]       = data.touch;
    doc["distance_cm"] = serialized(String(data.distance_cm, 1));

    char buffer[256];
    size_t n = serializeJson(doc, buffer);

    bool success = _mqttClient.publish(MQTT_TOPIC_SENSORS, buffer);
    return success;
}

bool MQTTModule::publishAlert(const char* reason, const SensorData &data) {
    if (!_mqttClient.connected()) {
        return false;
    }

    StaticJsonDocument<256> doc;
    doc["device_id"]   = data.device_id;
    doc["alert"]       = 1;
    doc["reason"]      = reason;
    doc["gas_adc"]     = data.gas_adc;
    doc["sound_adc"]   = data.sound_adc;
    doc["motion"]      = data.motion;
    doc["touch"]       = data.touch;
    doc["distance_cm"] = serialized(String(data.distance_cm, 1));

    char buffer[256];
    size_t n = serializeJson(doc, buffer);

    bool success = _mqttClient.publish(MQTT_TOPIC_ALERTS, buffer);
    return success;
}
