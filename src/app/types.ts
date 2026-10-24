export interface Pelanggan {
  id: string;
  nama: string;
  noHp?: string;
  alamat?: string;
  jenisKendaraan: string;
  nomorPolisi: string;
  createdAt: Date;
}

export interface Servis {
  id: string;
  pelangganId: string;
  tanggalServis: Date;
  kilometer: number;
  jenisServis: string;
  waktuServis: 'Pagi' | 'Siang' | 'Sore';
  hariServis: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
  createdAt: Date;
}

export interface AnalysisResult {
  frekuensi: 'Rendah' | 'Sedang' | 'Tinggi';
  intensitas: 'Rendah' | 'Sedang' | 'Tinggi';
  preferensiHari: string;
  preferensiWaktu: 'Pagi' | 'Siang' | 'Sore';
}

export interface Reminder {
  id: string;
  pelangganId: string;
  jarakWaktu: 'H-2' | 'H-5' | 'H-7';
  hariPengiriman: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
  waktuPengiriman: 'Pagi' | 'Siang' | 'Sore';
  tanggalDibuat: Date;
  analisis: AnalysisResult;
}

export interface Resepsionis {
  id: string;
  username: string;
  password: string;
  nama: string;
}
