-- ==============================================================================
-- SCHEMA CƠ SỞ DỮ LIỆU SQLITE CHÍNH THỨC - SMART AIoT SECURITY (GIAI ĐOẠN 4)
-- ==============================================================================
-- Bật kiểm tra toàn vẹn khóa ngoại (Foreign Key Constraints)
PRAGMA foreign_keys = ON;

-- 1. BẢNG devices: Lưu trữ thông tin và trạng thái thiết bị ESP32
CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(50) PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'ESP32',
    status VARCHAR(20) DEFAULT 'offline',            -- 'online' hoặc 'offline'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG sensor_logs: Lưu chuỗi thời gian dữ liệu cảm biến nhận từ MQTT
CREATE TABLE IF NOT EXISTS sensor_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id VARCHAR(50) NOT NULL,
    temperature REAL NOT NULL,                       -- Nhiệt độ (°C)
    humidity REAL NOT NULL,                          -- Độ ẩm (%)
    gas_adc INTEGER NOT NULL,                        -- Giá trị ADC MQ-2 sau lọc EMA
    sound_adc INTEGER NOT NULL,                      -- Biên độ âm thanh Peak-to-Peak
    motion INTEGER NOT NULL,                         -- 0 (yên tĩnh) hoặc 1 (có chuyển động)
    touch INTEGER NOT NULL,                          -- 0 (không chạm) hoặc 1 (tiếp xúc)
    distance_cm REAL NOT NULL,                       -- Khoảng cách đo bằng siêu âm (cm)
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Thời điểm ghi nhận
    FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- 3. BẢNG security_alerts: Lưu trữ các sự kiện và cảnh báo an ninh
CREATE TABLE IF NOT EXISTS security_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,                 -- 'INTRUSION', 'GAS_LEAK', 'TEMP_HIGH', 'AI_ANOMALY'
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',  -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    description TEXT,                                -- Nội dung mô tả chi tiết cảnh báo
    is_resolved INTEGER DEFAULT 0,                   -- 0 (chưa xử lý), 1 (đã xử lý)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Thời gian phát sinh cảnh báo
    resolved_at TIMESTAMP NULL,                      -- Thời gian xác nhận/xử lý cảnh báo nếu có
    FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- CHỈ MỤC (INDEXES) TỐI ƯU HÓA TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_logs(device_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_alert_device_time ON security_alerts(device_id, created_at);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
