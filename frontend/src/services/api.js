import axios from 'axios';

// Sử dụng baseURL tương đối '/api' để tự động chuyển qua Vite Proxy (target: http://localhost:8000)
const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 1. Kiểm tra sức khỏe hệ thống
export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// 2. Lấy danh sách thiết bị
export const getDevices = async () => {
  const response = await api.get('/devices');
  return response.data;
};

// 3. Lấy dữ liệu cảm biến mới nhất
export const getLatestSensor = async (deviceId = null) => {
  const params = deviceId ? { device_id: deviceId } : {};
  const response = await api.get('/sensors/latest', { params });
  return response.data;
};

// 4. Lấy chuỗi lịch sử dữ liệu cảm biến
export const getSensorHistory = async (deviceId = null, limit = 50) => {
  const params = { limit };
  if (deviceId) params.device_id = deviceId;
  const response = await api.get('/sensors/history', { params });
  return response.data;
};

// 5. Lấy danh sách cảnh báo an ninh
export const getAlerts = async (deviceId = null, limit = 50) => {
  const params = { limit };
  if (deviceId) params.device_id = deviceId;
  const response = await api.get('/alerts', { params });
  return response.data;
};

// 6. API Trí tuệ Nhân tạo (AI Isolation Forest)
export const getAIStatus = async () => {
  const response = await api.get('/ai/status');
  return response.data;
};

export const getLatestAI = async (deviceId = null) => {
  const params = deviceId ? { device_id: deviceId } : {};
  const response = await api.get('/ai/latest', { params });
  return response.data;
};

export const getAIHistory = async (deviceId = null, limit = 50) => {
  const params = { limit };
  if (deviceId) params.device_id = deviceId;
  const response = await api.get('/ai/history', { params });
  return response.data;
};

export const triggerAITrain = async (params = { use_database: true, contamination: 0.05, n_estimators: 100 }) => {
  const response = await api.post('/ai/train', params);
  return response.data;
};

export default api;
