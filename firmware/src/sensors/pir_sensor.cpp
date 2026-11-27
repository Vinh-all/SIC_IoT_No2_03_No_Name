#include "pir_sensor.h"

PIRSensorModule::PIRSensorModule() : _pin(PIN_PIR) {}

void PIRSensorModule::begin() {
    pinMode(_pin, INPUT);
}

int PIRSensorModule::read() {
    return (digitalRead(_pin) == HIGH) ? 1 : 0;
}
