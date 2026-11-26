import json
import smtplib
import time
from email.message import EmailMessage
import paho.mqtt.client as mqtt
import requests

import config

last_alert_time = 0.0


def send_telegram(message: str, chat_id: str | None = None):
    target_chat_id = chat_id if chat_id is not None else config.TELEGRAM_CHAT_ID
    url = f"https://api.telegram.org/bot{config.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": target_chat_id,
        "text": message,
        "parse_mode": "HTML",
    }
    resp = requests.post(url, json=payload, timeout=10)
    resp.raise_for_status()


def _normalize_recipients(recipients) -> list[str]:
    if isinstance(recipients, str):
        return [addr.strip() for addr in recipients.split(",") if addr.strip()]
    if isinstance(recipients, (list, tuple, set)):
        return [str(addr).strip() for addr in recipients if str(addr).strip()]
    return []


def send_email(subject: str, body: str, recipients=None):
    raw_recipients = recipients if recipients is not None else getattr(config, "TO_EMAILS", getattr(config, "TO_EMAIL", []))
    to_list = _normalize_recipients(raw_recipients)
    if not to_list:
        raise ValueError("Danh sách người nhận email (TO_EMAILS) đang trống.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = config.SMTP_USER
    msg["To"] = ", ".join(to_list)
    msg.set_content(body)

    with smtplib.SMTP_SSL(config.SMTP_SERVER, config.SMTP_PORT, timeout=10) as smtp:
        smtp.login(config.SMTP_USER, config.SMTP_PASS)
        smtp.send_message(msg, from_addr=config.SMTP_USER, to_addrs=to_list)


def dispatch_multi_channel_alert(reasons: list[str], data: dict):
    global last_alert_time
    now = time.time()

    if now - last_alert_time < config.COOLDOWN_SECONDS:
        return

    last_alert_time = now
    reason_text = ", ".join(reasons)
    summary = (
        f"🚨 <b>CẢNH BÁO HỆ THỐNG IoT</b>\n"
        f"<b>Nguyên nhân:</b> {reason_text}\n"
        f"<b>Nhiệt độ / Độ ẩm:</b> {data.get('temp')}°C / {data.get('hum')}%\n"
        f"<b>Khoảng cách (HC-SR04):</b> {data.get('dist')} cm\n"
        f"<b>Hồng ngoại (HC-SR501):</b> {data.get('pir')}\n"
        f"<b>Âm thanh (Sound):</b> {data.get('sound')}"
    )

    try:
        send_telegram(summary)
        print(f"[OK] Đã gửi cảnh báo Telegram tới nhóm ({config.TELEGRAM_CHAT_ID})")
    except Exception as exc:
        print(f"[ERR] Lỗi Telegram: {exc}")

    try:
        plain_body = (
            f"Cảnh báo IoT: {reason_text}\n"
            f"Nhiệt độ: {data.get('temp')} C | Độ ẩm: {data.get('hum')} %\n"
            f"Khoảng cách: {data.get('dist')} cm | PIR: {data.get('pir')} | Sound: {data.get('sound')}"
        )
        send_email(f"[IoT Alert] {reason_text}", plain_body)
        print(f"[OK] Đã gửi cảnh báo Email tới {len(config.TO_EMAILS)} người nhận")
    except Exception as exc:
        print(f"[ERR] Lỗi Email: {exc}")


def evaluate_sensor_data(data: dict):
    reasons = []
    temp = data.get("temp", -1)
    dist = data.get("dist", -1)
    pir = data.get("pir", 0)
    sound = data.get("sound", 0)

    if temp >= config.TEMP_THRESHOLD:
        reasons.append(f"Quá nhiệt ({temp}°C)")
    if 0 < dist <= config.DIST_THRESHOLD_CM:
        reasons.append(f"Vật thể quá gần ({dist} cm)")
    if pir == 1:
        reasons.append("Phát hiện chuyển động PIR")
    if sound >= config.SOUND_THRESHOLD:
        reasons.append(f"Tiếng ồn lớn ({sound})")

    if reasons:
        dispatch_multi_channel_alert(reasons, data)


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"[MQTT] Đã kết nối (code={reason_code}). Đang lắng nghe {config.MQTT_TOPIC}...")
    client.subscribe(config.MQTT_TOPIC)


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        print(f"[DATA] {payload}")
        evaluate_sensor_data(payload)
    except json.JSONDecodeError:
        print("[ERR] Payload không phải JSON hợp lệ:", msg.payload)


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(config.MQTT_BROKER, config.MQTT_PORT, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()