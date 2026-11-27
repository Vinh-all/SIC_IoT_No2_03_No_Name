/**
 * REPOSITORY THAO TÁC CƠ SỞ DỮ LIỆU ĐA NỀN TẢNG (POSTGRESQL & SQLITE)
 */
const { query } = require('./db');

class Storage {
  async ensureDevice(deviceId, deviceName = null) {
    const name = deviceName || `Trạm ${deviceId}`;
    const sql = `
      INSERT INTO devices (device_id, device_name, device_type, status, created_at, updated_at)
      VALUES (?, ?, 'ESP32', 'online', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(device_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;
    `;
    await query(sql, [deviceId, name]);
  }

  async saveSensorRecord(record) {
    await this.ensureDevice(record.device_id);

    const sql = `
      INSERT INTO sensor_logs (
        device_id, temperature, humidity, gas_adc, sound_adc, motion, touch, distance_cm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      record.device_id,
      record.temperature,
      record.humidity,
      record.gas_adc,
      record.sound_adc,
      record.motion,
      record.touch,
      record.distance_cm
    ]);
    return record;
  }

  async getLatestSensor(deviceId = null) {
    if (deviceId) {
      const sql = `
        SELECT id, device_id, temperature, humidity, gas_adc, sound_adc, motion, touch, distance_cm, recorded_at
        FROM sensor_logs
        WHERE device_id = ?
        ORDER BY recorded_at DESC, id DESC
        LIMIT 1
      `;
      const rows = await query(sql, [deviceId]);
      return rows[0] || null;
    }

    const sql = `
      SELECT id, device_id, temperature, humidity, gas_adc, sound_adc, motion, touch, distance_cm, recorded_at
      FROM sensor_logs
      ORDER BY recorded_at DESC, id DESC
      LIMIT 1
    `;
    const rows = await query(sql, []);
    return rows[0] || null;
  }

  async getSensorHistory(deviceId = null, limit = 50) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);
    let rows;
    if (deviceId) {
      const sql = `
        SELECT id, device_id, temperature, humidity, gas_adc, sound_adc, motion, touch, distance_cm, recorded_at
        FROM sensor_logs
        WHERE device_id = ?
        ORDER BY recorded_at DESC, id DESC
        LIMIT ?
      `;
      rows = await query(sql, [deviceId, safeLimit]);
    } else {
      const sql = `
        SELECT id, device_id, temperature, humidity, gas_adc, sound_adc, motion, touch, distance_cm, recorded_at
        FROM sensor_logs
        ORDER BY recorded_at DESC, id DESC
        LIMIT ?
      `;
      rows = await query(sql, [safeLimit]);
    }
    return (rows || []).slice().reverse();
  }

  async saveAlert(alert) {
    await this.ensureDevice(alert.device_id);
    const alertType = alert.alert_type || alert.reason || 'SECURITY_ALERT';
    const severity = alert.severity || 'HIGH';
    const desc = alert.description || alert.reason || 'Cảnh báo vi phạm an ninh';

    const sql = `
      INSERT INTO security_alerts (device_id, alert_type, severity, description, is_resolved, created_at)
      VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `;
    await query(sql, [alert.device_id, alertType, severity, desc]);

    return {
      device_id: alert.device_id,
      alert_type: alertType,
      severity,
      description: desc,
      is_resolved: 0
    };
  }

  async getAlerts(deviceId = null, limit = 50) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    let rows;
    if (deviceId) {
      const sql = `
        SELECT id, device_id, alert_type, severity, description, is_resolved, created_at, resolved_at
        FROM security_alerts
        WHERE device_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `;
      rows = await query(sql, [deviceId, safeLimit]);
    } else {
      const sql = `
        SELECT id, device_id, alert_type, severity, description, is_resolved, created_at, resolved_at
        FROM security_alerts
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `;
      rows = await query(sql, [safeLimit]);
    }
    return rows || [];
  }

  async resolveAlert(alertId) {
    const sql = `
      UPDATE security_alerts
      SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await query(sql, [alertId]);
    return { id: alertId, is_resolved: 1 };
  }

  async updateDeviceStatus(deviceId, status) {
    const sql = `
      INSERT INTO devices (device_id, device_name, device_type, status, created_at, updated_at)
      VALUES (?, ?, 'ESP32', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(device_id) DO UPDATE SET status = ?, updated_at = CURRENT_TIMESTAMP;
    `;
    await query(sql, [deviceId, `Trạm ${deviceId}`, status, status]);
  }

  async getDevices() {
    const sql = `
      SELECT device_id, device_name, device_type, status, created_at, updated_at
      FROM devices
      ORDER BY updated_at DESC
    `;
    const rows = await query(sql, []);
    return rows || [];
  }
}

module.exports = new Storage();
