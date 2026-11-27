#include "mq2_sensor.h"

MQ2SensorModule::MQ2SensorModule() : _pin(PIN_MQ2_ANALOG), _filteredValue(0.0f) {}

void MQ2SensorModule::begin() {
    pinMode(_pin, INPUT);
    // Khởi tạo giá trị trung bình ban đầu
    int sum = 0;
    for (int i = 0; i < 10; i++) {
        sum += analogRead(_pin);
        delay(10);
    }
    _filteredValue = (float)(sum / 10);
}

int MQ2SensorModule::readRaw() {
    return analogRead(_pin);
}

int MQ2SensorModule::readFiltered() {
    int raw = analogRead(_pin);
    // Bộ lọc EMA: Xử lý nhiễu dao động điện áp ADC của ESP32
    _filteredValue = (_alpha * (float)raw) + ((1.0f - _alpha) * _filteredValue);
    return (int)_filteredValue;
}
