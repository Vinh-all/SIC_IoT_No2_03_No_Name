#ifndef ALARM_ACTUATOR_H
#define ALARM_ACTUATOR_H

#include "config.h"

class LEDActuator {
public:
    LEDActuator();
    void begin();
    void update(float distanceCm, bool distanceValid, int motion, int doorOpen, SensorData &data);
    void testSelfCheck(); // Chớp kiểm tra tuần tự 3 LED lúc khởi động

    bool isRedOn() const { return _redState; }
    bool isYellowOn() const { return _yellowState; }
    bool isGreenOn() const { return _greenState; }
    const char* getStatusDescription() const;

private:
    int _pinRed;
    int _pinYellow;
    int _pinGreen;

    bool _redState;
    bool _yellowState;
    bool _greenState;
};

#endif // ALARM_ACTUATOR_H
