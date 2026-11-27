/**
 * SCRIPT KHỞI TẠO BẢNG & NẠP DỮ LIỆU POSTGRESQL CHUẨN THỰC TẾ
 * SMART AIoT SECURITY
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Nạp file .env từ backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = require('pg');

async function setupPostgres() {
  console.log('======================================================================');
  console.log('   KHỞI TẠO & CẬP NHẬT CƠ SỞ DỮ LIỆU POSTGRESQL - SMART AIoT SECURITY   ');
  console.log('======================================================================');

  const connectionConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'smart_aiot_security',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      };

  console.log(`[1] Đang kết nối tới PostgreSQL Database: "${process.env.DB_NAME || 'smart_aiot_security'}"...`);
  console.log(`    Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
  console.log(`    User: ${process.env.DB_USER || 'postgres'}`);

  const client = new Client(connectionConfig);

  try {
    await client.connect();
    console.log('[PASS] Kết nối PostgreSQL thành công 100%!');

    // 2. Đọc và thực thi file schema.postgres.sql
    const schemaPath = path.resolve(__dirname, '../../database/schema.postgres.sql');
    console.log(`\n[2] Đang nạp schema từ: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    await client.query(schemaSql);
    console.log('[PASS] Tạo bảng (devices, sensor_logs, security_alerts) và các Index thành công!');

    // 3. Nạp dữ liệu mẫu thực tế và phong phú
    console.log('\n[3] Đang cập nhật dữ liệu chuẩn mẫu...');

    // 3.1 Cập nhật thiết bị
    await client.query(`
      INSERT INTO devices (device_id, device_name, device_type, status, updated_at)
      VALUES 
        ('esp32_station_01', 'ESP32 Trạm Giám Sát Cảm Biến', 'ESP32', 'online', NOW()),
        ('rpi5_master_gateway', 'Raspberry Pi 5 Gateway & AI Engine', 'RaspberryPi', 'online', NOW())
      ON CONFLICT (device_id) DO UPDATE 
      SET status = EXCLUDED.status, updated_at = NOW();
    `);

    // 3.2 Nạp chuỗi dữ liệu cảm biến (Time-series)
    // Bản ghi mới nhất chính xác 18 cm (khớp với màn hình IoT Smart Monitor)
    const baseTime = Date.now();
    const sensorRecords = [
      // Quá khứ 30 phút đến hiện tại
      { temp: 27.8, hum: 66.0, gas: 110, sound: 38, motion: 0, touch: 0, dist: 35.5, minsAgo: 30 },
      { temp: 28.0, hum: 65.8, gas: 112, sound: 40, motion: 0, touch: 0, dist: 32.0, minsAgo: 25 },
      { temp: 28.1, hum: 65.5, gas: 115, sound: 42, motion: 0, touch: 0, dist: 28.4, minsAgo: 20 },
      { temp: 28.2, hum: 65.4, gas: 118, sound: 45, motion: 0, touch: 0, dist: 25.0, minsAgo: 15 },
      { temp: 28.3, hum: 65.3, gas: 122, sound: 50, motion: 1, touch: 0, dist: 20.2, minsAgo: 10 },
      { temp: 28.4, hum: 65.2, gas: 125, sound: 55, motion: 1, touch: 0, dist: 19.0, minsAgo: 5 },
      { temp: 28.5, hum: 65.0, gas: 120, sound: 48, motion: 0, touch: 0, dist: 18.0, minsAgo: 0 } // Mới nhất: 18cm (LED VÀNG)
    ];

    for (const r of sensorRecords) {
      const recTime = new Date(baseTime - r.minsAgo * 60 * 1000);
      await client.query(`
        INSERT INTO sensor_logs (
          device_id, temperature, humidity, gas_adc, sound_adc, motion, touch, distance_cm, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, ['esp32_station_01', r.temp, r.hum, r.gas, r.sound, r.motion, r.touch, r.dist, recTime]);
    }

    // 3.3 Nạp các sự kiện cảnh báo mẫu
    await client.query(`
      INSERT INTO security_alerts (device_id, alert_type, severity, description, is_resolved, created_at)
      VALUES 
        ('esp32_station_01', 'INTRUSION', 'HIGH', 'Phát hiện vật thể tiếp cận trong phạm vi cảnh báo vàng (khoảng cách 18 cm)', 0, NOW() - INTERVAL '5 minutes'),
        ('esp32_station_01', 'AI_ANOMALY', 'HIGH', 'Mô hình Isolation Forest phát hiện tổ hợp cảm biến bất thường', 0, NOW() - INTERVAL '15 minutes'),
        ('esp32_station_01', 'GAS_LEAK', 'LOW', 'Nồng độ gas nhẹ thoáng qua (sau đó đã trở về bình thường)', 1, NOW() - INTERVAL '1 hour')
    `);

    // 4. Kiểm tra và đếm tổng số bản ghi trong các bảng
    console.log('\n[4] Kiểm tra dữ liệu thực tế sau khi tạo:');
    const devRes = await client.query('SELECT COUNT(*) as count FROM devices;');
    const sensRes = await client.query('SELECT COUNT(*) as count FROM sensor_logs;');
    const alertRes = await client.query('SELECT COUNT(*) as count FROM security_alerts;');
    const latestSens = await client.query('SELECT * FROM sensor_logs ORDER BY recorded_at DESC, id DESC LIMIT 1;');

    console.log(`    - Bảng "devices": ${devRes.rows[0].count} thiết bị`);
    console.log(`    - Bảng "sensor_logs": ${sensRes.rows[0].count} bản ghi cảm biến`);
    console.log(`    - Bảng "security_alerts": ${alertRes.rows[0].count} cảnh báo an ninh`);
    if (latestSens.rows.length > 0) {
      const ls = latestSens.rows[0];
      console.log(`    - Bản ghi cảm biến mới nhất: Thiết bị=${ls.device_id}, Khoảng cách=${ls.distance_cm} cm, Nhiệt độ=${ls.temperature}°C, Độ ẩm=${ls.humidity}%`);
    }

    console.log('\n======================================================================');
    console.log('   TẤT CẢ CÁC BẢNG & DỮ LIỆU ĐÃ ĐƯỢC CẬP NHẬT THÀNH CÔNG VÀO POSTGRESQL!   ');
    console.log('======================================================================');

  } catch (err) {
    console.error('\n[LỖI]:', err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    await client.end();
  }
}

setupPostgres();
