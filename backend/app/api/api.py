from fastapi import APIRouter
from app.api.endpoints import health, devices, sensors, alerts, ai

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(devices.router, tags=["Devices"])
api_router.include_router(sensors.router, tags=["Sensors"])
api_router.include_router(alerts.router, tags=["Alerts"])
api_router.include_router(ai.router, tags=["AI Anomaly Detection"])
