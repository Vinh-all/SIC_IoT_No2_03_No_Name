#include "mqtt_module.h"

MQTTModule::MQTTModule()
    : _mqttClient(_wifiClient), _brokerIp(MQTT_BROKER_IP), _port(MQTT_BROKER_PORT),
      _clientId(MQTT_CLIENT_ID), _lastMqttReconnectAttempt(0), _wasConnected(false) {}

void MQTTModule::begin(const char* brokerIp, int port, const char* clientId) {
    _brokerIp = brokerIp;
    _port = port;
    _clientId = clientId;

    _mqttClient.setServer(_brokerIp, _port);
    _mqttClient.setBufferSize(512);
    Serial.printf("[MQTT] Khoi tao Client ID: %s | Broker: %s:%d\n", _clientId, _brokerIp, _port);
}

void MQTTModule::setCallback(CommandCallback callback) {
    _mqttClient.setCallback(callback);
}

void MQTTModule::reconnectNonBlocking() {
    if (WiFi.status() != WL_CONNECTED) {
        return;
    }

    unsigned long now = millis();
    if (now - _lastMqttReconnectAttempt < INTERVAL_NET_RETRY_MS) {
        return;
    }
    _lastMqttReconnectAttempt = now;

    Serial.printf("[MQTT] Dang ket noi den Mosquitto Broker (%s:%d)...\n", _brokerIp, _port);

    const char* willTopic = MQTT_TOPIC_STATUS;
    const char* willPayload = "{\"device_id\":\"esp32_station_01\",\"status\":\"offline\"}";
    int willQoS = 1;
    bool willRetain = true;

    if (_mqttClient.connect(_clientId, willTopic, willQoS, willRetain, willPayload)) {
        Serial.println(F("[MQTT] >>> DA KET NOI BROKER MOSQUITTO (RASPBERRY PI 5) THÀNH CÔNG! <<<"));

        const char* onlinePayload = "{\"device_id\":\"esp32_station_01\",\"status\":\"online\"}";
        _mqttClient.publish(MQTT_TOPIC_STATUS, onlinePayload, true);

        _mqttClient.subscribe(MQTT_TOPIC_COMMAND);
        Serial.printf("[MQTT] Da Subscribe topic: %s\n", MQTT_TOPIC_COMMAND);
        _wasConnected = true;
    } else {
        Serial.printf("[MQTT] Ket noi that bai (state = %d). Se thu lai sau 5s...\n", _mqttClient.state());
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
            Serial.println(F("[MQTT] >>> MAT KET NOI BROKER! Se tu dong thu lai trong nen..."));
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

    JsonDocument doc;
    doc["device_id"]      = data.device_id;
    doc["distance_cm"]    = serialized(String(data.distance_cm, 1));
    doc["motion"]         = data.motion;
    doc["door_open"]      = data.door_open;
    doc["led_red"]        = data.led_red ? 1 : 0;
    doc["led_yellow"]     = data.led_yellow ? 1 : 0;
    doc["led_green"]      = data.led_green ? 1 : 0;
    doc["status"]         = data.status_desc;

    // Giữ tương thích dữ liệu Backend
    doc["temperature"]    = 28.5;
    doc["humidity"]       = 65.0;
    doc["gas_adc"]        = 120;
    doc["sound_adc"]      = 45;
    doc["touch"]          = 0;

    char buffer[320];
    serializeJson(doc, buffer);

    return _mqttClient.publish(MQTT_TOPIC_SENSORS, buffer);
}

bool MQTTModule::publishAlert(const char* reason, const SensorData &data) {
    if (!_mqttClient.connected()) {
        return false;
    }

    JsonDocument doc;
    doc["device_id"]      = data.device_id;
    doc["alert"]          = 1;
    doc["reason"]         = reason;
    doc["door_open"]      = data.door_open;
    doc["motion"]         = data.motion;
    doc["distance_cm"]    = serialized(String(data.distance_cm, 1));

    char buffer[256];
    serializeJson(doc, buffer);

    return _mqttClient.publish(MQTT_TOPIC_ALERTS, buffer);
}
