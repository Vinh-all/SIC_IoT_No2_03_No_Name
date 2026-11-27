import React, { useState } from 'react';
import './SmartMonitorView.css';
import {
  ShieldAlert,
  ShieldCheck,
  DoorClosed,
  DoorOpen,
  Activity,
  Zap,
  Sliders,
  Radio,
  Cpu,
  Server,
  AlertTriangle,
  Flame,
  CheckCircle2
} from 'lucide-react';

export default function SmartMonitorView({ latestSensor, backendOnline, health, selectedDevice }) {
  // Trạng thái thử nghiệm / mô phỏng tương tác
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedDistance, setSimulatedDistance] = useState(18);
  const [simulatedDoorOpen, setSimulatedDoorOpen] = useState(false);
  const [simulatedMotion, setSimulatedMotion] = useState(false);

  // 1. Khoảng cách thực tế từ cảm biến siêu âm HC-SR04
  const realDistance = (latestSensor && latestSensor.distance_cm != null && latestSensor.distance_cm > 0)
    ? Math.round(latestSensor.distance_cm * 10) / 10
    : 18;
  const currentDistance = isSimulating ? simulatedDistance : realDistance;

  // 2. Trạng thái cửa mở (Ngắt phần cứng GPIO 23 - Reed switch)
  const realDoorOpen = Boolean(latestSensor && (latestSensor.touch === 1 || latestSensor.door_open === 1));
  const isDoorOpen = isSimulating ? simulatedDoorOpen : realDoorOpen;

  // 3. Trạng thái chuyển động hồng ngoại PIR (Ngắt phần cứng GPIO 27 - HC-SR501)
  const realMotion = Boolean(latestSensor && (latestSensor.motion === 1 || latestSensor.pir_motion === 1));
  const isMotionDetected = isSimulating ? simulatedMotion : realMotion;

  // 4. Logic 3 trạng thái đèn LED theo phần cứng ESP32 thực tế:
  // - Nếu CỬA MỞ HOẶC KHOẢNG CÁCH < 10cm: LED ĐỎ BẬT (Ưu tiên cảnh báo an ninh)
  // - Nếu CỬA ĐÓNG và KHOẢNG CÁCH từ 10–30 cm: LED VÀNG BẬT (Cảnh báo cự ly trung bình)
  // - Nếu CỬA ĐÓNG và KHOẢNG CÁCH > 30 cm: LED XANH BẬT (Khu vực an toàn)
  const isRedOn = isDoorOpen || currentDistance < 10;
  const isYellowOn = !isDoorOpen && currentDistance >= 10 && currentDistance <= 30;
  const isGreenOn = !isDoorOpen && currentDistance > 30;

  // Xác định câu mô tả và màu sắc cự ly siêu âm
  let distStatusText = '';
  let distStatusColor = '';
  let barColor = '';

  if (currentDistance < 10) {
    distStatusText = 'VẬT THỂ Ở KHOẢNG CÁCH GẦN (< 10 CM)';
    distStatusColor = '#ef4444';
    barColor = '#ef4444';
  } else if (currentDistance <= 30) {
    distStatusText = 'VẬT THỂ Ở KHOẢNG CÁCH TRUNG BÌNH (10 - 30 CM)';
    distStatusColor = '#f59e0b';
    barColor = '#f59e0b';
  } else {
    distStatusText = 'VẬT THỂ Ở KHOẢNG CÁCH AN TOÀN (> 30 CM)';
    distStatusColor = '#10b981';
    barColor = '#10b981';
  }

  // Thanh tiến trình khoảng cách (tỷ lệ 0 đến 60 cm)
  const barPercent = Math.min(Math.max((currentDistance / 60) * 100, 4), 100);

  // Trạng thái kết nối MQTT Broker
  const isBrokerOnline = Boolean(health?.broker_connected);

  return (
    <div className="smart-monitor-wrapper">
      {/* 1. Header: Tiêu Đề & Trạng Thái Hệ Thống */}
      <div className="smart-header">
        <div className="smart-header-text">
          <div className="smart-title-row">
            <h1 className="smart-title">IoT Smart Monitor</h1>
            <span className="smart-hardware-pill">Raspberry Pi 5 · ESP32</span>
          </div>
          <p className="smart-subtitle">
            Hệ thống an ninh ngắt phần cứng thời gian thực · Cửa từ · Hồng ngoại PIR · Siêu âm · 3 Đèn LED
          </p>
        </div>
        <div className="smart-badge-system-online">
          <span className="smart-dot-pulse" />
          SYSTEM ONLINE
        </div>
      </div>

      {/* 2. Hai Thẻ Trạng Thái Thiết Bị (Raspberry Pi 5 & ESP32) */}
      <div className="smart-device-row">
        <div className="smart-device-card">
          <div className="smart-device-icon-wrap rpi-color">
            <Server size={22} />
          </div>
          <div className="smart-device-info">
            <div className="smart-device-name">Raspberry Pi 5 (Trung Tâm)</div>
            <div className="smart-device-state">ONLINE</div>
            <div className="smart-device-activity">
              Mosquitto Broker: {isBrokerOnline ? 'Đã kích hoạt (Port 1883)' : 'Chờ kết nối'}
            </div>
          </div>
        </div>

        <div className="smart-device-card">
          <div className="smart-device-icon-wrap esp-color">
            <Cpu size={22} />
          </div>
          <div className="smart-device-info">
            <div className="smart-device-name">ESP32 DevKit V1 (Trạm Cảm Biến)</div>
            <div className="smart-device-state">CONNECTED</div>
            <div className="smart-device-activity">
              ID: {selectedDevice || 'esp32_station_01'} · Ngắt phần cứng sẵn sàng
            </div>
          </div>
        </div>
      </div>

      {/* 3. Khối 2 Cảm Biến Ngắt Phần Cứng Tức Thì (Hardware Interrupts: Cửa & PIR) */}
      <div className="smart-interrupt-grid">
        {/* 3.1. Cảm Biến Cửa Mở Tức Thì (Door Sensor - GPIO 23) */}
        <div className={`smart-sensor-card ${isDoorOpen ? 'card-alert-door' : 'card-safe'}`}>
          <div className="smart-sensor-top">
            <div className="smart-sensor-badge-title">
              <span className="hardware-pin-tag">GPIO 23</span>
              <span className="sensor-type-name">CẢM BIẾN CỬA TỪ</span>
            </div>
            <span className={`status-pill ${isDoorOpen ? 'pill-danger' : 'pill-safe'}`}>
              {isDoorOpen ? 'NGẮT BÁO ĐỘNG' : 'BÌNH THƯỜNG'}
            </span>
          </div>

          <div className="smart-sensor-body">
            <div className="smart-sensor-icon-large">
              {isDoorOpen ? (
                <DoorOpen size={42} color="#ef4444" className="icon-pulse-alert" />
              ) : (
                <DoorClosed size={42} color="#10b981" />
              )}
            </div>
            <div className="smart-sensor-main-state">
              <div className={`smart-sensor-state-title ${isDoorOpen ? 'text-danger' : 'text-safe'}`}>
                {isDoorOpen ? 'CỬA ĐANG MỞ!' : 'CỬA ĐÓNG KÍN'}
              </div>
              <div className="smart-sensor-detail-desc">
                {isDoorOpen
                  ? 'Phát hiện ngắt phần cứng tức thì! Kích hoạt LED Đỏ cảnh báo.'
                  : 'Cửa phòng an toàn, mạch tiếp điểm khép kín.'}
              </div>
            </div>
          </div>

          <div className="smart-sensor-footer">
            <span className="interrupt-tag">
              <Zap size={13} /> Ngắt tức thì (IRAM_ATTR &lt; 1ms)
            </span>
          </div>
        </div>

        {/* 3.2. Cảm Biến Hồng Ngoại PIR (Motion Sensor - GPIO 27) */}
        <div className={`smart-sensor-card ${isMotionDetected ? 'card-alert-pir' : 'card-safe'}`}>
          <div className="smart-sensor-top">
            <div className="smart-sensor-badge-title">
              <span className="hardware-pin-tag">GPIO 27</span>
              <span className="sensor-type-name">HỒNG NGOẠI PIR (HC-SR501)</span>
            </div>
            <span className={`status-pill ${isMotionDetected ? 'pill-warning' : 'pill-safe'}`}>
              {isMotionDetected ? 'CÓ CHUYỂN ĐỘNG' : 'YÊN TĨNH'}
            </span>
          </div>

          <div className="smart-sensor-body">
            <div className="smart-sensor-icon-large">
              {isMotionDetected ? (
                <Activity size={42} color="#f59e0b" className="icon-pulse-motion" />
              ) : (
                <Radio size={42} color="#0284c7" />
              )}
            </div>
            <div className="smart-sensor-main-state">
              <div className={`smart-sensor-state-title ${isMotionDetected ? 'text-warning' : 'text-safe'}`}>
                {isMotionDetected ? 'PHÁT HIỆN NGƯỜI / CHUYỂN ĐỘNG' : 'KHÔNG CÓ CHUYỂN ĐỘNG'}
              </div>
              <div className="smart-sensor-detail-desc">
                {isMotionDetected
                  ? 'Cảm biến hồng ngoại phát hiện bức xạ thân nhiệt thay đổi trong vùng quét.'
                  : 'Không gian tĩnh, không phát hiện vật thể di chuyển.'}
              </div>
            </div>
          </div>

          <div className="smart-sensor-footer">
            <span className="interrupt-tag">
              <Zap size={13} /> Ngắt phần cứng (Debounce 150ms)
            </span>
          </div>
        </div>
      </div>

      {/* 4. Thẻ Cảm Biến Siêu Âm (ULTRASONIC SENSOR - HC-SR04) */}
      <div className="smart-ultrasonic-card">
        <div className="smart-ultrasonic-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="hardware-pin-tag">Trig 26 · Echo 25</span>
            <span className="smart-ultrasonic-tag">CẢM BIẾN KHOẢNG CÁCH SIÊU ÂM (HC-SR04)</span>
          </div>
          <span className="smart-ultrasonic-active">
            ACTIVE · 100ms
          </span>
        </div>

        <div className="smart-ultrasonic-dist-row">
          <div className="smart-ultrasonic-dist">
            {currentDistance} <span className="smart-dist-unit">cm</span>
          </div>
          <div className="smart-ultrasonic-status-box" style={{ borderColor: distStatusColor }}>
            <span className="smart-ultrasonic-status" style={{ color: distStatusColor }}>
              {distStatusText}
            </span>
          </div>
        </div>

        {/* Thanh thước đo tiến trình */}
        <div className="smart-progress-track">
          <div
            className="smart-progress-fill"
            style={{ width: `${barPercent}%`, backgroundColor: barColor }}
          />
        </div>
        <div className="smart-progress-scale">
          <span>0 cm (Quá gần)</span>
          <span>10 cm (Ngưỡng Đỏ)</span>
          <span>30 cm (Ngưỡng Vàng)</span>
          <span>60+ cm (An Toàn)</span>
        </div>
      </div>

      {/* 5. Trạng Thái Của 3 Đèn LED (LED STATUS) */}
      <div className="smart-led-section">
        <div className="smart-section-header">
          <h2 className="smart-led-title">TRẠNG THÁI 3 ĐÈN LED ĐIỀU KHIỂN (ACTUATOR STATUS)</h2>
          <span className="smart-led-subtitle">Tự động đồng bộ theo logic khoảng cách và trạng thái cửa</span>
        </div>

        <div className="smart-led-grid">
          {/* LED VÀNG */}
          <div className={`smart-led-card ${isYellowOn ? 'card-active-yellow' : ''}`}>
            <div className={`smart-bulb-glow bulb-yellow ${isYellowOn ? 'bulb-on' : 'bulb-off'}`} />
            <div className="smart-led-name">LED VÀNG</div>
            <div className={`smart-led-badge ${isYellowOn ? 'badge-yellow-on' : 'badge-off'}`}>
              {isYellowOn ? 'BẬT (ON)' : 'TẮT (OFF)'}
            </div>
            <div className="smart-led-sub">Khoảng cách 10–30 cm</div>
            <span className="led-gpio-tag">GPIO 21</span>
          </div>

          {/* LED ĐỎ */}
          <div className={`smart-led-card ${isRedOn ? 'card-active-red' : ''}`}>
            <div className={`smart-bulb-glow bulb-red ${isRedOn ? 'bulb-on' : 'bulb-off'}`} />
            <div className="smart-led-name">LED ĐỎ</div>
            <div className={`smart-led-badge ${isRedOn ? 'badge-red-on' : 'badge-off'}`}>
              {isRedOn ? 'BẬT (ON)' : 'TẮT (OFF)'}
            </div>
            <div className="smart-led-sub">
              {isDoorOpen ? 'Báo động: CỬA ĐANG MỞ!' : 'Dưới 10 cm (Quá gần)'}
            </div>
            <span className="led-gpio-tag">GPIO 18</span>
          </div>

          {/* LED XANH */}
          <div className={`smart-led-card ${isGreenOn ? 'card-active-green' : ''}`}>
            <div className={`smart-bulb-glow bulb-green ${isGreenOn ? 'bulb-on' : 'bulb-off'}`} />
            <div className="smart-led-name">LED XANH</div>
            <div className={`smart-led-badge ${isGreenOn ? 'badge-green-on' : 'badge-off'}`}>
              {isGreenOn ? 'BẬT (ON)' : 'TẮT (OFF)'}
            </div>
            <div className="smart-led-sub">Trên 30 cm (An toàn)</div>
            <span className="led-gpio-tag">GPIO 19</span>
          </div>
        </div>
      </div>

      {/* 6. Bảng Điều Khiển Mô Phỏng Thử Nghiệm Tương Tác Nhanh */}
      <div className="smart-sim-panel">
        <div className="smart-sim-header">
          <div className="smart-sim-title">
            <Sliders size={16} /> BẢNG ĐIỀU KHIỂN MÔ PHỎNG KIỂM THỬ TỨC THỜI
          </div>
          <label className="smart-sim-switch">
            <input
              type="checkbox"
              checked={isSimulating}
              onChange={(e) => setIsSimulating(e.target.checked)}
            />
            <span>{isSimulating ? 'Đang bật chế độ mô phỏng' : 'Bật chế độ thử nghiệm tương tác'}</span>
          </label>
        </div>

        {isSimulating && (
          <div className="smart-sim-controls">
            {/* Thanh trượt khoảng cách siêu âm */}
            <div className="smart-sim-control-item">
              <span className="sim-control-label">Thử nghiệm khoảng cách siêu âm:</span>
              <div className="smart-sim-slider-wrap">
                <span className="sim-min-max">2 cm</span>
                <input
                  type="range"
                  min="2"
                  max="60"
                  value={simulatedDistance}
                  onChange={(e) => setSimulatedDistance(Number(e.target.value))}
                  className="smart-sim-slider"
                />
                <span className="sim-min-max">60 cm</span>
                <span className="smart-sim-val">{simulatedDistance} cm</span>
              </div>
            </div>

            {/* Nút bật/tắt ngắt cửa */}
            <div className="smart-sim-control-item">
              <span className="sim-control-label">Thử nghiệm ngắt cảm biến cửa:</span>
              <button
                type="button"
                onClick={() => setSimulatedDoorOpen((prev) => !prev)}
                className={`sim-action-btn ${simulatedDoorOpen ? 'btn-door-open' : 'btn-door-closed'}`}
              >
                {simulatedDoorOpen ? '🚪 Mô phỏng: Cửa đang Mở (Báo động)' : '🔒 Mô phỏng: Cửa đang Đóng (An toàn)'}
              </button>
            </div>

            {/* Nút bật/tắt hồng ngoại PIR */}
            <div className="smart-sim-control-item">
              <span className="sim-control-label">Thử nghiệm ngắt hồng ngoại PIR:</span>
              <button
                type="button"
                onClick={() => setSimulatedMotion((prev) => !prev)}
                className={`sim-action-btn ${simulatedMotion ? 'btn-pir-motion' : 'btn-pir-quiet'}`}
              >
                {simulatedMotion ? '🏃‍♂️ Mô phỏng: Có người di chuyển' : '🛡️ Mô phỏng: Không gian yên tĩnh'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dòng ghi chú chân trang */}
      <div className="smart-bottom-note">
        <strong>Trạng thái dữ liệu:</strong> {isSimulating ? 'Đang chạy mô phỏng tương tác cục bộ' : 'Đang lấy dữ liệu trực tiếp từ cảm biến ESP32 qua MQTT'} · Cập nhật thời gian thực.
      </div>
    </div>
  );
}
