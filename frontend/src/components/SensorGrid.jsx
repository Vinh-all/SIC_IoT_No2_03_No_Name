import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  Flame, 
  Volume2, 
  Activity, 
  Fingerprint, 
  Ruler 
} from 'lucide-react';
import SensorCard from './SensorCard';

export default function SensorGrid({ data }) {
  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', backgroundColor: '#151d2f', borderRadius: '12px' }}>
        Đang chờ bản tin cảm biến đầu tiên từ thiết bị ESP32 qua MQTT...
      </div>
    );
  }

  // Đánh giá ngưỡng cảnh báo hiển thị trên giao diện
  const tempAlert = data.temperature > 40.0 || data.temperature < 10.0;
  const humiAlert = data.humidity > 85.0;
  const gasAlert = data.gas_adc > 1800;
  const soundAlert = data.sound_adc > 1500;
  const motionAlert = data.motion === 1;
  const touchAlert = data.touch === 1;
  const distanceAlert = data.distance_cm > 0 && data.distance_cm < 40.0;

  return (
    <div className="sensor-grid">
      {/* 1. Nhiệt độ */}
      <SensorCard
        title="Nhiệt độ (DHT22)"
        value={data.temperature}
        unit="°C"
        icon={Thermometer}
        status={tempAlert ? 'danger' : 'safe'}
        statusText={tempAlert ? 'Nhiệt độ bất thường' : 'An toàn'}
        subText="Ngưỡng: 10 - 40°C"
        isAlert={tempAlert}
      />

      {/* 2. Độ ẩm */}
      <SensorCard
        title="Độ ẩm không khí"
        value={data.humidity}
        unit="%"
        icon={Droplets}
        status={humiAlert ? 'warning' : 'safe'}
        statusText={humiAlert ? 'Độ ẩm cao' : 'Bình thường'}
        subText="Ngưỡng: < 85%"
        isAlert={humiAlert}
      />

      {/* 3. Khí gas / Khói (MQ-2) */}
      <SensorCard
        title="Khí gas / Khói (MQ-2)"
        value={data.gas_adc}
        unit="ADC"
        icon={Flame}
        status={gasAlert ? 'danger' : 'safe'}
        statusText={gasAlert ? 'Cảnh báo khí gas!' : 'Không khí sạch'}
        subText="Ngưỡng báo: > 1800"
        isAlert={gasAlert}
      />

      {/* 4. Âm thanh (KY-037) */}
      <SensorCard
        title="Âm thanh Peak-to-Peak"
        value={data.sound_adc}
        unit="ADC"
        icon={Volume2}
        status={soundAlert ? 'warning' : 'safe'}
        statusText={soundAlert ? 'Tiếng ồn lớn / Đột biến' : 'Môi trường yên tĩnh'}
        subText="Ngưỡng: > 1500"
        isAlert={soundAlert}
      />

      {/* 5. Chuyển động (PIR HC-SR501) */}
      <SensorCard
        title="Chuyển động (PIR)"
        value={data.motion === 1 ? 'CÓ' : 'KHÔNG'}
        unit=""
        icon={Activity}
        status={motionAlert ? 'warning' : 'safe'}
        statusText={motionAlert ? 'Phát hiện chuyển động!' : 'Yên tĩnh'}
        subText="Cảm biến hồng ngoại"
        isAlert={motionAlert}
      />

      {/* 6. Cảm biến chạm (TTP223) */}
      <SensorCard
        title="Cảm biến chạm (TTP223)"
        value={data.touch === 1 ? 'CHẠM' : 'AN TOÀN'}
        unit=""
        icon={Fingerprint}
        status={touchAlert ? 'danger' : 'safe'}
        statusText={touchAlert ? 'Có tiếp xúc chạm!' : 'Không tiếp xúc'}
        subText="Chống phá hoại thiết bị"
        isAlert={touchAlert}
      />

      {/* 7. Khoảng cách (HC-SR04) */}
      <SensorCard
        title="Khoảng cách (HC-SR04)"
        value={data.distance_cm}
        unit="cm"
        icon={Ruler}
        status={distanceAlert ? 'warning' : 'safe'}
        statusText={distanceAlert ? 'Vật cản tiếp cận gần!' : 'Phạm vi thông thoáng'}
        subText="Ngưỡng cảnh báo: < 40cm"
        isAlert={distanceAlert}
      />
    </div>
  );
}
