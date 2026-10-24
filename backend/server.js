import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ahass_kirana',
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function createDatabaseIfNeeded() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  await connection.end();
}

async function initDatabase() {
  await createDatabaseIfNeeded();
  pool = mysql.createPool(dbConfig);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS resepsionis (
      id_resepsionis INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(100) NOT NULL,
      nama VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pelanggan (
      id_pelanggan INT AUTO_INCREMENT PRIMARY KEY,
      nama_konsumen VARCHAR(150) NOT NULL,
      no_hp VARCHAR(30) DEFAULT NULL,
      alamat TEXT DEFAULT NULL,
      type_motor VARCHAR(100) NOT NULL,
      no_polisi VARCHAR(30) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_no_polisi (no_polisi)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS servis (
      id_servis INT AUTO_INCREMENT PRIMARY KEY,
      id_pelanggan INT NOT NULL,
      tanggal_service DATE NOT NULL,
      hari_servis VARCHAR(20) NOT NULL,
      jam_masuk TIME DEFAULT NULL,
      kilometer INT NOT NULL,
      jenis_servis TEXT,
      waktu_servis ENUM('Pagi','Siang','Sore') DEFAULT 'Pagi',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_servis_pelanggan FOREIGN KEY (id_pelanggan)
        REFERENCES pelanggan(id_pelanggan)
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  // PATCH 1: status_kirim pakai VARCHAR (bukan ENUM), tambah tanggal_aktual_dikirim
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reminder (
      id_reminder INT AUTO_INCREMENT PRIMARY KEY,
      id_pelanggan INT NOT NULL,
      h_minus VARCHAR(10) NOT NULL,
      hari_pengiriman VARCHAR(20) NOT NULL,
      waktu_pengiriman VARCHAR(20) NOT NULL,
      frekuensi VARCHAR(20) NOT NULL,
      intensitas VARCHAR(20) NOT NULL,
      preferensi_hari VARCHAR(20) DEFAULT NULL,
      preferensi_waktu VARCHAR(20) DEFAULT NULL,
      status_kirim VARCHAR(30) DEFAULT 'Belum Dikirim',
      tanggal_aktual_dikirim DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_reminder_pelanggan FOREIGN KEY (id_pelanggan)
        REFERENCES pelanggan(id_pelanggan)
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  // Kalau tabel lama sudah ada tapi kolomnya kurang, tambahkan kolom yang dibutuhkan.
  await ensureColumn('pelanggan', 'no_hp', "VARCHAR(30) DEFAULT NULL");
  await ensureColumn('pelanggan', 'alamat', "TEXT DEFAULT NULL");
  await ensureColumn('pelanggan', 'type_motor', "VARCHAR(100) NOT NULL DEFAULT '-' ");
  await ensureColumn('pelanggan', 'no_polisi', "VARCHAR(30) NOT NULL DEFAULT '-' ");
  await ensureColumn('servis', 'jenis_servis', "TEXT");
  await pool.query(`ALTER TABLE servis MODIFY jenis_servis TEXT`);
  await ensureColumn('servis', 'waktu_servis', "ENUM('Pagi','Siang','Sore') DEFAULT 'Pagi'");
  await ensureColumn('reminder', 'hari_pengiriman', "VARCHAR(20) NOT NULL DEFAULT 'Selasa'");
  await ensureColumn('reminder', 'waktu_pengiriman', "VARCHAR(20) NOT NULL DEFAULT 'Pagi'");
  await ensureColumn('reminder', 'frekuensi', "VARCHAR(20) NOT NULL DEFAULT 'Sedang'");
  await ensureColumn('reminder', 'intensitas', "VARCHAR(20) NOT NULL DEFAULT 'Sedang'");
  await ensureColumn('reminder', 'preferensi_hari', "VARCHAR(20) DEFAULT NULL");
  await ensureColumn('reminder', 'preferensi_waktu', "VARCHAR(20) DEFAULT NULL");
  // PATCH 2a: definisi ensureColumn status_kirim pakai VARCHAR
  await ensureColumn('reminder', 'status_kirim', "VARCHAR(30) DEFAULT 'Belum Dikirim'");
  await ensureColumn('reminder', 'id_servis', "INT DEFAULT NULL");
  // PATCH 2b: tambah kolom tanggal_aktual_dikirim
  await ensureColumn('reminder', 'tanggal_aktual_dikirim', "DATETIME DEFAULT NULL");

  // PATCH 2c: migrasi tabel lama — ubah ENUM ke VARCHAR dan sesuaikan nilai lama
  try {
    await pool.query(`ALTER TABLE reminder MODIFY COLUMN status_kirim VARCHAR(30) DEFAULT 'Belum Dikirim'`);
    await pool.query(`UPDATE reminder SET status_kirim = 'Belum Dikirim' WHERE status_kirim IN ('Belum Dihubungi', 'Pending')`);
    await pool.query(`UPDATE reminder SET status_kirim = 'Sudah Dikirim' WHERE status_kirim = 'Sudah Dihubungi'`);
  } catch (e) { /* sudah VARCHAR, skip */ }

  await pool.query(`
    INSERT INTO resepsionis (username, password, nama)
    VALUES ('admin', 'admin123', 'Resepsionis AHASS Kirana')
    ON DUPLICATE KEY UPDATE nama = VALUES(nama)
  `);
}

async function ensureColumn(tableName, columnName, columnDefinition) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbConfig.database, tableName, columnName]
  );

  if (rows[0].total === 0) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    console.log(`✅ Kolom ${tableName}.${columnName} ditambahkan`);
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function normalizeTimeToKategori(jamMasuk) {
  if (!jamMasuk) return 'Pagi';
  const jam = String(jamMasuk).replace('.', ':').split(':')[0];
  const hour = Number(jam);
  if (Number.isNaN(hour)) return 'Pagi';
  if (hour < 12) return 'Pagi';
  if (hour < 15) return 'Siang';
  return 'Sore';
}

function hitungFrekuensi(servisList) {
  if (!servisList || servisList.length < 2) return 'Sedang';

  const sorted = [...servisList].sort((a, b) => new Date(a.tanggal_service) - new Date(b.tanggal_service));
  let totalHari = 0;
  let jumlahSelisih = 0;

  for (let i = 1; i < sorted.length; i++) {
    const sebelum = new Date(sorted[i - 1].tanggal_service);
    const sekarang = new Date(sorted[i].tanggal_service);
    const selisihHari = Math.max(1, Math.round((sekarang - sebelum) / (1000 * 60 * 60 * 24)));
    totalHari += selisihHari;
    jumlahSelisih++;
  }

  const rataHari = totalHari / jumlahSelisih;
  if (rataHari <= 45) return 'Tinggi';
  if (rataHari <= 75) return 'Sedang';
  return 'Rendah';
}

function hitungIntensitas(servisList) {
  if (!servisList || servisList.length < 2) return 'Sedang';

  const sorted = [...servisList].sort((a, b) => new Date(a.tanggal_service) - new Date(b.tanggal_service));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const selisihKm = Math.max(0, Number(last.kilometer) - Number(first.kilometer));
  const selisihHari = Math.max(1, Math.round((new Date(last.tanggal_service) - new Date(first.tanggal_service)) / (1000 * 60 * 60 * 24)));
  const kmPerBulan = selisihKm / (selisihHari / 30);

  if (kmPerBulan > 1200) return 'Tinggi';
  if (kmPerBulan >= 801) return 'Sedang';
  return 'Rendah';
}

function modus(values, defaultValue) {
  const counter = new Map();
  for (const value of values) {
    if (!value) continue;
    counter.set(value, (counter.get(value) || 0) + 1);
  }
  let result = defaultValue;
  let max = 0;
  for (const [key, count] of counter.entries()) {
    if (count > max) {
      max = count;
      result = key;
    }
  }
  return result;
}

function tentukanHMinus(frekuensi, intensitas) {
  if (frekuensi === 'Rendah') return 'H-7';

  if (frekuensi === 'Sedang') {
    if (intensitas === 'Tinggi') return 'H-7';
    return 'H-5';
  }

  if (frekuensi === 'Tinggi') {
    if (intensitas === 'Rendah') return 'H-2';
    return 'H-5';
  }

  return 'H-5';
}

function generateReminderFromServis(servisList) {
  const frekuensi = hitungFrekuensi(servisList);
  const intensitas = hitungIntensitas(servisList);
  const preferensiHari = modus(servisList.map(s => s.hari_servis), 'Selasa');
  const preferensiWaktu = modus(servisList.map(s => s.waktu_servis || normalizeTimeToKategori(s.jam_masuk)), 'Pagi');

  return {
    h_minus: tentukanHMinus(frekuensi, intensitas),
    hari_pengiriman: preferensiHari,
    waktu_pengiriman: preferensiWaktu,
    frekuensi,
    intensitas,
    preferensi_hari: preferensiHari,
    preferensi_waktu: preferensiWaktu
  };
}

app.get('/', (req, res) => {
  res.json({ message: 'Backend AHASS Smart Reminder aktif', port: PORT });
});

app.post('/api/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await pool.query(
    'SELECT id_resepsionis, username, nama FROM resepsionis WHERE username = ? AND password = ?',
    [username, password]
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }
  res.json(rows[0]);
}));

