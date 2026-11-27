/**
 * QUẢN LÝ KẾT NỐI & TRUY VẤN CƠ SỞ DỮ LIỆU
 * Hỗ trợ song song: PostgreSQL (Production/Real) & SQLite 3 WAL Mode (Fallback/Dev)
 */
const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./config');

let pgPool = null;
let sqliteDb = null;

function getDriver() {
  return config.DB_DRIVER === 'postgres' ? 'postgres' : 'sqlite';
}

function getPostgresPool() {
  if (!pgPool) {
    const poolConfig = config.DATABASE_URL
      ? { connectionString: config.DATABASE_URL }
      : {
          host: config.DB_HOST,
          port: config.DB_PORT,
          user: config.DB_USER,
          password: config.DB_PASSWORD,
          database: config.DB_NAME,
          ssl: config.DB_SSL ? { rejectUnauthorized: false } : false,
          min: config.DB_POOL_MIN,
          max: config.DB_POOL_MAX,
          idleTimeoutMillis: config.DB_IDLE_TIMEOUT_MS || 30000,
          connectionTimeoutMillis: config.DB_CONNECTION_TIMEOUT_MS || 5000
        };

    pgPool = new Pool(poolConfig);
    pgPool.on('error', (err) => {
      console.error('[POSTGRESQL ERROR]:', err.message);
    });
  }
  return pgPool;
}

function getSqliteDb() {
  if (!sqliteDb) {
    const dbDir = path.dirname(config.DATABASE_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    sqliteDb = new DatabaseSync(config.DATABASE_PATH);
    sqliteDb.exec('PRAGMA foreign_keys = ON;');
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA synchronous = NORMAL;');
  }
  return sqliteDb;
}

/**
 * Thực thi câu lệnh SQL thống nhất
 * Tự động chuyển dấu ? sang $1, $2 nếu đang dùng PostgreSQL
 */
async function query(sql, params = []) {
  if (getDriver() === 'postgres') {
    const pool = getPostgresPool();
    let psql = sql;
    let index = 1;
    psql = psql.replace(/\?/g, () => `$${index++}`);
    const result = await pool.query(psql, params);
    return result.rows;
  } else {
    const db = getSqliteDb();
    const isSelect = /^\s*SELECT/i.test(sql);
    const stmt = db.prepare(sql);
    if (isSelect) {
      return stmt.all(...params);
    } else {
      const res = stmt.run(...params);
      return res;
    }
  }
}

/**
 * Khởi tạo CSDL khi khởi động Server
 */
async function initDb() {
  if (getDriver() === 'postgres') {
    try {
      const pool = getPostgresPool();
      const client = await pool.connect();
      console.log(`[DATABASE] >>> ĐÃ KẾT NỐI POSTGRESQL THỰC TẾ THÀNH CÔNG! <<<`);
      console.log(`[DATABASE] Database: ${config.DB_NAME} | Host: ${config.DB_HOST}:${config.DB_PORT}`);
      client.release();
    } catch (err) {
      console.error(`[DATABASE] Lỗi kết nối PostgreSQL: ${err.message}. Đang chuyển dự phòng sang SQLite...`);
      // Dự phòng chuyển sang sqlite nếu postgres lỗi kết nối
      config.DB_DRIVER = 'sqlite';
      initSqlite();
    }
  } else {
    initSqlite();
  }
}

function initSqlite() {
  const db = getSqliteDb();
  if (fs.existsSync(config.SCHEMA_PATH)) {
    const sql = fs.readFileSync(config.SCHEMA_PATH, 'utf-8');
    db.exec(sql);
    console.log(`[DATABASE] Khởi tạo SQLite 3 bảng thành công từ: ${config.SCHEMA_PATH}`);
  }
}

async function closeDb() {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
}

module.exports = {
  getDriver,
  query,
  initDb,
  closeDb,
  getPostgresPool,
  getSqliteDb
};
