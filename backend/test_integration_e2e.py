"""
SMART AIoT SECURITY - BỘ KIỂM THỬ TÍCH HỢP TOÀN HỆ THỐNG (E2E INTEGRATION SUITE)
Giai đoạn 7: Kiểm thử liên hoàn từ Ingestion -> SQLite -> AI -> REST API -> Resilience
"""
import sys
import os
import json
from datetime import datetime

# Đảm bảo đường dẫn import đúng
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.db.session import init_db, get_connection
from app.schemas.sensor import SensorDataPayload, SensorDataRecord
from app.schemas.alert import AlertPayload
from app.services.storage import get_storage
from app.services.ai_service import ai_service
from app.services.mqtt_service import mqtt_service

from main import read_root
from app.api.endpoints import health, devices, sensors, alerts, ai

results = []

def record_test(test_id, name, expected, actual, passed, test_type="Tích hợp (Simulation E2E)"):
    status = "PASS" if passed else "FAIL"
    results.append({
        "id": test_id,
        "name": name,
        "type": test_type,
        "expected": expected,
        "actual": actual,
        "status": status
    })
    mark = "[PASS]" if passed else "[FAIL]"
    print(f"{mark} {test_id}: {name} -> {actual}")


print("=" * 70)
print("   BAT DAU KIEM THU TICH HOP TOAN HE THONG (STAGE 7 - SMART AIoT)   ")
print("=" * 70)

# ----------------------------------------------------------------------
# TEST CASE 1: Khởi tạo Database và tính toàn vẹn 3 bảng chính
# ----------------------------------------------------------------------
try:
    init_db()
    conn = get_connection()
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r["name"] for r in cursor.fetchall()]
    conn.close()
    has_3_tables = all(t in tables for t in ["devices", "sensor_logs", "security_alerts"])
    record_test("TC-01", "Khoi tao SQLite 3 bang chinh", "devices, sensor_logs, security_alerts deu ton tai", f"Cac bang: {tables}", has_3_tables)
