#include "sound_sensor.h"

SoundSensorModule::SoundSensorModule() : _pin(PIN_SOUND_ANALOG) {}

void SoundSensorModule::begin() {
    pinMode(_pin, INPUT);
}

// Lấy mẫu tín hiệu âm thanh trong cửa sổ 50ms để tính đặc trưng Peak-to-Peak (biên độ đỉnh - đỉnh)
int SoundSensorModule::readPeakToPeak(unsigned int sampleWindowMs) {
    unsigned long startMillis = millis();
    unsigned int signalMax = 0;
    unsigned int signalMin = 4095;

    while (millis() - startMillis < sampleWindowMs) {
        int sample = analogRead(_pin);
        if (sample >= 0 && sample <= 4095) {
            if (sample > (int)signalMax) {
                signalMax = sample;
            }
            if (sample < (int)signalMin) {
                signalMin = sample;
            }
        }
    }

    int peakToPeak = (signalMax >= signalMin) ? (signalMax - signalMin) : 0;
    return peakToPeak;
}
