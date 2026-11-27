"""
SMART AIoT SECURITY - BACKEND SERVER (FastAPI)
Giai đoạn 5: Tích hợp Trí tuệ nhân tạo phát hiện bất thường (Isolation Forest).
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from app.core.config import settings
from app.api.api import api_router
from app.services.mqtt_service import mqtt_service
from app.services.ai_service import ai_service
from app.db.session import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Khởi tạo Cơ sở dữ liệu SQLite và kiểm tra 3 bảng chính
    print(f"[BACKEND] Khoi dong Database SQLite tai: {settings.DATABASE_PATH}")
    init_db()

    # 2. Khởi tạo mô hình AI Isolation Forest (Tự động nạp hoặc huấn luyện baseline nếu chưa có)
    print("[BACKEND] Kiem tra mo hinh AI Isolation Forest...")
    if not ai_service.load_model():
        print("[BACKEND] Khoi tao va huan luyen tap mau baseline ban dau cho AI...")
        ai_service.train(use_database=True, contamination=0.05)

    # 3. Khởi động dịch vụ MQTT Subscriber chạy nền
    print(f"[BACKEND] Ket noi MQTT Broker tai {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}...")
    mqtt_service.start()
    yield
    # 4. Dừng an toàn MQTT Client khi tắt server
    print("[BACKEND] Dang tat may chu... Dong ket noi MQTT Client.")
    mqtt_service.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Hệ thống giám sát và phát hiện xâm nhập thông minh ứng dụng AIoT - API Service (AI Anomaly Detection)",
    version=settings.VERSION,
    lifespan=lifespan
)

# Cho phép kết nối CORS từ Dashboard Frontend (React/Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tích hợp các router REST API tại prefix /api
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/", summary="Trang chủ kiểm tra trạng thái Backend & AI")
def read_root():
    ai_status = ai_service.get_status()
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "stage": "Stage 5 - AI Anomaly Detection (Isolation Forest) Integrated",
        "database": "SQLite (Persistent)",
        "ai_model": {
            "loaded": ai_status.is_model_loaded,
            "type": ai_status.model_type,
            "samples": ai_status.sample_count,
            "contamination": ai_status.contamination
        },
        "status": "online",
        "docs_url": "/docs",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
