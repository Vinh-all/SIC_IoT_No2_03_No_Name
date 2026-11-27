from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from app.schemas.common import BaseResponse
from app.schemas.sensor import SensorDataPayload
from app.schemas.ai import AITrainRequest, AITrainResponse, AIDetectionResult, AIStatusResponse
from app.services.ai_service import ai_service

router = APIRouter()

@router.post("/ai/train", response_model=BaseResponse[AITrainResponse], summary="Kích hoạt huấn luyện mô hình Isolation Forest")
def train_model(request: AITrainRequest = AITrainRequest()):
    """
    Huấn luyện mô hình Isolation Forest từ dữ liệu lịch sử trong SQLite hoặc tập Baseline chuẩn hóa.
    """
    try:
        response = ai_service.train(
            use_database=request.use_database,
            contamination=request.contamination,
            n_estimators=request.n_estimators
        )
        return BaseResponse(
            success=True,
            message=response.message,
            data=response
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi huấn luyện mô hình: {str(e)}")

@router.get("/ai/status", response_model=BaseResponse[AIStatusResponse], summary="Xem trạng thái mô hình AI hiện tại")
def get_ai_status():
    """
    Kiểm tra xem mô hình Isolation Forest đã được nạp hay chưa, số lượng mẫu huấn luyện và tỷ lệ ngoại lệ.
    """
    status = ai_service.get_status()
    return BaseResponse(
        success=True,
        message="Lấy trạng thái mô hình AI thành công",
        data=status
    )

@router.post("/ai/detect", response_model=BaseResponse[AIDetectionResult], summary="Phân tích bất thường cho một bản ghi cảm biến tức thời")
def detect_anomaly(payload: SensorDataPayload):
    """
    Nhận dữ liệu cảm biến và trả về kết quả phân tích ngoại lệ đa chiều từ Isolation Forest.
    """
    result = ai_service.predict(payload)
    return BaseResponse(
        success=True,
        message="Phân tích bất thường hoàn tất",
        data=result
    )

@router.get("/ai/latest", response_model=BaseResponse[Optional[AIDetectionResult]], summary="Lấy kết quả phân tích AI mới nhất")
def get_latest_ai_result(device_id: Optional[str] = Query(None, description="Lọc theo mã thiết bị (ví dụ: ESP32_001)")):
    """
    Lấy kết quả phân tích AI gần nhất của thiết bị từ bộ nhớ đệm RAM.
    """
    result = ai_service.get_latest_prediction(device_id=device_id)
    if not result:
        return BaseResponse(
            success=True,
            message="Chưa có kết quả phân tích AI nào được ghi nhận",
            data=None
        )
    return BaseResponse(
        success=True,
        message="Lấy kết quả phân tích AI mới nhất thành công",
        data=result
    )

@router.get("/ai/history", response_model=BaseResponse[List[AIDetectionResult]], summary="Lấy lịch sử các phân tích AI")
def get_ai_history(
    device_id: Optional[str] = Query(None, description="Lọc theo mã thiết bị"),
    limit: int = Query(50, ge=1, le=200, description="Số lượng kết quả tối đa")
):
    """
    Lấy lịch sử các lần phân tích và phát hiện bất thường từ mô hình AI lưu trong bộ nhớ tạm.
    """
    history = ai_service.get_prediction_history(device_id=device_id, limit=limit)
    return BaseResponse(
        success=True,
        message=f"Lấy {len(history)} bản ghi phân tích AI thành công",
        data=history
    )
