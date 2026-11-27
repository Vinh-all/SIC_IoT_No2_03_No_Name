#ifndef PIR_SENSOR_H
#define PIR_SENSOR_H

#include <Arduino.h>
#include "config.h"

class PIRSensorModule {
public:
    PIRSensorModule();
    void begin();
    int read();
    bool hasNewMotion();
    void clearMotionFlag();

    static void IRAM_ATTR isrHandler();

private:
    int _pin;
    static volatile bool _motionDetected;
    static volatile unsigned long _lastInterruptTime;
};

#endif // PIR_SENSOR_H
