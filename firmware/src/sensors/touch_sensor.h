#ifndef TOUCH_SENSOR_H
#define TOUCH_SENSOR_H

#include "config.h"

class TouchSensorModule {
public:
    TouchSensorModule();
    void begin();
    int read(); // Trả về 0 (không chạm) hoặc 1 (có chạm)

private:
    int _pin;
};

#endif // TOUCH_SENSOR_H
