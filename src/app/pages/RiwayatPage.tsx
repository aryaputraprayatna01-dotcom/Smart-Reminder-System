import { useEffect, useState } from 'react';
import { History, Search, Calendar, Gauge, Clock, Hash, ChevronDown, ChevronUp, Trash2, CheckCircle, Bike, Phone, MapPin } from 'lucide-react';

type Pelanggan = {
  id_pelanggan: number;
  nama_konsumen: string;
  no_hp: string | null;
  alamat: string | null;
  type_motor: string;
  no_polisi: string;
};

type Servis = {
  id_servis: number;
  id_pelanggan: number;
  tanggal_service: string;
  hari_servis: string;
  jam_masuk: string | null;
  kilometer: number;
  jenis_servis: string;
  waktu_servis: string;
};

const API_URL = 'http://localhost:3001/api';
const RIWAYAT_SELECTED_PELANGGAN_KEY = 'riwayat_selected_pelanggan_id';
const RIWAYAT_SEARCH_KEY = 'riwayat_search_keyword';

/* Design tokens — sama persis dengan HTML referensi */
const C = {
  primary:    '#b50009',
  secondary:  '#555f71',
  surface:    '#f8f9ff',
  surfaceLow: '#eff4ff',
  surfaceHigh:'#dce9ff',
  onSurface:  '#0d1c2e',
  outline:    '#e9bcb6',
};

const formatNopol = (nopol: string) => {
  if (!nopol) return '-';
  const clean = nopol.replace(/\s+/g, '').toUpperCase();
  const match = clean.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})$/);
  if (!match) return nopol;
  return `${match[1]} ${match[2]} ${match[3]}`;
};

const formatJam = (jam: string | null | undefined): string => {
  if (!jam || jam === '-') return '-';
  const trimmed = String(jam).trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  return trimmed;
};

const getInitial = (nama: string) => (nama || '?').charAt(0).toUpperCase();

function SkeletonItem() {
  return (
    <div className="p-4 flex items-center gap-4 animate-pulse border-b" style={{ borderColor: C.outline }}>
      <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: C.surfaceHigh }} />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 rounded w-3/4" style={{ backgroundColor: C.surfaceHigh }} />
        <div className="h-2.5 rounded w-1/2" style={{ backgroundColor: C.surfaceLow }} />
      </div>
      <div className="h-5 w-8 rounded" style={{ backgroundColor: C.surfaceLow }} />
    </div>
  );
}

