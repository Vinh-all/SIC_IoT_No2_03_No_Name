#ifndef MQ2_SENSOR_H
#define MQ2_SENSOR_H

#include "config.h"

class MQ2SensorModule {
public:
    MQ2SensorModule();
    void begin();
    int readRaw();
    int readFiltered();

private:
    int _pin;
    float _filteredValue;
    const float _alpha = 0.2f; // He so loc trung binh dong EMA (Exponential Moving Average)
};

#endif // MQ2_SENSOR_H
