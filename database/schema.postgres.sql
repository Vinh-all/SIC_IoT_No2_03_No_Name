-- ==============================================================================
-- SCHEMA CƠ SỞ DỮ LIỆU POSTGRESQL CHUẨN THỰC TẾ - SMART AIoT SECURITY
-- ==============================================================================
-- Có thể import trực tiếp vào PostgreSQL via: psql -U postgres -d smart_aiot_security -f schema.postgres.sql
-- Hoặc chạy trực tiếp trên Supabase / Neon / pgAdmin / DBeaver / AWS RDS

-- 1. BẢNG devices: Quản lý thiết bị IoT (ESP32, Raspberry Pi)
CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(50) PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'ESP32',
    status VARCHAR(20) DEFAULT 'offline',            -- 'online' hoặc 'offline'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG sensor_logs: Chuỗi thời gian đo đạc đa cảm biến nhận từ MQTT
CREATE TABLE IF NOT EXISTS sensor_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    temperature DOUBLE PRECISION NOT NULL,           -- Nhiệt độ (°C)
    humidity DOUBLE PRECISION NOT NULL,              -- Độ ẩm (%)
    gas_adc INTEGER NOT NULL,                        -- Giá trị MQ-2 sau lọc EMA
    sound_adc INTEGER NOT NULL,                      -- Biên độ âm thanh Peak-to-Peak
    motion SMALLINT NOT NULL DEFAULT 0,              -- 0 (yên tĩnh) hoặc 1 (phát hiện chuyển động)
    touch SMALLINT NOT NULL DEFAULT 0,               -- 0 (không chạm) hoặc 1 (tiếp xúc)
    distance_cm DOUBLE PRECISION NOT NULL,           -- Khoảng cách đo bằng siêu âm (cm)
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sensor_device FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- 3. BẢNG security_alerts: Lưu trữ cảnh báo an ninh & bất thường phát hiện bởi AI
CREATE TABLE IF NOT EXISTS security_alerts (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,                 -- 'INTRUSION', 'GAS_LEAK', 'TEMP_HIGH', 'AI_ANOMALY'
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',  -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    description TEXT,                                -- Chi tiết diễn giải nguy cơ
    is_resolved SMALLINT DEFAULT 0,                  -- 0 (chưa xử lý), 1 (đã giải quyết)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_alert_device FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- CHỈ MỤC TỐI ƯU HÓA TRUY VẤN TẢI CAO (INDEXES)
CREATE INDEX IF NOT EXISTS idx_sensor_device_time ON sensor_logs(device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_device_time ON security_alerts(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON security_alerts(is_resolved) WHERE is_resolved = 0;

-- KHỞI TẠO DỮ LIỆU THIẾT BỊ MẪU BAN ĐẦU
INSERT INTO devices (device_id, device_name, device_type, status)
VALUES 
    ('esp32_station_01', 'ESP32 Trạm Giám Sát Cảm Biến', 'ESP32', 'online'),
    ('rpi5_master_gateway', 'Raspberry Pi 5 Gateway & AI Engine', 'RaspberryPi', 'online')
ON CONFLICT (device_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;