app.post('/api/resepsionis/register', asyncHandler(async (req, res) => {
  const { nama, username, password } = req.body;

  if (!nama || !username || !password) {
    return res.status(400).json({
      message: 'Nama, username, dan password wajib diisi'
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({
      message: 'Password minimal 6 karakter'
    });
  }

  const [existingUser] = await pool.query(
    'SELECT id_resepsionis FROM resepsionis WHERE username = ?',
    [username]
  );

  if (existingUser.length > 0) {
    return res.status(409).json({
      message: 'Username sudah digunakan'
    });
  }

  const [result] = await pool.query(
    `INSERT INTO resepsionis (nama, username, password)
     VALUES (?, ?, ?)`,
    [
      String(nama).trim(),
      String(username).trim(),
      String(password).trim()
    ]
  );

  res.status(201).json({
    message: 'Pendaftaran berhasil',
    id_resepsionis: result.insertId,
    nama: String(nama).trim(),
    username: String(username).trim()
  });
}));


app.get('/api/pelanggan', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM pelanggan ORDER BY id_pelanggan DESC');
  res.json(rows);
}));

app.get('/api/pelanggan/:id', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM pelanggan WHERE id_pelanggan = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Pelanggan tidak ditemukan' });
  res.json(rows[0]);
}));

app.post('/api/pelanggan', asyncHandler(async (req, res) => {
  const { nama_konsumen, nama, no_hp, noHp, alamat, type_motor, jenisKendaraan, no_polisi, nomorPolisi } = req.body;
  const namaFinal = nama_konsumen || nama;
  const motorFinal = type_motor || jenisKendaraan;
  const nopolFinal = no_polisi || nomorPolisi;

  if (!namaFinal || !motorFinal || !nopolFinal) {
    return res.status(400).json({ message: 'Nama, type motor, dan nomor polisi wajib diisi' });
  }

  const [result] = await pool.query(
    `INSERT INTO pelanggan (nama_konsumen, no_hp, alamat, type_motor, no_polisi)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nama_konsumen = VALUES(nama_konsumen),
       no_hp = VALUES(no_hp),
       alamat = VALUES(alamat),
       type_motor = VALUES(type_motor)`,
    [namaFinal, no_hp || noHp || null, alamat || null, motorFinal, nopolFinal]
  );

  res.status(201).json({ id_pelanggan: result.insertId, message: 'Pelanggan berhasil disimpan' });
}));

