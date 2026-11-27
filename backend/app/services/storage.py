from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from datetime import datetime
import threading
import logging
from app.schemas.sensor import SensorDataRecord
from app.schemas.device import DeviceStatus
from app.schemas.alert import AlertPayload, AlertRecord
from app.db.session import get_connection

logger = logging.getLogger("storage")

class BaseStorage(ABC):
    """
    Interface trừu tượng cho tầng lưu trữ dữ liệu (Repository Pattern).
    Đảm bảo tính nhất quán giữa In-Memory (Giai đoạn 3) và SQLite (Giai đoạn 4).
    """

    @abstractmethod
    def save_sensor_record(self, record: SensorDataRecord) -> None:
        pass

    @abstractmethod
    def get_latest_sensor(self, device_id: Optional[str] = None) -> Optional[SensorDataRecord]:
        pass

    @abstractmethod
    def get_sensor_history(self, device_id: Optional[str] = None, limit: int = 100) -> List[SensorDataRecord]:
        pass

    @abstractmethod
    def update_device_status(self, device_id: str, status: str, last_data: Optional[SensorDataRecord] = None) -> None:
        pass

    @abstractmethod
    def get_devices(self) -> List[DeviceStatus]:
        pass

    @abstractmethod
    def save_alert(self, payload: AlertPayload) -> AlertRecord:
        pass

    @abstractmethod
    def get_alerts(self, device_id: Optional[str] = None, limit: int = 50) -> List[AlertRecord]:
        pass


