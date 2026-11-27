#include "alarm_actuator.h"
#include <string.h>

LEDActuator::LEDActuator()
    : _pinRed(PIN_LED_RED), _pinYellow(PIN_LED_YELLOW), _pinGreen(PIN_LED_GREEN),
      _redState(false), _yellowState(false), _greenState(false) {}

void LEDActuator::begin() {
    pinMode(_pinRed, OUTPUT);
    pinMode(_pinYellow, OUTPUT);
    pinMode(_pinGreen, OUTPUT);

    digitalWrite(_pinRed, LOW);
    digitalWrite(_pinYellow, LOW);
    digitalWrite(_pinGreen, LOW);
}

void LEDActuator::testSelfCheck() {
    // Nhấp nháy tuần tự: Đỏ -> Vàng -> Xanh khi khởi động kiểm tra phần cứng
    int pins[3] = { _pinRed, _pinYellow, _pinGreen };
    for (int cycle = 0; cycle < 2; cycle++) {
        for (int i = 0; i < 3; i++) {
            digitalWrite(pins[i], HIGH);
            delay(120);
            digitalWrite(pins[i], LOW);
        }
    }
}

void LEDActuator::update(float distanceCm, bool distanceValid, int motion, int doorOpen, SensorData &data) {
    // ƯU TIÊN 1: CỬA BỊ MỞ TỨC THÌ -> BẬT NGAY LED ĐỎ CẢNH BÁO
    if (doorOpen == 1) {
        _redState = true;
        _yellowState = false;
        _greenState = false;
        strcpy(data.status_desc, "CANH BAO: CUA DANG MO!");
    } 
    // ƯU TIÊN 2: VẬT THỂ Ở CỰ LY GẦN (< 10cm) -> BẬT LED ĐỎ
    else if (distanceValid && distanceCm > 0.0f && distanceCm < DISTANCE_THRESHOLD_DANGER) {
        _redState = true;
        _yellowState = false;
        _greenState = false;
        strcpy(data.status_desc, "VAT THE O KHOANG CACH GAN (< 10cm)");
    } 
    // ƯU TIÊN 3: VẬT THỂ Ở CỰ LY TRUNG BÌNH (10cm - 30cm) -> BẬT LED VÀNG
    else if (distanceValid && distanceCm >= DISTANCE_THRESHOLD_DANGER && distanceCm <= DISTANCE_THRESHOLD_SAFE) {
        _redState = false;
        _yellowState = true;
        _greenState = false;
        strcpy(data.status_desc, "VAT THE O KHOANG CACH TRUNG BINH (10-30cm)");
    } 
    // ƯU TIÊN 4: KHU VỰC AN TOÀN (> 30cm và CỬA ĐÓNG) -> BẬT LED XANH
    else {
        _redState = false;
        _yellowState = false;
        _greenState = true;
        if (!distanceValid || distanceCm <= 0.0f) {
            strcpy(data.status_desc, "AN TOAN (CHO TIN HIEU SIEU AM)");
        } else {
            strcpy(data.status_desc, "AN TOAN (> 30cm)");
        }
    }

    // Xuất tín hiệu điện áp ra 3 chân LED
    digitalWrite(_pinRed, _redState ? HIGH : LOW);
    digitalWrite(_pinYellow, _yellowState ? HIGH : LOW);
    digitalWrite(_pinGreen, _greenState ? HIGH : LOW);

    // Đồng bộ trạng thái vào đối tượng dữ liệu
    data.led_red = _redState;
    data.led_yellow = _yellowState;
    data.led_green = _greenState;
    data.door_open = doorOpen;
}

const char* LEDActuator::getStatusDescription() const {
    if (_redState)    return "LED DO: ON  | LED VANG: OFF | LED XANH: OFF (NGUY HIEM / CUA MO)";
    if (_yellowState) return "LED DO: OFF | LED VANG: ON  | LED XANH: OFF (CANH BAO 10-30cm)";
    return                   "LED DO: OFF | LED VANG: OFF | LED XANH: ON  (AN TOAN / CUA DONG)";
}
