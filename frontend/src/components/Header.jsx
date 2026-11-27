import React from 'react';
import { ShieldCheck, ShieldAlert, Cpu, RefreshCw, Radio, Server } from 'lucide-react';

export default function Header({
  health,
  backendOnline,
  devices,
  selectedDevice,
  onSelectDevice,
  onRefresh,
  isRefreshing,
  lastUpdated
}) {
  const brokerConnected = health?.broker_connected;

  return (
    <header className="header">
      <div className="brand-section">
        <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)', display: 'flex' }}>
          <ShieldCheck size={26} color="#fff" />
        </div>
        <div>
          <h1 className="brand-title">SMART AIoT SECURITY</h1>
          <p className="brand-subtitle">Hệ thống giám sát & Phát hiện xâm nhập thông minh (ESP32 + MQTT + AI)</p>
        </div>
      </div>

      <div className="header-controls">
        {/* Lựa chọn thiết bị */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Cpu size={16} color="#94a3b8" />
          <select
            value={selectedDevice || ''}
            onChange={(e) => onSelectDevice(e.target.value)}
            className="btn-secondary"
            style={{ fontWeight: 600, color: '#38bdf8' }}
          >
            {devices && devices.length > 0 ? (
              devices.map((d) => (
                <option key={d.device_id} value={d.device_id}>
                  {d.device_id} ({d.status})
                </option>
              ))
            ) : (
              <option value="ESP32_001">ESP32_001 (Mặc định)</option>
            )}
          </select>
        </div>

        {/* Trạng thái Backend */}
        <div className={`status-pill ${backendOnline ? '' : 'offline'}`} title="Trạng thái máy chủ FastAPI">
          <Server size={14} />
          <span className="status-dot"></span>
          <span>{backendOnline ? 'Backend Online' : 'Backend Mất kết nối'}</span>
        </div>

        {/* Trạng thái MQTT Broker */}
        <div className={`status-pill ${brokerConnected ? '' : 'offline'}`} title="Trạng thái kết nối Mosquitto Broker">
          <Radio size={14} />
          <span className="status-dot"></span>
          <span>{brokerConnected ? 'MQTT Broker: OK' : 'MQTT Broker: Mất'}</span>
        </div>

        {/* Nút Làm mới thủ công */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn-primary"
          title="Làm mới dữ liệu tức thì"
        >
          <RefreshCw size={14} className={isRefreshing ? 'status-dot' : ''} />
          <span>Làm mới</span>
        </button>
      </div>
    </header>
  );
}
