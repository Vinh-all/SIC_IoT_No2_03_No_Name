import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Tính toán đường dẫn gốc dự án tuyệt đối (E:\SMART_AIoT_SECURITY)
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent
DEFAULT_DB_PATH = str(ROOT_DIR / "database" / "security.db")
DEFAULT_SCHEMA_PATH = str(ROOT_DIR / "database" / "schema.sql")

# Tự động nạp biến môi trường từ .env (Ưu tiên thư mục gốc, sau đó đến backend)
if (ROOT_DIR / ".env").exists():
    load_dotenv(ROOT_DIR / ".env")
elif (BACKEND_DIR / ".env").exists():
    load_dotenv(BACKEND_DIR / ".env")

class Settings(BaseModel):
    PROJECT_NAME: str = "SMART AIoT SECURITY"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    # MQTT Settings
    MQTT_BROKER_HOST: str = os.getenv("MQTT_BROKER_HOST", "localhost")
    MQTT_BROKER_PORT: int = int(os.getenv("MQTT_BROKER_PORT", 1883))
    MQTT_CLIENT_ID: str = os.getenv("MQTT_CLIENT_ID", "FastAPI_Backend_Service")
    
    # MQTT Topics (Hợp đồng đã thống nhất)
    MQTT_TOPIC_SENSORS: str = "aiot/security/sensors"
    MQTT_TOPIC_STATUS: str = "aiot/security/status"
    MQTT_TOPIC_ALERTS: str = "aiot/security/alerts"
    MQTT_TOPIC_COMMAND: str = "aiot/security/command"

    # Database Settings (Giai đoạn 4: SQLite cố định an toàn)
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", DEFAULT_DB_PATH)
    SCHEMA_PATH: str = os.getenv("SCHEMA_PATH", DEFAULT_SCHEMA_PATH)
    ROOT_DIR: str = str(ROOT_DIR)

settings = Settings()
