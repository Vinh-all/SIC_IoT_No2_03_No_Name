from fastapi import APIRouter
from datetime import datetime
from app.schemas.common import BaseResponse, HealthResponse
from app.services.mqtt_service import mqtt_service

router = APIRouter()

@router.get("/health", response_model=BaseResponse[HealthResponse], summary="Kiểm tra trạng thái hệ thống Backend")
def get_health():
    """
    Trả về trạng thái hoạt động của Backend, kết nối Broker MQTT và thời gian hoạt động.
    """
    health_info = HealthResponse(
        status="healthy",
        broker_connected=mqtt_service.is_connected,
        total_messages_received=mqtt_service.total_messages,
        uptime_seconds=round(mqtt_service.uptime_seconds, 1),
        timestamp=datetime.now().isoformat()
    )
    return BaseResponse(
        success=True,
        message="Backend đang hoạt động bình thường",
        data=health_info
    )