app.put('/api/pelanggan/:id', asyncHandler(async (req, res) => {
  const { nama_konsumen, nama, no_hp, noHp, alamat, type_motor, jenisKendaraan, no_polisi, nomorPolisi } = req.body;
  await pool.query(
    `UPDATE pelanggan SET nama_konsumen = ?, no_hp = ?, alamat = ?, type_motor = ?, no_polisi = ?
     WHERE id_pelanggan = ?`,
    [nama_konsumen || nama, no_hp || noHp || null, alamat || null, type_motor || jenisKendaraan, no_polisi || nomorPolisi, req.params.id]
  );
  res.json({ message: 'Pelanggan berhasil diupdate' });
}));

app.delete('/api/pelanggan/:id', asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM pelanggan WHERE id_pelanggan = ?', [req.params.id]);
  res.json({ message: 'Pelanggan berhasil dihapus' });
}));

app.get('/api/servis', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT 
      s.id_servis,
      s.id_pelanggan,
      DATE_FORMAT(s.tanggal_service, '%Y-%m-%d') AS tanggal_service,
      s.hari_servis,
      s.jam_masuk,
      s.kilometer,
      s.jenis_servis,
      s.waktu_servis,
      s.created_at,
      p.nama_konsumen,
      p.type_motor,
      p.no_polisi,
      p.no_hp
    FROM servis s
    JOIN pelanggan p 
    ON p.id_pelanggan = s.id_pelanggan
    ORDER BY s.tanggal_service DESC, s.id_servis DESC
  `);

  res.json(rows);
}));

app.get('/api/servis/pelanggan/:id', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `
    SELECT
      id_servis,
      id_pelanggan,
      DATE_FORMAT(tanggal_service, '%Y-%m-%d') AS tanggal_service,
      hari_servis,
      jam_masuk,
      kilometer,
      jenis_servis,
      waktu_servis,
      created_at
    FROM servis
    WHERE id_pelanggan = ?
    ORDER BY tanggal_service ASC, id_servis ASC
    `,
    [req.params.id]
  );

  res.json(rows);
}));

app.post('/api/servis', asyncHandler(async (req, res) => {
  const { id_pelanggan, tanggal_service, hari_servis, jam_masuk, kilometer, jenis_servis, waktu_servis } = req.body;

  if (!id_pelanggan || !tanggal_service || !hari_servis || kilometer === undefined) {
    return res.status(400).json({ message: 'id_pelanggan, tanggal_service, hari_servis, dan kilometer wajib diisi' });
  }

  const waktuFinal = waktu_servis || normalizeTimeToKategori(jam_masuk);

  const [result] = await pool.query(
    `INSERT INTO servis (id_pelanggan, tanggal_service, hari_servis, jam_masuk, kilometer, jenis_servis, waktu_servis)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id_pelanggan, tanggal_service, hari_servis, jam_masuk || null, Number(kilometer), jenis_servis || 'Servis Berkala', waktuFinal]
  );

  res.status(201).json({ id_servis: result.insertId, message: 'Servis berhasil disimpan' });
}));

