/*
 * ============================================================
 *  04 - DO KHOANG CACH + PIR + NUT BAM + 3 LED  (ESP32, khong WiFi)
 * ============================================================
 *  SO DO CHAN:
 *    HY-SRF05 : TRIG -> GPIO 5   | ECHO -> GPIO 18
 *    PIR      : OUT  -> GPIO 35
 *    Nut bam  : 1 chan -> GPIO 32, chan con lai -> GND
 *    LED xanh -> GPIO 27 | LED vang -> GPIO 26 | LED do -> GPIO 25
 *
 *  HOAT DONG:
 *    - Do khoang cach: gan -> DO, trung binh -> VANG, xa -> XANH
 *    - Che do AUTO     : chi do khi PIR phat hien nguoi,
 *                        khong co nguoi -> tat het den
 *    - Che do LUON BAT : do lien tuc, bo qua PIR
 *    - Che do TAT      : tat het
 *    - Nhan nut: AUTO -> LUON BAT -> TAT -> AUTO ...
 *      (3 den nhay 1 / 2 / 3 lan de bao che do moi)
 * ============================================================
 */

#define TRIG_PIN    5
#define ECHO_PIN    18
#define PIR_PIN     35
#define BUTTON_PIN  32
#define LED_XANH    27
#define LED_VANG    26
#define LED_DO      25

const float NGUONG_GAN = 20.0;               // < 20 cm      -> DO
const float NGUONG_XA  = 50.0;               // 20 - 50 cm   -> VANG, > 50 cm -> XANH
const unsigned long THOI_GIAN_GIU  = 10000;  // giu den 10s sau lan cuoi PIR thay nguoi
const unsigned long PIR_KHOI_DONG  = 30000;  // PIR can ~30s on dinh sau khi cap dien
const unsigned long TIMEOUT_US     = 30000;  // timeout sieu am (~5 m)

enum CheDo { AUTO, LUON_BAT, TAT };
const char* tenCheDo[] = { "AUTO (chi do khi co nguoi)", "LUON BAT", "TAT" };

volatile CheDo cheDo = AUTO;
volatile bool  vuaDoiCheDo = false;

unsigned long lanCuoiCoNguoi = 0;
bool dangCoNguoi = false;

// ---------- NUT BAM (ngat + chong doi) ----------
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

void nhayDen(int soLan) {
  for (int i = 0; i < soLan; i++) {
    batDen(1, 1, 1); delay(150);
    batDen(0, 0, 0); delay(150);
  }
}

void doVaHienThi() {
  float d = docKhoangCachLoc();

  if (d < 0 || d > 400) {
    batDen(1, 0, 0);
    Serial.println("  Khong co vat / ngoai tam -> XANH");
  } else if (d < NGUONG_GAN) {
    batDen(0, 0, 1);
    Serial.printf("  %.1f cm -> DO (gan)\n", d);
  } else if (d < NGUONG_XA) {
    batDen(0, 1, 0);
    Serial.printf("  %.1f cm -> VANG (trung binh)\n", d);
  } else {
    batDen(1, 0, 0);
    Serial.printf("  %.1f cm -> XANH (xa)\n", d);
  }
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

  Serial.println("\n===== KHOI DONG =====");
  Serial.printf("Che do hien tai: %s\n", tenCheDo[cheDo]);
  Serial.println("Nhan nut de doi che do.");
}

// ---------- LOOP ----------
void loop() {
  unsigned long now = millis();

  if (vuaDoiCheDo) {
    vuaDoiCheDo = false;
    dangCoNguoi = false;
    batDen(0, 0, 0);
    nhayDen(cheDo + 1);
    Serial.printf("\n>>> CHE DO: %s\n", tenCheDo[cheDo]);
  }

  switch (cheDo) {
    case TAT:
      batDen(0, 0, 0);
      delay(50);
      return;

    case LUON_BAT:
      doVaHienThi();
      break;

    case AUTO: {
      if (now < PIR_KHOI_DONG) {
        static unsigned long lanIn = 0;
        if (now - lanIn > 5000) {
          Serial.printf("PIR dang khoi dong... con %lu giay\n", (PIR_KHOI_DONG - now) / 1000);
          lanIn = now;
        }
        batDen(0, (now / 500) % 2, 0);
        delay(50);
        return;
      }

      if (digitalRead(PIR_PIN) == HIGH) {
        lanCuoiCoNguoi = now;
        if (!dangCoNguoi) {
          dangCoNguoi = true;
          Serial.println("PIR: CO NGUOI -> bat dau do");
        }
      }

      if (dangCoNguoi && now - lanCuoiCoNguoi > THOI_GIAN_GIU) {
        dangCoNguoi = false;
        batDen(0, 0, 0);
        Serial.println("PIR: KHONG CON NGUOI -> tat den");
      }

      if (dangCoNguoi) doVaHienThi();
      break;
    }
  }

  delay(30);
}
