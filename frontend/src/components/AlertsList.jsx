import React from 'react';
import { AlertTriangle, ShieldAlert, Brain, CheckCircle2, Clock } from 'lucide-react';

export default function AlertsList({ alerts = [], aiHistory = [] }) {
  // Phân biệt rõ hai loại cảnh báo:
  // 1. Cảnh báo theo ngưỡng (Rule-based Hardware Alerts)
  // 2. Cảnh báo dị thường AI (Machine Learning Outlier)

  const aiAnomalies = aiHistory.filter((item) => item.is_anomaly);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* KHỐI 1: CẢNH BÁO THEO NGƯỠNG PHẦN CỨNG (RULE-BASED) */}
      <div className="chart-card">
        <div className="chart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} color="#ef4444" />
            <span style={{ fontWeight: 600, fontSize: '1rem', color: '#f87171' }}>
              1. Cảnh Báo Theo Ngưỡng Vật Lý (Hardware Rule-based Alerts)
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lưu trữ trong SQLite: security_alerts</span>
        </div>

        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
            <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
            Hiện tại không có sự cố hoặc cảnh báo vượt ngưỡng nào được ghi nhận.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã sự kiện</th>
                  <th>Thiết bị</th>
                  <th>Loại cảnh báo</th>
                  <th>Mức độ</th>
                  <th>Thời gian phát sinh</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>#{alert.id}</td>
                    <td><strong>{alert.device_id}</strong></td>
                    <td style={{ color: '#f87171', fontWeight: 600 }}>{alert.reason || alert.alert_type}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: alert.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: alert.severity === 'HIGH' ? '#f87171' : '#fbbf24'
                      }}>
                        {alert.severity || 'MEDIUM'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {alert.created_at ? alert.created_at.substring(0, 19).replace('T', ' ') : '--'}
                    </td>
                    <td>
                      <span style={{ color: alert.is_resolved ? '#34d399' : '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
                        {alert.is_resolved ? 'Đã xác nhận' : 'Cần xử lý'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* KHỐI 2: CẢNH BÁO NGOẠI LAI THỐNG KÊ DO AI PHÁT HIỆN */}
      <div className="chart-card">
        <div className="chart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Brain size={20} color="#818cf8" />
            <span style={{ fontWeight: 600, fontSize: '1rem', color: '#818cf8' }}>
              2. Cảnh Báo Bất Thường Ngoại Lai AI (Isolation Forest Outlier Alerts)
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Phân tích thống kê xác suất (Lưu bộ nhớ RAM)</span>
        </div>

        {aiAnomalies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
            Mô hình AI chưa phát hiện mẫu dữ liệu ngoại lệ nào vượt ngưỡng Score 0.50.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Thiết bị</th>
                  <th>Anomaly Score</th>
                  <th>Độ tin cậy</th>
                  <th>Chi tiết nhận định của AI</th>
                </tr>
              </thead>
              <tbody>
                {aiAnomalies.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {item.timestamp ? item.timestamp.substring(0, 19).replace('T', ' ') : '--'}
                    </td>
                    <td><strong>{item.device_id}</strong></td>
                    <td>
                      <span style={{ color: '#f87171', fontWeight: 700 }}>
                        {item.anomaly_score.toFixed(4)}
                      </span>
                    </td>
                    <td>{(item.confidence * 100).toFixed(0)}%</td>
                    <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                      {item.analysis_summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
