/**
 * DỊCH VỤ TRÍ TUỆ NHÂN TẠO (AI) - ISOLATION FOREST TRÊN 7 ĐẶC TRƯNG SỐ
 */
const config = require('./config');

const FEATURE_NAMES = [
  'temperature',
  'humidity',
  'gas_adc',
  'sound_adc',
  'motion',
  'touch',
  'distance_cm'
];

class IsolationTreeNode {
  constructor(size, splitFeature = null, splitValue = null, left = null, right = null) {
    this.size = size;
    this.splitFeature = splitFeature;
    this.splitValue = splitValue;
    this.left = left;
    this.right = right;
    this.isLeaf = left === null && right === null;
  }
}

class IsolationForestModel {
  constructor(nEstimators = 100, maxSamples = 256) {
    this.nEstimators = nEstimators;
    this.maxSamples = maxSamples;
    this.trees = [];
    this.maxDepth = Math.ceil(Math.log2(maxSamples));
  }

  static c(n) {
    if (n <= 2) return 1;
    const eulerGamma = 0.5772156649;
    return 2 * (Math.log(n - 1) + eulerGamma) - (2 * (n - 1)) / n;
  }

  fit(data) {
    this.trees = [];
    const n = data.length;
    const subSampleSize = Math.min(n, this.maxSamples);

    for (let i = 0; i < this.nEstimators; i++) {
      const sampleIndices = new Set();
      while (sampleIndices.size < subSampleSize) {
        sampleIndices.add(Math.floor(Math.random() * n));
      }
      const sample = Array.from(sampleIndices).map(idx => data[idx]);
      const tree = this._buildTree(sample, 0, this.maxDepth);
      this.trees.push(tree);
    }
  }

  _buildTree(data, currentDepth, maxDepth) {
    const n = data.length;
    if (currentDepth >= maxDepth || n <= 1) {
      return new IsolationTreeNode(n);
    }

    const featureIdx = Math.floor(Math.random() * FEATURE_NAMES.length);
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < n; i++) {
      const val = data[i][featureIdx];
      if (val < min) min = val;
      if (val > max) max = val;
    }

    if (min === max) {
      return new IsolationTreeNode(n);
    }

    const splitValue = min + Math.random() * (max - min);
    const leftData = [];
    const rightData = [];

    for (let i = 0; i < n; i++) {
      if (data[i][featureIdx] < splitValue) {
        leftData.push(data[i]);
      } else {
        rightData.push(data[i]);
      }
    }

    const leftNode = this._buildTree(leftData, currentDepth + 1, maxDepth);
    const rightNode = this._buildTree(rightData, currentDepth + 1, maxDepth);

    return new IsolationTreeNode(n, featureIdx, splitValue, leftNode, rightNode);
  }

  pathLength(point, node, currentDepth) {
    if (node.isLeaf) {
      return currentDepth + (node.size > 1 ? IsolationForestModel.c(node.size) : 0);
    }
    const val = point[node.splitFeature];
    if (val < node.splitValue) {
      return this.pathLength(point, node.left, currentDepth + 1);
    } else {
      return this.pathLength(point, node.right, currentDepth + 1);
    }
  }

  anomalyScore(point) {
    if (this.trees.length === 0) return 0.2;
    let totalPath = 0;
    for (let i = 0; i < this.trees.length; i++) {
      totalPath += this.pathLength(point, this.trees[i], 0);
    }
    const avgPath = totalPath / this.trees.length;
    const cVal = IsolationForestModel.c(this.maxSamples);
    return Math.pow(2, -avgPath / cVal);
  }
}

class AIService {
  constructor() {
    this.model = new IsolationForestModel(config.AI_N_ESTIMATORS, 256);
    this.isTrained = false;
    this.sampleCount = 0;
    this.lastTrainedAt = null;

    // RAM Cache xoay vòng 200 bản ghi (không tạo bảng SQLite thứ 4)
    this._latestPredictions = new Map();
    this._predictionHistory = [];
    this._maxHistory = 200;

    this.trainBaseline(600);
  }

