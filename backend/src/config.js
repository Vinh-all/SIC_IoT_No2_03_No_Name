/**
 * CẤU HÌNH HỆ THỐNG TẬP TRUNG - SMART AIoT SECURITY
 */
const path = require('path');
const dotenv = require('dotenv');

// Tự động nạp .env từ thư mục gốc hoặc backend nếu có
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ROOT_DIR = path.resolve(__dirname, '../../');

module.exports = {
  PROJECT_NAME: process.env.PROJECT_NAME || 'SMART AIoT SECURITY',
  VERSION: process.env.VERSION || '1.0.0',
  PORT: parseInt(process.env.PORT, 10) || 8000,
  API_PREFIX: '/api',

  // Cấu hình MQTT Broker Mosquitto
  MQTT_BROKER_HOST: process.env.MQTT_BROKER_HOST || 'localhost',
  MQTT_BROKER_PORT: parseInt(process.env.MQTT_BROKER_PORT, 10) || 1883,
  MQTT_CLIENT_ID: process.env.MQTT_CLIENT_ID || 'NodeJS_Backend_Service',

  // Hợp đồng MQTT Topics
  MQTT_TOPIC_SENSORS: 'aiot/security/sensors',
  MQTT_TOPIC_STATUS: 'aiot/security/status',
  MQTT_TOPIC_ALERTS: 'aiot/security/alerts',
  MQTT_TOPIC_COMMAND: 'aiot/security/command',

  // Cấu hình Cơ sở dữ liệu (Hỗ trợ cả PostgreSQL thực tế & SQLite)
  DB_DRIVER: process.env.DB_DRIVER || (process.env.DATABASE_URL ? 'postgres' : 'sqlite'),
  DATABASE_URL: process.env.DATABASE_URL || '',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME || 'smart_aiot_security',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_SCHEMA: process.env.DB_SCHEMA || 'public',
  DB_SSL: process.env.DB_SSL === 'true',
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN, 10) || 2,
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX, 10) || 20,

  // Cấu hình SQLite dự phòng
  DATABASE_PATH: process.env.DATABASE_PATH || path.join(ROOT_DIR, 'database', 'security.db'),
  SCHEMA_PATH: process.env.SCHEMA_PATH || path.join(ROOT_DIR, 'database', 'schema.sql'),
  SCHEMA_POSTGRES_PATH: path.join(ROOT_DIR, 'database', 'schema.postgres.sql'),
  ROOT_DIR,

  // Cấu hình Trí tuệ Nhân tạo (AI)
  AI_CONTAMINATION: parseFloat(process.env.AI_CONTAMINATION) || 0.05,
  AI_N_ESTIMATORS: parseInt(process.env.AI_N_ESTIMATORS, 10) || 100
};
