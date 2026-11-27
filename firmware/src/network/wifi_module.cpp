#include "wifi_module.h"

WiFiModule::WiFiModule()
    : _ssid(WIFI_SSID), _password(WIFI_PASSWORD),
      _lastReconnectAttempt(0), _wasConnected(false) {}

void WiFiModule::begin(const char* ssid, const char* password) {
    _ssid = ssid;
    _password = password;

    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);

    Serial.printf("[Wi-Fi] Bat dau ket noi den SSID: %s (Che do Non-blocking)...\n", _ssid);
    WiFi.begin(_ssid, _password);
    _lastReconnectAttempt = millis();
}

void WiFiModule::update() {
    bool currentlyConnected = (WiFi.status() == WL_CONNECTED);

    // Phát hiện trạng thái vừa kết nối thành công
    if (currentlyConnected && !_wasConnected) {
        _wasConnected = true;
        Serial.println(F("\n[Wi-Fi] >>> DA KET NOI WI-FI THANH CONG! <<<"));
        Serial.printf("[Wi-Fi] Dia chi IP cap phat: %s | RSSI: %d dBm\n", 
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } 
    // Phát hiện mất kết nối Wi-Fi
    else if (!currentlyConnected && _wasConnected) {
        _wasConnected = false;
        Serial.println(F("\n[Wi-Fi] >>> CANH BAO: MAT KET NOI WI-FI! Se tu dong ket noi lai trong nen..."));
    }

    // Tự động thử kết nối lại theo chu kỳ INTERVAL_NET_RETRY_MS mà không làm đơ chương trình
    if (!currentlyConnected) {
        unsigned long now = millis();
        if (now - _lastReconnectAttempt >= INTERVAL_NET_RETRY_MS) {
            _lastReconnectAttempt = now;
            Serial.println(F("[Wi-Fi] Dang thu ket noi lai Wi-Fi..."));
            WiFi.disconnect();
            WiFi.begin(_ssid, _password);
        }
    }
}

bool WiFiModule::isConnected() const {
    return (WiFi.status() == WL_CONNECTED);
}

String WiFiModule::getIP() const {
    if (isConnected()) {
        return WiFi.localIP().toString();
    }
    return String("Chua co IP");
}

int WiFiModule::getRSSI() const {
    if (isConnected()) {
        return WiFi.RSSI();
    }
    return 0;
}
