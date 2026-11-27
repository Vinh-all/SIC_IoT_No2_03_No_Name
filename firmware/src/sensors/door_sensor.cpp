#include "door_sensor.h"

volatile bool DoorSensorModule::_doorOpen = false;
volatile bool DoorSensorModule::_doorChanged = false;
volatile unsigned long DoorSensorModule::_lastDoorInterruptTime = 0;

// Trình phục vụ ngắt phần cứng cảm biến cửa mở tức thì (IRAM_ATTR)
void IRAM_ATTR DoorSensorModule::isrHandler() {
    unsigned long now = millis();
    // Chống dội tiếp điểm cơ khí (Debounce 50ms)
    if (now - _lastDoorInterruptTime > 50) {
        // Cảm biến từ Reed switch với INPUT_PULLUP:
        // Cửa đóng -> Tiếp điểm đóng về GND (LOW)
        // Cửa mở  -> Tiếp điểm hở ra, kéo lên 3.3V (HIGH)
        _doorOpen = (digitalRead(PIN_DOOR) == HIGH);
        _doorChanged = true;
        _lastDoorInterruptTime = now;
    }
}

DoorSensorModule::DoorSensorModule() : _pin(PIN_DOOR) {}

void DoorSensorModule::begin() {
    pinMode(_pin, INPUT_PULLUP); // Bật điện trở kéo lên nội bộ của ESP32
    _doorOpen = (digitalRead(_pin) == HIGH);

    // Kích hoạt ngắt phần cứng tức thì khi trạng thái cửa thay đổi (Đóng <-> Mở)
    attachInterrupt(digitalPinToInterrupt(_pin), isrHandler, CHANGE);
}

bool DoorSensorModule::isOpen() {
    return (digitalRead(_pin) == HIGH);
}

bool DoorSensorModule::hasDoorTriggered() {
    if (_doorChanged) {
        _doorChanged = false;
        return true;
    }
    return false;
}

void DoorSensorModule::clearTrigger() {
    _doorChanged = false;
}
