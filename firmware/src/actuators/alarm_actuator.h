#ifndef ALARM_ACTUATOR_H
#define ALARM_ACTUATOR_H

#include "config.h"

class AlarmActuator {
public:
    AlarmActuator();
    void begin();
    void update(AlarmState &state);
    void testSelfCheck(); // Chớp tắt kiểm tra LED và Buzzer khi khởi động

    // Trạng thái hiện tại của thiết bị cảnh báo để hiển thị trên Serial Monitor
    bool isGreenLedOn() const { return _greenState; }
    bool isRedLedActive() const { return _isAlertMode; }
    bool isBuzzerActive() const { return _isAlertMode; }
    const char* getStatusDescription() const;

private:
    int _pinRed;
    int _pinGreen;
    int _pinBuzzer;

    unsigned long _lastBlinkTime;
    unsigned long _alarmHoldUntil;
    bool _toggleState;
    bool _isAlertMode;
    bool _greenState;
};

#endif // ALARM_ACTUATOR_H
