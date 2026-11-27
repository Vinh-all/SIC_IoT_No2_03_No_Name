from typing import List
from fastapi import APIRouter
from app.schemas.common import BaseResponse
from app.schemas.device import DeviceStatus
from app.services.storage import get_storage

router = APIRouter()

@router.get("/devices", response_model=BaseResponse[List[DeviceStatus]], summary="Lấy danh sách các thiết bị ESP32")
def get_devices():
    """
    Trả về danh sách thiết bị kèm trạng thái online/offline và thời điểm kết nối gần nhất.
    """
    storage = get_storage()
    devices = storage.get_devices()
    return BaseResponse(
        success=True,
        message=f"Tìm thấy {len(devices)} thiết bị",
        data=devices
    )
