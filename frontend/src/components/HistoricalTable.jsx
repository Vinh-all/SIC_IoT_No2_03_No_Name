import React, { useState } from 'react';
import { Table, Search, Download } from 'lucide-react';

export default function HistoricalTable({ history = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.device_id.toLowerCase().includes(term) ||
      (item.received_at && item.received_at.toLowerCase().includes(term))
    );
  });

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Table size={20} color="#38bdf8" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc' }}>
            Lịch Sử Dữ Liệu Cảm Biến (SQLite: sensor_logs)
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Tìm theo thiết bị hoặc ngày..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="btn-secondary"
              style={{ paddingLeft: '1.8rem', width: 220, fontSize: '0.8rem' }}
            />
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: 8, top: 10 }} />
          </div>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Thời gian tiếp nhận</th>
              <th>Thiết bị</th>
              <th>Nhiệt độ (°C)</th>
              <th>Độ ẩm (%)</th>
              <th>Khí Gas MQ-2 (ADC)</th>
              <th>Âm thanh (Peak ADC)</th>
              <th>Chuyển động (PIR)</th>
              <th>Chạm (TTP223)</th>
              <th>Khoảng cách (cm)</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                  Không tìm thấy dữ liệu lịch sử nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredHistory.map((item, idx) => (
                <tr key={idx}>
                  <td>#{idx + 1}</td>
                  <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {item.received_at ? item.received_at.substring(0, 19).replace('T', ' ') : '--'}
                  </td>
                  <td><strong>{item.device_id}</strong></td>
                  <td style={{ color: item.temperature > 40 ? '#f87171' : 'inherit' }}>
                    {item.temperature.toFixed(1)}
                  </td>
                  <td>{item.humidity.toFixed(1)}</td>
                  <td style={{ color: item.gas_adc > 1800 ? '#f87171' : 'inherit', fontWeight: item.gas_adc > 1800 ? 700 : 'normal' }}>
                    {item.gas_adc}
                  </td>
                  <td>{item.sound_adc}</td>
                  <td>
                    <span style={{ color: item.motion === 1 ? '#fbbf24' : '#64748b', fontWeight: item.motion === 1 ? 700 : 'normal' }}>
                      {item.motion === 1 ? 'CÓ (1)' : 'Không (0)'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: item.touch === 1 ? '#f87171' : '#64748b', fontWeight: item.touch === 1 ? 700 : 'normal' }}>
                      {item.touch === 1 ? 'CHẠM (1)' : 'An toàn (0)'}
                    </span>
                  </td>
                  <td style={{ color: item.distance_cm < 40 ? '#fbbf24' : 'inherit' }}>
                    {item.distance_cm.toFixed(1)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
