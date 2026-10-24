import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Database,
  Download,
  TriangleAlert
} from 'lucide-react';
import * as XLSX from 'xlsx';

/* ─── Design tokens (sama dengan HTML referensi) ─────────── */
const C = {
  primary:       '#b50009',
  secondary:     '#555f71',
  surface:       '#f8f9ff',
  surfaceLow:    '#eff4ff',
  surfaceHigh:   '#dce9ff',
  onSurface:     '#0d1c2e',
  outlineVar:    '#e9bcb6',
  greenBtn:      '#107C41',
  greenBtnHover: '#0E6C38',
};

/* ─── Helpers (logika identik dengan import-page.tsx) ────── */
const API_URL = 'http://localhost:3001/api';

const formatNopol = (nopol: string) => {
  if (!nopol) return '-';
  const clean = String(nopol).replace(/\s+/g, '').toUpperCase();
  const match = clean.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})$/);
  if (!match) return String(nopol).toUpperCase();
  return `${match[1]} ${match[2]} ${match[3]}`;
};

const padTime = (value: number) => String(value).padStart(2, '0');

const normalizeJamMasukValue = (value: any) => {
  if (value === undefined || value === null || value === '') return '';
  if (value instanceof Date) {
    return `${padTime(value.getHours())}:${padTime(value.getMinutes())}:${padTime(value.getSeconds())}`;
  }
  if (typeof value === 'number') {
    if (value > 0 && value < 1) {
      const totalSeconds = Math.round(value * 24 * 60 * 60);
      const hh = Math.floor(totalSeconds / 3600) % 24;
      const mm = Math.floor((totalSeconds % 3600) / 60);
      const ss = totalSeconds % 60;
      return `${padTime(hh)}:${padTime(mm)}:${padTime(ss)}`;
    }
    if (value >= 1 && value < 24) {
      const hh = Math.floor(value);
      const mm = Math.round((value - hh) * 60);
      return `${padTime(hh)}:${padTime(mm)}:00`;
    }
    if (value >= 100 && value <= 2359) {
      const rawNumber = String(Math.floor(value)).padStart(4, '0');
      const hh = Number(rawNumber.slice(0, 2));
      const mm = Number(rawNumber.slice(2, 4));
      if (hh <= 23 && mm <= 59) return `${padTime(hh)}:${padTime(mm)}:00`;
    }
    return '';
  }
  const raw = String(value).trim();
  if (!raw) return '';
  const normalizedRaw = raw.replace('.', ':');
  const timeMatch = normalizedRaw.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (timeMatch) {
    const hh = Math.min(23, Number(timeMatch[1]));
    const mm = Math.min(59, Number(timeMatch[2]));
    const ss = Math.min(59, Number(timeMatch[3] || 0));
    return `${padTime(hh)}:${padTime(mm)}:${padTime(ss)}`;
  }
  const numberOnly = raw.replace(/\D/g, '');
  if (numberOnly.length === 3 || numberOnly.length === 4) {
    const padded = numberOnly.padStart(4, '0');
    const hh = Number(padded.slice(0, 2));
    const mm = Number(padded.slice(2, 4));
    if (hh <= 23 && mm <= 59) return `${padTime(hh)}:${padTime(mm)}:00`;
  }
  if (numberOnly.length === 1 || numberOnly.length === 2) {
    const hh = Number(numberOnly);
    if (hh <= 23) return `${padTime(hh)}:00:00`;
  }
  const numericValue = Number(raw);
  if (!Number.isNaN(numericValue) && numericValue > 0 && numericValue < 1) {
    const totalSeconds = Math.round(numericValue * 24 * 60 * 60);
    const hh = Math.floor(totalSeconds / 3600) % 24;
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return `${padTime(hh)}:${padTime(mm)}:${padTime(ss)}`;
  }
  return '';
};

const formatJamMasukPreview = (value: any) => {
  const jam = normalizeJamMasukValue(value);
  if (!jam) return '-';
  const [hh, mm] = jam.split(':');
  return `${hh}:${mm}`;
};

const normalizeText = (value: any) => String(value || '').trim();
const normalizeUpper = (value: any) => normalizeText(value).toUpperCase();

