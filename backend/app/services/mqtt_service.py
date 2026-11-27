import json
import logging
from typing import Optional
from datetime import datetime
import paho.mqtt.client as mqtt

from app.core.config import settings
from app.schemas.sensor import SensorDataPayload, SensorDataRecord
from app.schemas.alert import AlertPayload
from app.services.storage import get_storage
from app.services.ai_service import ai_service

logger = logging.getLogger("mqtt_service")
logging.basicConfig(level=logging.INFO)

class MQTTSubscriberService:
    """
    Dịch vụ MQTT Subscriber chạy nền tiếp nhận bản tin từ Mosquitto Broker.
    """
    def __init__(self):
        self._connected = False
        self._total_messages = 0
        self._start_time = datetime.now()
        self.storage = get_storage()

        # Tương thích cả paho-mqtt v2.x và v1.x
        try:
            self.client = mqtt.Client(
                mqtt.CallbackAPIVersion.VERSION2, 
                client_id=settings.MQTT_CLIENT_ID
            )
        except AttributeError:
            self.client = mqtt.Client(client_id=settings.MQTT_CLIENT_ID)

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        rc_code = rc if isinstance(rc, int) else getattr(rc, "value", rc)
        if rc_code == 0:
            self._connected = True
            logger.info(f"[MQTT] Da ket noi thanh cong den Broker {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}")
            
            # Subscribe các topic đã thống nhất
            client.subscribe(settings.MQTT_TOPIC_SENSORS)
            client.subscribe(settings.MQTT_TOPIC_STATUS)
            client.subscribe(settings.MQTT_TOPIC_ALERTS)
            logger.info(f"[MQTT] Da subscribe cac topic: {settings.MQTT_TOPIC_SENSORS}, {settings.MQTT_TOPIC_STATUS}, {settings.MQTT_TOPIC_ALERTS}")
        else:
            self._connected = False
            logger.warning(f"[MQTT] Ket noi that bai voi ma loi rc={rc_code}")

    def _on_disconnect(self, client, userdata, flags, rc, properties=None):
        self._connected = False
        logger.warning(f"[MQTT] Mat ket noi voi Broker Mosquitto (rc={rc})")

    def _on_message(self, client, userdata, msg):
        self._total_messages += 1
        topic = msg.topic
        payload_str = msg.payload.decode("utf-8", errors="ignore")
        
        try:
            data_dict = json.loads(payload_str)
        except Exception as e:
            logger.warning(f"[MQTT] Bo qua goi tin loi JSON tren topic {topic}: {e} | Payload: {payload_str}")
            return

        try:
            # 1. Tiếp nhận dữ liệu cảm biến
            if topic == settings.MQTT_TOPIC_SENSORS:
                # Kiểm duyệt dữ liệu qua Pydantic
                validated_payload = SensorDataPayload(**data_dict)
                record = SensorDataRecord(**validated_payload.model_dump())
                
                # Lưu trữ vào SQLite Database
                self.storage.save_sensor_record(record)
                logger.debug(f"[MQTT] Nhan du lieu cam bien hop le tu {record.device_id}")

                # Phân tích AI Isolation Forest theo thời gian thực (Lưu cache bộ nhớ RAM)
                ai_result = ai_service.predict(validated_payload)
                if ai_result.is_anomaly:
                    logger.warning(f"[AI ANOMALY DETECTED] Thiet bi {record.device_id} co chi so lech chuan! Score: {ai_result.anomaly_score} | {ai_result.analysis_summary}")

            # 2. Tiếp nhận trạng thái thiết bị
            elif topic == settings.MQTT_TOPIC_STATUS:
                device_id = data_dict.get("device_id", "UNKNOWN")
                status = data_dict.get("status", "unknown")
                self.storage.update_device_status(device_id, status)
                logger.info(f"[MQTT] Thiet bi {device_id} cap nhat trang thai: {status}")

            # 3. Tiếp nhận cảnh báo an ninh từ ESP32 (Ngưỡng cứng phần cứng)
            elif topic == settings.MQTT_TOPIC_ALERTS:
                alert_payload = AlertPayload(**data_dict)
                saved_alert = self.storage.save_alert(alert_payload)
                logger.warning(f"[MQTT HARD-ALERT] Canh bao theo nguong tu {saved_alert.device_id}: {saved_alert.reason}")

        except Exception as err:
            logger.error(f"[MQTT ERROR] Loi kiem duyet du lieu tu topic {topic}: {err} | Raw: {payload_str}")

    def start(self):
        try:
            logger.info(f"[MQTT] Bat dau ket noi den Broker {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}...")
            self.client.connect_async(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, keepalive=60)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"[MQTT] Khong the khoi dong MQTT Client: {e}")

    def stop(self):
        try:
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("[MQTT] Da dung MQTT Client")
        except Exception:
            pass

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def total_messages(self) -> int:
        return self._total_messages

    @property
    def uptime_seconds(self) -> float:
        return (datetime.now() - self._start_time).total_seconds()


# Singleton Service
mqtt_service = MQTTSubscriberService()
