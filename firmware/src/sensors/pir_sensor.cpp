#include "pir_sensor.h"

volatile bool PIRSensorModule::_motionDetected = false;
volatile unsigned long PIRSensorModule::_lastInterruptTime = 0;

// Trình phục vụ ngắt phần cứng (Hardware Interrupt Service Routine - IRAM_ATTR)
void IRAM_ATTR PIRSensorModule::isrHandler() {
    unsigned long now = millis();
    // Chống dội tín hiệu (debounce) 150ms
    if (now - _lastInterruptTime > 150) {
        _motionDetected = (digitalRead(PIN_PIR) == HIGH);
        _lastInterruptTime = now;
    }
}

PIRSensorModule::PIRSensorModule() : _pin(PIN_PIR) {}

void PIRSensorModule::begin() {
    pinMode(_pin, INPUT);
    // Kích hoạt ngắt phần cứng trên sườn CHANGE (phát hiện cả khi bắt đầu và kết thúc chuyển động)
    attachInterrupt(digitalPinToInterrupt(_pin), isrHandler, CHANGE);
}

int PIRSensorModule::read() {
    return (digitalRead(_pin) == HIGH) ? 1 : 0;
}

bool PIRSensorModule::hasNewMotion() {
    return _motionDetected;
}

void PIRSensorModule::clearMotionFlag() {
    _motionDetected = false;
}
