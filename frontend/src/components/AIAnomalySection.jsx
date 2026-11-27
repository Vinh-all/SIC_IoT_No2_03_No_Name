import React, { useState } from 'react';
import { Brain, Cpu, AlertTriangle, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';
import { triggerAITrain } from '../services/api';

export default function AIAnomalySection({ aiResult, aiStatus, onReloadAI }) {
  const [isTraining, setIsTraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState(null);

  const handleTrain = async () => {
    setIsTraining(true);
    setTrainMessage(null);
    try {
      const res = await triggerAITrain({ use_database: true, contamination: 0.05, n_estimators: 100 });
      setTrainMessage({ success: true, text: res.message || 'Huấn luyện AI thành công!' });
      if (onReloadAI) onReloadAI();
    } catch (err) {
      setTrainMessage({ success: false, text: 'Lỗi khi kích hoạt huấn luyện AI' });
    } finally {
      setIsTraining(false);
    }
  };

  const isAnomaly = aiResult?.is_anomaly;
  const score = aiResult?.anomaly_score !== undefined ? aiResult.anomaly_score : 0.0;
  const percentage = Math.min(100, Math.max(0, Math.round(score * 100)));

  // Màu sắc thanh đo độ bất thường
  let barColor = '#10b981'; // Xanh lá
  if (score >= 0.5) {
    barColor = '#ef4444'; // Đỏ (Dị thường)
  } else if (score >= 0.35) {
    barColor = '#f59e0b'; // Cam (Cảnh giác)
  }

  return (
    <div className="ai-overview-card">
      <div className="ai-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: 'rgba(129, 140, 248, 0.15)', color: '#818cf8', display: 'flex' }}>
            <Brain size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc' }}>
              Trí Tuệ Nhân Tạo: Phân Tích Bất Thường Đa Chiều
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              Mô hình Isolation Forest (Scikit-learn) phân tích tương quan 7 đặc trưng số
            </p>
          </div>
        </div>

        <button
          onClick={handleTrain}
          disabled={isTraining}
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <RefreshCw size={14} className={isTraining ? 'status-dot' : ''} />
          <span>{isTraining ? 'Đang huấn luyện...' : 'Huấn luyện lại AI'}</span>
        </button>
      </div>

      {trainMessage && (
        <div style={{
          padding: '0.5rem 0.85rem',
          borderRadius: 6,
          marginBottom: '1rem',
          fontSize: '0.8rem',
          backgroundColor: trainMessage.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: trainMessage.success ? '#34d399' : '#f87171',
          border: `1px solid ${trainMessage.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {trainMessage.text}
        </div>
      )}

      {/* Thanh đo điểm bất thường Anomaly Score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Chỉ số dị thường thống kê (Anomaly Score):</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.35rem', fontWeight: 700, color: barColor }}>
            {score.toFixed(4)}
          </span>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem',
            borderRadius: 4,
            fontWeight: 700,
            backgroundColor: isAnomaly ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: isAnomaly ? '#f87171' : '#34d399'
          }}>
            {isAnomaly ? 'NGOẠI LỆ / BẤT THƯỜNG' : 'PHÂN PHỐI BÌNH THƯỜNG'}
          </span>
        </div>
      </div>

      <div className="ai-score-bar-container">
        <div className="ai-score-bar" style={{ width: `${percentage}%`, backgroundColor: barColor }}></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
        <span>0.0 (Bình thường chuẩn)</span>
        <span style={{ color: '#f59e0b' }}>0.50 (Ngưỡng phân định ngoại lệ)</span>
        <span>1.0 (Cực đoan lệch chuẩn)</span>
      </div>

      {/* Nhận định chi tiết của AI */}
      <div style={{
        marginTop: '1rem',
        padding: '0.85rem 1rem',
        backgroundColor: '#0f172a',
        borderRadius: 8,
        border: '1px solid #1e293b',
        fontSize: '0.85rem',
        color: '#e2e8f0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem'
      }}>
        <Sparkles size={18} color="#818cf8" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, color: '#818cf8', marginBottom: '0.2rem' }}>Nhận định phân tích của mô hình:</div>
          <div>{aiResult?.analysis_summary || 'Đang chờ dữ liệu cảm biến để mô hình AI đánh giá phân phối...'}</div>
        </div>
      </div>

      {/* Thông số kỹ thuật mô hình */}
      <div style={{ marginTop: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.75rem', color: '#94a3b8' }}>
        <div>Trạng thái mô hình: <strong style={{ color: '#38bdf8' }}>{aiStatus?.is_model_loaded ? 'Đã nạp sẵn sàng' : 'Chưa nạp'}</strong></div>
        <div>Số mẫu huấn luyện: <strong style={{ color: '#f8fafc' }}>{aiStatus?.sample_count || 600} mẫu</strong></div>
        <div>Hệ số Contamination: <strong style={{ color: '#f8fafc' }}>{aiStatus?.contamination || 0.05} (5%)</strong></div>
        <div>Lần cập nhật cuối: <strong style={{ color: '#f8fafc' }}>{aiStatus?.last_trained_at ? aiStatus.last_trained_at.substring(0, 19).replace('T', ' ') : 'Mới khởi tạo'}</strong></div>
      </div>
    </div>
  );
}