app.put('/api/servis/:id', asyncHandler(async (req, res) => {
  const { tanggal_service, hari_servis, jam_masuk, kilometer, jenis_servis, waktu_servis } = req.body;
  await pool.query(
    `UPDATE servis SET tanggal_service = ?, hari_servis = ?, jam_masuk = ?, kilometer = ?, jenis_servis = ?, waktu_servis = ?
     WHERE id_servis = ?`,
    [tanggal_service, hari_servis, jam_masuk || null, Number(kilometer), jenis_servis || 'Servis Berkala', waktu_servis || normalizeTimeToKategori(jam_masuk), req.params.id]
  );
  res.json({ message: 'Servis berhasil diupdate' });
}));

app.delete('/api/servis/:id', asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM servis WHERE id_servis = ?', [req.params.id]);
  res.json({ message: 'Servis berhasil dihapus' });
}));

app.get('/api/reminder', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT 
      r.*,
      DATE_FORMAT(s.tanggal_service, '%Y-%m-%d') AS tanggal_service,
      p.nama_konsumen,
      p.type_motor,
      p.no_polisi,
      p.no_hp
    FROM reminder r
    JOIN pelanggan p 
      ON p.id_pelanggan = r.id_pelanggan
    LEFT JOIN servis s
      ON s.id_servis = r.id_servis
    ORDER BY r.created_at DESC, r.id_reminder DESC
  `);

  res.json(rows);
}));

app.post('/api/reminder', asyncHandler(async (req, res) => {
  const {
    id_pelanggan,
    id_servis,
    h_minus,
    hari_pengiriman,
    waktu_pengiriman,
    frekuensi,
    intensitas,
    preferensi_hari,
    preferensi_waktu,
    status_kirim
  } = req.body;

  if (!id_pelanggan || !h_minus || !hari_pengiriman || !waktu_pengiriman || !frekuensi || !intensitas) {
    return res.status(400).json({ message: 'Data reminder belum lengkap' });
  }

  const [result] = await pool.query(
    `INSERT INTO reminder
    (id_pelanggan, id_servis, h_minus, hari_pengiriman, waktu_pengiriman, frekuensi, intensitas, preferensi_hari, preferensi_waktu, status_kirim)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_pelanggan,
      id_servis,
      h_minus,
      hari_pengiriman,
      waktu_pengiriman,
      frekuensi,
      intensitas,
      preferensi_hari || hari_pengiriman,
      preferensi_waktu || waktu_pengiriman,
      // PATCH 3: default 'Belum Dikirim' (bukan 'Belum Dihubungi')
      status_kirim || 'Belum Dikirim'
    ]
  );

  res.status(201).json({ id_reminder: result.insertId, message: 'Reminder berhasil disimpan' });
}));

