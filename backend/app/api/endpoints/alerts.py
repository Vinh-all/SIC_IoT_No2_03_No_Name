from typing import List, Optional
from fastapi import APIRouter, Query
from app.schemas.common import BaseResponse
from app.schemas.alert import AlertRecord
from app.services.storage import get_storage

router = APIRouter()

@router.get("/alerts", response_model=BaseResponse[List[AlertRecord]], summary="Lấy danh sách các cảnh báo an ninh")
def get_alerts(
    device_id: Optional[str] = Query(None, description="Lọc theo mã thiết bị"),
    limit: int = Query(50, ge=1, le=200, description="Số lượng cảnh báo tối đa")
):
    """
    Cung cấp danh sách sự kiện cảnh báo an ninh tiếp nhận từ topic aiot/security/alerts.
    """
    storage = get_storage()
    alerts = storage.get_alerts(device_id=device_id, limit=limit)
    return BaseResponse(
        success=True,
        message=f"Lấy {len(alerts)} cảnh báo thành công",
        data=alerts
    )
