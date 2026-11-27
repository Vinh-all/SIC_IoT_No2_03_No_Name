#include "dht_sensor.h"

DHTSensorModule::DHTSensorModule() 
    : _dht(PIN_DHT22, DHT_TYPE), _lastTemp(0.0f), _lastHumi(0.0f), _lastReadTime(0) {}

void DHTSensorModule::begin() {
    _dht.begin();
}

bool DHTSensorModule::read(float &temperature, float &humidity) {
    unsigned long now = millis();
    if (now - _lastReadTime < INTERVAL_DHT_MS && _lastReadTime != 0) {
        temperature = _lastTemp;
        humidity = _lastHumi;
        return true;
    }

    float t = _dht.readTemperature();
    float h = _dht.readHumidity();

    // Kiểm tra dữ liệu lỗi: NaN hoặc vượt ngoài dải vật lý hoạt động (-40 đến 80°C, 0 đến 100%)
    if (isnan(t) || isnan(h) || t < -40.0f || t > 80.0f || h < 0.0f || h > 100.0f) {
        // Cảm biến không phản hồi hoặc đọc lỗi: không cập nhật dữ liệu mới
        temperature = _lastTemp;
        humidity = _lastHumi;
        return false;
    }

    _lastTemp = t;
    _lastHumi = h;
    _lastReadTime = now;

    temperature = _lastTemp;
    humidity = _lastHumi;
    return true;
}
