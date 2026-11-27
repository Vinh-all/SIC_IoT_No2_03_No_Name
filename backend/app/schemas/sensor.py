from typing import Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

class SensorDataPayload(BaseModel):
    """
    Schema kiểm duyệt dữ liệu cảm biến đầu vào nhận từ ESP32 qua MQTT.
    Khớp 100% với hợp đồng JSON:
    {
      "device_id": "ESP32_001",
      "temperature": 29.5,
      "humidity": 70.2,
      "gas_adc": 850,
      "sound_adc": 420,
      "motion": 1,
      "touch": 0,
      "distance_cm": 120.5
    }
    """
    device_id: str = Field(..., description="Định danh thiết bị gửi")
    temperature: float = Field(..., description="Nhiệt độ môi trường (°C)")
    humidity: float = Field(..., description="Độ ẩm không khí (%)")
    gas_adc: int = Field(..., ge=0, le=4095, description="Giá trị ADC thô/lọc MQ-2")
    sound_adc: int = Field(..., ge=0, le=4095, description="Biên độ âm thanh Peak-to-Peak")
    motion: int = Field(..., ge=0, le=1, description="Trạng thái chuyển động (0 hoặc 1)")
    touch: int = Field(..., ge=0, le=1, description="Trạng thái cảm biến chạm (0 hoặc 1)")
    distance_cm: float = Field(..., ge=0.0, description="Khoảng cách đo bằng siêu âm (cm)")

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: float) -> float:
        if v < -40.0 or v > 80.0:
            raise ValueError(f"Nhiệt độ vượt ngoài giới hạn vật lý (-40 đến 80°C): {v}")
        return round(v, 1)

    @field_validator("humidity")
    @classmethod
    def validate_humidity(cls, v: float) -> float:
        if v < 0.0 or v > 100.0:
            raise ValueError(f"Độ ẩm không hợp lệ (0 đến 100%): {v}")
        return round(v, 1)

    @field_validator("distance_cm")
    @classmethod
    def validate_distance(cls, v: float) -> float:
        return round(v, 1)

class SensorDataRecord(SensorDataPayload):
    """
    Bản ghi dữ liệu cảm biến lưu trữ trong hệ thống, bổ sung thời gian tiếp nhận.
    """
    received_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Thời điểm Backend tiếp nhận (ISO 8601)")
