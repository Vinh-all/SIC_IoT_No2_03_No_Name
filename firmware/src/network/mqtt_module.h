#ifndef MQTT_MODULE_H
#define MQTT_MODULE_H

#include <WiFi.h>
#include <WiFiClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"

typedef void (*CommandCallback)(char* topic, byte* payload, unsigned int length);

class MQTTModule {
public:
    MQTTModule();
    void begin(const char* brokerIp = MQTT_BROKER_IP, int port = MQTT_BROKER_PORT, const char* clientId = MQTT_CLIENT_ID);
    void update(); // Duy trì kết nối MQTT và gọi loop() không nghẽn
    bool isConnected();
    
    // Gửi bản tin cảm biến theo đúng cấu trúc JSON đã thống nhất
    bool publishSensorData(const SensorData &data);

    // Gửi bản tin cảnh báo khi phát hiện sự cố an ninh
    bool publishAlert(const char* reason, const SensorData &data);

    // Cài đặt hàm callback khi nhận lệnh từ topic command
    void setCallback(CommandCallback callback);

private:
    WiFiClient _wifiClient;
    PubSubClient _mqttClient;
    const char* _brokerIp;
    int _port;
    const char* _clientId;
    unsigned long _lastMqttReconnectAttempt;
    bool _wasConnected;

    void reconnectNonBlocking();
};

#endif // MQTT_MODULE_H
