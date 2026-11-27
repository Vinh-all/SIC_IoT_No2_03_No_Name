from flask import Flask, jsonify, make_response, request

from test_file import test_hello_channels

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.route("/api/test-hello", methods=["POST", "OPTIONS"])
def api_test_hello():
    if request.method == "OPTIONS":
        return make_response("", 204)

    res = test_hello_channels()
    all_ok = res["telegram"]["ok"] and res["email"]["ok"]
    return jsonify({"ok": all_ok, "results": res}), (200 if all_ok else 207)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)