// PATCH 4: simpan tanggal_aktual_dikirim saat status diupdate
app.put('/api/reminder/:id/status', asyncHandler(async (req, res) => {
  const { status_kirim, tanggal_aktual_dikirim } = req.body;
  const tanggal = tanggal_aktual_dikirim
    ? new Date(tanggal_aktual_dikirim)
    : (status_kirim === 'Sudah Dikirim' ? new Date() : null);
  await pool.query(
    'UPDATE reminder SET status_kirim = ?, tanggal_aktual_dikirim = ? WHERE id_reminder = ?',
    [status_kirim, tanggal, req.params.id]
  );
  res.json({ message: 'Status reminder berhasil diupdate' });
}));


app.delete('/api/reminder/:id', asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM reminder WHERE id_reminder = ?', [req.params.id]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Reminder tidak ditemukan' });
  }

  res.json({ message: 'Reminder berhasil dihapus' });
}));

app.post('/api/reminder/generate/:id_pelanggan', asyncHandler(async (req, res) => {
  const [servisList] = await pool.query(
    'SELECT * FROM servis WHERE id_pelanggan = ? ORDER BY tanggal_service ASC, id_servis ASC',
    [req.params.id_pelanggan]
  );

  const reminder = generateReminderFromServis(servisList);
  const [result] = await pool.query(
    `INSERT INTO reminder
      (id_pelanggan, h_minus, hari_pengiriman, waktu_pengiriman, frekuensi, intensitas, preferensi_hari, preferensi_waktu)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.params.id_pelanggan,
      reminder.h_minus,
      reminder.hari_pengiriman,
      reminder.waktu_pengiriman,
      reminder.frekuensi,
      reminder.intensitas,
      reminder.preferensi_hari,
      reminder.preferensi_waktu
    ]
  );

  res.status(201).json({ id_reminder: result.insertId, ...reminder });
}));


function normalizeImportKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function getImportValue(item, aliases, defaultValue = null) {
  const normalized = {};
  for (const [key, value] of Object.entries(item || {})) {
    normalized[normalizeImportKey(key)] = value;
  }

  for (const alias of aliases) {
    const key = normalizeImportKey(alias);
    const value = normalized[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return defaultValue;
}

function normalizeExcelDate(value) {
  if (!value) return null;

  // Excel date serial number, e.g. 45200
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Format Indonesia: dd/mm/yyyy atau dd-mm-yyyy
  const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function normalizeExcelTime(value) {
  if (!value) return null;

  const pad = (number) => String(number).padStart(2, '0');

  if (value instanceof Date) {
    return `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }

  if (typeof value === 'number') {
    if (value > 0 && value < 1) {
      const totalSeconds = Math.round(value * 24 * 60 * 60);
      const hh = Math.floor(totalSeconds / 3600) % 24;
      const mm = Math.floor((totalSeconds % 3600) / 60);
      const ss = totalSeconds % 60;

      return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
    }

    if (value >= 1 && value < 24) {
      const hh = Math.floor(value);
      const mm = Math.round((value - hh) * 60);

      return `${pad(hh)}:${pad(mm)}:00`;
    }

    if (value >= 100 && value <= 2359) {
      const rawNumber = String(Math.floor(value)).padStart(4, '0');
      const hh = Number(rawNumber.slice(0, 2));
      const mm = Number(rawNumber.slice(2, 4));

      if (hh <= 23 && mm <= 59) {
        return `${pad(hh)}:${pad(mm)}:00`;
      }
    }

    return null;
  }

  const raw = String(value).trim().replace('.', ':');
  const match = raw.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);

  if (match) {
    const hh = Math.min(23, Number(match[1]));
    const mm = Math.min(59, Number(match[2]));
    const ss = Math.min(59, Number(match[3] || 0));

    return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  }

  const numberOnly = raw.replace(/\D/g, '');

  if (numberOnly.length === 3 || numberOnly.length === 4) {
    const padded = numberOnly.padStart(4, '0');
    const hh = Number(padded.slice(0, 2));
    const mm = Number(padded.slice(2, 4));

    if (hh <= 23 && mm <= 59) {
      return `${pad(hh)}:${pad(mm)}:00`;
    }
  }

  if (numberOnly.length === 1 || numberOnly.length === 2) {
    const hh = Number(numberOnly);

    if (hh <= 23) {
      return `${pad(hh)}:00:00`;
    }
  }

  return null;
}

function normalizeDayName(value) {
  if (!value) return 'Selasa';
  const raw = String(value).trim().toLowerCase();
  const map = {
    senin: 'Senin',
    selasa: 'Selasa',
    rabu: 'Rabu',
    kamis: 'Kamis',
    jumat: 'Jumat',
    jumaat: 'Jumat',
    sabtu: 'Sabtu',
    minggu: 'Minggu',
    ahad: 'Minggu'
  };
  return map[raw] || String(value).trim();
}

app.post('/api/import-excel', asyncHandler(async (req, res) => {
  const rows = req.body.rows || [];

  if (!rows.length) {
    return res.status(400).json({
      message: 'Tidak ada data dikirim'
    });
  }

  let pelangganBaru = 0;
  let servisBaru = 0;
  let dilewati = 0;

  const contohDilewati = [];

  for (const item of rows) {
    try {
      // PATCH 5: pakai getImportValue agar nama kolom Excel apapun bisa terbaca
      const nama  = getImportValue(item, ['nama', 'nama_konsumen', 'NAMA KONSUMEN', 'NAMA', 'name', 'customer_name']);
      const nopol = getImportValue(item, ['nomorPolisi', 'no_polisi', 'NO POLISI', 'NOMOR POLISI', 'nopol', 'plate', 'no_plat', 'plat']);
      const motor = getImportValue(item, ['jenisKendaraan', 'type_motor', 'TYPE MOTOR', 'JENIS KENDARAAN', 'motor', 'vehicle', 'tipe_motor']);
      const noHp  = getImportValue(item, ['noHp', 'no_hp', 'NO HP', 'TELEPON', 'phone', 'hp', 'telp', 'no_telp', 'NO TELP']);
      const alamat = getImportValue(item, ['alamat', 'address', 'ALAMAT']) || 'Bekasi';

      // PATCH 5: km=0 tetap valid — jangan pakai !kilometer sebagai filter
      const kmRaw    = getImportValue(item, ['kilometer', 'KILOMETER', 'km', 'KM', 'odometer', 'ODO', 'jarak']);
      const kilometer = kmRaw !== null ? Number(kmRaw) : 0;

      const tanggalRaw = getImportValue(item, ['tanggalServis', 'tanggal_service', 'TANGGAL SERVICE', 'TANGGAL SERVIS', 'tanggal', 'date', 'DATE', 'tgl', 'TGL']);
      let tanggal = normalizeExcelDate(tanggalRaw);
      if (!tanggal) {
        tanggal = new Date().toISOString().slice(0, 10);
      }

      const hariRaw = getImportValue(item, ['hariServis', 'hari_servis', 'HARI SERVIS', 'HARI', 'hari', 'day', 'DAY']);
      const hari = normalizeDayName(hariRaw || 'Senin');

      const jamRaw   = getImportValue(item, ['jamMasuk', 'jam_masuk', 'JAM MASUK', 'JAM', 'jam', 'time', 'TIME', 'waktu_masuk']);
      const jamMasuk = normalizeExcelTime(jamRaw) || null;

      const waktuRaw = getImportValue(item, ['waktuServis', 'waktu_servis', 'WAKTU SERVIS', 'WAKTU', 'waktu']);
      const waktu    = waktuRaw || normalizeTimeToKategori(jamMasuk);

      const jenisServis = getImportValue(item, [
        'jenisServis', 'jenis_servis', 'SERVIS CATEGORI', 'SERVIS KATEGORI',
        'SERVICE CATEGORY', 'JENIS SERVIS', 'JENIS SERVICE', 'kategori', 'service_type'
      ]) || 'Servis Berkala';

      // PATCH 5: validasi hanya nama, nopol, motor — km=0 boleh lolos
      if (!nama || !nopol || !motor) {
        dilewati++;

        if (contohDilewati.length < 5) {
          contohDilewati.push({
            alasan: 'Data wajib kosong (nama/nopol/motor)',
            data: item
          });
        }

        continue;
      }

      const [existing] = await pool.query(
        'SELECT id_pelanggan FROM pelanggan WHERE no_polisi = ?',
        [String(nopol).trim()]
      );

      let idPelanggan;

      if (existing.length > 0) {
        idPelanggan = existing[0].id_pelanggan;

        await pool.query(
          `UPDATE pelanggan
           SET nama_konsumen = ?, no_hp = ?, alamat = ?, type_motor = ?
           WHERE id_pelanggan = ?`,
          [
            String(nama).trim(),
            noHp ? String(noHp).trim() : null,
            alamat,
            String(motor).trim(),
            idPelanggan
          ]
        );
      } else {
        const [insertPelanggan] = await pool.query(
          `INSERT INTO pelanggan
           (nama_konsumen, no_hp, alamat, type_motor, no_polisi)
           VALUES (?, ?, ?, ?, ?)`,
          [
            String(nama).trim(),
            noHp ? String(noHp).trim() : null,
            alamat,
            String(motor).trim(),
            String(nopol).trim()
          ]
        );

        idPelanggan = insertPelanggan.insertId;
        pelangganBaru++;
      }

      await pool.query(
        `INSERT INTO servis
         (id_pelanggan, tanggal_service, hari_servis, jam_masuk, kilometer, jenis_servis, waktu_servis)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          idPelanggan,
          tanggal,
          hari,
          jamMasuk,
          kilometer,
          String(jenisServis).trim(),
          waktu
        ]
      );

      servisBaru++;
    } catch (err) {
      console.error('ERROR IMPORT ROW:', err);

      dilewati++;

      if (contohDilewati.length < 5) {
        contohDilewati.push({
          alasan: err.message,
          data: item
        });
      }
    }
  }

  res.json({
    message: 'Import selesai. Data historis berhasil disimpan. Reminder tidak dibuat dari import Excel.',
    jumlah_data_dibaca: rows.length,
    pelanggan_baru: pelangganBaru,
    riwayat_servis: servisBaru,
    reminder_terbentuk: 0,
    data_dilewati: dilewati,
    contoh_data_dilewati: contohDilewati
  });
}));

app.get('/api/dashboard', asyncHandler(async (req, res) => {
  const [[pelangganCount]] = await pool.query('SELECT COUNT(*) AS total FROM pelanggan');
  const [[servisCount]] = await pool.query('SELECT COUNT(*) AS total FROM servis');
  const [[servisBulanIni]] = await pool.query(
    'SELECT COUNT(*) AS total FROM servis WHERE MONTH(tanggal_service) = MONTH(CURRENT_DATE()) AND YEAR(tanggal_service) = YEAR(CURRENT_DATE())'
  );
  const [[reminderCount]] = await pool.query('SELECT COUNT(*) AS total FROM reminder');
  const [[tinggi]] = await pool.query("SELECT COUNT(*) AS total FROM reminder WHERE frekuensi = 'Tinggi'");
  const [[sedang]] = await pool.query("SELECT COUNT(*) AS total FROM reminder WHERE frekuensi = 'Sedang'");
  const [[rendah]] = await pool.query("SELECT COUNT(*) AS total FROM reminder WHERE frekuensi = 'Rendah'");

  res.json({
    totalPelanggan: pelangganCount.total,
    totalServis: servisCount.total,
    servisBulanIni: servisBulanIni.total,
    totalReminder: reminderCount.total,
    frekuensiTinggi: tinggi.total,
    frekuensiSedang: sedang.total,
    frekuensiRendah: rendah.total
  });
}));

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ message: err.message || 'Terjadi kesalahan server' });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Backend AHASS berjalan di http://localhost:${PORT}`);
      console.log(`✅ Database: ${dbConfig.database}`);
    });
  })
  .catch((error) => {
    console.error('❌ Gagal menjalankan backend:', error);
    process.exit(1);
  });