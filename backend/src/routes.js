/**
 * BỘ ĐỊNH TUYẾN TOÀN BỘ REST API ENDPOINTS
 * Hỗ trợ bất đồng bộ (Async/Await) tương thích cả PostgreSQL và SQLite
 */
const express = require('express');
const router = express.Router();
const storage = require('./storage');
const ai = require('./ai');
const mqttService = require('./mqtt');
const config = require('./config');
const { getDriver } = require('./db');

const serverStartTime = Date.now();

// 1. Endpoint /api/health
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Hệ thống hoạt động bình thường',
    data: {
      status: 'online',
      db_driver: getDriver(),
      broker_connected: mqttService.isConnected,
      broker_host: config.MQTT_BROKER_HOST,
      broker_port: config.MQTT_BROKER_PORT,
      total_mqtt_messages: mqttService.totalMessages,
      uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
      timestamp: new Date().toISOString()
    }
  });
});

// 2. Endpoint /api/devices
router.get('/devices', async (req, res) => {
  try {
    const devices = await storage.getDevices();
    res.json({ success: true, message: `Lấy ${devices.length} thiết bị thành công`, data: devices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// 3. Endpoint /api/sensors/latest
router.get('/sensors/latest', async (req, res) => {
  try {
    const record = await storage.getLatestSensor(req.query.device_id || null);
    res.json({
      success: true,
      message: record ? 'Lấy dữ liệu cảm biến mới nhất thành công' : 'Chưa có dữ liệu cảm biến',
      data: record
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 4. Endpoint /api/sensors/history
router.get('/sensors/history', async (req, res) => {
  try {
    const history = await storage.getSensorHistory(req.query.device_id || null, req.query.limit || 50);
    res.json({ success: true, message: `Lấy ${history.length} bản ghi lịch sử thành công`, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// 5. Endpoint /api/alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await storage.getAlerts(req.query.device_id || null, req.query.limit || 50);
    res.json({ success: true, message: `Lấy ${alerts.length} cảnh báo thành công`, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// 6. Endpoint /api/alerts/:id/resolve
router.patch('/alerts/:id/resolve', async (req, res) => {
  try {
    const result = await storage.resolveAlert(req.params.id);
    res.json({ success: true, message: 'Đã giải quyết cảnh báo thành công', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 7. Endpoint /api/ai/train
router.post('/ai/train', (req, res) => {
  try {
    ai.trainBaseline(600);
    const status = ai.getStatus();
    res.json({
      success: true,
      message: 'Huấn luyện mô hình Isolation Forest thành công',
      data: {
        training_status: 'completed',
        samples_used: status.sample_count,
        contamination: status.contamination,
        trained_at: status.last_trained_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 8. Endpoint /api/ai/status
router.get('/ai/status', (req, res) => {
  res.json({ success: true, message: 'Lấy trạng thái mô hình AI thành công', data: ai.getStatus() });
});

// 9. Endpoint /api/ai/detect
router.post('/ai/detect', (req, res) => {
  const data = req.body;
  if (!data || isNaN(Number(data.temperature)) || isNaN(Number(data.humidity))) {
    return res.status(422).json({ success: false, message: 'Dữ liệu đầu vào không hợp lệ', data: null });
  }
  const result = ai.predict(data);
  res.json({
    success: true,
    message: result.is_anomaly ? 'Phát hiện điểm bất thường ngoại lai' : 'Chỉ số bình thường',
    data: result
  });
});

// 10. Endpoint /api/ai/latest
router.get('/ai/latest', (req, res) => {
  const result = ai.getLatestPrediction(req.query.device_id || null);
  res.json({
    success: true,
    message: result ? 'Lấy kết quả phân tích AI mới nhất thành công' : 'Chưa có phân tích AI nào',
    data: result
  });
});

// 11. Endpoint /api/ai/history
router.get('/ai/history', (req, res) => {
  const history = ai.getPredictionHistory(req.query.device_id || null, req.query.limit || 50);
  res.json({ success: true, message: `Lấy ${history.length} bản ghi phân tích AI thành công`, data: history });
});

module.exports = router;