class SQLiteStorage(BaseStorage):
    """
    Tầng lưu trữ cơ sở dữ liệu vật lý SQLite chính thức (Giai đoạn 4).
    Dữ liệu được lưu vĩnh viễn trên đĩa cứng tại database/security.db.
    """

    def save_sensor_record(self, record: SensorDataRecord) -> None:
        conn = get_connection()
        try:
            with conn:
                # 1. Đảm bảo thiết bị đã đăng ký trong bảng devices (Khóa ngoại)
                conn.execute("""
                    INSERT INTO devices (device_id, device_name, device_type, status, updated_at)
                    VALUES (?, ?, 'ESP32', 'online', CURRENT_TIMESTAMP)
                    ON CONFLICT(device_id) DO UPDATE SET
                        status = 'online',
                        updated_at = CURRENT_TIMESTAMP;
                """, (record.device_id, record.device_id))

                # 2. Thêm bản ghi vào bảng sensor_logs
                conn.execute("""
                    INSERT INTO sensor_logs (
                        device_id, temperature, humidity, gas_adc, sound_adc,
                        motion, touch, distance_cm, recorded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    record.device_id, record.temperature, record.humidity,
                    record.gas_adc, record.sound_adc, record.motion,
                    record.touch, record.distance_cm, record.received_at
                ))
        except Exception as e:
            logger.error(f"[SQLITE ERROR] Loi luu sensor_logs: {e}")
            raise
        finally:
            conn.close()

    def get_latest_sensor(self, device_id: Optional[str] = None) -> Optional[SensorDataRecord]:
        conn = get_connection()
        try:
            if device_id:
                cursor = conn.execute(
                    "SELECT * FROM sensor_logs WHERE device_id = ? ORDER BY id DESC LIMIT 1;", 
                    (device_id,)
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM sensor_logs ORDER BY id DESC LIMIT 1;"
                )
            row = cursor.fetchone()
            if not row:
                return None
            return SensorDataRecord(
                device_id=row["device_id"],
                temperature=row["temperature"],
                humidity=row["humidity"],
                gas_adc=row["gas_adc"],
                sound_adc=row["sound_adc"],
                motion=row["motion"],
                touch=row["touch"],
                distance_cm=row["distance_cm"],
                received_at=str(row["recorded_at"])
            )
        finally:
            conn.close()

    def get_sensor_history(self, device_id: Optional[str] = None, limit: int = 100) -> List[SensorDataRecord]:
        conn = get_connection()
        try:
            if device_id:
                cursor = conn.execute(
                    "SELECT * FROM sensor_logs WHERE device_id = ? ORDER BY id DESC LIMIT ?;",
                    (device_id, limit)
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM sensor_logs ORDER BY id DESC LIMIT ?;",
                    (limit,)
                )
            rows = cursor.fetchall()
            # Trả về theo thứ tự thời gian tăng dần để phục vụ trực quan hóa biểu đồ
            records = [
                SensorDataRecord(
                    device_id=r["device_id"],
                    temperature=r["temperature"],
                    humidity=r["humidity"],
                    gas_adc=r["gas_adc"],
                    sound_adc=r["sound_adc"],
                    motion=r["motion"],
                    touch=r["touch"],
                    distance_cm=r["distance_cm"],
                    received_at=str(r["recorded_at"])
                ) for r in reversed(rows)
            ]
            return records
        finally:
            conn.close()

    def update_device_status(self, device_id: str, status: str, last_data: Optional[SensorDataRecord] = None) -> None:
        conn = get_connection()
        try:
            with conn:
                conn.execute("""
                    INSERT INTO devices (device_id, device_name, device_type, status, updated_at)
                    VALUES (?, ?, 'ESP32', ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(device_id) DO UPDATE SET
                        status = ?,
                        updated_at = CURRENT_TIMESTAMP;
                """, (device_id, device_id, status, status))
        finally:
            conn.close()

    def get_devices(self) -> List[DeviceStatus]:
        conn = get_connection()
        try:
            cursor = conn.execute("SELECT * FROM devices ORDER BY updated_at DESC;")
            rows = cursor.fetchall()
            device_list = []
            for r in rows:
                dev_id = r["device_id"]
                # Lấy bản ghi cảm biến mới nhất kèm theo
                cur_latest = conn.execute(
                    "SELECT * FROM sensor_logs WHERE device_id = ? ORDER BY id DESC LIMIT 1;",
                    (dev_id,)
                )
                l_row = cur_latest.fetchone()
                last_data = None
                if l_row:
                    last_data = SensorDataRecord(
                        device_id=l_row["device_id"],
                        temperature=l_row["temperature"],
                        humidity=l_row["humidity"],
                        gas_adc=l_row["gas_adc"],
                        sound_adc=l_row["sound_adc"],
                        motion=l_row["motion"],
                        touch=l_row["touch"],
                        distance_cm=l_row["distance_cm"],
                        received_at=str(l_row["recorded_at"])
                    )
                device_list.append(DeviceStatus(
                    device_id=dev_id,
                    status=r["status"],
                    last_seen=str(r["updated_at"]),
                    last_sensor_data=last_data
                ))
            return device_list
        finally:
            conn.close()

    def save_alert(self, payload: AlertPayload) -> AlertRecord:
        conn = get_connection()
        try:
            with conn:
                # Đảm bảo thiết bị đã có trong bảng devices
                conn.execute("""
                    INSERT INTO devices (device_id, device_name, device_type, status, updated_at)
                    VALUES (?, ?, 'ESP32', 'online', CURRENT_TIMESTAMP)
                    ON CONFLICT(device_id) DO UPDATE SET
                        updated_at = CURRENT_TIMESTAMP;
                """, (payload.device_id, payload.device_id))

                severity = "HIGH" if (payload.gas_adc and payload.gas_adc > 1800) or (payload.touch and payload.touch == 1) else "MEDIUM"
                cursor = conn.execute("""
                    INSERT INTO security_alerts (
                        device_id, alert_type, severity, description, is_resolved, created_at
                    ) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP);
                """, (
                    payload.device_id, payload.reason, severity,
                    f"Canh bao an ninh tu he thong: {payload.reason}"
                ))
                alert_id = cursor.lastrowid

                # Lấy thời gian created_at vừa tạo
                cur_time = conn.execute("SELECT created_at FROM security_alerts WHERE id = ?;", (alert_id,))
                t_row = cur_time.fetchone()
                time_str = str(t_row["created_at"]) if t_row else datetime.now().isoformat()

                return AlertRecord(
                    id=alert_id,
                    device_id=payload.device_id,
                    alert=payload.alert,
                    reason=payload.reason,
                    gas_adc=payload.gas_adc,
                    sound_adc=payload.sound_adc,
                    motion=payload.motion,
                    touch=payload.touch,
                    distance_cm=payload.distance_cm,
                    created_at=time_str
                )
        finally:
            conn.close()

    def get_alerts(self, device_id: Optional[str] = None, limit: int = 50) -> List[AlertRecord]:
        conn = get_connection()
        try:
            if device_id:
                cursor = conn.execute(
                    "SELECT * FROM security_alerts WHERE device_id = ? ORDER BY id DESC LIMIT ?;",
                    (device_id, limit)
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM security_alerts ORDER BY id DESC LIMIT ?;",
                    (limit,)
                )
            rows = cursor.fetchall()
            return [
                AlertRecord(
                    id=r["id"],
                    device_id=r["device_id"],
                    alert=1,
                    reason=r["alert_type"],
                    created_at=str(r["created_at"])
                ) for r in rows
            ]
        finally:
            conn.close()


# Singleton Storage Instance (Chính thức chuyển sang SQLiteStorage ở Giai đoạn 4)
_storage_instance: BaseStorage = SQLiteStorage()

def get_storage() -> BaseStorage:
    """Hàm cung cấp instance lưu trữ thống nhất cho toàn bộ hệ thống Backend."""
    return _storage_instance
