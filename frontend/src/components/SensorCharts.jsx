import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

export default function SensorCharts({ history = [] }) {
  const [pointLimit, setPointLimit] = useState(30);

  // Lấy N bản ghi gần nhất
  const chartData = history.slice(-pointLimit).map((item, idx) => {
    const timeStr = item.received_at
      ? item.received_at.split('T')[1]?.substring(0, 8) || `Điểm #${idx + 1}`
      : `#${idx + 1}`;
    return {
      ...item,
      time: timeStr
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Bộ điều khiển chọn khoảng thời gian / số mẫu */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Biểu Đồ Giám Sát Cảm Biến Thời Gian Thực</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Số điểm hiển thị:</span>
          {[15, 30, 50, 100].map((limit) => (
            <button
              key={limit}
              onClick={() => setPointLimit(limit)}
              className={pointLimit === limit ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            >
              {limit}
            </button>
          ))}
        </div>
      </div>

      {/* Biểu đồ 1: Môi trường (Nhiệt độ & Độ ẩm) */}
      <div className="chart-card">
        <div className="chart-header">
          <span style={{ fontWeight: 600, color: '#38bdf8' }}>1. Biến thiên Nhiệt độ (°C) & Độ ẩm (%)</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cảm biến DHT22</span>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#26354f" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis yAxisId="left" stroke="#38bdf8" domain={['dataMin - 2', 'dataMax + 2']} fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke="#34d399" domain={[0, 100]} fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="temperature" name="Nhiệt độ (°C)" stroke="#38bdf8" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="humidity" name="Độ ẩm (%)" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Biểu đồ 2: Khí Gas & Âm thanh (MQ-2 & KY-037) */}
      <div className="chart-card">
        <div className="chart-header">
          <span style={{ fontWeight: 600, color: '#fb923c' }}>2. Cường độ Khí Gas / Khói & Biên độ Âm thanh (Giá trị ADC)</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Chuẩn hóa ADC 12-bit (0 - 4095)</span>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#26354f" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="gas_adc" name="Khí Gas MQ-2 (ADC)" stroke="#f97316" fillOpacity={1} fill="url(#colorGas)" />
              <Area type="monotone" dataKey="sound_adc" name="Âm thanh Peak-to-Peak (ADC)" stroke="#a855f7" fillOpacity={1} fill="url(#colorSound)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Biểu đồ 3: Khoảng cách Siêu âm (HC-SR04) */}
      <div className="chart-card">
        <div className="chart-header">
          <span style={{ fontWeight: 600, color: '#818cf8' }}>3. Khoảng cách Vật thể Tiếp cận (cm)</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cảm biến siêu âm HC-SR04</span>
        </div>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#26354f" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#818cf8" fontSize={11} unit=" cm" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="distance_cm" name="Khoảng cách (cm)" stroke="#818cf8" fill="#818cf822" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
