/**
 * MÁY CHỦ BACKEND CHÍNH - SMART AIoT SECURITY (EXPRESS.JS)
 */
const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const { initDb, closeDb, getDriver } = require('./src/db');
const routes = require('./src/routes');
const mqttService = require('./src/mqtt');

const app = express();

// Middleware chuẩn
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Định tuyến API
app.use(config.API_PREFIX, routes);
app.use('/', routes); // Dự phòng cho /health trực tiếp

// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} không tồn tại` });
});

// Xử lý ngoại lệ toàn cục
app.use((err, req, res, next) => {
  console.error('[UNCAUGHT ERROR]:', err);
  res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ', error: err.message });
});

// Khởi động hệ thống
async function startServer() {
  try {
    // 1. Khởi tạo Cơ sở dữ liệu (PostgreSQL hoặc SQLite)
    await initDb();

    // 2. Kích hoạt dịch vụ MQTT Ingestion
    mqttService.start();

    // 3. Lắng nghe HTTP Requests
    const server = app.listen(config.PORT, '0.0.0.0', () => {
      console.log('='.repeat(70));
      console.log(`🚀 [BACKEND NODE.JS] MÁY CHỦ ĐANG HOẠT ĐỘNG TẠI: http://localhost:${config.PORT}`);
      console.log(`📦 [DATABASE DRIVER]: ${getDriver().toUpperCase()}`);
      console.log(`📡 [MQTT BROKER]: ${config.MQTT_BROKER_HOST}:${config.MQTT_BROKER_PORT}`);
      console.log(`🛡️ [AI ENGINE]: Isolation Forest (Contamination: ${config.AI_CONTAMINATION})`);
      console.log('='.repeat(70));
    });

    // Graceful Shutdown an toàn
    const shutdown = async () => {
      console.log('\n[SERVER] Đang dừng máy chủ an toàn...');
      mqttService.stop();
      await closeDb();
      server.close(() => {
        console.log('[SERVER] Đã giải phóng toàn bộ tài nguyên. Tạm biệt!');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error('Không thể khởi động máy chủ:', err.message);
    process.exit(1);
  }
}

startServer();
