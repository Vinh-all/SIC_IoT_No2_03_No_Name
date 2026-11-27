#ifndef SOUND_SENSOR_H
#define SOUND_SENSOR_H

#include "config.h"

class SoundSensorModule {
public:
    SoundSensorModule();
    void begin();
    int readPeakToPeak(unsigned int sampleWindowMs = 50);

private:
    int _pin;
};

#endif // SOUND_SENSOR_H
