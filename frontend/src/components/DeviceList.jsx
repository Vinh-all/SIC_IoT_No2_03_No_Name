import React from 'react';
import { Cpu, Wifi, WifiOff, CheckCircle2, Clock } from 'lucide-react';

export default function DeviceList({ devices = [] }) {
  if (devices.length === 0) {
    return (
      <div className="chart-card" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
        Chưa có thiết bị ESP32 nào được ghi nhận trong cơ sở dữ liệu.
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc' }}>Danh Sách Thiết Bị ESP32 Đang Quản Lý</h3>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Bảng SQLite: devices</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {devices.map((device) => {
          const isOnline = device.status === 'online';
          return (
            <div
              key={device.device_id}
              style={{
                backgroundColor: '#1f2b42',
                border: '1px solid #26354f',
                borderRadius: 10,
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={20} color="#38bdf8" />
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                    {device.device_id}
                  </span>
                </div>
                <div className={`status-pill ${isOnline ? '' : 'offline'}`} style={{ fontSize: '0.75rem' }}>
                  {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div>Loại phần cứng: <strong style={{ color: '#e2e8f0' }}>ESP32 DevKit V1</strong></div>
                <div>Cập nhật gần nhất: <strong style={{ color: '#e2e8f0' }}>{device.last_seen ? device.last_seen.substring(0, 19).replace('T', ' ') : '--'}</strong></div>
              </div>

              {device.last_sensor_data && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #334155', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <div>Nhiệt độ: <strong>{device.last_sensor_data.temperature}°C</strong> | Khí gas: <strong>{device.last_sensor_data.gas_adc}</strong></div>
                  <div>Khoảng cách: <strong>{device.last_sensor_data.distance_cm} cm</strong></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
