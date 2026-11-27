"""
Mô hình miền (Domain Models) nội bộ của hệ thống SMART AIoT SECURITY.
"""
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class DeviceEntity:
    device_id: str
    status: str
    last_seen: datetime

@dataclass
class SensorReadingEntity:
    device_id: str
    temperature: float
    humidity: float
    gas_adc: int
    sound_adc: int
    motion: int
    touch: int
    distance_cm: float
    received_at: datetime