const isHeaderLikeRow = (item: any) => {
  const nama    = normalizeUpper(item.nama);
  const nopol   = normalizeUpper(item.nomorPolisi);
  const motor   = normalizeUpper(item.jenisKendaraan);
  const tanggal = normalizeUpper(item.tanggalServis);
  const km      = normalizeUpper(item.kilometer);
  return (
    nama.includes('NAMA') || nama.includes('KONSUMEN') ||
    nopol.includes('POLISI') || nopol.includes('NOPOL') ||
    motor.includes('MOTOR') || motor.includes('TYPE') || motor.includes('KENDARAAN') ||
    tanggal.includes('TANGGAL') || tanggal.includes('SERVICE') || tanggal.includes('SERVIS') ||
    km.includes('KILOMETER')
  );
};

/* ─── Column pills ───────────────────────────────────────── */
const EXCEL_COLUMNS = [
  'NAMA KONSUMEN', 'TANGGAL SERVICE', 'NO POLISI',
  'HARI SERVIS', 'TYPE MOTOR', 'JAM MASUK',
  'KILOMETER', 'NO HP', 'SERVIS CATEGORI',
];

/* ─── Component ──────────────────────────────────────────── */
export function ImportPage() {
  const navigate = useNavigate();

  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [importData, setImportData]       = useState<any[]>([]);
  const [isImporting, setIsImporting]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── logika parseWaktuServis ── */
  const parseWaktuServis = (jamMasuk: any): 'Pagi' | 'Siang' | 'Sore' => {
    const jam = normalizeJamMasukValue(jamMasuk);
    if (!jam) return 'Pagi';
    const hour = Number(jam.split(':')[0]);
    if (Number.isNaN(hour)) return 'Pagi';
    if (hour < 12) return 'Pagi';
    if (hour < 15) return 'Siang';
    return 'Sore';
  };

  const formatTanggalPreview = (tanggal: any) => {
    try {
      if (!tanggal) return '-';
      if (tanggal instanceof Date) return tanggal.toLocaleDateString('id-ID');
      if (typeof tanggal === 'number')
        return new Date((tanggal - 25569) * 86400 * 1000).toLocaleDateString('id-ID');
      if (typeof tanggal === 'string') {
        const date = new Date(tanggal);
        if (isNaN(date.getTime())) return tanggal;
        return date.toLocaleDateString('id-ID');
      }
      return '-';
    } catch { return '-'; }
  };

  /* ── logika detectHeaderRow ── */
  const detectHeaderRow = (worksheet: XLSX.WorkSheet) => {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let rowIndex = range.s.r; rowIndex <= Math.min(range.s.r + 20, range.e.r); rowIndex++) {
      const values: string[] = [];
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })];
        if (cell && cell.v !== undefined && cell.v !== null)
          values.push(String(cell.v).toUpperCase().trim());
      }
      const rowText = values.join(' ');
      const hasName      = rowText.includes('NAMA') || rowText.includes('KONSUMEN');
      const hasNopol     = rowText.includes('NO POLISI') || rowText.includes('NOPOL') || rowText.includes('NO POL');
      const hasMotor     = rowText.includes('TYPE MOTOR') || rowText.includes('MOTOR') || rowText.includes('KENDARAAN');
      const hasKilometer = rowText.includes('KILOMETER') || rowText.includes('KM');
      if (hasName && hasNopol && (hasMotor || hasKilometer)) return rowIndex;
    }
    return 0;
  };

  /* ── logika handleFileUpload ── */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data     = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName  = workbook.SheetNames[0];
        const worksheet  = workbook.Sheets[sheetName];
        if (!worksheet) {
          setImportStatus('error');
          setImportMessage('Sheet Excel tidak ditemukan.');
          return;
        }
        const headerRow = detectHeaderRow(worksheet);
        const jsonData  = XLSX.utils.sheet_to_json(worksheet, { range: headerRow, defval: '' });
        if (jsonData.length === 0) {
          setImportStatus('error');
          setImportMessage('File Excel kosong atau tidak ada data!');
          return;
        }
        const mappedData = jsonData.map((row: any) => {
          let nama = '', nomorPolisi = '', jenisKendaraan = '',
              tanggalService: any = '', hariServis = '', jamMasuk: any = '',
              kilometer: any = 0, jenisServis = '', noHp = '', alamat = 'Bekasi';
          Object.keys(row).forEach((key) => {
            const upperKey = String(key).toUpperCase().trim();
            const value    = row[key];
            if (upperKey.includes('NAMA') && upperKey.includes('KONSUMEN')) { nama = value; }
            else if (upperKey.includes('NAMA') && !nama)                    { nama = value; }
            else if (upperKey.includes('POLISI') || upperKey.includes('NOPOL') || upperKey.includes('NO POL')) { nomorPolisi = value; }
            else if (upperKey.includes('TYPE') || upperKey.includes('MOTOR') || upperKey.includes('KENDARAAN')) { jenisKendaraan = value; }
            else if (upperKey.includes('TANGGAL') && (upperKey.includes('SERVICE') || upperKey.includes('SERVIS'))) { tanggalService = value; }
            else if (upperKey.includes('HARI') && (upperKey.includes('SERVICE') || upperKey.includes('SERVIS')))  { hariServis = value; }
            else if (upperKey.includes('JAM') || upperKey.includes('MASUK'))  { jamMasuk = value; }
            else if (upperKey.includes('KILOMETER') || upperKey === 'KM' || upperKey.includes('KM')) { kilometer = value; }
            else if (upperKey.includes('HP') || upperKey.includes('TELP') || upperKey.includes('TELEPON') || upperKey.includes('NO HANDPHONE')) { noHp = value; }
            else if (upperKey.includes('ALAMAT')) { alamat = value || 'Bekasi'; }
            else if (
              upperKey === 'SERVIS CATEGORI' || upperKey === 'SERVIS KATEGORI' ||
              upperKey === 'SERVICE CATEGORY' || upperKey === 'JENIS SERVIS' ||
              upperKey === 'JENIS SERVICE' || upperKey.includes('SERVIS CATEG') ||
              upperKey.includes('SERVICE CATEG') || upperKey.includes('JENIS SERVIS') || upperKey.includes('JENIS SERVICE')
            ) { jenisServis = value; }
          });
          const jamMasukFinal    = normalizeJamMasukValue(jamMasuk);
          const kilometerFinal   = parseInt(String(kilometer).replace(/\D/g, '')) || 0;
          return {
            nama:          nama ? String(nama).trim() : '',
            nomorPolisi:   nomorPolisi ? String(nomorPolisi).replace(/\s+/g, '').toUpperCase() : '',
            jenisKendaraan: jenisKendaraan ? String(jenisKendaraan).trim() : '',
            tanggalServis:  tanggalService || '',
            hariServis:     hariServis ? String(hariServis).trim() : 'Senin',
            jamMasuk:       jamMasukFinal,
            waktuServis:    parseWaktuServis(jamMasukFinal),
            kilometer:      kilometerFinal,
            jenisServis:    jenisServis ? String(jenisServis).trim() : 'Servis Berkala',
            noHp:           noHp ? String(noHp).trim() : '-',
            alamat:         alamat ? String(alamat).trim() : 'Bekasi',
          };
        });
        const validData = mappedData.filter((item, index) => {
          if (index >= 1000) return false;
          if (!item.nama || !item.nomorPolisi || !item.jenisKendaraan || !item.kilometer) return false;
          if (isHeaderLikeRow(item)) return false;
          return true;
        });
        if (validData.length === 0) {
          setImportStatus('error');
          setImportMessage('Tidak bisa membaca data dari Excel. Coba file lain atau format kolom berbeda.');
          return;
        }
        setImportData(validData);
        setImportStatus('preview');
        setImportMessage(`${validData.length} data historis siap diimport.`);
      } catch (error) {
        console.error('GAGAL MEMBACA EXCEL:', error);
        setImportStatus('error');
        setImportMessage(`Gagal membaca file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  /* ── logika handleImport ── */
  const handleImport = async () => {
    try {
      if (importData.length === 0) {
        setImportStatus('error');
        setImportMessage('Tidak ada data yang bisa diimport.');
        return;
      }
      setIsImporting(true);
      setImportStatus('idle');
      setImportMessage('Mengirim data ke database ...');
      const response = await fetch(`${API_URL}/import-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: importData }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Gagal import ke database.');
      setImportStatus('success');
      setImportMessage(
        `Import berhasil.\nPelanggan baru: ${result.pelanggan_baru || 0}\nRiwayat servis: ${result.riwayat_servis || 0}\nData dilewati: ${result.data_dilewati || 0}`
      );
      console.log('HASIL IMPORT:', result);
      setTimeout(() => { navigate('/dashboard/pelanggan'); }, 2000);
    } catch (error) {
      console.error('IMPORT ERROR:', error);
      setImportStatus('error');
      setImportMessage(`Gagal import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const resetFile = () => {
    setImportStatus('idle');
    setImportMessage('');
    setImportData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div style={{ backgroundColor: C.surface }} className="min-h-screen">

      {/* Page header */}
      <div className="mb-8">
        <h1
          className="text-[28px] font-bold leading-9"
          style={{ color: C.onSurface, fontFamily: "'Hanken Grotesk', sans-serif" }}
        >
          Import Data Historis
        </h1>
       
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ══ LEFT COLUMN (2/3) ══ */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card 1 — Deskripsi */}
          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: '#e2e8f0' }}>
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef2f2' }}>
                <Database className="w-7 h-7" style={{ color: C.primary }} />
              </div>
              <div className="flex-1">
                <h2
                  className="text-xl font-bold mb-2"
                  style={{ color: C.onSurface, fontFamily: "'Hanken Grotesk', sans-serif" }}
                >
                  Import Data Historis Servis
                </h2>
                <p className="text-sm leading-relaxed mb-4" style={{ color: C.secondary }}>
                  Fitur ini memungkinkan Anda untuk mengunggah riwayat servis pelanggan secara massal.
                  Pastikan data yang diimport mengandung informasi lengkap berikut:
                </p>
                <div className="grid grid-cols-2 gap-y-2">
                  {[
                    'Data Pelanggan & No. HP',
                    'Tanggal & Hari Servis',
                    'Jenis Servis (Kategori)',
                    'Informasi Kendaraan',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-xs font-semibold" style={{ color: C.onSurface }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 — Format Kolom */}
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(239,246,255,0.5)', border: '1px solid #dbeafe' }}>
            <div className="flex items-center gap-2 mb-4" style={{ color: '#1e40af' }}>
              <FileSpreadsheet className="w-5 h-5" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Format Kolom Excel</h4>
            </div>
            <p className="text-sm mb-4" style={{ color: '#1d4ed8' }}>
              File Excel Anda wajib memiliki kolom sebagai berikut (Huruf Kapital):
            </p>
            <div className="flex flex-wrap gap-2">
              {EXCEL_COLUMNS.map(col => (
                <span
                  key={col}
                  className="px-3 py-1 bg-white border rounded text-[11px] font-bold"
                  style={{ borderColor: '#bfdbfe', color: '#1d4ed8' }}
                >
                  {col}
                </span>
              ))}
            </div>
          
          </div>

          {/* Card 3 — Upload Area (hanya tampil jika belum preview/success) */}
          {importStatus !== 'preview' && importStatus !== 'success' && (
            <div className="bg-white rounded-xl border shadow-sm p-8" style={{ borderColor: '#e2e8f0' }}>
              <div
                className="rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all"
                style={{ border: '2px dashed #d1d5db' }}
                onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2'; }}
                onDragLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                onDrop={e => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  const dt = e.dataTransfer;
                  if (dt.files.length > 0 && fileInputRef.current) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(dt.files[0]);
                    fileInputRef.current.files = dataTransfer.files;
                    fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#fee2e2' }}
                >
                  <Upload className="w-8 h-8" style={{ color: C.primary }} />
                </div>
                <h4
                  className="text-xl font-bold mb-1"
                  style={{ color: C.onSurface, fontFamily: "'Hanken Grotesk', sans-serif" }}
                >
                  Pilih File Data Historis
                </h4>
                <p className="text-sm mb-8" style={{ color: C.secondary }}>
                  Format file harus .xlsx atau .xls (Excel)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="px-8 py-3 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
                  style={{ backgroundColor: C.greenBtn }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.greenBtnHover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.greenBtn)}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Pilih File Excel
                </label>
              </div>
            </div>
          )}

          {/* Status: idle/loading */}
          {importStatus === 'idle' && importMessage && (
            <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="text-sm" style={{ color: '#1e40af' }}>{importMessage}</p>
            </div>
          )}

          {/* Status: error */}
          {importStatus === 'error' && (
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Gagal membaca file</p>
                <p className="text-sm text-red-700 mt-0.5">{importMessage}</p>
                <button onClick={resetFile} className="text-xs font-bold text-red-600 hover:underline mt-2">
                  Coba lagi
                </button>
              </div>
            </div>
          )}

          {/* Status: success */}
          {importStatus === 'success' && (
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">Import Berhasil!</p>
                <p className="text-sm text-green-700 whitespace-pre-line mt-0.5">{importMessage}</p>
                <p className="text-xs text-green-600 mt-1">Mengalihkan ke halaman pelanggan...</p>
              </div>
            </div>
          )}

          {/* Preview section */}
          {importStatus === 'preview' && importData.length > 0 && (
            <div className="space-y-4">
              {/* Banner */}
              <div
                className="rounded-xl p-4 flex items-center justify-between"
                style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
              >
                <div className="flex items-center gap-3 text-green-800">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-bold">
                    {importData.length} data historis siap diimport
                  </span>
                </div>
                <button
                  onClick={resetFile}
                  className="text-xs font-bold hover:underline"
                  style={{ color: C.primary }}
                >
                  Ganti File
                </button>
              </div>

              {/* Tabel preview */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
                <div className="overflow-auto" style={{ maxHeight: 400 }}>
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10" style={{ backgroundColor: '#f8fafc' }}>
                      <tr>
                        {['Nama', 'Nopol', 'Motor', 'Jenis Servis', 'Tanggal', 'KM', 'Jam Masuk'].map(h => (
                          <th
                            key={h}
                            className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider border-b"
                            style={{ color: C.secondary, borderColor: '#e2e8f0' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 15).map((item, index) => (
                        <tr
                          key={index}
                          className="border-b transition-colors hover:bg-slate-50"
                          style={{ borderColor: '#f1f5f9' }}
                        >
                          <td className="px-4 py-3 text-sm font-medium" style={{ color: C.onSurface }}>{item.nama}</td>
                          <td className="px-4 py-3 text-sm font-mono" style={{ color: C.secondary }}>{formatNopol(item.nomorPolisi)}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: C.secondary }}>{item.jenisKendaraan}</td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ backgroundColor: C.surfaceLow, color: C.secondary }}
                            >
                              {item.jenisServis}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: C.secondary }}>{formatTanggalPreview(item.tanggalServis)}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: C.secondary }}>
                            {Number(item.kilometer || 0).toLocaleString('id-ID')} KM
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: C.secondary }}>{formatJamMasukPreview(item.jamMasuk)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importData.length > 15 && (
                    <div className="px-4 py-3 text-center text-sm" style={{ backgroundColor: '#f8fafc', color: C.secondary }}>
                      ... dan {importData.length - 15} data lainnya
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Import */}
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full py-4 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.99]"
                style={{
                  backgroundColor: isImporting ? '#9ca3af' : C.greenBtn,
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => { if (!isImporting) (e.currentTarget as HTMLElement).style.backgroundColor = C.greenBtnHover; }}
                onMouseLeave={e => { if (!isImporting) (e.currentTarget as HTMLElement).style.backgroundColor = C.greenBtn; }}
              >
                <Database className="w-5 h-5" />
                {isImporting ? 'Mengimpor...' : `Import ${importData.length} Data Historis`}
              </button>
            </div>
          )}
        </div>

        {/* ══ RIGHT COLUMN (1/3) ══ */}
        <div className="space-y-6">

          {/* Panduan */}
          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: '#e2e8f0' }}>
            <h3
              className="text-xl font-bold mb-6"
              style={{ color: C.onSurface, fontFamily: "'Hanken Grotesk', sans-serif" }}
            >
              Panduan untuk Import file
            </h3>

            <div className="space-y-6">
              {[
                { title: 'Siapkan File',      desc: 'Pastikan file Excel menggunakan format kolom yang ditentukan dan tidak ada baris kosong.' },
                { title: 'Unggah Data',       desc: 'Pilih file dari komputer Anda melalui area dropzone atau tombol pilih file.' },
                { title: 'Periksa Preview',   desc: 'Sistem akan menampilkan ringkasan data. Pastikan tidak ada data yang tergeser kolomnya.' },
                { title: 'Simpan ke Sistem',  desc: 'Klik tombol Import untuk memasukkan seluruh data ke dalam database AHASS Kirana.' },
              ].map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
                    style={{ backgroundColor: C.primary }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-1" style={{ color: C.onSurface }}>{step.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: C.secondary }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Warning note */}
            <div className="mt-8 pt-6 border-t" style={{ borderColor: '#f1f5f9' }}>
              <div className="p-4 rounded-lg flex gap-3" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
                <TriangleAlert className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-tight text-orange-800">
                  <strong>Catatan:</strong> Data dengan Nomor Polisi yang sama akan secara otomatis
                  dihubungkan dengan profil kendaraan yang sudah ada.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
