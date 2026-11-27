/**
 * KIỂM THỬ TÍCH HỢP HỆ THỐNG BACKEND NODE.JS (HỖ TRỢ POSTGRESQL & SQLITE)
 */
const { initDb, getDriver, closeDb } = require('./src/db');
const storage = require('./src/storage');
const ai = require('./src/ai');

async function runTests() {
  console.log('='.repeat(70));
  console.log('   KIỂM THỬ BACKEND NODE.JS RÚT GỌN (SMART AIoT SECURITY)   ');
  console.log('='.repeat(70));

  let passCount = 0;
  let totalCount = 0;

  function assertTest(name, condition, details = '') {
    totalCount++;
    if (condition) {
      passCount++;
      console.log(`[PASS] ${name} ${details ? '-> ' + details : ''}`);
    } else {
      console.error(`[FAIL] ${name} ${details ? '-> ' + details : ''}`);
    }
  }

  // 1. Khởi tạo Database
  try {
    await initDb();
    const driver = getDriver();
    const devices = await storage.getDevices();
    assertTest(`Khởi tạo CSDL [${driver.toUpperCase()}] thành công`, Array.isArray(devices), `Hiện có: ${devices.length} thiết bị`);
  } catch (e) {
    assertTest('Khởi tạo CSDL', false, e.message);
  }

  // 2. Lưu và đọc dữ liệu cảm biến
  try {
    const testRecord = {
      device_id: 'esp32_station_01',
      temperature: 28.5,
      humidity: 65.0,
      gas_adc: 450,
      sound_adc: 320,
      motion: 0,
      touch: 0,
      distance_cm: 18.0
    };
    await storage.saveSensorRecord(testRecord);
    const latest = await storage.getLatestSensor('esp32_station_01');
    const ok = latest && Number(latest.distance_cm) === 18.0;
    assertTest('Lưu và đọc dữ liệu cảm biến mới nhất', ok, `Nhiệt độ=${latest?.temperature}, Khoảng cách=${latest?.distance_cm} cm`);
  } catch (e) {
    assertTest('Lưu và đọc dữ liệu cảm biến mới nhất', false, e.message);
  }

  // 3. Truy vấn chuỗi thời gian lịch sử
  try {
    const hist = await storage.getSensorHistory('esp32_station_01', 10);
    assertTest('Truy vấn chuỗi thời gian lịch sử', Array.isArray(hist) && hist.length > 0, `Đã lấy ${hist.length} bản ghi`);
  } catch (e) {
    assertTest('Truy vấn chuỗi thời gian lịch sử', false, e.message);
  }

  // 4. Lưu và truy vấn cảnh báo an ninh
  try {
    await storage.saveAlert({
      device_id: 'esp32_station_01',
      alert_type: 'INTRUSION',
      severity: 'HIGH',
      description: 'Phát hiện đối tượng xâm nhập khoảng cách gần'
    });
    const alerts = await storage.getAlerts('esp32_station_01', 10);
    assertTest('Lưu và đọc danh sách cảnh báo an ninh', Array.isArray(alerts) && alerts.length > 0, `Có ${alerts.length} cảnh báo`);
  } catch (e) {
    assertTest('Lưu và đọc danh sách cảnh báo an ninh', false, e.message);
  }

  // 5. Đánh giá AI trên dữ liệu bình thường
  try {
    const normalReading = {
      temperature: 28.0,
      humidity: 65.0,
      gas_adc: 120,
      sound_adc: 40,
      motion: 0,
      touch: 0,
      distance_cm: 45.0
    };
    const res = ai.predict(normalReading);
    assertTest('Đánh giá AI trên dữ liệu bình thường', !res.is_anomaly, `Score=${res.anomaly_score.toFixed(4)}, Anomaly=${res.is_anomaly}`);
  } catch (e) {
    assertTest('Đánh giá AI trên dữ liệu bình thường', false, e.message);
  }

  // 6. Phát hiện dị thường đa chiều qua AI
  try {
    const anomalyReading = {
      temperature: 65.0,
      humidity: 98.0,
      gas_adc: 950,
      sound_adc: 850,
      motion: 1,
      touch: 1,
      distance_cm: 4.5
    };
    const res = ai.predict(anomalyReading);
    assertTest('Phát hiện dị thường đa chiều qua AI', res.is_anomaly, `Score=${res.anomaly_score}, Summary=${res.analysis_summary}`);
  } catch (e) {
    assertTest('Phát hiện dị thường đa chiều qua AI', false, e.message);
  }

  console.log('='.repeat(70));
  const rate = ((passCount / totalCount) * 100).toFixed(1);
  console.log(`TỔNG KẾT KIỂM THỬ: ${passCount}/${totalCount} TEST CASES ĐẠT (${rate}%)`);
  console.log('='.repeat(70));

  await closeDb();
  process.exit(passCount === totalCount ? 0 : 1);
}

runTests();
