#include "alarm_actuator.h"

AlarmActuator::AlarmActuator()
    : _pinRed(PIN_LED_RED), _pinGreen(PIN_LED_GREEN), _pinBuzzer(PIN_BUZZER),
      _lastBlinkTime(0), _alarmHoldUntil(0), _toggleState(false), 
      _isAlertMode(false), _greenState(false) {}

void AlarmActuator::begin() {
    pinMode(_pinRed, OUTPUT);
    pinMode(_pinGreen, OUTPUT);
    pinMode(_pinBuzzer, OUTPUT);

    digitalWrite(_pinRed, LOW);
    digitalWrite(_pinGreen, LOW);
    digitalWrite(_pinBuzzer, LOW);
}

void AlarmActuator::testSelfCheck() {
    // Tự kiểm tra phần cứng 3 lần nhấp nháy lúc bật nguồn
    for (int i = 0; i < 3; i++) {
        digitalWrite(_pinRed, HIGH);
        digitalWrite(_pinGreen, HIGH);
        digitalWrite(_pinBuzzer, HIGH);
        delay(100);
        digitalWrite(_pinRed, LOW);
        digitalWrite(_pinGreen, LOW);
        digitalWrite(_pinBuzzer, LOW);
        delay(100);
    }
}

void AlarmActuator::update(AlarmState &state) {
    unsigned long now = millis();

    // 1. Kiểm tra kích hoạt cảnh báo mới
    if (state.is_triggered) {
        state.triggered_time = now;
        _alarmHoldUntil = now + ALARM_HOLD_TIME_MS; // Kéo dài thời gian giữ cảnh báo chống rung nhiễu
    }

    // 2. Đánh giá trạng thái giữ cảnh báo (Anti-chattering)
    if (now < _alarmHoldUntil) {
        _isAlertMode = true;
    } else {
        _isAlertMode = false;
    }

    // 3. Điều khiển thiết bị theo trạng thái
    if (_isAlertMode) {
        // CHẾ ĐỘ CẢNH BÁO: LED Xanh TẮT, LED Đỏ & Buzzer nhấp nháy chu kỳ 200ms
        _greenState = false;
        digitalWrite(_pinGreen, LOW);

        if (now - _lastBlinkTime >= 200) {
            _lastBlinkTime = now;
            _toggleState = !_toggleState;
            digitalWrite(_pinRed, _toggleState ? HIGH : LOW);
            digitalWrite(_pinBuzzer, _toggleState ? HIGH : LOW);
        }
    } else {
        // CHẾ ĐỘ AN TOÀN: LED Xanh BẬT, LED Đỏ TẮT, Buzzer TẮT
        _greenState = true;
        _toggleState = false;
        digitalWrite(_pinGreen, HIGH);
        digitalWrite(_pinRed, LOW);
        digitalWrite(_pinBuzzer, LOW);
    }
}

const char* AlarmActuator::getStatusDescription() const {
    if (_isAlertMode) {
        return "CANH BAO [LED Xanh: TAT | LED Do: CHOP NHAY | Buzzer: KEU]";
    } else {
        return "AN TOAN  [LED Xanh: BAT | LED Do: TAT       | Buzzer: TAT]";
    }
}
