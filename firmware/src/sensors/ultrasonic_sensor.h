#ifndef ULTRASONIC_SENSOR_H
#define ULTRASONIC_SENSOR_H

#include "config.h"

class UltrasonicSensorModule {
public:
    UltrasonicSensorModule();
    void begin();
    bool readDistance(float &distanceCm);

private:
    int _trigPin;
    int _echoPin;
    float _lastValidDistance;
    float _samples[5];
    int _sampleIdx;

    float getMedian(float a[], int n);
};

#endif // ULTRASONIC_SENSOR_H
