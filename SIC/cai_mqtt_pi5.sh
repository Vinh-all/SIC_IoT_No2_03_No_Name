#!/bin/bash
# ===== CAI MQTT BROKER (MOSQUITTO) TREN RASPBERRY PI 5 =====
# Chay tren Pi:  bash cai_mqtt_pi5.sh
# Khi duoc hoi mat khau: nhap DUNG gia tri MQTT_PASS trong code ESP32.

set -e

MQTT_USER="esp01"

echo "==> Cai mosquitto..."
sudo apt update
sudo apt install -y mosquitto mosquitto-clients

echo "==> Tao user MQTT: $MQTT_USER"
if [ -f /etc/mosquitto/passwd ]; then
  sudo mosquitto_passwd /etc/mosquitto/passwd "$MQTT_USER"      # them vao file cu
else
  sudo mosquitto_passwd -c /etc/mosquitto/passwd "$MQTT_USER"   # tao file moi
fi
sudo chown mosquitto:mosquitto /etc/mosquitto/passwd
sudo chmod 640 /etc/mosquitto/passwd

echo "==> Ghi cau hinh /etc/mosquitto/conf.d/esp.conf"
sudo tee /etc/mosquitto/conf.d/esp.conf > /dev/null <<'EOF'
listener 1883 0.0.0.0
allow_anonymous false
password_file /etc/mosquitto/passwd
EOF

echo "==> Khoi dong mosquitto"
sudo systemctl enable mosquitto
sudo systemctl restart mosquitto
sudo systemctl --no-pager status mosquitto | head -n 5

echo ""
echo "XONG. IP cua Pi:"
hostname -I
echo ""
echo "Xem du lieu ESP32 gui len:"
echo "  mosquitto_sub -h localhost -u $MQTT_USER -P 'MAT_KHAU' -t '$MQTT_USER/#' -v"
echo "Gui lenh doi che do (auto | on | off | next):"
echo "  mosquitto_pub -h localhost -u $MQTT_USER -P 'MAT_KHAU' -t '$MQTT_USER/cmd/mode' -m on"
