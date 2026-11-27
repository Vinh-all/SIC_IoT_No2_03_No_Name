#ifndef PIR_SENSOR_H
#define PIR_SENSOR_H

#include "config.h"

class PIRSensorModule {
public:
    PIRSensorModule();
    void begin();
    int read(); // Trả về 0 (yên tĩnh) hoặc 1 (phát hiện chuyển động)

private:
    int _pin;
};

#endif // PIR_SENSOR_H
