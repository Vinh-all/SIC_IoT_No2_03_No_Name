import os
import logging
import threading
from typing import Optional, List, Dict, Tuple
from datetime import datetime
import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.core.config import settings
from app.db.session import get_connection
from app.schemas.sensor import SensorDataPayload
from app.schemas.ai import AIDetectionResult, AIStatusResponse, AITrainResponse

logger = logging.getLogger("ai_service")

# 7 đặc trưng số được tuyển chọn từ hợp đồng cảm biến
FEATURE_NAMES = [
    "temperature",
    "humidity",
    "gas_adc",
    "sound_adc",
    "motion",
    "touch",
    "distance_cm"
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "ai_model.joblib")

class AIService:
    """
    Dịch vụ AI phân tích và phát hiện bất thường sử dụng thuật toán Isolation Forest (Scikit-learn).
    """

    def __init__(self):
        self._lock = threading.Lock()
        self.scaler: Optional[StandardScaler] = None
        self.model: Optional[IsolationForest] = None
        self.contamination: float = 0.05
        self.sample_count: int = 0
        self.last_trained_at: Optional[str] = None
        
        # Lưu trữ lịch sử dự đoán AI trong bộ nhớ RAM (Không tạo bảng DB thứ tư)
        self._latest_predictions: Dict[str, AIDetectionResult] = {}
        self._prediction_history: List[AIDetectionResult] = []
        self._max_history: int = 200

        # Tự động nạp mô hình đã lưu nếu có
        self.load_model()

    def generate_baseline_dataset(self, num_samples: int = 600) -> pd.DataFrame:
        """
        Sinh tập dữ liệu nền tảng mô phỏng phân phối môi trường phòng thiết bị bình thường:
        - Nhiệt độ: 26 - 31°C (trung bình ~28.5°C)
        - Độ ẩm: 60 - 75%
        - Khí gas MQ-2 (sạch): ADC 350 - 550
        - Âm thanh (yên tĩnh): Peak-to-Peak 80 - 250
        - Chuyển động: 96% yên tĩnh (0), 4% có người đi qua (1)
        - Chạm: 100% không chạm (0)
        - Khoảng cách: 90 - 180cm
        Kèm ~5% mẫu ngoại lệ để huấn luyện đường biên ngoại lai.
        """
        np.random.seed(42)
        normal_count = int(num_samples * 0.95)
        anomaly_count = num_samples - normal_count

        # 1. Dữ liệu bình thường
        normal_data = {
            "temperature": np.random.normal(28.5, 1.2, normal_count).clip(24.0, 33.0),
            "humidity": np.random.normal(67.0, 4.0, normal_count).clip(50.0, 80.0),
            "gas_adc": np.random.normal(450, 45, normal_count).clip(320, 600).astype(int),
            "sound_adc": np.random.normal(120, 35, normal_count).clip(60, 250).astype(int),
            "motion": np.random.choice([0, 1], size=normal_count, p=[0.96, 0.04]),
            "touch": np.zeros(normal_count, dtype=int),
            "distance_cm": np.random.normal(125.0, 20.0, normal_count).clip(70.0, 200.0)
        }
        df_normal = pd.DataFrame(normal_data)

        # 2. Dữ liệu bất thường mô phỏng (Xâm nhập, cháy khói, gõ đập)
        anomaly_data = {
            "temperature": np.random.uniform(36.0, 45.0, anomaly_count),
            "humidity": np.random.uniform(85.0, 95.0, anomaly_count),
            "gas_adc": np.random.uniform(1200, 2500, anomaly_count).astype(int),
            "sound_adc": np.random.uniform(800, 2200, anomaly_count).astype(int),
            "motion": np.ones(anomaly_count, dtype=int),
            "touch": np.random.choice([0, 1], size=anomaly_count, p=[0.5, 0.5]),
            "distance_cm": np.random.uniform(5.0, 35.0, anomaly_count)
        }
        df_anomaly = pd.DataFrame(anomaly_data)

        df = pd.concat([df_normal, df_anomaly], ignore_index=True)
        return df

    def train(self, use_database: bool = True, contamination: float = 0.05, n_estimators: int = 100) -> AITrainResponse:
        """
        Quy trình tiền xử lý và huấn luyện mô hình Isolation Forest.
        """
        with self._lock:
            data_source = "Baseline Dataset (Mô phỏng môi trường phòng học/máy tính)"
            df: Optional[pd.DataFrame] = None

            # 1. Khảo sát dữ liệu từ SQLite nếu được yêu cầu
            if use_database:
                conn = get_connection()
                try:
                    query = f"SELECT {', '.join(FEATURE_NAMES)} FROM sensor_logs;"
                    df_db = pd.read_sql_query(query, conn)
                    # Nếu có từ 30 bản ghi trở lên trong DB, ưu tiên dùng dữ liệu thực tế
                    if len(df_db) >= 30:
                        df = df_db.dropna()
                        data_source = f"SQLite Database sensor_logs ({len(df)} ban ghi thuc te)"
                        logger.info(f"[AI TRAIN] Su dung {len(df)} ban ghi tu SQLite de huan luyen.")
                    else:
                        logger.info(f"[AI TRAIN] SQLite chi co {len(df_db)} ban ghi (< 30). Tu dong su dung tap Baseline chuan hoa de bootstrap mo hinh.")
                except Exception as e:
                    logger.warning(f"[AI TRAIN] Loi doc SQLite, chuyen sang Baseline: {e}")
                finally:
                    conn.close()

            # Nếu chưa có đủ dữ liệu DB, sinh dữ liệu nền tảng mô phỏng
            if df is None or len(df) < 30:
                df = self.generate_baseline_dataset(num_samples=600)

            # 2. Tiền xử lý dữ liệu: Chuẩn hóa thang đo (StandardScaler)
            X = df[FEATURE_NAMES].values
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            # 3. Huấn luyện mô hình Isolation Forest
            model = IsolationForest(
                n_estimators=n_estimators,
                contamination=contamination,
                random_state=42,
                n_jobs=-1
            )
            model.fit(X_scaled)

            # 4. Lưu lại cấu hình và mô hình
            self.scaler = scaler
            self.model = model
            self.contamination = contamination
            self.sample_count = len(df)
            self.last_trained_at = datetime.now().isoformat()

            self.save_model()

            logger.info(f"[AI TRAIN SUCCESS] Da huan luyen xong Isolation Forest tren {self.sample_count} mau. Contamination={contamination}")

            return AITrainResponse(
                success=True,
                message="Huấn luyện mô hình Isolation Forest thành công",
                sample_count=self.sample_count,
                data_source=data_source,
                features_used=FEATURE_NAMES,
                contamination=self.contamination,
                trained_at=self.last_trained_at
            )

    def save_model(self):
        """Lưu trữ mô hình và bộ tiền xử lý ra file joblib."""
        try:
            bundle = {
                "scaler": self.scaler,
                "model": self.model,
                "contamination": self.contamination,
                "sample_count": self.sample_count,
                "last_trained_at": self.last_trained_at,
                "features": FEATURE_NAMES
            }
            joblib.dump(bundle, MODEL_PATH)
            logger.info(f"[AI] Da luu mo hinh thanh cong vao {MODEL_PATH}")
        except Exception as e:
            logger.error(f"[AI ERROR] Khong the luu mo hinh: {e}")

    def load_model(self) -> bool:
        """Nạp mô hình đã lưu từ đĩa cứng."""
        if not os.path.exists(MODEL_PATH):
            logger.info("[AI] Chua tim thay file mo hinh cu. Se tu dong huan luyen khi can thiet.")
            return False

        try:
            bundle = joblib.load(MODEL_PATH)
            self.scaler = bundle.get("scaler")
            self.model = bundle.get("model")
            self.contamination = bundle.get("contamination", 0.05)
            self.sample_count = bundle.get("sample_count", 0)
            self.last_trained_at = bundle.get("last_trained_at")
            logger.info(f"[AI] Da nap mo hinh thanh cong tu {MODEL_PATH} (Trained at: {self.last_trained_at})")
            return True
        except Exception as e:
            logger.error(f"[AI ERROR] Loi nap mo hinh: {e}")
            return False

    def predict(self, sensor_data: SensorDataPayload) -> AIDetectionResult:
        """
        Phân tích và dự đoán độ bất thường của một bản ghi cảm biến.
        Phân biệt rõ:
        - Cảnh báo theo ngưỡng (Heuristic Rules)
        - Cảnh báo AI (Isolation Forest Multi-dimensional Statistical Outlier)
        """
        # Nếu mô hình chưa sẵn sàng, tự động huấn luyện nhanh bằng baseline
        if self.model is None or self.scaler is None:
            logger.info("[AI] Mo hinh chua duoc nạp, tu dong huan luyen baseline ban dau...")
            self.train(use_database=False, contamination=0.05)

        # 1. Trích xuất vector đặc trưng đầu vào đúng thứ tự 7 chiều
        feature_dict = {
            "temperature": float(sensor_data.temperature),
            "humidity": float(sensor_data.humidity),
            "gas_adc": float(sensor_data.gas_adc),
            "sound_adc": float(sensor_data.sound_adc),
            "motion": float(sensor_data.motion),
            "touch": float(sensor_data.touch),
            "distance_cm": float(sensor_data.distance_cm)
        }
        X_raw = np.array([[feature_dict[f] for f in FEATURE_NAMES]])

        # 2. Tiền xử lý theo chuẩn đã fit khi huấn luyện
        X_scaled = self.scaler.transform(X_raw)

        # 3. Dự đoán phân loại (-1: Ngoại lệ / Bất thường, 1: Bình thường)
        prediction = self.model.predict(X_scaled)[0]
        is_anomaly = bool(prediction == -1)

        # 4. Tính điểm số bất thường (decision_function trả về giá trị âm khi bất thường)
        raw_score = float(self.model.decision_function(X_scaled)[0])
        
        # Chuẩn hóa raw_score thành thang đo trực quan [0.0 đến 1.0]
        # (raw_score < 0 -> anomaly_score > 0.5)
        normalized_score = float(1.0 / (1.0 + np.exp(raw_score * 6.0)))
        confidence = round(float(min(1.0, 0.5 + abs(raw_score) * 2.0)), 2)

        # 5. Phân tích nhận định đặc trưng đóng góp
        reasons = []
        if feature_dict["gas_adc"] > 700:
            reasons.append(f"gas_adc ({feature_dict['gas_adc']}) cao hon phan phoi thong ke")
        if feature_dict["sound_adc"] > 400:
            reasons.append(f"am thanh ({feature_dict['sound_adc']}) dot bien")
        if feature_dict["touch"] == 1:
            reasons.append("co tiep xuc cham thiet bi")
        if feature_dict["distance_cm"] < 40.0:
            reasons.append(f"khoang cach ({feature_dict['distance_cm']}cm) tiep can qua gan")
        if feature_dict["temperature"] > 35.0:
            reasons.append(f"nhiet do ({feature_dict['temperature']}C) cao lech chuan")

        if is_anomaly:
            if reasons:
                summary = f"Mô hình AI phát hiện điểm bất thường ngoại lai: {'; '.join(reasons)}."
            else:
                summary = "Mô hình AI phát hiện tương quan đa chiều giữa các cảm biến lệch khỏi phân phối bình thường."
            category = "AI_ANOMALY"
        else:
            summary = "Dữ liệu cảm biến nằm trong không gian phân phối bình thường của phòng."
            category = "NORMAL"

        result = AIDetectionResult(
            device_id=sensor_data.device_id,
            is_anomaly=is_anomaly,
            anomaly_score=round(normalized_score, 4),
            raw_decision_score=round(raw_score, 4),
            confidence=confidence,
            category=category,
            analysis_summary=summary,
            features_input=feature_dict,
            timestamp=datetime.now().isoformat()
        )

        # 6. Lưu trữ vào bộ nhớ RAM tạm thời (Không lưu DB nếu chưa được phép)
        with self._lock:
            self._latest_predictions[sensor_data.device_id] = result
            self._prediction_history.append(result)
            if len(self._prediction_history) > self._max_history:
                self._prediction_history.pop(0)

        return result

    def get_latest_prediction(self, device_id: Optional[str] = None) -> Optional[AIDetectionResult]:
        with self._lock:
            if device_id:
                return self._latest_predictions.get(device_id)
            if self._prediction_history:
                return self._prediction_history[-1]
            return None

    def get_prediction_history(self, device_id: Optional[str] = None, limit: int = 50) -> List[AIDetectionResult]:
        with self._lock:
            filtered = [p for p in self._prediction_history if not device_id or p.device_id == device_id]
            return list(reversed(filtered[-limit:]))

    def get_status(self) -> AIStatusResponse:
        return AIStatusResponse(
            is_model_loaded=bool(self.model is not None),
            model_type="Isolation Forest (Scikit-learn)",
            features_used=FEATURE_NAMES,
            contamination=self.contamination,
            sample_count=self.sample_count,
            last_trained_at=self.last_trained_at,
            model_file=MODEL_PATH
        )


# Singleton AI Service
ai_service = AIService()
