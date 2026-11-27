from typing import Generic, TypeVar, Optional, List
from pydantic import BaseModel

T = TypeVar("T")

class BaseResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Thành công"
    data: Optional[T] = None

class HealthResponse(BaseModel):
    status: str
    broker_connected: bool
    total_messages_received: int
    uptime_seconds: float
    timestamp: str
