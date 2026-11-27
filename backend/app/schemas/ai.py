from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field
from datetime import datetime

class AITrainRequest(BaseModel):
    """
    Tham số yêu cầu huấn luyện mô hình Isolation Forest
    """
    use_database: bool = Field(True, description="Sử dụng dữ liệu từ bảng sensor_logs trong SQLite")
    contamination: float = Field(0.05, ge=0.01, le=0.20, description="Tỷ lệ ngoại lệ ước tính (0.01 đến 0.20)")
    n_estimators: int = Field(100, ge=50, le=300, description="Số lượng cây quyết định trong rừng cô lập")

class AITrainResponse(BaseModel):
    success: bool
    message: str
    sample_count: int
    data_source: str
    features_used: List[str]
    contamination: float
    trained_at: str

class AIDetectionResult(BaseModel):
    """
    Kết quả suy luận bất thường từ thuật toán Isolation Forest
    """
    device_id: str
    is_anomaly: bool = Field(..., description="True nếu mô hình phân loại là ngoại lệ bất thường")
    anomaly_score: float = Field(..., description="Điểm bất thường chuẩn hóa (0.0: rất bình thường -> 1.0: cực kỳ bất thường)")
    raw_decision_score: float = Field(..., description="Điểm quyết định gốc từ hàm decision_function (âm: bất thường, dương: bình thường)")
    confidence: float = Field(..., description="Độ tin cậy của kết luận phân tích")
    category: str = Field(..., description="Phân loại: 'NORMAL' hoặc 'AI_ANOMALY'")
    analysis_summary: str = Field(..., description="Nhận định của mô hình về các đặc trưng lệch chuẩn")
    features_input: Dict[str, float] = Field(..., description="Các giá trị cảm biến đầu vào mô hình phân tích")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class AIStatusResponse(BaseModel):
    is_model_loaded: bool
    model_type: str = "Isolation Forest (Scikit-learn)"
    features_used: List[str]
    contamination: float
    sample_count: int
    last_trained_at: Optional[str] = None
    model_file: str
