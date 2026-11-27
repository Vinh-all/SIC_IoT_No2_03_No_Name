import alert_gateway
import config

def test_hello_channels() -> dict:
    results = {
        "telegram": {"ok": False, "detail": ""},
        "email": {"ok": False, "detail": ""},
    }

    # 1. Test gửi "hello" lên nhóm Telegram
    try:
        alert_gateway.send_telegram("hello")
        msg = f"Đã gửi 'hello' tới nhóm Telegram ({config.TELEGRAM_CHAT_ID}) thành công!"
        print(f"[OK] {msg}")
        results["telegram"] = {"ok": True, "detail": msg}
    except Exception as exc:
        err = f"Gửi Telegram thất bại: {exc}"
        print(f"[ERR] {err}")
        results["telegram"] = {"ok": False, "detail": err}

    # 2. Test gửi "hello" tới toàn bộ danh sách Email
    try:
        recipients = getattr(config, "TO_EMAILS", getattr(config, "TO_EMAIL", []))
        alert_gateway.send_email("[Test IoT] Hello", "hello", recipients=recipients)
        msg = f"Đã gửi 'hello' tới danh sách Email ({recipients}) thành công!"
        print(f"[OK] {msg}")
        results["email"] = {"ok": True, "detail": msg}
    except Exception as exc:
        err = f"Gửi Email thất bại: {exc}"
        print(f"[ERR] {err}")
        results["email"] = {"ok": False, "detail": err}

    return results


if __name__ == "__main__":
    print("--- BẮT ĐẦU KIỂM TRA KẾT NỐI CẢNH BÁO ---")
    test_hello_channels()