  generateBaselineData(numSamples = 600) {
    const data = [];
    for (let i = 0; i < numSamples; i++) {
      const temp = 24.0 + Math.random() * 8.0;   // 24 - 32 °C
      const humi = 50.0 + Math.random() * 25.0;  // 50 - 75 %
      const gas = 100 + Math.random() * 350;     // 100 - 450 ADC
      const sound = 30 + Math.random() * 150;    // 30 - 180 ADC
      const motion = Math.random() < 0.05 ? 1 : 0;
      const touch = 0;
      const dist = 20 + Math.random() * 180;     // 20 - 200 cm
      data.push([temp, humi, gas, sound, motion, touch, dist]);
    }
    return data;
  }

  trainBaseline(numSamples = 600) {
    const data = this.generateBaselineData(numSamples);
    this.model.fit(data);
    this.isTrained = true;
    this.sampleCount = numSamples;
    this.lastTrainedAt = new Date().toISOString();
  }

  predict(sensorData) {
    const point = [
      Number(sensorData.temperature),
      Number(sensorData.humidity),
      Number(sensorData.gas_adc),
      Number(sensorData.sound_adc),
      Number(sensorData.motion),
      Number(sensorData.touch),
      Number(sensorData.distance_cm)
    ];

    let rawScore = this.model.anomalyScore(point);
    if (sensorData.gas_adc > 1200) rawScore += 0.25;
    if (sensorData.sound_adc > 1200) rawScore += 0.2;
    if (sensorData.motion === 1 && sensorData.distance_cm < 25) rawScore += 0.2;
    if (sensorData.touch === 1) rawScore += 0.3;

    const anomalyScore = Math.min(Math.max(Math.round(rawScore * 10000) / 10000, 0.0), 1.0);
    const isAnomaly = anomalyScore >= 0.55;

    let riskLevel = 'LOW';
    let anomalyCategory = 'NORMAL';
    let summary = 'Chỉ số môi trường và an ninh hoạt động trong ngưỡng bình thường.';

    if (anomalyScore >= 0.75) {
      riskLevel = 'CRITICAL';
      anomalyCategory = 'CRITICAL_OUTLIER';
      summary = 'Phát hiện nguy cơ an ninh nghiêm trọng! Cần kiểm tra hiện trường ngay.';
    } else if (anomalyScore >= 0.55) {
      riskLevel = 'MEDIUM';
      anomalyCategory = 'MULTIVARIATE_ANOMALY';
      summary = 'Mô hình AI phát hiện điểm bất thường ngoại lai tương quan đa biến.';
    }

    const result = {
      device_id: sensorData.device_id,
      is_anomaly: isAnomaly,
      anomaly_score: anomalyScore,
      risk_level: riskLevel,
      anomaly_category: anomalyCategory,
      analysis_summary: summary,
      feature_contributions: {
        temperature: point[0] > 38 ? 0.2 : 0.05,
        humidity: point[1] > 80 ? 0.2 : 0.05,
        gas_adc: point[2] > 800 ? 0.35 : 0.1,
        sound_adc: point[3] > 800 ? 0.3 : 0.1,
        motion: point[4] === 1 ? 0.25 : 0.0,
        touch: point[5] === 1 ? 0.4 : 0.0,
        distance_cm: point[6] < 30 ? 0.25 : 0.05
      },
      analyzed_at: new Date().toISOString()
    };

    this._latestPredictions.set(sensorData.device_id, result);
    this._predictionHistory.unshift(result);
    if (this._predictionHistory.length > this._maxHistory) {
      this._predictionHistory.pop();
    }
    return result;
  }

  getLatestPrediction(deviceId = null) {
    if (deviceId && this._latestPredictions.has(deviceId)) {
      return this._latestPredictions.get(deviceId);
    }
    return this._predictionHistory[0] || null;
  }

  getPredictionHistory(deviceId = null, limit = 50) {
    let hist = this._predictionHistory;
    if (deviceId) {
      hist = hist.filter(item => item.device_id === deviceId);
    }
    return hist.slice(0, limit);
  }

  getStatus() {
    return {
      is_model_loaded: this.isTrained,
      model_type: 'IsolationForest (Node.js)',
      sample_count: this.sampleCount,
      contamination: config.AI_CONTAMINATION,
      last_trained_at: this.lastTrainedAt
    };
  }
}

module.exports = new AIService();
