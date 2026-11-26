import alert_gateway

try:
    alert_gateway.send_telegram("hello")
    print("[OK] Đã gửi 'hello' vào nhóm Telegram thành công!")
except Exception as e:
    print(f"[ERR] Lỗi Telegram: {e}")

try:
    alert_gateway.send_email("Test IoT Alert", "hello")
    print("[OK] Đã gửi 'hello' tới danh sách Email thành công!")
except Exception as e:
    print(f"[ERR] Lỗi Email: {e}")