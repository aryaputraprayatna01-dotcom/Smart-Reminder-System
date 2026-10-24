import { Pelanggan, Servis, Reminder, Resepsionis } from './types';

class DataStore {
  private pelangganList: Pelanggan[] = [];
  private servisList: Servis[] = [];
  private reminderList: Reminder[] = [];
  private resepsionisData: Resepsionis = {
    id: '1',
    username: 'admin',
    password: 'admin123',
    nama: 'Resepsionis AHASS Kirana'
  };
  private currentUser: string | null = null;

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    const pelanggan1: Pelanggan = {
      id: 'P001',
      nama: 'Budi Santoso',
      noHp: '08123456789',
      alamat: 'Jl. Raya Bekasi No. 123',
      jenisKendaraan: 'Honda Beat',
      nomorPolisi: 'B 1234 XYZ',
      createdAt: new Date('2024-01-15')
    };

    const pelanggan2: Pelanggan = {
      id: 'P002',
      nama: 'Siti Rahayu',
      noHp: '08234567890',
      alamat: 'Jl. Ahmad Yani No. 45',
      jenisKendaraan: 'Honda Vario 160',
      nomorPolisi: 'B 5678 ABC',
      createdAt: new Date('2024-02-10')
    };

    const pelanggan3: Pelanggan = {
      id: 'P003',
      nama: 'Ahmad Dahlan',
      noHp: '08345678901',
      alamat: 'Jl. Sudirman No. 78',
      jenisKendaraan: 'Honda Scoopy',
      nomorPolisi: 'B 9012 DEF',
      createdAt: new Date('2024-03-20')
    };

    this.pelangganList = [pelanggan1, pelanggan2, pelanggan3];

    this.servisList = [
      {
        id: 'S001',
        pelangganId: 'P001',
        tanggalServis: new Date('2024-03-15'),
        kilometer: 5000,
        jenisServis: 'Servis Berkala',
        waktuServis: 'Pagi',
        hariServis: 'Selasa',
        createdAt: new Date('2024-03-15')
      },
      {
        id: 'S002',
        pelangganId: 'P001',
        tanggalServis: new Date('2024-07-20'),
        kilometer: 9500,
        jenisServis: 'Servis Berkala',
        waktuServis: 'Pagi',
        hariServis: 'Rabu',
        createdAt: new Date('2024-07-20')
      },
      {
        id: 'S003',
        pelangganId: 'P001',
        tanggalServis: new Date('2024-11-25'),
        kilometer: 14200,
        jenisServis: 'Servis Berkala',
        waktuServis: 'Pagi',
        hariServis: 'Selasa',
        createdAt: new Date('2024-11-25')
      },
      {
        id: 'S004',
        pelangganId: 'P002',
        tanggalServis: new Date('2024-04-10'),
        kilometer: 3000,
        jenisServis: 'Servis Ringan',
        waktuServis: 'Siang',
        hariServis: 'Kamis',
        createdAt: new Date('2024-04-10')
      },
      {
        id: 'S005',
        pelangganId: 'P002',
        tanggalServis: new Date('2024-08-15'),
        kilometer: 8500,
        jenisServis: 'Servis Berkala',
        waktuServis: 'Siang',
        hariServis: 'Jumat',
        createdAt: new Date('2024-08-15')
      },
      {
        id: 'S006',
        pelangganId: 'P003',
        tanggalServis: new Date('2025-01-10'),
        kilometer: 2500,
        jenisServis: 'Servis Ringan',
        waktuServis: 'Sore',
        hariServis: 'Sabtu',
        createdAt: new Date('2025-01-10')
      }
    ];
  }

  login(username: string, password: string): boolean {
    if (username === this.resepsionisData.username && password === this.resepsionisData.password) {
      this.currentUser = this.resepsionisData.id;
      localStorage.setItem('currentUser', this.resepsionisData.id);
      return true;
    }
    return false;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  isLoggedIn(): boolean {
    if (!this.currentUser) {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        this.currentUser = savedUser;
      }
    }
    return this.currentUser !== null;
  }

  getCurrentUser(): Resepsionis | null {
    return this.currentUser ? this.resepsionisData : null;
  }

  getPelanggan(): Pelanggan[] {
    return [...this.pelangganList];
  }

  getPelangganById(id: string): Pelanggan | undefined {
    return this.pelangganList.find(p => p.id === id);
  }

  addPelanggan(pelanggan: Omit<Pelanggan, 'id' | 'createdAt'>): Pelanggan {
    const newPelanggan: Pelanggan = {
      ...pelanggan,
      noHp: pelanggan.noHp || '-',
      alamat: pelanggan.alamat || 'Bekasi',
      id: `P${String(this.pelangganList.length + 1).padStart(3, '0')}`,
      createdAt: new Date()
    };
    this.pelangganList.push(newPelanggan);
    return newPelanggan;
  }

  updatePelanggan(id: string, data: Partial<Pelanggan>): boolean {
    const index = this.pelangganList.findIndex(p => p.id === id);
    if (index !== -1) {
      this.pelangganList[index] = { ...this.pelangganList[index], ...data };
      return true;
    }
    return false;
  }

  deletePelanggan(id: string): boolean {
    const index = this.pelangganList.findIndex(p => p.id === id);
    if (index !== -1) {
      this.pelangganList.splice(index, 1);
      return true;
    }
    return false;
  }

  getServis(): Servis[] {
    return [...this.servisList];
  }

  getServisByPelangganId(pelangganId: string): Servis[] {
    return this.servisList.filter(s => s.pelangganId === pelangganId);
  }

  addServis(servis: Omit<Servis, 'id' | 'createdAt'>): Servis {
    const newServis: Servis = {
      ...servis,
      id: `S${String(this.servisList.length + 1).padStart(3, '0')}`,
      createdAt: new Date()
    };
    this.servisList.push(newServis);
    return newServis;
  }

  getReminders(): Reminder[] {
    return [...this.reminderList];
  }

  addReminder(reminder: Omit<Reminder, 'id' | 'tanggalDibuat'>): Reminder {
    const newReminder: Reminder = {
      ...reminder,
      id: `R${String(this.reminderList.length + 1).padStart(3, '0')}`,
      tanggalDibuat: new Date()
    };
    this.reminderList.push(newReminder);
    return newReminder;
  }
}

export const store = new DataStore();
