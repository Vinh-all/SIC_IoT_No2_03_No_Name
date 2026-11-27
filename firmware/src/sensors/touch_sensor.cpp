#include "touch_sensor.h"

TouchSensorModule::TouchSensorModule() : _pin(PIN_TOUCH) {}

void TouchSensorModule::begin() {
    pinMode(_pin, INPUT);
}

int TouchSensorModule::read() {
    return (digitalRead(_pin) == HIGH) ? 1 : 0;
}
