#ifndef DHT_SENSOR_H
#define DHT_SENSOR_H

#include "config.h"
#include <DHT.h>

class DHTSensorModule {
public:
    DHTSensorModule();
    void begin();
    bool read(float &temperature, float &humidity);

private:
    DHT _dht;
    float _lastTemp;
    float _lastHumi;
    unsigned long _lastReadTime;
};

#endif // DHT_SENSOR_H
