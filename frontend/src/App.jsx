import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import SmartMonitorView from './components/SmartMonitorView';
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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'light';
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [backendOnline, setBackendOnline] = useState(true);
  const [health, setHealth] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('esp32_station_01');

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

      if (devRes && devRes.data && devRes.data.length > 0) {
        setDevices(devRes.data);
        setSelectedDevice((prev) => {
          const exists = devRes.data.some((d) => d.device_id === prev);
          return exists ? prev : devRes.data[0].device_id;
        });
      }
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

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* 2. Phần Thân Gồm Sidebar Chức Năng Hàng Dọc (Trái) và Nội Dung Chính (Phải) */}
      <div className="layout-body">
        {/* 2.1. Sidebar Chức Năng Hàng Dọc Bên Trái */}
        <aside className="sidebar-left">
          <div className="sidebar-header">
            <span className="sidebar-header-title">DANH MỤC CHỨC NĂNG</span>
            <span className="sidebar-header-badge">4 Tabs</span>
          </div>

          <nav className="sidebar-nav">
            <button
              onClick={() => setActiveTab('overview')}
              className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <div className="sidebar-btn-icon">
                <LayoutDashboard size={18} />
              </div>
              <div className="sidebar-btn-text">
                <span className="sidebar-btn-label">Tổng Quan Giám Sát</span>
                <span className="sidebar-btn-sub">Cảm biến hiện trường tức thời</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`sidebar-btn ${activeTab === 'charts' ? 'active' : ''}`}
            >
              <div className="sidebar-btn-icon">
                <LineChart size={18} />
              </div>
              <div className="sidebar-btn-text">
                <span className="sidebar-btn-label">Biểu Đồ Thời Gian Thực</span>
                <span className="sidebar-btn-sub">Xu hướng Recharts</span>
              </div>
            </button>

            {/* Chức năng Cảnh Báo & Trí Tuệ AI đã được ẩn theo yêu cầu */}

            <button
              onClick={() => setActiveTab('history')}
              className={`sidebar-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <div className="sidebar-btn-icon">
                <Database size={18} />
              </div>
              <div className="sidebar-btn-text">
                <span className="sidebar-btn-label">Lịch Sử Dữ Liệu</span>
                <span className="sidebar-btn-sub">Nhật ký SQLite 3</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('devices')}
              className={`sidebar-btn ${activeTab === 'devices' ? 'active' : ''}`}
            >
              <div className="sidebar-btn-icon">
                <Cpu size={18} />
              </div>
              <div className="sidebar-btn-text">
                <span className="sidebar-btn-label">Quản Lý Thiết Bị</span>
                <span className="sidebar-btn-sub">{devices.length} trạm trực tuyến</span>
              </div>
            </button>
          </nav>

          {/* Hộp Thông Tin Giám Sát Nhanh */}
          <div className="sidebar-quick-card">
            <div className="sidebar-card-title">THÔNG TIN HỆ THỐNG</div>
            <div className="sidebar-info-row">
              <span className="label">Trạm hiện tại:</span>
              <span className="val highlight">{selectedDevice}</span>
            </div>
            <div className="sidebar-info-row">
              <span className="label">Trạng thái Backend:</span>
              <span className={`val ${backendOnline ? 'status-ok' : 'status-err'}`}>
                {backendOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
              </span>
            </div>
            <div className="sidebar-info-row">
              <span className="label">MQTT Broker:</span>
              <span className={`val ${health?.broker_connected ? 'status-ok' : 'status-err'}`}>
                {health?.broker_connected ? 'Đã kết nối' : 'Mất kết nối'}
              </span>
            </div>
            <div className="sidebar-info-row">
              <span className="label">Chu kỳ Polling:</span>
              <span className="val">2.5s / 6.0s</span>
            </div>
            <div className="sidebar-info-row">
              <span className="label">Cập nhật lúc:</span>
              <span className="val">{lastUpdated}</span>
            </div>
          </div>
        </aside>

        {/* 2.2. Nội Dung Chính Bên Phải */}
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

          {/* TAB 1: TỔNG QUAN (ĐÃ THAY THẾ BẰNG IOT SMART MONITOR - ULTRASONIC & LED STATUS) */}
          {activeTab === 'overview' && (
            <SmartMonitorView
              latestSensor={latestSensor}
              backendOnline={backendOnline}
              health={health}
              selectedDevice={selectedDevice}
            />
          )}

          {/* TAB 2: BIỂU ĐỒ THỜI GIAN THỰC */}
          {activeTab === 'charts' && (
            <SensorCharts history={history} />
          )}

          {/* TAB 3: CẢNH BÁO & AI (Đã ẩn theo yêu cầu) */}
          {/* {activeTab === 'alerts' && (
            <div>
              <AIAnomalySection
                aiResult={aiResult}
                aiStatus={aiStatus}
                onReloadAI={fetchSlowData}
              />
              <AlertsList alerts={alerts} aiHistory={aiHistory} />
            </div>
          )} */}

          {/* TAB 4: LỊCH SỬ DỮ LIỆU */}
          {activeTab === 'history' && (
            <HistoricalTable history={history} />
          )}

          {/* TAB 5: QUẢN LÝ THIẾT BỊ */}
          {activeTab === 'devices' && (
            <DeviceList devices={devices} />
          )}
        </main>
      </div>

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
