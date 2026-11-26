#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// --- CẤU HÌNH WI-FI & MQTT (Thay bằng IP Raspberry Pi 5 của bạn) ---
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_BROKER   = "192.168.1.100"; // IP của Raspberry Pi 5
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC    = "sic/iot/sensors";

// --- CHÂN GPIO TRÊN ESP32 ---
#define DHT_PIN       4
#define DHT_TYPE      DHT11

#define TRIG_PIN      5
#define ECHO_PIN      18   // Nhớ chia áp 5V -> 3.3V nếu HC-SR04 cấp 5V

#define PIR_PIN       27   // HC-SR501 OUT
#define TOUCH_PIN     26   // TTP223 OUT
#define SOUND_PIN     34   // Sound sensor (ADC input) hoặc chân digital nếu dùng chân D0

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 2000; // Gửi định kỳ mỗi 2 giây

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // timeout 30ms (~5m)
  if (duration == 0) return -1.0;
  return (duration * 0.0343f) / 2.0f;
}

void reconnectWiFiAndMQTT() {
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  client.setServer(MQTT_BROKER, MQTT_PORT);
  while (!client.connected()) {
    String clientId = "ESP32-IoT-Node-" + String(random(0xffff), HEX);
    if (!client.connect(clientId.c_str())) {
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(TOUCH_PIN, INPUT);
  pinMode(SOUND_PIN, INPUT);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  reconnectWiFiAndMQTT();
}

void loop() {
  if (!client.connected()) {
    reconnectWiFiAndMQTT();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    float distance = readDistanceCm();
    int pirState = digitalRead(PIR_PIN);
    int touchState = digitalRead(TOUCH_PIN);
    int soundLevel = analogRead(SOUND_PIN); // 0 - 4095 trên ESP32

    if (isnan(temperature) || isnan(humidity)) {
      temperature = -1.0;
      humidity = -1.0;
    }

    char payload[256];
    snprintf(
      payload,
      sizeof(payload),
      "{\"temp\":%.1f,\"hum\":%.1f,\"dist\":%.1f,\"pir\":%d,\"touch\":%d,\"sound\":%d}",
      temperature, humidity, distance, pirState, touchState, soundLevel
    );

    client.publish(MQTT_TOPIC, payload);
    Serial.println(payload);
  }
}