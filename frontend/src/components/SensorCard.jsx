import React from 'react';

export default function SensorCard({
  title,
  value,
  unit = '',
  icon: Icon,
  status = 'normal',
  statusText = 'Bình thường',
  subText = '',
  isAlert = false
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'danger':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#38bdf8';
      default:
        return '#10b981';
    }
  };

  const statusColor = getStatusColor();

  return (
    <div className={`sensor-card ${isAlert ? 'alert-active' : ''}`}>
      <div className="sensor-card-header">
        <span className="sensor-card-title">{title}</span>
        <div className="sensor-icon-wrapper" style={{ color: statusColor, backgroundColor: `${statusColor}18` }}>
          {Icon && <Icon size={20} />}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', margin: '0.5rem 0' }}>
        <span className="sensor-value-large" style={{ color: isAlert ? '#f87171' : 'inherit' }}>
          {value !== null && value !== undefined ? value : '--'}
        </span>
        {unit && <span className="sensor-unit">{unit}</span>}
      </div>

      <div className="sensor-card-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: statusColor, fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor }}></span>
          {statusText}
        </span>
        {subText && <span>{subText}</span>}
      </div>
    </div>
  );
}
