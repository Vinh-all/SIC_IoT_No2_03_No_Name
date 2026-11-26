import alert_gateway
import config


def test_hello_channels():
    print("--- BẮT ĐẦU KIỂM TRA KẾT NỐI CẢNH BÁO ---")

    # 1. Test gửi "hello" lên nhóm Telegram
    try:
        alert_gateway.send_telegram("hello")
        print(f"[OK] Đã gửi 'hello' tới nhóm Telegram ({config.TELEGRAM_CHAT_ID}) thành công!")
    except Exception as exc:
        print(f"[ERR] Gửi Telegram thất bại: {exc}")

    # 2. Test gửi "hello" tới toàn bộ danh sách Email
    try:
        recipients = getattr(config, "TO_EMAILS", getattr(config, "TO_EMAIL", []))
        alert_gateway.send_email("[Test IoT] Hello", "hello", recipients=recipients)
        print(f"[OK] Đã gửi 'hello' tới danh sách Email ({recipients}) thành công!")
    except Exception as exc:
        print(f"[ERR] Gửi Email thất bại: {exc}")


if __name__ == "__main__":
    test_hello_channels()