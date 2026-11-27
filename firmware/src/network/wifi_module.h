#ifndef WIFI_MODULE_H
#define WIFI_MODULE_H

#include <WiFi.h>
#include "config.h"

class WiFiModule {
public:
    WiFiModule();
    void begin(const char* ssid = WIFI_SSID, const char* password = WIFI_PASSWORD);
    void update(); // Quản lý kết nối lại tự động không nghẽn
    bool isConnected() const;
    String getIP() const;
    int getRSSI() const;

private:
    const char* _ssid;
    const char* _password;
    unsigned long _lastReconnectAttempt;
    bool _wasConnected;
};

#endif // WIFI_MODULE_H
