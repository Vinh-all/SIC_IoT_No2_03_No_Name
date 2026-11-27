// ===== 06 - CHAN DOAN CAM BIEN PIR (KHONG WIFI) =====
// In ra moi lan PIR doi trang thai va thoi gian giu muc do.
// Noi day: PIR OUT -> GPIO 35
//
// Cach doc:
//  - Luon HIGH khong ve LOW: rut day OUT ra. Van HIGH -> GPIO35 tha noi
//    (them dien tro 10k tu GPIO35 xuong GND). Ve LOW -> vang lai Tx/Sx.
//  - HIGH vai chuc giay / vai phut moi ve LOW -> bien tro Tx dang qua lon.
//  - Code nay chay dung nhung code co WiFi bao sai -> nhieu WiFi,
//    dat PIR xa ESP32 va them tu loc 100uF + 0.1uF.

#define PIR_PIN 35

int trangThaiCu = -1;
unsigned long lanDoiCuoi = 0;

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  Serial.println("\n=== TEST PIR (khong WiFi) - cho 60s cho PIR on dinh ===");
}

void loop() {
  int v = digitalRead(PIR_PIN);
  unsigned long now = millis();

  if (v != trangThaiCu) {
    if (trangThaiCu != -1)
      Serial.printf("[%5lus] %s -> %s  (da giu %.1f giay)\n",
                    now / 1000,
                    trangThaiCu ? "HIGH" : "LOW",
                    v ? "HIGH" : "LOW",
                    (now - lanDoiCuoi) / 1000.0);
    else
      Serial.printf("[%5lus] Bat dau: %s\n", now / 1000, v ? "HIGH" : "LOW");
    trangThaiCu = v;
    lanDoiCuoi = now;
  }
  delay(20);
}
