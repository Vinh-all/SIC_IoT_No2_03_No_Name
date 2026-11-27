#ifndef DOOR_SENSOR_H
#define DOOR_SENSOR_H

#include <Arduino.h>
#include "config.h"

class DoorSensorModule {
public:
    DoorSensorModule();
    void begin();
    bool isOpen();
    bool hasDoorTriggered();
    void clearTrigger();

    static void IRAM_ATTR isrHandler();

private:
    int _pin;
    static volatile bool _doorOpen;
    static volatile bool _doorChanged;
    static volatile unsigned long _lastDoorInterruptTime;
};

#endif // DOOR_SENSOR_H
