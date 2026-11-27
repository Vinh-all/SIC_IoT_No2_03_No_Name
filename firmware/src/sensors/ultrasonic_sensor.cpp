#include "ultrasonic_sensor.h"

UltrasonicSensorModule::UltrasonicSensorModule()
    : _trigPin(PIN_TRIG), _echoPin(PIN_ECHO), _lastValidDistance(100.0f), _sampleIdx(0) {
    for (int i = 0; i < 5; i++) {
        _samples[i] = 100.0f;
    }
}

void UltrasonicSensorModule::begin() {
    pinMode(_trigPin, OUTPUT);
    pinMode(_echoPin, INPUT);
    digitalWrite(_trigPin, LOW);
}

float UltrasonicSensorModule::getMedian(float a[], int n) {
    float temp[5];
    for (int i = 0; i < n; i++) temp[i] = a[i];

    // Sắp xếp nổi bọt (Bubble Sort) cho mảng 5 phần tử để lấy giá trị trung vị
    for (int i = 0; i < n - 1; i++) {
        for (int j = i + 1; j < n; j++) {
            if (temp[i] > temp[j]) {
                float t = temp[i];
                temp[i] = temp[j];
                temp[j] = t;
            }
        }
    }
    return temp[n / 2];
}

bool UltrasonicSensorModule::readDistance(float &distanceCm) {
    // Phát xung Trigger 10µs
    digitalWrite(_trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(_trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(_trigPin, LOW);

    // Bắt xung Echo với timeout 25000µs (~4.3m) để tránh treo CPU nếu không có phản hồi
    unsigned long duration = pulseIn(_echoPin, HIGH, 25000);

    if (duration == 0) {
        // Cảm biến không phản hồi hoặc vật thể ngoài tầm đo: không cập nhật khoảng cách
        distanceCm = _lastValidDistance;
        return false;
    }

    // Tốc độ âm thanh: ~0.0343 cm/µs
    float distance = (float)duration * 0.0343f / 2.0f;

    // Giới hạn dải đo hợp lý của HC-SR04 (2cm - 400cm)
    if (distance >= 2.0f && distance <= 400.0f) {
        _samples[_sampleIdx] = distance;
        _sampleIdx = (_sampleIdx + 1) % 5;
        _lastValidDistance = getMedian(_samples, 5);
        distanceCm = _lastValidDistance;
        return true;
    }

    distanceCm = _lastValidDistance;
    return false;
}
