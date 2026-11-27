from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class AlertPayload(BaseModel):
    """
    Schema nhận bản tin cảnh báo từ MQTT topic aiot/security/alerts
    """
    device_id: str
    alert: int = 1
    reason: str
    gas_adc: Optional[int] = None
    sound_adc: Optional[int] = None
    motion: Optional[int] = None
    touch: Optional[int] = None
    distance_cm: Optional[float] = None

class AlertRecord(AlertPayload):
    id: int
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
