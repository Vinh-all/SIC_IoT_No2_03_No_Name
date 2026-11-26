const statusBadge = document.getElementById("statusBadge");
const valTemp = document.getElementById("valTemp");
const valHum = document.getElementById("valHum");
const valDist = document.getElementById("valDist");
const valPir = document.getElementById("valPir");
const valSound = document.getElementById("valSound");
const valTouch = document.getElementById("valTouch");
const logList = document.getElementById("logList");

function addLog(text) {
  const li = document.createElement("li");
  const time = new Date().toLocaleTimeString("vi-VN");
  li.textContent = `[${time}] ${text}`;
  logList.prepend(li);
}

function renderState(data) {
  valTemp.textContent = `${data.temp} °C`;
  valHum.textContent = `Độ ẩm: ${data.hum} %`;
  valDist.textContent = `${data.dist} cm`;
  valPir.textContent = data.pir === 1 ? "Có chuyển động" : "Không có";
  valSound.textContent = `Âm: ${data.sound}`;
  valTouch.textContent = `Chạm TTP223: ${data.touch === 1 ? "Đã chạm" : "Chưa chạm"}`;

  const isAlert =
    data.temp >= 38 ||
    (data.dist > 0 && data.dist <= 15) ||
    data.pir === 1 ||
    data.sound >= 2500;

  if (isAlert) {
    statusBadge.textContent = "CẢNH BÁO KÍCH HOẠT";
    statusBadge.className = "badge badge-alert";
  } else {
    statusBadge.textContent = "BÌNH THƯỜNG";
    statusBadge.className = "badge badge-ok";
  }
}

document.getElementById("btnSimulateNormal").addEventListener("click", () => {
  const sample = { temp: 29.5, hum: 62, dist: 85.0, pir: 0, touch: 0, sound: 420 };
  renderState(sample);
  addLog("Cập nhật trạng thái bình thường.");
});

document.getElementById("btnSimulateAlert").addEventListener("click", () => {
  const sample = { temp: 40.2, hum: 70, dist: 10.5, pir: 1, touch: 0, sound: 3100 };
  renderState(sample);
  addLog("CẢNH BÁO: Quá nhiệt, vật thể gần, PIR & âm thanh vượt ngưỡng -> Kích hoạt còi, Telegram, Email.");
});

renderState({ temp: 29.5, hum: 62, dist: 85.0, pir: 0, touch: 0, sound: 420 });
addLog("Giao diện giám sát đã sẵn sàng.");