export function RiwayatPage() {
  const [pelangganList, setPelangganList]               = useState<Pelanggan[]>([]);
  const [servisList, setServisList]                     = useState<Servis[]>([]);
  const [selectedPelangganId, setSelectedPelangganId]   = useState<number | null>(null);
  const [searchTerm, setSearchTerm]                     = useState(() => localStorage.getItem(RIWAYAT_SEARCH_KEY) || '');
  const [collapsedCards, setCollapsedCards]             = useState<Set<number>>(new Set());
  const [loading, setLoading]                           = useState(true);
  const [confirmDeleteService, setConfirmDeleteService] = useState<number | null>(null);
  const [toast, setToast]                               = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const handleDeleteService = async () => {
    if (!confirmDeleteService) return;
    const idToDelete = confirmDeleteService;
    setConfirmDeleteService(null);
    try {
      const res = await fetch(`${API_URL}/servis/${idToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus data servis');
      setServisList(prev => prev.filter(s => s.id_servis !== idToDelete));
      showToast('Riwayat servis berhasil dihapus.');
    } catch (error) {
      console.error('Error hapus servis:', error);
      alert('Gagal menghapus data servis. Pastikan backend running.');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [pelangganRes, servisRes] = await Promise.all([
        fetch(`${API_URL}/pelanggan`),
        fetch(`${API_URL}/servis`),
      ]);
      const pelangganData = await pelangganRes.json();
      const servisData    = await servisRes.json();
      if (!pelangganRes.ok) throw new Error(pelangganData.message || 'Gagal mengambil data pelanggan');
      if (!servisRes.ok)    throw new Error(servisData.message    || 'Gagal mengambil data servis');
      setPelangganList(pelangganData);
      setServisList(servisData);
      const savedId  = localStorage.getItem(RIWAYAT_SELECTED_PELANGGAN_KEY);
      const savedPel = savedId ? pelangganData.find((p: Pelanggan) => String(p.id_pelanggan) === savedId) : null;
      if (savedPel) {
        setSelectedPelangganId(savedPel.id_pelanggan);
      } else if (pelangganData.length > 0) {
        setSelectedPelangganId(pelangganData[0].id_pelanggan);
        localStorage.setItem(RIWAYAT_SELECTED_PELANGGAN_KEY, String(pelangganData[0].id_pelanggan));
      } else {
        setSelectedPelangganId(null);
        localStorage.removeItem(RIWAYAT_SELECTED_PELANGGAN_KEY);
      }
    } catch (error) {
      console.error('Gagal mengambil riwayat:', error);
      alert('Gagal mengambil data riwayat dari database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    localStorage.setItem(RIWAYAT_SEARCH_KEY, value);
  };

  const handleSelectPelanggan = (id: number) => {
    setSelectedPelangganId(id);
    localStorage.setItem(RIWAYAT_SELECTED_PELANGGAN_KEY, String(id));
  };

  const toggleCollapse = (id: number) => {
    setCollapsedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getServisByPelanggan = (id: number) =>
    servisList
      .filter(s => s.id_pelanggan === id)
      .sort((a, b) => new Date(b.tanggal_service).getTime() - new Date(a.tanggal_service).getTime());

  const filteredPelanggan = pelangganList.filter(p => {
    const q = searchTerm.toLowerCase();
    return (
      (p.nama_konsumen || '').toLowerCase().includes(q) ||
      (p.no_hp         || '').toLowerCase().includes(q) ||
      (p.no_polisi     || '').toLowerCase().includes(q) ||
      formatNopol(p.no_polisi).toLowerCase().includes(q) ||
      (p.type_motor    || '').toLowerCase().includes(q)
    );
  });

  const selectedPelanggan = pelangganList.find(p => p.id_pelanggan === selectedPelangganId) || null;
  const selectedServis    = selectedPelangganId ? getServisByPelanggan(selectedPelangganId) : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface }}>

      {/* Toast */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-semibold" style={{ backgroundColor: '#059669' }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {toast.message}
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {confirmDeleteService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(13,28,46,0.5)', backdropFilter: 'blur(2px)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#fee2e2' }}>
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: C.onSurface, fontFamily: "'Hanken Grotesk', sans-serif" }}>
                Hapus Riwayat?
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: C.secondary }}>
                Apakah Anda yakin ingin menghapus data riwayat servis ini? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ backgroundColor: C.surfaceLow }}>
              <button
                onClick={() => setConfirmDeleteService(null)}
                className="px-4 py-2 text-sm font-bold rounded-xl transition-colors hover:opacity-80"
                style={{ color: C.secondary }}
              >
                Batal
              </button>
              <button
                onClick={handleDeleteService}
                className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-sm bg-red-600 hover:bg-red-700 transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.onSurface, fontFamily: "'Hanken Grotesk', sans-serif" }}>
          Riwayat Servis
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.secondary }}>
          Lihat riwayat servis kendaraan pelanggan bengkel AHASS Kirana Bekasi
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ══ KOLOM KIRI: Daftar Pelanggan ══ */}
        <div className="lg:col-span-1">
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col"
            style={{ border: `1px solid ${C.outline}`, maxHeight: 'calc(100vh - 180px)' }}
          >
            {/* Header */}
            <div className="p-5 border-b" style={{ borderColor: C.outline }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color: C.onSurface, fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  Pilih Pelanggan
                </h3>
                {!loading && (
                  <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ backgroundColor: C.surfaceHigh, color: C.secondary }}>
                    {filteredPelanggan.length} Ditemukan
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.secondary }} />
                <input
                  type="text"
                  placeholder="Cari nama atau nopol..."
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl outline-none transition-all"
                  style={{ backgroundColor: C.surfaceLow, border: `1px solid ${C.outline}`, color: C.onSurface }}
                  onFocus={e => (e.currentTarget.style.boxShadow = `0 0 0 2px ${C.primary}33`)}
                  onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => <SkeletonItem key={i} />)
              ) : filteredPelanggan.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-10 h-10 mx-auto mb-2" style={{ color: C.surfaceHigh }} />
                  <p className="text-sm" style={{ color: C.secondary }}>Pelanggan tidak ditemukan</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: C.outline }}>
                  {filteredPelanggan.map(pel => {
                    const count = getServisByPelanggan(pel.id_pelanggan).length;
                    const isSel = selectedPelangganId === pel.id_pelanggan;
                    return (
                      <button
                        key={pel.id_pelanggan}
                        onClick={() => handleSelectPelanggan(pel.id_pelanggan)}
                        className="w-full text-left p-4 flex items-center gap-3 transition-all"
                        style={{
                          backgroundColor: isSel ? `${C.primary}0d` : 'transparent',
                          borderLeft: isSel ? `4px solid ${C.primary}` : '4px solid transparent',
                        }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.backgroundColor = C.surfaceLow; }}
                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={isSel
                            ? { backgroundColor: `${C.primary}1a`, color: C.primary }
                            : { backgroundColor: C.surfaceHigh, color: C.secondary }
                          }
                        >
                          {getInitial(pel.nama_konsumen)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate" style={{ color: C.onSurface }}>
                            {pel.nama_konsumen}
                          </p>
                          <p className="text-xs truncate mt-0.5" style={{ color: C.secondary }}>
                            {pel.type_motor || '-'} &bull; <span className="font-mono">{formatNopol(pel.no_polisi)}</span>
                          </p>
                        </div>

                        {/* Count badge */}
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                          style={isSel
                            ? { backgroundColor: C.primary, color: '#fff' }
                            : { backgroundColor: C.surfaceHigh, color: C.secondary }
                          }
                        >
                          {count}x
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ KOLOM KANAN: Info + Timeline ══ */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPelanggan ? (
            <>
              {/* Info Pelanggan */}
              <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: `1px solid ${C.outline}` }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold" style={{ color: C.onSurface, fontFamily: "'Hanken Grotesk', sans-serif" }}>
                    Info Pelanggan
                  </h3>

                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { icon: <Bike className="w-3 h-3" />, label: 'Kendaraan', value: selectedPelanggan.type_motor || '-', mono: false },
                    { icon: <MapPin className="w-3 h-3" />, label: 'Nomor Polisi', value: formatNopol(selectedPelanggan.no_polisi), mono: true },
                    { icon: <Phone className="w-3 h-3" />, label: 'No HP', value: selectedPelanggan.no_hp || '-', mono: false },
                    { icon: null, label: 'Total Servis', value: `${selectedServis.length}x`, mono: false },
                  ].map(({ label, value, mono }) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: C.secondary }}>
                        {label}
                      </p>
                      <p className={`font-bold text-sm ${mono ? 'font-mono' : ''}`} style={{ color: C.onSurface }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Riwayat Label */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm" style={{ color: C.onSurface }}>Riwayat Servis</p>
                  <p className="text-xs mt-0.5" style={{ color: C.secondary }}>Diurutkan dari terbaru ke terlama</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: C.surfaceHigh, color: C.secondary }}>
                  {selectedServis.length} data
                </span>
              </div>

              {selectedServis.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-20" style={{ border: `1px solid ${C.outline}` }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: C.surfaceHigh }}>
                    <History className="w-7 h-7" style={{ color: C.secondary }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: C.secondary }}>Belum ada riwayat servis</p>
                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Servis pelanggan akan muncul di sini</p>
                </div>
              ) : (
                /* ── Timeline ── */
                <div className="relative pl-12">
                  {/* Garis vertikal */}
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none"
                    style={{ left: 20, width: 2, backgroundColor: C.surfaceHigh }}
                  />

                  <div className="space-y-8">
                    {selectedServis.map((servis, index) => {
                      const isLatest    = index === 0;
                      const isCollapsed = collapsedCards.has(servis.id_servis);
                      const jenis       = servis.jenis_servis || 'Servis Berkala';
                      const jamTampil   = formatJam(servis.jam_masuk);

                      return (
                        <div
                          key={servis.id_servis}
                          className="relative group transition-opacity"
                          style={{ opacity: isLatest ? 1 : 0.85 }}
                          onMouseEnter={e => { if (!isLatest) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                          onMouseLeave={e => { if (!isLatest) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                        >
                          {/* Circle badge */}
                          <div
                            className="absolute z-10 flex items-center justify-center font-bold text-sm border-4 border-white shadow-sm transition-transform group-hover:scale-110"
                            style={{
                              left: -32, top: 0,
                              width: 40, height: 40,
                              borderRadius: '50%',
                              backgroundColor: isLatest ? `${C.primary}1a` : C.surfaceHigh,
                              color:           isLatest ? C.primary        : C.secondary,
                            }}
                          >
                            {index + 1}
                          </div>

                          {/* Card */}
                          <div
                            className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all"
                            style={{ border: `1px solid ${C.outline}` }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = isLatest ? `${C.primary}4d` : `${C.secondary}40`;
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = C.outline;
                            }}
                          >
                            {/* Card header */}
                            <div
                              className="p-5 flex items-center justify-between border-b"
                              style={{
                                borderColor: C.surfaceLow,
                                backgroundColor: isLatest ? `${C.surfaceLow}` : 'transparent',
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <h4 className="font-bold text-lg leading-snug" style={{ color: C.onSurface }}>
                                  {jenis}
                                </h4>
                                {/* KM badge */}
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap flex-shrink-0 flex items-center gap-1"
                                  style={isLatest
                                    ? { backgroundColor: `${C.primary}1a`, color: C.primary, border: `1px solid ${C.primary}33` }
                                    : { backgroundColor: C.surfaceHigh, color: C.secondary, border: `1px solid ${C.outline}` }
                                  }
                                >
                                  <Gauge className="w-3 h-3" />
                                  {Number(servis.kilometer || 0).toLocaleString('id-ID')} KM
                                </span>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                                {/* Expand/collapse */}
                                <button
                                  onClick={() => toggleCollapse(servis.id_servis)}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ color: C.secondary }}
                                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.surfaceLow)}
                                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  title={isCollapsed ? 'Tampilkan detail' : 'Sembunyikan detail'}
                                >
                                  {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                                </button>
                                {/* Hapus */}
                                <button
                                  onClick={() => setConfirmDeleteService(servis.id_servis)}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ color: C.secondary }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.color = '#dc2626';
                                    e.currentTarget.style.backgroundColor = '#fef2f2';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.color = C.secondary;
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                  title="Hapus riwayat servis ini"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            {/* Card body */}
                            {!isCollapsed && (
                              <div className="p-5">
                                {/* Tanggal */}
                                <div className="flex items-center gap-2 mb-4" style={{ color: C.secondary }}>
                                  <Calendar className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-sm font-semibold">
                                    {new Date(servis.tanggal_service).toLocaleDateString('id-ID', {
                                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                    })}
                                  </span>
                                </div>

                                {/* Detail grid — persis seperti di HTML */}
                                <div
                                  className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl"
                                  style={{ backgroundColor: C.surfaceLow }}
                                >
                                  {[
                                    { label: 'Hari',      value: servis.hari_servis || '-' },
                                    { label: 'Waktu',     value: servis.waktu_servis || '-' },
                                    { label: 'Jam Masuk', value: jamTampil },
                                    { label: 'ID Servis', value: `#SRV-${String(servis.id_servis).padStart(4, '0')}` },
                                  ].map(({ label, value }) => (
                                    <div key={label}>
                                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: C.secondary }}>
                                        {label}
                                      </p>
                                      <p className="font-bold text-sm" style={{ color: C.onSurface }}>{value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-24" style={{ border: `1px solid ${C.outline}` }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: C.surfaceHigh }}>
                <History className="w-8 h-8" style={{ color: C.secondary }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: C.secondary }}>Pilih pelanggan terlebih dahulu</p>
              <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Riwayat servis akan ditampilkan di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
