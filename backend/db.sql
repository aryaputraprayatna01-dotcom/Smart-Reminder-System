CREATE DATABASE IF NOT EXISTS ahass_kirana_bekasi;
USE ahass_kirana;

CREATE TABLE IF NOT EXISTS resepsionis (
  id_resepsionis INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  nama VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pelanggan (
  id_pelanggan INT AUTO_INCREMENT PRIMARY KEY,
  nama_konsumen VARCHAR(150) NOT NULL,
  no_hp VARCHAR(30) DEFAULT NULL,
  alamat TEXT DEFAULT NULL,
  type_motor VARCHAR(100) NOT NULL,
  no_polisi VARCHAR(30) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_no_polisi (no_polisi)
);

CREATE TABLE IF NOT EXISTS servis (
  id_servis INT AUTO_INCREMENT PRIMARY KEY,
  id_pelanggan INT NOT NULL,
  id_resepsionis INT NOT NULL,

  tanggal_service DATE NOT NULL,
  hari_servis VARCHAR(20) NOT NULL,
  JAM_MASUK TIME DEFAULT NULL,
  kilometer INT NOT NULL,
  jenis_servis VARCHAR(100) DEFAULT 'Servis Berkala',
  waktu_servis ENUM('Pagi','Siang','Sore') DEFAULT 'Pagi',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_servis_pelanggan FOREIGN KEY (id_pelanggan)
    REFERENCES pelanggan(id_pelanggan)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_servis_resepsionis FOREIGN KEY (id_resepsionis)
    REFERENCES resepsionis(id_resepsionis)
    ON DELETE CASCADE ON UPDATE CASCADE
);

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
  status_kirim ENUM('Belum Dihubungi','Sudah Dihubungi','Pending') DEFAULT 'Belum Dihubungi',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reminder_pelanggan FOREIGN KEY (id_pelanggan)
    REFERENCES pelanggan(id_pelanggan)
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO resepsionis (username, password, nama)
VALUES ('admin', 'admin123', 'Resepsionis AHASS Kirana')
ON DUPLICATE KEY UPDATE nama = VALUES(nama);
