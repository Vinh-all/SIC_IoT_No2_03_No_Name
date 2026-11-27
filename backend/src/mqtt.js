/**
 * DỊCH VỤ TRUYỀN THÔNG MQTT INGESTION SERVICE
 */
const mqtt = require('mqtt');
const config = require('./config');
const storage = require('./storage');
const ai = require('./ai');

class MqttService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.totalMessages = 0;
  }

  start() {
    const brokerUrl = `mqtt://${config.MQTT_BROKER_HOST}:${config.MQTT_BROKER_PORT}`;
    console.log(`[MQTT] Đang kết nối đến Mosquitto Broker tại: ${brokerUrl}...`);

    this.client = mqtt.connect(brokerUrl, {
      clientId: config.MQTT_CLIENT_ID,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 5000
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log(`[MQTT] >>> ĐÃ KẾT NỐI BROKER MOSQUITTO THÀNH CÔNG! <<<`);

      this.client.subscribe(config.MQTT_TOPIC_SENSORS);
      this.client.subscribe(config.MQTT_TOPIC_STATUS);
      this.client.subscribe(config.MQTT_TOPIC_ALERTS);
    });

    this.client.on('close', () => {
      if (this.isConnected) {
        this.isConnected = false;
        console.warn('[MQTT] Mất kết nối với Broker Mosquitto! Đang tự động kết nối lại...');
      }
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      console.error('[MQTT ERROR]:', err.message);
    });

    this.client.on('message', async (topic, payload) => {
      this.totalMessages++;
      const payloadStr = payload.toString('utf-8');

      let data;
      try {
        data = JSON.parse(payloadStr);
      } catch (e) {
        console.warn(`[MQTT] Bỏ qua gói tin JSON lỗi trên ${topic}: ${e.message}`);
        return;
      }

      try {
        if (topic === config.MQTT_TOPIC_SENSORS) {
          await storage.saveSensorRecord(data);

          // Đánh giá dị thường an ninh tức thì qua Isolation Forest
          const evalResult = ai.predict(data);
          if (evalResult.is_anomaly) {
            console.warn(`[AI ANOMALY] Phát hiện bất thường từ ${data.device_id}: ${evalResult.summary}`);
            await storage.saveAlert({
              device_id: data.device_id,
              alert_type: 'AI_ANOMALY',
              severity: 'HIGH',
              description: evalResult.summary
            });
          }
        } else if (topic === config.MQTT_TOPIC_STATUS) {
          await storage.updateDeviceStatus(data.device_id, data.status || 'online');
        } else if (topic === config.MQTT_TOPIC_ALERTS) {
          await storage.saveAlert(data);
        }
      } catch (err) {
        console.error(`[STORAGE ERROR] Lỗi ghi nhận MQTT: ${err.message}`);
      }
    });
  }

  stop() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
    }
  }
}

module.exports = new MqttService();
