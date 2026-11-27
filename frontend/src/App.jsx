import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import SensorGrid from './components/SensorGrid';
import SensorCharts from './components/SensorCharts';
import AIAnomalySection from './components/AIAnomalySection';
import AlertsList from './components/AlertsList';
import DeviceList from './components/DeviceList';
import HistoricalTable from './components/HistoricalTable';

import {
  getHealth,
  getDevices,
  getLatestSensor,
  getSensorHistory,
  getAlerts,
  getAIStatus,
  getLatestAI,
  getAIHistory
} from './services/api';

import { 
  LayoutDashboard, 
  LineChart, 
  ShieldAlert, 
  Database, 
  Cpu, 
  AlertCircle 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [backendOnline, setBackendOnline] = useState(true);
  const [health, setHealth] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('ESP32_001');

  const [latestSensor, setLatestSensor] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiHistory, setAiHistory] = useState([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  // Hàm tải dữ liệu nhanh (Fast Poll - 2.5s)
  const fetchFastData = useCallback(async () => {
    try {
      const [healthRes, sensorRes, aiRes] = await Promise.all([
        getHealth().catch(() => null),
        getLatestSensor(selectedDevice).catch(() => null),
        getLatestAI(selectedDevice).catch(() => null)
      ]);

      if (healthRes) {
        setBackendOnline(true);
        setHealth(healthRes.data);
      } else {
        setBackendOnline(false);
      }

      if (sensorRes && sensorRes.data) {
        setLatestSensor(sensorRes.data);
      }

      if (aiRes && aiRes.data) {
        setAiResult(aiRes.data);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setBackendOnline(false);
    }
  }, [selectedDevice]);

  // Hàm tải dữ liệu lịch sử & danh sách (Slow Poll - 6s)
  const fetchSlowData = useCallback(async () => {
    try {
      const [devRes, histRes, alertRes, aiStatRes, aiHistRes] = await Promise.all([
        getDevices().catch(() => null),
        getSensorHistory(selectedDevice, 50).catch(() => null),
        getAlerts(selectedDevice, 50).catch(() => null),
        getAIStatus().catch(() => null),
        getAIHistory(selectedDevice, 50).catch(() => null)
      ]);

      if (devRes && devRes.data) setDevices(devRes.data);
      if (histRes && histRes.data) setHistory(histRes.data);
      if (alertRes && alertRes.data) setAlerts(alertRes.data);
      if (aiStatRes && aiStatRes.data) setAiStatus(aiStatRes.data);
      if (aiHistRes && aiHistRes.data) setAiHistory(aiHistRes.data);
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu phụ:', err);
    }
  }, [selectedDevice]);

  // Tải dữ liệu toàn diện khi người dùng bấm nút làm mới
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchFastData(), fetchSlowData()]);
    setIsRefreshing(false);
  };

  // Khởi tạo vòng lặp Polling
  useEffect(() => {
    handleManualRefresh();

    // Vòng lặp nhanh 2.5 giây
    const fastTimer = setInterval(fetchFastData, 2500);
    // Vòng lặp chậm 6.0 giây
    const slowTimer = setInterval(fetchSlowData, 6000);

    return () => {
      clearInterval(fastTimer);
      clearInterval(slowTimer);
    };
  }, [fetchFastData, fetchSlowData]);

  return (
    <div className="dashboard-container">
      {/* 1. Header Điều Khiển */}
      <Header
        health={health}
        backendOnline={backendOnline}
        devices={devices}
        selectedDevice={selectedDevice}
        onSelectDevice={setSelectedDevice}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
      />

      {/* 2. Thanh Điều Hướng Tab */}
      <nav className="nav-tabs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <LayoutDashboard size={16} />
          <span>Tổng Quan Giám Sát</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`tab-btn ${activeTab === 'charts' ? 'active' : ''}`}
        >
          <LineChart size={16} />
          <span>Biểu Đồ Thời Gian Thực</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
        >
          <ShieldAlert size={16} />
          <span>Cảnh Báo & Trí Tuệ Nhân Tạo (AI)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
        >
          <Database size={16} />
          <span>Lịch Sử Dữ Liệu (SQLite)</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
        >
          <Cpu size={16} />
          <span>Quản Lý Thiết Bị ({devices.length})</span>
        </button>
      </nav>

      {/* 3. Nội Dung Chính */}
      <main className="main-content">
        {/* Banner cảnh báo khi mất kết nối Backend */}
        {!backendOnline && (
          <div className="alert-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertCircle size={20} color="#ef4444" />
              <span>
                <strong>Không thể kết nối đến Backend Server (FastAPI)!</strong> Vui lòng đảm bảo server đang chạy tại port 8000 (<code>python main.py</code>).
              </span>
            </div>
            <button onClick={handleManualRefresh} className="btn-secondary" style={{ padding: '0.2rem 0.6rem' }}>
              Thử lại
            </button>
          </div>
        )}

        {/* TAB 1: TỔNG QUAN */}
        {activeTab === 'overview' && (
          <div>
            {/* Lưới 7 thẻ cảm biến */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>
                  Thông Số Cảm Biến Hiện Trường ({selectedDevice})
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Cập nhật lúc: <strong>{lastUpdated}</strong>
                </span>
              </div>
              <SensorGrid data={latestSensor} />
            </div>

            {/* Phân tích AI Isolation Forest */}
            <AIAnomalySection
              aiResult={aiResult}
              aiStatus={aiStatus}
              onReloadAI={fetchSlowData}
            />

            {/* Biểu đồ tóm tắt ngắn */}
            <div style={{ marginTop: '1.5rem' }}>
              <SensorCharts history={history} />
            </div>
          </div>
        )}

        {/* TAB 2: BIỂU ĐỒ THỜI GIAN THỰC */}
        {activeTab === 'charts' && (
          <SensorCharts history={history} />
        )}

        {/* TAB 3: CẢNH BÁO & AI */}
        {activeTab === 'alerts' && (
          <div>
            <AIAnomalySection
              aiResult={aiResult}
              aiStatus={aiStatus}
              onReloadAI={fetchSlowData}
            />
            <AlertsList alerts={alerts} aiHistory={aiHistory} />
          </div>
        )}

        {/* TAB 4: LỊCH SỬ DỮ LIỆU */}
        {activeTab === 'history' && (
          <HistoricalTable history={history} />
        )}

        {/* TAB 5: QUẢN LÝ THIẾT BỊ */}
        {activeTab === 'devices' && (
          <DeviceList devices={devices} />
        )}
      </main>

      {/* 4. Footer */}
      <footer className="footer">
        <div>
          <strong>SMART AIoT SECURITY DASHBOARD</strong> – Hệ thống giám sát an ninh thông minh ứng dụng AIoT
        </div>
        <div style={{ marginTop: '0.3rem', color: '#64748b' }}>
          Kiến trúc: ESP32 DevKit V1 (C++) ➔ Mosquitto MQTT (JSON) ➔ FastAPI Backend (Python) ➔ SQLite 3 Database ➔ Isolation Forest AI ➔ React Vite Dashboard
        </div>
      </footer>
    </div>
  );
}