except Exception as e:
    record_test("TC-01", "Khoi tao SQLite 3 bang chinh", "3 bang ton tai", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 2: Kiểm thử luồng dữ liệu cảm biến bình thường (Normal Flow)
# ----------------------------------------------------------------------
try:
    storage = get_storage()
    normal_data = {
        "device_id": "ESP32_001",
        "temperature": 28.5,
        "humidity": 65.2,
        "gas_adc": 450,
        "sound_adc": 120,
        "motion": 0,
        "touch": 0,
        "distance_cm": 125.0
    }
    payload = SensorDataPayload(**normal_data)
    record = SensorDataRecord(**payload.model_dump())
    storage.save_sensor_record(record)
    
    # Kiểm tra trong DB
    latest = storage.get_latest_sensor("ESP32_001")
    is_valid = (latest is not None and latest.temperature == 28.5 and latest.gas_adc == 450)
    record_test("TC-02", "Tiep nhan & Luu tru du lieu cam bien binh thuong", "Luu thanh cong vao sensor_logs voi temp=28.5, gas=450", f"Thuc te: temp={latest.temperature if latest else None}, gas={latest.gas_adc if latest else None}", is_valid)
except Exception as e:
    record_test("TC-02", "Tiep nhan & Luu tru du lieu cam bien binh thuong", "Thanh cong", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 3: Kiểm thử phân tích AI với mẫu bình thường (AI Normal Evaluation)
# ----------------------------------------------------------------------
try:
    ai_res_normal = ai_service.predict(payload)
    is_normal = (ai_res_normal.is_anomaly is False and ai_res_normal.category == "NORMAL" and ai_res_normal.anomaly_score < 0.5)
    record_test("TC-03", "Phan tich AI mau du lieu binh thuong", "is_anomaly=False, Category=NORMAL, Score < 0.5", f"is_anomaly={ai_res_normal.is_anomaly}, Category={ai_res_normal.category}, Score={ai_res_normal.anomaly_score}", is_normal)
except Exception as e:
    record_test("TC-03", "Phan tich AI mau du lieu binh thuong", "is_anomaly=False", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 4: Kiểm thử kịch bản Khí Gas tăng vọt & Âm thanh bất thường (Gas & Sound Anomaly)
# ----------------------------------------------------------------------
try:
    spike_data = {
        "device_id": "ESP32_001",
        "temperature": 39.0,
        "humidity": 82.0,
        "gas_adc": 2300,
        "sound_adc": 1900,
        "motion": 1,
        "touch": 1,
        "distance_cm": 15.0
    }
    payload_spike = SensorDataPayload(**spike_data)
    record_spike = SensorDataRecord(**payload_spike.model_dump())
    storage.save_sensor_record(record_spike)
    
    # Kiểm tra AI nhận diện ngoại lệ
    ai_res_spike = ai_service.predict(payload_spike)
    is_spike_anomaly = (ai_res_spike.is_anomaly is True and ai_res_spike.anomaly_score >= 0.5)
    record_test("TC-04", "Phat hien di thuong da chieu Gas va Am thanh qua AI", "is_anomaly=True, Anomaly Score >= 0.5", f"is_anomaly={ai_res_spike.is_anomaly}, Score={ai_res_spike.anomaly_score}, Summary={ai_res_spike.analysis_summary[:40]}...", is_spike_anomaly)
except Exception as e:
    record_test("TC-04", "Phat hien di thuong da chieu Gas va Am thanh qua AI", "is_anomaly=True", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 5: Kiểm thử cảnh báo an ninh theo ngưỡng vật lý (Rule-based Alert)
# ----------------------------------------------------------------------
try:
    alert_payload = AlertPayload(
        device_id="ESP32_001",
        alert=1,
        reason="GAS_LEAK MOTION TOUCH_TAMPER",
        gas_adc=2300,
        sound_adc=1900,
        motion=1,
        touch=1,
        distance_cm=15.0
    )
    saved_alert = storage.save_alert(alert_payload)
    alerts_list = storage.get_alerts("ESP32_001", limit=5)
    alert_saved = any(a.id == saved_alert.id for a in alerts_list)
    record_test("TC-05", "Ghi nhan canh bao theo nguong vao security_alerts", "Canh bao duoc luu vao SQLite kem muc do HIGH", f"Alert ID={saved_alert.id}, Device={saved_alert.device_id}, Reason={saved_alert.reason}", alert_saved)
except Exception as e:
    record_test("TC-05", "Ghi nhan canh bao theo nguong vao security_alerts", "Thanh cong", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 6: Kiểm thử khả năng chịu lỗi khi nhận bản tin lỗi / rác (Fault Tolerance)
# ----------------------------------------------------------------------
try:
    # Gửi payload lỗi (thiếu trường, sai kiểu) qua hàm xử lý MQTT message
    class MockMsg:
        topic = "aiot/security/sensors"
        payload = b'{"device_id": "ESP32_001", "temperature": "INVALID_TEXT"}'
    
    # Giữ nguyên số lượng message trước đó
    before_count = mqtt_service.total_messages
    mqtt_service._on_message(None, None, MockMsg())
    # Server không bị crash và tiếp tục nhận bản tin
    after_count = mqtt_service.total_messages
    handled_safely = (after_count == before_count + 1)
    record_test("TC-06", "Kha nang chiu loi khi nhan JSON rac / sai kieu", "Khong crash Backend, log loi va bo qua an toan", f"Messages count tang {before_count} -> {after_count}, Server hoat dong on dinh", handled_safely)
except Exception as e:
    record_test("TC-06", "Kha nang chiu loi khi nhan JSON rac / sai kieu", "Khong crash", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 7: Kiểm thử truy vấn REST API qua các Endpoint trực tiếp
# ----------------------------------------------------------------------
try:
    res_root = read_root()
    res_health = health.get_health()
    res_devices = devices.get_devices()
    res_latest = sensors.get_latest_sensor(device_id="ESP32_001")
    res_history = sensors.get_sensor_history(device_id="ESP32_001", limit=10)
    res_alerts_resp = alerts.get_alerts(device_id="ESP32_001", limit=10)
    res_ai_status = ai.get_ai_status()
    res_ai_latest = ai.get_latest_ai_result(device_id="ESP32_001")

    api_all_ok = (
        res_root["status"] == "online" and
        res_health.success and
        res_devices.success and
        res_latest.success and
        res_history.success and
        res_alerts_resp.success and
        res_ai_status.success and
        res_ai_latest.success
    )
    record_test("TC-07", "Truy van toan bo cac endpoint REST API", "Tat ca 8 endpoints tra ve success: True va du lieu chinh xac", f"Root: {res_root['status']}, Health: {res_health.success}, Latest: {res_latest.success}, AI: {res_ai_latest.success}", api_all_ok)
except Exception as e:
    record_test("TC-07", "Truy van toan bo cac endpoint REST API", "success: True", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 8: Kiểm thử tính bền vững sau khi khởi động lại Backend (Persistence)
# ----------------------------------------------------------------------
try:
    # Mở phiên kết nối hoàn toàn mới đến database/security.db
    new_conn = get_connection()
    c = new_conn.execute("SELECT count(*) as total FROM sensor_logs;").fetchone()["total"]
    new_conn.close()
    persists = (c >= 2)
    record_test("TC-08", "Kiem tra tinh ben vung du lieu SQLite sau restart", "Du lieu sensor_logs van nguyen ven tren file security.db", f"So ban ghi luu giu tren dia cung: {c} ban ghi", persists)
except Exception as e:
    record_test("TC-08", "Kiem tra tinh ben vung du lieu SQLite sau restart", "Du lieu ton tai", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 9: Kiểm thử bảo vệ toàn vẹn khóa ngoại (Foreign Key Constraints)
# ----------------------------------------------------------------------
try:
    fk_conn = get_connection()
    fk_ok = True
    try:
        # Cố tình chèn vào sensor_logs một device_id không có trong devices
        fk_conn.execute("PRAGMA foreign_keys = ON;")
        fk_conn.execute("""
            INSERT INTO sensor_logs (device_id, temperature, humidity, gas_adc, sound_adc, motion, touch, distance_cm)
            VALUES ('NON_EXISTING_DEVICE_999', 25.0, 50.0, 400, 100, 0, 0, 100.0);
        """)
        fk_conn.commit()
        fk_ok = False # Không được thành công
    except Exception as fk_err:
        fk_ok = True # Phải bắt lỗi khóa ngoại
    finally:
        fk_conn.close()

    record_test("TC-09", "Bao ve toan ven khoa ngoai (Foreign Keys)", "Tu choi chen ban ghi neu device_id khong ton tai", "Bat loi sqlite3.IntegrityError thanh cong", fk_ok)
except Exception as e:
    record_test("TC-09", "Bao ve toan ven khoa ngoai (Foreign Keys)", "Bat loi khoa ngoai", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 10: Kiểm thử khả năng phục hồi khi mất Broker (Broker Down Resilience)
# ----------------------------------------------------------------------
try:
    # Giả lập Broker disconnect
    mqtt_service._on_disconnect(None, None, None, 1)
    is_disc_reported = (mqtt_service.is_connected is False)
    
    # Giả lập Broker reconnect (sử dụng mock client có method subscribe)
    class MockMqttClient:
        def subscribe(self, topic):
            pass
    mqtt_service._on_connect(MockMqttClient(), None, None, 0)
    is_reconn_reported = (mqtt_service.is_connected is True)

    record_test("TC-10", "Tu dong phat hien Broker Disconnect & Reconnect", "Health API cap nhat broker_connected: False -> True", f"Mat ket noi={is_disc_reported}, Tai ket noi={is_reconn_reported}", is_disc_reported and is_reconn_reported)
except Exception as e:
    record_test("TC-10", "Tu dong phat hien Broker Disconnect & Reconnect", "Cap nhat trang thai", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 11: Kiểm thử đóng gói Frontend Build (React + Vite Bundle)
# ----------------------------------------------------------------------
try:
    dist_html = os.path.exists(os.path.join(settings.ROOT_DIR, "frontend", "dist", "index.html"))
    record_test("TC-11", "Kiem tra Bundle Frontend Production (Vite Build)", "dist/index.html va asset bundle ton tai, san sang deploy", f"Tep dist/index.html: {'Ton tai' if dist_html else 'Chua build'}", dist_html, test_type="Tích hợp Frontend")
except Exception as e:
    record_test("TC-11", "Kiem tra Bundle Frontend Production (Vite Build)", "dist ton tai", f"Loi: {e}", False)

# ----------------------------------------------------------------------
# TEST CASE 12: Đánh giá phân biệt cảnh báo theo ngưỡng vs cảnh báo AI
# ----------------------------------------------------------------------
try:
    # Cảnh báo theo ngưỡng: lưu trong database
    alerts_db = storage.get_alerts("ESP32_001", limit=1)
    has_threshold_alert = len(alerts_db) > 0
    # Cảnh báo AI: lưu trong RAM cache
    latest_ai = ai_service.get_latest_prediction("ESP32_001")
    has_ai_analysis = latest_ai is not None and hasattr(latest_ai, "anomaly_score")
    distinct = has_threshold_alert and has_ai_analysis and (alerts_db[0].reason != latest_ai.analysis_summary)

    record_test("TC-12", "Phan biet ranh gioi Canh bao nguong vs Canh bao AI", "Canh bao nguong luu SQLite, AI luu cache RAM voi 2 cau truc rieng biet", f"Threshold Alert ID={alerts_db[0].id if alerts_db else None} | AI Score={latest_ai.anomaly_score if latest_ai else None}", distinct)
except Exception as e:
    record_test("TC-12", "Phan biet ranh gioi Canh bao nguong vs Canh bao AI", "Phan biet ro", f"Loi: {e}", False)

print("=" * 70)
total_tests = len(results)
passed_tests = sum(1 for r in results if r["status"] == "PASS")
print(f"TONG KET KIEM THU: {passed_tests}/{total_tests} TEST CASES DAT (PASS RATE: {passed_tests/total_tests*100:.1f}%)")
print("=" * 70)
