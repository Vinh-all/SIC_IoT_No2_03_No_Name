import sqlite3
import os
import logging
from app.core.config import settings

logger = logging.getLogger("database")

def get_connection() -> sqlite3.Connection:
    """
    Tạo kết nối an toàn đến file SQLite cố định trong database/security.db.
    Kích hoạt khóa ngoại (PRAGMA foreign_keys = ON) và chế độ WAL (Write-Ahead Logging).
    """
    # Đảm bảo thư mục cha tồn tại
    os.makedirs(os.path.dirname(settings.DATABASE_PATH), exist_ok=True)
    
    conn = sqlite3.connect(
        settings.DATABASE_PATH, 
        check_same_thread=False,
        timeout=15.0
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def init_db():
    """
    Khởi tạo cơ sở dữ liệu và 3 bảng chính từ schema.sql nếu chưa tồn tại.
    Không ghi đè dữ liệu cũ.
    """
    if not os.path.exists(settings.SCHEMA_PATH):
        logger.error(f"[DATABASE] Khong tim thay file schema tai: {settings.SCHEMA_PATH}")
        return

    logger.info(f"[DATABASE] Khoi tao Database tai: {settings.DATABASE_PATH}")
    with open(settings.SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    conn = get_connection()
    try:
        conn.executescript(schema_sql)
        conn.commit()
        logger.info("[DATABASE] Da khoi tao thanh cong 3 bang: devices, sensor_logs, security_alerts")
    except Exception as e:
        logger.error(f"[DATABASE ERROR] Loi khoi tao bang SQLite: {e}")
    finally:
        conn.close()
