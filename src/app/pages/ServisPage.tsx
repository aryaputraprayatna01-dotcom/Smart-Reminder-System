import { useState, useRef, useEffect, useMemo } from 'react';
import { store } from '../store';
import { RuleBasedEngine } from '../ruleEngine';
import { CheckCircle, Upload, Download, AlertCircle, X, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

export function ServisPage() {
  const [pelangganList, setPelangganList] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadPelanggan();
  }, []);

useEffect(() => {

  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
  }, 300);

  return () => clearTimeout(timer);

}, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.searchable-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPelanggan = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/pelanggan');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Data pelanggan dari MySQL:', data);

      const mappedData = data.map((item: any) => ({
        id: String(item.id_pelanggan),
        nama: item.nama_konsumen,
        noHp: item.no_hp || '-',
        alamat: item.alamat || 'Bekasi',
        jenisKendaraan: item.type_motor,
        nomorPolisi: item.no_polisi,
      }));

      setPelangganList(mappedData);
    } catch (error) {
      console.error('❌ Gagal mengambil data pelanggan:', error);
      alert();
    } finally {
      setLoading(false);
    }
  };
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [importData, setImportData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    pelangganId: '',
    tanggalServis: new Date().toISOString().split('T')[0],
    jamMasuk: '',
    kilometer: '',
    jenisServis: 'Servis Berkala',
  });

  // Auto-hitung hari dari tanggal yang dipilih
  const getHariFromDate = (tanggal: string): string => {
    if (!tanggal) return 'Senin';
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const [y, m, d] = tanggal.split('-').map(Number);
    return days[new Date(y, m - 1, d).getDay()];
  };

  // Auto-hitung kategori waktu dari jam masuk
  const getWaktuFromJam = (jam: string): 'Pagi' | 'Siang' | 'Sore' => {
    if (!jam) return 'Pagi';
    const hour = parseInt(jam.split(':')[0]);
    if (isNaN(hour)) return 'Pagi';
    if (hour < 12) return 'Pagi';
    if (hour < 15) return 'Siang';
    return 'Sore';
  };

  const jenisServisOptions = [
    'Servis Berkala',
    'Servis Ringan',
    'Ganti Oli',
    'Tune Up',
    'Perbaikan',
    'SERVIS PAKET, MPX2, OLI GIR',
    'LR, KAMPAS BELAKANG',
    'SERVIS KPB 3, MPX2',
    'GANTI RANGKA, MPX2, GEMUK CVT',
    'SERVIS CVT, ROLLER, SEAL PULLY, RUMAH ROLER, BOSH ROLER',
    'SERVIS REGULER, MPX2, OLI GIR, BUSI',
  ];

  const [showJenisDropdown, setShowJenisDropdown] = useState(false);
  const filteredJenisOptions = jenisServisOptions.filter(opt =>
    opt.toLowerCase().includes(formData.jenisServis.toLowerCase())
  );

  // Hari & waktu servis dihitung otomatis — tidak perlu dropdown manual

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pelangganId || !formData.kilometer || !formData.jamMasuk || !formData.tanggalServis) {
      alert('Semua field harus diisi termasuk Jam Masuk Servis!');
      return;
    }

    try {
      console.log('📝 Menyimpan servis ke MySQL...');

      // 1. Simpan servis ke MySQL
      // Hari & waktu dihitung otomatis dari tanggal dan jam masuk
      const hariServis  = getHariFromDate(formData.tanggalServis);
      const waktuServis = getWaktuFromJam(formData.jamMasuk);
      const jamMasukFmt = formData.jamMasuk ? `${formData.jamMasuk}:00` : null;

      console.log('📝 Menyimpan servis | hari:', hariServis, '| waktu:', waktuServis, '| jam:', jamMasukFmt);

      const servisResponse = await fetch('http://localhost:3001/api/servis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_pelanggan: parseInt(formData.pelangganId),
          tanggal_service: formData.tanggalServis,
          hari_servis: hariServis,
          jam_masuk: jamMasukFmt,
          kilometer: parseInt(formData.kilometer),
          jenis_servis: formData.jenisServis,
          waktu_servis: waktuServis
        })
      });

      if (!servisResponse.ok) {
        throw new Error('Gagal menyimpan data servis');
      }

      const servisResult = await servisResponse.json();
      console.log('✅ Servis berhasil disimpan:', servisResult);

      // 2. Get riwayat servis pelanggan dari MySQL
      const riwayatResponse = await fetch(`http://localhost:3001/api/servis/pelanggan/${formData.pelangganId}`);
      const riwayatData = await riwayatResponse.json();

      // Convert data MySQL ke format RuleBasedEngine
      const riwayatServis = riwayatData.map((s: any) => ({
        id: String(s.id_servis),
        pelangganId: String(s.id_pelanggan),
        tanggalServis: new Date(s.tanggal_service),
        kilometer: s.kilometer,
        jenisServis: s.jenis_servis,
        waktuServis: s.waktu_servis,
        hariServis: s.hari_servis,
        createdAt: new Date(s.created_at)
      }));

      // 3. Generate reminder menggunakan Rule-Based Engine
      const reminder = RuleBasedEngine.generateReminder(formData.pelangganId, riwayatServis);
      console.log('🔔 Reminder generated:', reminder);

      // 4. Simpan reminder ke MySQL
      const reminderResponse = await fetch('http://localhost:3001/api/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_pelanggan: parseInt(formData.pelangganId),
          id_servis: servisResult.id_servis,   // snapshot: tanggal servis yg baru diinput
          h_minus: reminder.jarakWaktu,
          hari_pengiriman: reminder.hariPengiriman,
          waktu_pengiriman: reminder.waktuPengiriman,
          frekuensi: reminder.analisis.frekuensi,
          intensitas: reminder.analisis.intensitas,
          preferensi_hari: reminder.analisis.preferensiHari,
          preferensi_waktu: reminder.analisis.preferensiWaktu
        })
      });

      if (!reminderResponse.ok) {
        throw new Error('Gagal menyimpan reminder');
      }

      console.log('✅ Reminder berhasil disimpan ke MySQL');

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      setFormData({
        pelangganId: '',
        tanggalServis: new Date().toISOString().split('T')[0],
        jamMasuk: '',
        kilometer: '',
        jenisServis: 'Servis Berkala',
      });
      setSearchQuery('');
      setShowDropdown(false);
    } catch (error) {
      console.error('❌ Error submit servis:', error);
      alert('Gagal menyimpan data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const parseWaktuServis = (jamMasuk: string): 'Pagi' | 'Siang' | 'Sore' => {
    if (!jamMasuk) return 'Pagi';

    const timeStr = String(jamMasuk).trim();
    let hour = 0;

    if (timeStr.includes(':')) {
      hour = parseInt(timeStr.split(':')[0]);
    } else if (timeStr.length === 4 || timeStr.length === 5) {
      hour = parseInt(timeStr.substring(0, 2));
    } else {
      const timeNum = parseFloat(timeStr);
      if (timeNum > 0 && timeNum < 24) {
        hour = Math.floor(timeNum);
      } else if (timeNum >= 100) {
        hour = Math.floor(timeNum / 100);
      }
    }

    if (hour >= 6 && hour < 12) return 'Pagi';
    if (hour >= 12 && hour < 17) return 'Siang';
    return 'Sore';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        let headerRow = 0;

        for (let R = range.s.r; R <= Math.min(range.s.r + 5, range.e.r); ++R) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: 0 });
          const cell = worksheet[cellAddress];
          const cellValue = cell ? String(cell.v).toUpperCase() : '';

          if (cellValue.includes('NO') || cellValue === '1') {
            const nextCellAddress = XLSX.utils.encode_cell({ r: R, c: 1 });
            const nextCell = worksheet[nextCellAddress];
            const nextCellValue = nextCell ? String(nextCell.v).toUpperCase() : '';

            if (nextCellValue.includes('NAMA') || nextCellValue.includes('KONSUMEN')) {
              headerRow = R;
              break;
            }
          }
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          range: headerRow,
          defval: ''
        });

        if (jsonData.length === 0) {
          setImportStatus('error');
          setImportMessage('File Excel kosong atau tidak ada data!');
          return;
        }

        const mappedData = jsonData.map((row: any, index: number) => {
          const allKeys = Object.keys(row);

          let nama = '';
          let nomorPolisi = '';
          let jenisKendaraan = '';
          let tanggalService: any = '';
          let hariServis = '';
          let jamMasuk = '';
          let kilometer = 0;

          allKeys.forEach(key => {
            const upperKey = String(key).toUpperCase();
            const value = row[key];

            if (upperKey.includes('NAMA') && upperKey.includes('KONSUMEN')) {
              nama = value;
            } else if (upperKey.includes('POLISI') || upperKey.includes('NOPOL')) {
              nomorPolisi = value;
            } else if (upperKey.includes('TYPE') || upperKey.includes('MOTOR') || upperKey.includes('KENDARAAN')) {
              jenisKendaraan = value;
            } else if (upperKey.includes('TANGGAL') && upperKey.includes('SERVICE')) {
              tanggalService = value;
            } else if (upperKey.includes('HARI') && upperKey.includes('SERVIS')) {
              hariServis = value;
            } else if (upperKey.includes('JAM') || upperKey.includes('MASUK')) {
              jamMasuk = value;
            } else if (upperKey.includes('KILOMETER') || upperKey === 'KM') {
              kilometer = value;
            }
          });

          return {
            nama: nama ? String(nama).trim() : `Pelanggan ${index + 1}`,
            nomorPolisi: nomorPolisi ? String(nomorPolisi).trim() : `UNKNOWN-${index}`,
            jenisKendaraan: jenisKendaraan ? String(jenisKendaraan).trim() : 'Motor',
            tanggalServis: tanggalService || new Date(),
            hariServis: hariServis ? String(hariServis).trim() : 'Senin',
            waktuServis: parseWaktuServis(jamMasuk),
            kilometer: parseInt(String(kilometer)) || 1000
          };
        });

        const validData = mappedData.filter((item, index) => {
          if (index >= 1000) return false;

          const hasMinimalData =
            item.nama !== '' &&
            item.nomorPolisi !== '' &&
            item.jenisKendaraan !== '';

          return hasMinimalData;
        });

        if (validData.length === 0) {
          setImportStatus('error');
          setImportMessage('Tidak bisa membaca data dari Excel. Coba file lain atau format berbeda.');
          return;
        }

        const message = `${validData.length} data servis siap diimport`;

        setImportData(validData);
        setImportStatus('preview');
        setImportMessage(message);
      } catch (error) {
        setImportStatus('error');
        setImportMessage(`Gagal membaca file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    try {
      let successCount = 0;
      let pelangganBaru = 0;

      importData.forEach(data => {
        try {
          let pelanggan = store.getPelanggan().find(p =>
            p.nomorPolisi.toLowerCase() === data.nomorPolisi.toLowerCase()
          );

          if (!pelanggan) {
            pelanggan = store.addPelanggan({
              nama: data.nama,
              nomorPolisi: data.nomorPolisi,
              jenisKendaraan: data.jenisKendaraan,
              noHp: '-',
              alamat: 'Bekasi'
            });
            pelangganBaru++;
          }

          let tanggalServis: Date;
          if (data.tanggalServis instanceof Date) {
            tanggalServis = data.tanggalServis;
          } else if (typeof data.tanggalServis === 'number') {
            tanggalServis = new Date((data.tanggalServis - 25569) * 86400 * 1000);
          } else if (typeof data.tanggalServis === 'string') {
            tanggalServis = new Date(data.tanggalServis);
          } else {
            tanggalServis = new Date();
          }

          if (isNaN(tanggalServis.getTime())) {
            tanggalServis = new Date();
          }

          store.addServis({
            pelangganId: pelanggan.id,
            tanggalServis,
            kilometer: data.kilometer || 1000,
            jenisServis: 'Servis Berkala',
            waktuServis: data.waktuServis || 'Pagi',
            hariServis: data.hariServis as any || 'Senin'
          });

          successCount++;
        } catch (err) {
          console.error('Error importing row:', err);
        }
      });

      importData.forEach(data => {
        try {
          const pelanggan = store.getPelanggan().find(p =>
            p.nomorPolisi.toLowerCase() === data.nomorPolisi.toLowerCase()
          );
          if (pelanggan) {
            const riwayatServis = store.getServisByPelangganId(pelanggan.id);
            if (riwayatServis.length > 0) {
              const reminder = RuleBasedEngine.generateReminder(pelanggan.id, riwayatServis);
              store.addReminder(reminder);
            }
          }
        } catch (err) {
          console.error('Error generating reminder:', err);
        }
      });

      setImportStatus('success');
      setImportMessage(`✅ Berhasil import ${successCount} data servis! (${pelangganBaru} pelanggan baru)`);

      setTimeout(() => {
        setShowImportModal(false);
        setImportStatus('idle');
        setImportData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        window.location.reload();
      }, 2000);
    } catch (error) {
      setImportStatus('error');
      setImportMessage(`Error: ${error instanceof Error ? error.message : 'Gagal import'}`);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        'NO': 1,
        'NAMA KONSUMEN': 'BULAN',
        'NO HP': '',
        'NO POLISI': 'B5818TGC',
        'TYPE MOTOR': 'VARIO 125',
        'SERVIS CATEGORI': 'SERVIS PAKET',
        'TANGGAL SERVICE': '2/1/2026',
        'HARI SERVIS': 'Jumat',
        'JAM MASUK': '12:47',
        'KILOMETER': 73702
      },
      {
        'NO': 2,
        'NAMA KONSUMEN': 'INDAH',
        'NO HP': '',
        'NO POLISI': 'B5925FER',
        'TYPE MOTOR': 'BEAT',
        'SERVIS CATEGORI': 'LR, KAMPAS DEPAN',
        'TANGGAL SERVICE': '2/1/2026',
        'HARI SERVIS': 'Jumat',
        'JAM MASUK': '15:02',
        'KILOMETER': 91338
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Import_Servis_AHASS_Kirana.xlsx');
  };

  // Filter and sort pelanggan
const filteredAndSortedPelanggan = useMemo(() => {

  if (debouncedSearch.length < 2) {
    return [];
  }


  const query = debouncedSearch.toLowerCase();


  return pelangganList
    .filter((pelanggan)=>{

      const nama =
      pelanggan.nama?.toLowerCase() || '';

      const nopol =
      pelanggan.nomorPolisi?.toLowerCase() || '';

      const kendaraan =
      pelanggan.jenisKendaraan?.toLowerCase() || '';


      return(
        nama.includes(query) ||
        nopol.includes(query) ||
        kendaraan.includes(query)
      );

    })
    .sort((a,b)=>
      a.nama.localeCompare(b.nama)
    )
    .slice(0,15);


},[debouncedSearch,pelangganList]);

  const selectedPelanggan = pelangganList.find(p => p.id === formData.pelangganId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Input Data Servis</h1>
        <p className="text-gray-600 mt-1">Catat data servis kendaraan pelanggan</p>
      </div>

      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-900">Data servis berhasil disimpan!</p>
            <p className="text-sm text-green-700">Rekomendasi reminder telah dibuat secara otomatis</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Form Input Servis</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Pelanggan *
                </label>

                {loading ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                    ⏳ Loading data pelanggan dari MySQL...
                  </div>
                ) : pelangganList.length === 0 ? (
                  <div>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-yellow-50 text-yellow-700">
                      ⚠️ Belum ada data pelanggan. Tambah pelanggan dulu!
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                    </p>
                  </div>
                ) : (
                  <div className="relative searchable-dropdown">
                    {/* Search and Display Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari nama, nomor polisi, atau jenis kendaraan..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={()=>{
                        if(searchQuery.length >= 2){
                          setShowDropdown(true);
                        }
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* Selected Pelanggan Display */}
                    {formData.pelangganId && !showDropdown && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-blue-900">
                            {selectedPelanggan?.nama}
                          </p>
                          <p className="text-sm text-blue-700">
                            {selectedPelanggan?.jenisKendaraan} ({selectedPelanggan?.nomorPolisi})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, pelangganId: '' });
                            setSearchQuery('');
                            setShowDropdown(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {/* Dropdown List */}
                    {showDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        {filteredAndSortedPelanggan.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            🔍 Tidak ada hasil untuk "{searchQuery}"
                          </div>
                        ) : (
                          <div>
                            {filteredAndSortedPelanggan.map((pelanggan) => (
                              <button
                                key={pelanggan.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, pelangganId: pelanggan.id });
                                  setSearchQuery(pelanggan.nama);
                                  setShowDropdown(false);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 transition ${
                                  formData.pelangganId === pelanggan.id ? 'bg-blue-100' : ''
                                }`}
                              >
                                <p className="font-semibold text-gray-900">{pelanggan.nama}</p>
                                <p className="text-sm text-gray-600">
                                  {pelanggan.jenisKendaraan} - {pelanggan.nomorPolisi}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-600 mt-1">
                      📋 {filteredAndSortedPelanggan.length} dari {pelangganList.length} pelanggan (diurutkan A-Z)
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Servis *
                  </label>
                  <input
                    type="date"
                    value={formData.tanggalServis}
                    onChange={(e) => setFormData({ ...formData, tanggalServis: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jam Masuk Servis *
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={formData.jamMasuk}
                      onChange={(e) => setFormData({ ...formData, jamMasuk: e.target.value })}
                      className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                  {formData.jamMasuk && (
                    <p className="text-xs text-gray-500 mt-1">
                      Waktu: <span className="font-semibold text-red-600">{getWaktuFromJam(formData.jamMasuk)}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilometer *
                  </label>
                  <input
                    type="number"
                    value={formData.kilometer}
                    onChange={(e) => setFormData({ ...formData, kilometer: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="Contoh: 15000"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Servis *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.jenisServis}
                        onChange={(e) => {
                        setFormData({ ...formData, jenisServis: e.target.value });
                        setShowJenisDropdown(true);
                    }}
                    onFocus={() => setShowJenisDropdown(true)}
                    onBlur={() => setTimeout(() => setShowJenisDropdown(false), 150)}
                    placeholder="Pilih atau ketik jenis servis..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none pr-10"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShowJenisDropdown(v => !v); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                {showJenisDropdown && filteredJenisOptions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {filteredJenisOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onMouseDown={() => {
                          setFormData({ ...formData, jenisServis: opt });
                          setShowJenisDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-red-50 hover:text-red-700 transition text-sm border-b border-gray-50 last:border-0 ${
                          formData.jenisServis === opt ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-800'
                        }`}
                      >
                        <span className="block leading-snug line-clamp-2">{opt}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1.5">
                  
                </p>
              </div>

              {/* Info otomatis hari & waktu */}
              {formData.tanggalServis && (
                <div className="flex gap-3">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500 mb-0.5">Hari Servis <span className="text-gray-400"></span></p>
                    <p className="font-semibold text-gray-800">{getHariFromDate(formData.tanggalServis)}</p>
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500 mb-0.5">Waktu Servis <span className="text-gray-400"></span></p>
                    <p className="font-semibold text-gray-800">{formData.jamMasuk ? getWaktuFromJam(formData.jamMasuk) : <span className="text-gray-400 font-normal text-sm">Isi jam masuk</span>}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition shadow-md hover:shadow-lg"
              >
                Simpan Data Servis
              </button>
            </form>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Info Pelanggan</h2>
            {selectedPelanggan ? (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Nama</p>
                  <p className="font-semibold text-gray-900">{selectedPelanggan.nama}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Kendaraan</p>
                  <p className="font-semibold text-gray-900">{selectedPelanggan.jenisKendaraan}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Nopol</p>
                  <p className="font-semibold text-gray-900">{selectedPelanggan.nomorPolisi}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">No HP</p>
                  <p className="font-semibold text-gray-900">{selectedPelanggan.noHp || '-'}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Pilih pelanggan untuk melihat info</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold text-blue-900">💡 Catatan:</p>
            <p className="text-xs text-blue-800 mt-2">
              Setelah data servis disimpan, sistem akan otomatis melakukan analisis perilaku
              konsumen dan membuat rekomendasi reminder yang personal.
            </p>
          </div>
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Import Data Servis dari Excel</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStatus('idle');
                  setImportData([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">📋 Kolom Excel yang diperlukan:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>NAMA KONSUMEN</strong> - Nama pelanggan</li>
                  <li>• <strong>NO POLISI</strong> - Nomor polisi kendaraan</li>
                  <li>• <strong>TYPE MOTOR</strong> - Jenis/tipe motor</li>
                  <li>• <strong>TANGGAL SERVICE</strong> - Tanggal servis</li>
                  <li>• <strong>HARI SERVIS</strong> - Hari servis (Senin-Minggu)</li>
                  <li>• <strong>JAM MASUK</strong> - Waktu servis (otomatis dikonversi ke Pagi/Siang/Sore)</li>
                  <li>• <strong>KILOMETER</strong> - Kilometer kendaraan</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3 italic">
                  * Upload langsung file Excel AHASS Kirana Anda!
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-3 flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  Download Template Excel
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih File Excel (.xlsx atau .xls)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 transition"
                />
              </div>

              {importStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Error!</p>
                    <p className="text-sm text-red-700">{importMessage}</p>
                  </div>
                </div>
              )}

              {importStatus === 'success' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Berhasil!</p>
                    <p className="text-sm text-green-700">{importMessage}</p>
                  </div>
                </div>
              )}

              {importStatus === 'preview' && importData.length > 0 && (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="font-semibold text-green-900">{importMessage}</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <p className="font-semibold text-gray-900">Preview Data ({importData.length} baris)</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Nama</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Nopol</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Motor</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Tanggal</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">KM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importData.slice(0, 15).map((item, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-2 px-3 text-gray-900">{item.nama}</td>
                              <td className="py-2 px-3 text-gray-900">{item.nomorPolisi}</td>
                              <td className="py-2 px-3 text-gray-900">{item.jenisKendaraan}</td>
                              <td className="py-2 px-3 text-gray-900">
                                {item.tanggalServis instanceof Date
                                  ? item.tanggalServis.toLocaleDateString('id-ID')
                                  : new Date((item.tanggalServis - 25569) * 86400 * 1000).toLocaleDateString('id-ID')}
                              </td>
                              <td className="py-2 px-3 text-gray-900">{item.kilometer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importData.length > 15 && (
                        <div className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-600">
                          ... dan {importData.length - 15} data lainnya
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleImport}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition shadow-md"
                  >
                    Import {importData.length} Data Servis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
