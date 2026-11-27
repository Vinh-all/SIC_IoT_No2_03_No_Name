from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from app.schemas.common import BaseResponse
from app.schemas.sensor import SensorDataRecord
from app.services.storage import get_storage

router = APIRouter()

@router.get("/sensors/latest", response_model=BaseResponse[Optional[SensorDataRecord]], summary="Lấy dữ liệu cảm biến mới nhất")
def get_latest_sensor(device_id: Optional[str] = Query(None, description="Lọc theo mã thiết bị (ví dụ: ESP32_001)")):
    """
    Cung cấp bản ghi cảm biến mới nhất tiếp nhận từ MQTT.
    """
    storage = get_storage()
    record = storage.get_latest_sensor(device_id=device_id)
    if not record:
        return BaseResponse(
            success=True,
            message="Chưa có dữ liệu cảm biến nào được ghi nhận",
            data=None
        )
    return BaseResponse(
        success=True,
        message="Lấy dữ liệu cảm biến mới nhất thành công",
        data=record
    )

@router.get("/sensors/history", response_model=BaseResponse[List[SensorDataRecord]], summary="Lấy lịch sử dữ liệu cảm biến")
def get_sensor_history(
    device_id: Optional[str] = Query(None, description="Lọc theo mã thiết bị"),
    limit: int = Query(50, ge=1, le=500, description="Số lượng bản ghi tối đa")
):
    """
    Cung cấp chuỗi thời gian dữ liệu cảm biến phục vụ vẽ biểu đồ ở các giai đoạn sau.
    """
    storage = get_storage()
    history = storage.get_sensor_history(device_id=device_id, limit=limit)
    return BaseResponse(
        success=True,
        message=f"Lấy {len(history)} bản ghi lịch sử thành công",
        data=history
    )
