from typing import Optional
from pydantic import BaseModel
from .sensor import SensorDataRecord

class DeviceStatus(BaseModel):
    device_id: str
    status: str  # 'online' | 'offline'
    last_seen: str
    last_sensor_data: Optional[SensorDataRecord] = None
