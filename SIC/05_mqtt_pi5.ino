/*
 * ============================================================
 *  05 - SIEU AM + PIR + NUT BAM + 3 LED + MQTT -> RASPBERRY PI 5
 * ============================================================
 *  Can cai thu vien: PubSubClient (Nick O'Leary) trong Library Manager
 *
 *  SO DO CHAN:
 *    HY-SRF05 : TRIG -> GPIO 5   | ECHO -> GPIO 18
 *    PIR      : OUT  -> GPIO 35
 *    Nut bam  : GPIO 32 <-> GND
 *    LED xanh -> GPIO 27 | LED vang -> GPIO 26 | LED do -> GPIO 25
 *
 *  MQTT TOPIC (voi NODE_ID = "esp01"):
 *    esp01/status    : "online" / "offline"            (retained, LWT)
 *    esp01/state     : JSON trang thai, gui moi 1s va ngay khi co thay doi
 *    esp01/mode      : "auto" / "on" / "off"           (retained)
 *    esp01/cmd/mode  : Pi GUI LENH xuong: auto | on | off | next
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>

// ======================= CẤU HÌNH THÔNG SỐ =======================
const char*    WIFI_SSID = "Dat0101";             // Tên WiFi (chỉ 2.4GHz)
const char*    WIFI_PASS = "88888888";            // Mật khẩu WiFi
const char*    MQTT_HOST = "10.182.199.252";      // IP Raspberry Pi 5 (MQTT Broker)
const uint16_t MQTT_PORT = 1883;                  // Cổng MQTT
const char*    MQTT_USER = "esp01";               // User MQTT
const char*    MQTT_PASS = "MAT_KHAU_MQTT_ESP01"; // Mật khẩu MQTT (phải trùng với Pi)
const char*    NODE_ID   = "esp01";               // Tên định danh thiết bị

// ======================= CHÂN =======================
#define TRIG_PIN    5
#define ECHO_PIN    18
#define PIR_PIN     35
#define BUTTON_PIN  32
#define LED_XANH    27
#define LED_VANG    26
#define LED_DO      25

// ======================= THÔNG SỐ ĐO =======================
const float NGUONG_GAN = 20.0;               // < 20 cm    -> DO
const float NGUONG_XA  = 50.0;               // 20-50 cm   -> VANG, > 50 -> XANH
const unsigned long THOI_GIAN_GIU  = 10000;  // giu den 10s sau lan cuoi thay nguoi
const unsigned long PIR_KHOI_DONG  = 30000;  // PIR on dinh ~30s
const unsigned long TIMEOUT_US     = 30000;  // timeout sieu am (~5m)
const unsigned long CHU_KY_GUI     = 1000;   // gui trang thai len Pi moi 1s

// ======================= CHẾ ĐỘ =======================
enum CheDo { AUTO, LUON_BAT, TAT };
const char* tenCheDo[]  = { "AUTO (chi do khi co nguoi)", "LUON BAT", "TAT" };
const char* maCheDo[]   = { "auto", "on", "off" };

volatile CheDo cheDo = AUTO;
volatile bool  vuaDoiCheDo = false;

// ======================= TRẠNG THÁI =======================
unsigned long lanCuoiCoNguoi = 0;
bool dangCoNguoi = false;
float khoangCach = -1;
const char* denHienTai = "tat";
bool canGuiNgay = false;

// ======================= MQTT =======================
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);
char TOPIC_STATUS[48], TOPIC_STATE[48], TOPIC_MODE[48], TOPIC_CMD[48];
unsigned long lanThuMQTT = 0;

// ---------- NUT BAM ----------
void IRAM_ATTR xuLyNut() {
  static unsigned long lanNhanTruoc = 0;
  unsigned long now = millis();
  if (now - lanNhanTruoc > 250) {
    cheDo = (CheDo)((cheDo + 1) % 3);
    vuaDoiCheDo = true;
    lanNhanTruoc = now;
  }
}

// ---------- SIEU AM ----------
float docKhoangCach() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long t = pulseIn(ECHO_PIN, HIGH, TIMEOUT_US);
  if (t == 0) return -1;
  return t * 0.0343 / 2.0;
}

float docKhoangCachLoc() {
  float a = docKhoangCach(); delay(15);
  float b = docKhoangCach(); delay(15);
  float c = docKhoangCach();
  if (a > b) { float t = a; a = b; b = t; }
  if (b > c) { float t = b; b = c; c = t; }
  if (a > b) { float t = a; a = b; b = t; }
  return b;
}

// ---------- LED ----------
void batDen(bool xanh, bool vang, bool doo) {
  digitalWrite(LED_XANH, xanh);
  digitalWrite(LED_VANG, vang);
  digitalWrite(LED_DO,   doo);
}

void datDen(const char* mau) {
  batDen(strcmp(mau, "xanh") == 0, strcmp(mau, "vang") == 0, strcmp(mau, "do") == 0);
  if (strcmp(mau, denHienTai) != 0) {
    denHienTai = mau;
    canGuiNgay = true;
  }
}

void nhayDen(int soLan) {
  for (int i = 0; i < soLan; i++) {
    batDen(1, 1, 1); delay(150);
    batDen(0, 0, 0); delay(150);
  }
}

void doVaHienThi() {
  float d = docKhoangCachLoc();

  if (d < 0 || d > 400) {
    khoangCach = -1;
    datDen("xanh");
    Serial.println("  Khong co vat / ngoai tam -> XANH");
  } else {
    khoangCach = d;
    if (d < NGUONG_GAN)      { datDen("do");   Serial.printf("  %.1f cm -> DO\n", d); }
    else if (d < NGUONG_XA)  { datDen("vang"); Serial.printf("  %.1f cm -> VANG\n", d); }
    else                     { datDen("xanh"); Serial.printf("  %.1f cm -> XANH\n", d); }
  }
}

// ---------- MQTT: nhan lenh tu Pi ----------
void nhanLenh(char* topic, byte* payload, unsigned int len) {
  String s;
  for (unsigned int i = 0; i < len; i++) s += (char)payload[i];
  s.trim();
  s.toLowerCase();
  Serial.printf("MQTT nhan [%s]: %s\n", topic, s.c_str());

  CheDo moi;
  if      (s == "auto" || s == "0") moi = AUTO;
  else if (s == "on"   || s == "1") moi = LUON_BAT;
  else if (s == "off"  || s == "2") moi = TAT;
  else if (s == "next")             moi = (CheDo)((cheDo + 1) % 3);
  else { Serial.println("  -> Lenh khong hop le (dung: auto | on | off | next)"); return; }

  cheDo = moi;
  vuaDoiCheDo = true;
}

// ---------- MQTT: giu ket noi ----------
void giuKetNoi() {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!mqtt.connected()) {
    unsigned long now = millis();
    if (now - lanThuMQTT < 5000) return;
    lanThuMQTT = now;

    Serial.print("Ket noi MQTT toi Pi... ");
    if (mqtt.connect(NODE_ID, MQTT_USER, MQTT_PASS, TOPIC_STATUS, 1, true, "offline")) {
      Serial.println("OK");
      mqtt.publish(TOPIC_STATUS, "online", true);
      mqtt.publish(TOPIC_MODE, maCheDo[cheDo], true);
      mqtt.subscribe(TOPIC_CMD);
      canGuiNgay = true;
    } else {
      Serial.printf("THAT BAI (rc=%d), thu lai sau 5s\n", mqtt.state());
    }
  }
  mqtt.loop();
}

// ---------- MQTT: gui trang thai ----------
void guiTrangThai() {
  static unsigned long lanGuiCuoi = 0;
  unsigned long now = millis();
  if (!mqtt.connected()) return;
  if (!canGuiNgay && now - lanGuiCuoi < CHU_KY_GUI) return;

  char kc[12];
  if (khoangCach < 0) strcpy(kc, "null");
  else snprintf(kc, sizeof(kc), "%.1f", khoangCach);

  char json[200];
  snprintf(json, sizeof(json),
    "{\"node\":\"%s\",\"mode\":\"%s\",\"pir\":%d,\"distance\":%s,\"led\":\"%s\",\"rssi\":%d,\"uptime\":%lu}",
    NODE_ID, maCheDo[cheDo], dangCoNguoi ? 1 : 0, kc, denHienTai, WiFi.RSSI(), now / 1000);

  mqtt.publish(TOPIC_STATE, json);
  lanGuiCuoi = now;
  canGuiNgay = false;
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN,   OUTPUT);
  pinMode(ECHO_PIN,   INPUT);
  pinMode(PIR_PIN,    INPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_XANH,   OUTPUT);
  pinMode(LED_VANG,   OUTPUT);
  pinMode(LED_DO,     OUTPUT);
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), xuLyNut, FALLING);

  batDen(1, 0, 0); delay(300);
  batDen(0, 1, 0); delay(300);
  batDen(0, 0, 1); delay(300);
  batDen(0, 0, 0);

  snprintf(TOPIC_STATUS, sizeof(TOPIC_STATUS), "%s/status",   NODE_ID);
  snprintf(TOPIC_STATE,  sizeof(TOPIC_STATE),  "%s/state",    NODE_ID);
  snprintf(TOPIC_MODE,   sizeof(TOPIC_MODE),   "%s/mode",     NODE_ID);
  snprintf(TOPIC_CMD,    sizeof(TOPIC_CMD),    "%s/cmd/mode", NODE_ID);

  Serial.printf("\nKet noi WiFi \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED)
    Serial.printf("\nWiFi OK - IP ESP32: %s\n", WiFi.localIP().toString().c_str());
  else
    Serial.println("\nChua ket noi duoc WiFi - he thong van chay, se tu thu lai.");

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(nhanLenh);
  mqtt.setKeepAlive(15);

  Serial.println("===== KHOI DONG XONG =====");
  Serial.printf("Che do: %s\n", tenCheDo[cheDo]);
}

// ---------- LOOP ----------
void loop() {
  unsigned long now = millis();

  giuKetNoi();

  if (vuaDoiCheDo) {
    vuaDoiCheDo = false;
    dangCoNguoi = false;
    khoangCach = -1;
    batDen(0, 0, 0);
    nhayDen(cheDo + 1);
    denHienTai = "tat";
    Serial.printf("\n>>> CHE DO: %s\n", tenCheDo[cheDo]);
    if (mqtt.connected()) mqtt.publish(TOPIC_MODE, maCheDo[cheDo], true);
    canGuiNgay = true;
  }

  if (cheDo == TAT) {
    datDen("tat");
    khoangCach = -1;
  }
  else if (cheDo == LUON_BAT) {
    doVaHienThi();
  }
  else {  // AUTO
    if (now < PIR_KHOI_DONG) {
      static unsigned long lanIn = 0;
      if (now - lanIn > 5000) {
        Serial.printf("PIR dang khoi dong... con %lu giay\n", (PIR_KHOI_DONG - now) / 1000);
        lanIn = now;
      }
      batDen(0, (now / 500) % 2, 0);
      denHienTai = "cho_pir";
    } else {
      if (digitalRead(PIR_PIN) == HIGH) {
        lanCuoiCoNguoi = now;
        if (!dangCoNguoi) {
          dangCoNguoi = true;
          canGuiNgay = true;
          Serial.println("PIR: CO NGUOI -> bat dau do");
        }
      }
      if (dangCoNguoi && now - lanCuoiCoNguoi > THOI_GIAN_GIU) {
        dangCoNguoi = false;
        khoangCach = -1;
        datDen("tat");
        canGuiNgay = true;
        Serial.println("PIR: KHONG CON NGUOI -> tat den");
      }
      if (dangCoNguoi) doVaHienThi();
    }
  }

  guiTrangThai();
  delay(30);
}
