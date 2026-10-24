import { useState, useEffect } from 'react';
import { RuleBasedEngine } from '../ruleEngine';
import { Bell, TrendingUp, Calendar, Clock, User, CheckCircle, ChevronLeft, ChevronRight, Search, Trash2, MessageCircle, AlertTriangle } from 'lucide-react';

type FilterTab = 'Belum Dikirim' | 'Sudah Dikirim' | 'Perlu Dikirim';
type SubTab    = 'hari-ini' | 'terdekat' | 'terlewat';

interface ToastState {
  show: boolean;
  message: string;
  type?: 'success' | 'warning';
}

const REMINDER_SELECTED_KEY = 'reminder_selected_id';
const REMINDER_SEARCH_KEY   = 'reminder_search_keyword';
const REMINDER_TAB_KEY      = 'reminder_selected_tab';
const REMINDER_PAGE_KEY     = 'reminder_current_page';

const getSavedReminderTab = (): FilterTab => {
  const savedTab = localStorage.getItem(REMINDER_TAB_KEY);
  if (savedTab === 'Belum Dikirim' || savedTab === 'Sudah Dikirim' || savedTab === 'Perlu Dikirim') {
    return savedTab;
  }
  return 'Belum Dikirim';
};

export function ReminderPage() {
  const [reminderList, setReminderList]         = useState<any[]>([]);
  const [selectedReminder, setSelectedReminder] = useState<string | null>(() => localStorage.getItem(REMINDER_SELECTED_KEY));
  const [pelangganMap, setPelangganMap]         = useState<Map<string, any>>(new Map());
  const [loading, setLoading]                   = useState(true);
  const [currentPage, setCurrentPage]           = useState(() => {
    const savedPage = Number(localStorage.getItem(REMINDER_PAGE_KEY));
    return savedPage > 0 ? savedPage : 1;
  });
  const [searchQuery, setSearchQuery]   = useState(() => localStorage.getItem(REMINDER_SEARCH_KEY) || '');
  const [activeTab, setActiveTab]       = useState<FilterTab>(() => getSavedReminderTab());
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('hari-ini');
  const [toast, setToast]               = useState<ToastState>({ show: false, message: '' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const itemsPerPage = 5;

  /* ─── helpers ─────────────────────────────────────────── */
  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    localStorage.setItem(REMINDER_SEARCH_KEY, value);
    localStorage.setItem(REMINDER_PAGE_KEY, '1');
  };

  const handleSelectReminder = (reminderId: string) => {
    setSelectedReminder(reminderId);
    localStorage.setItem(REMINDER_SELECTED_KEY, reminderId);
  };

  const clearSelectedReminder = () => {
    setSelectedReminder(null);
    localStorage.removeItem(REMINDER_SELECTED_KEY);
  };

  const formatPhoneNumber = (noHp: string): string | null => {
    if (!noHp || noHp === '-') return null;
    let phone = String(noHp).replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    if (phone.startsWith('8')) phone = '62' + phone;
    if (phone.length < 10 || phone.length > 15) return null;
    return phone;
  };

  const handleSendWhatsApp = (reminder: any) => {
    const pelanggan = pelangganMap.get(reminder.pelangganId);
    const phone = formatPhoneNumber(pelanggan?.noHp);
    if (!phone) {
      showToast('Nomor WhatsApp pelanggan belum valid.', 'warning');
      return;
    }
    const tanggalEstimasi = reminder.tanggalServisBerikutnya?.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const pesan = `Halo Bapak/Ibu ${pelanggan?.nama}, kami dari AHASS Kirana Bekasi ingin mengingatkan bahwa kendaraan ${pelanggan?.jenisKendaraan} dengan nomor polisi ${pelanggan?.nomorPolisi} sudah mendekati jadwal servis berikutnya pada tanggal ${tanggalEstimasi}. Silakan melakukan servis sesuai jadwal agar kondisi kendaraan tetap optimal. Terima kasih.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(pesan)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const HARI_TO_DAY: Record<string, number> = {
    Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6,
  };

  const calculateReminderDate = (nextServiceDate: Date, hMinus: string): Date => {
    const reminderDate = new Date(nextServiceDate);
    if (hMinus === 'H-7') {
      reminderDate.setDate(reminderDate.getDate() - 7);
    } else if (hMinus === 'H-5') {
      reminderDate.setDate(reminderDate.getDate() - 5);
    } else {
      reminderDate.setDate(reminderDate.getDate() - 2);
    }
    return reminderDate;
  };

  const adjustReminderToPreferensiHari = (
    reminderDate: Date,
    nextServiceDate: Date,
    preferensiHari: string,
  ): { adjustedReminder: Date; adjustedNextService: Date } => {
    const targetDay = HARI_TO_DAY[preferensiHari];
    if (targetDay === undefined) {
      return { adjustedReminder: reminderDate, adjustedNextService: nextServiceDate };
    }
    const currentDay = reminderDate.getDay();
    const daysToShift = (targetDay - currentDay + 7) % 7;
    if (daysToShift === 0) {
      return { adjustedReminder: reminderDate, adjustedNextService: nextServiceDate };
    }
    const adjustedReminder = new Date(reminderDate);
    adjustedReminder.setDate(adjustedReminder.getDate() + daysToShift);
    const adjustedNextService = new Date(nextServiceDate);
    adjustedNextService.setDate(adjustedNextService.getDate() + daysToShift);
    return { adjustedReminder, adjustedNextService };
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const idToDelete = confirmDelete;
    setConfirmDelete(null);
    setReminderList(prev => prev.filter(r => r.id !== idToDelete));
    if (selectedReminder === idToDelete) clearSelectedReminder();
    showToast('Reminder pelanggan berhasil dihapus dari daftar.');
    try {
      await fetch(`http://localhost:3001/api/reminder/${idToDelete}`, { method: 'DELETE' });
    } catch (error) {
      console.error('❌ Error hapus reminder:', error);
    }
  };

  const handleMarkAsSent = async (reminderId: string) => {
    const tanggalAktualDikirim = new Date();
    setReminderList(prev =>
      prev.map(r =>
        r.id === reminderId
          ? { ...r, statusKirim: 'Sudah Dikirim', tanggalAktualDikirim }
          : r
      )
    );
    if (selectedReminder === reminderId) clearSelectedReminder();
    showToast('Reminder berhasil ditandai sebagai sudah dikirim.');
    try {
      await fetch(`http://localhost:3001/api/reminder/${reminderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_kirim: 'Sudah Dikirim', tanggal_aktual_dikirim: tanggalAktualDikirim.toISOString() })
      });
    } catch (error) {
      console.error('❌ Error update status:', error);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (reminderList.length === 0) return;
    const savedReminderId = localStorage.getItem(REMINDER_SELECTED_KEY);
    if (savedReminderId && reminderList.some(r => r.id === savedReminderId)) {
      setSelectedReminder(savedReminderId);
      return;
    }
    if (savedReminderId) {
      localStorage.removeItem(REMINDER_SELECTED_KEY);
      setSelectedReminder(null);
    }
  }, [reminderList]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reminderResponse, pelangganResponse, servisResponse] = await Promise.all([
        fetch('http://localhost:3001/api/reminder'),
        fetch('http://localhost:3001/api/pelanggan'),
        fetch('http://localhost:3001/api/servis'),
      ]);

      const reminderData  = await reminderResponse.json();
      const pelangganData = await pelangganResponse.json();
      const servisData    = await servisResponse.json();

      const map = new Map<string, any>();
      pelangganData.forEach((p: any) => {
        map.set(String(p.id_pelanggan), {
          id: String(p.id_pelanggan),
          nama: p.nama_konsumen,
          jenisKendaraan: p.type_motor,
          nomorPolisi: p.no_polisi,
          noHp: p.no_hp || '-'
        });
      });

      const lastServiceMap = new Map<string, Date>();
      const servisPerPelanggan = new Map<string, { tanggalServis: Date }[]>();

      servisData.forEach((s: any) => {
        const pid = String(s.id_pelanggan);
        const tanggalOnly = String(s.tanggal_service).split('T')[0];
        const [year, month, day] = tanggalOnly.split('-').map(Number);
        const tanggalServis = new Date(year, month - 1, day);

        if (!lastServiceMap.has(pid) || tanggalServis.getTime() > lastServiceMap.get(pid)!.getTime()) {
          lastServiceMap.set(pid, tanggalServis);
        }

        const list = servisPerPelanggan.get(pid) || [];
        list.push({ tanggalServis });
        servisPerPelanggan.set(pid, list);
      });

      const mappedReminders = reminderData
        .map((r: any) => {
          const pelangganId = String(r.id_pelanggan);

          let tanggalServisTerakhir: Date;
          if (r.tanggal_service) {
            const tgl = String(r.tanggal_service).split('T')[0];
            const [yr, mo, dy] = tgl.split('-').map(Number);
            tanggalServisTerakhir = new Date(yr, mo - 1, dy);
          } else {
            const fallback = lastServiceMap.get(pelangganId);
            if (!fallback) return null;
            tanggalServisTerakhir = fallback;
          }

          const servisHistori = servisPerPelanggan.get(pelangganId) || [];
          const baseNextService = RuleBasedEngine.hitungPredictedNextService(
            servisHistori,
            tanggalServisTerakhir
          );
          const baseReminder    = calculateReminderDate(baseNextService, r.h_minus);
          const { adjustedReminder, adjustedNextService } = adjustReminderToPreferensiHari(
            baseReminder,
            baseNextService,
            r.preferensi_hari || 'Selasa',
          );
          const tanggalServisBerikutnya = adjustedNextService;
          const tanggalReminderDikirim  = adjustedReminder;

          return {
            id: String(r.id_reminder),
            pelangganId,
            jarakWaktu: r.h_minus,
            hariPengiriman: r.hari_pengiriman,
            waktuPengiriman: r.waktu_pengiriman,
            tanggalDibuat: new Date(r.created_at),
            statusKirim: r.status_kirim || 'Belum Dikirim',
            tanggalAktualDikirim: r.tanggal_aktual_dikirim ? new Date(r.tanggal_aktual_dikirim) : null,
            tanggalServisTerakhir,
            tanggalServisBerikutnya,
            tanggalReminderDikirim,
            analisis: {
              frekuensi: r.frekuensi,
              intensitas: r.intensitas,
              preferensiHari: r.preferensi_hari,
              preferensiWaktu: r.preferensi_waktu
            }
          };
        })
        .filter(Boolean);

      setReminderList(mappedReminders);
      setPelangganMap(map);
    } catch (error) {
      console.error('❌ Gagal load data reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  /* ─── color helpers ──────────────────────────────────── */
  const getColorByFrekuensi = (category: string) => {
    switch (category) {
      case 'Tinggi': return 'text-green-700 bg-green-50';
      case 'Sedang': return 'text-yellow-600 bg-yellow-50';
      case 'Rendah': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getColorByIntensitas = (category: string) => {
    switch (category) {
      case 'Tinggi': return 'text-orange-600 bg-orange-50';
      case 'Sedang': return 'text-yellow-600 bg-yellow-50';
      case 'Rendah': return 'text-green-700 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getFrekuensiKeterangan = (category: string) => {
    switch (category) {
      case 'Tinggi': return 'Pelanggan rutin melakukan servis';
      case 'Sedang': return 'Pelanggan cukup rutin melakukan servis';
      case 'Rendah': return 'Pelanggan jarang melakukan servis';
      default: return '';
    }
  };

  const getIntensitasKeterangan = (category: string) => {
    switch (category) {
      case 'Tinggi': return 'Kendaraan sering digunakan';
      case 'Sedang': return 'Kendaraan digunakan secara normal';
      case 'Rendah': return 'Kendaraan jarang digunakan';
      default: return '';
    }
  };

  const getColorByJarak = (jarak: string) => {
    switch (jarak) {
      case 'H-7': return 'bg-red-500';
      case 'H-5': return 'bg-yellow-500';
      case 'H-2': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  /* ─── derived state ──────────────────────────────────── */
  const selectedReminderData = reminderList.find(r => r.id === selectedReminder);
  const selectedPelanggan    = selectedReminderData ? pelangganMap.get(selectedReminderData.pelangganId) : null;

  // Today at midnight for date comparisons
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Day difference helper: positive = future, negative = past
  const getDaysDiff = (targetDate: Date): number => {
    const d = new Date(targetDate);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Search helper
  const applySearch = (list: any[]) => {
    if (!searchQuery) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(r => {
      const p = pelangganMap.get(r.pelangganId);
      return (p?.nama?.toLowerCase() || '').includes(query) || (p?.nomorPolisi?.toLowerCase() || '').includes(query);
    });
  };

  // For Belum/Sudah Dikirim tabs — existing logic unchanged
  const tabFilteredReminders = reminderList.filter(r => {
    if (activeTab === 'Belum Dikirim') return r.statusKirim !== 'Sudah Dikirim';
    if (activeTab === 'Sudah Dikirim') return r.statusKirim === 'Sudah Dikirim';
    return r.statusKirim !== 'Sudah Dikirim';
  });

  const filteredReminders = tabFilteredReminders.filter(reminder => {
    const pelanggan = pelangganMap.get(reminder.pelangganId);
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const nama  = pelanggan?.nama?.toLowerCase() || '';
    const nopol = pelanggan?.nomorPolisi?.toLowerCase() || '';
    return nama.includes(query) || nopol.includes(query);
  });

  const totalPages         = Math.ceil(filteredReminders.length / itemsPerPage);
  const startIndex         = (currentPage - 1) * itemsPerPage;
  const paginatedReminders = filteredReminders.slice(startIndex, startIndex + itemsPerPage);

  // ── Perlu Dikirim sub-groups (base = all belum dikirim, before search)
  const perluBase = reminderList.filter(r => r.statusKirim !== 'Sudah Dikirim');

  const hariIniAll  = perluBase.filter(r => getDaysDiff(r.tanggalReminderDikirim) === 0);
  const terdekatAll = perluBase
    .filter(r => getDaysDiff(r.tanggalReminderDikirim) > 0)
    .sort((a, b) => a.tanggalReminderDikirim.getTime() - b.tanggalReminderDikirim.getTime());
  const terlewatAll = perluBase
    .filter(r => getDaysDiff(r.tanggalReminderDikirim) < 0)
    .sort((a, b) => b.tanggalReminderDikirim.getTime() - a.tanggalReminderDikirim.getTime()); // most recent first

  // Apply search per active sub-tab
  const hariIniFiltered  = applySearch(hariIniAll);
  const terdekatFiltered = applySearch(terdekatAll);
  const terlewatFiltered = applySearch(terlewatAll);

  // Active sub-tab data
  const activeSubTabData =
    activeSubTab === 'hari-ini'  ? hariIniFiltered  :
    activeSubTab === 'terdekat'  ? terdekatFiltered :
    terlewatFiltered;

  // Group by date for Terdekat and Terlewat date headers
  const groupByDate = (list: any[]): { date: Date; items: any[] }[] => {
    const groups = new Map<number, { date: Date; items: any[] }>();
    list.forEach(r => {
      const d = new Date(r.tanggalReminderDikirim);
      d.setHours(0, 0, 0, 0);
      const key = d.getTime();
      if (!groups.has(key)) groups.set(key, { date: d, items: [] });
      groups.get(key)!.items.push(r);
    });
    return Array.from(groups.values());
  };

  // Tab change handlers
  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    clearSelectedReminder();
    if (tab === 'Perlu Dikirim') setActiveSubTab('hari-ini');
    localStorage.setItem(REMINDER_TAB_KEY, tab);
    localStorage.setItem(REMINDER_PAGE_KEY, '1');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    localStorage.setItem(REMINDER_PAGE_KEY, String(page));
  };

  // Badge counts
  const perluDikirimCount = reminderList.filter(r => {
    if (r.statusKirim === 'Sudah Dikirim') return false;
    return getDaysDiff(r.tanggalReminderDikirim) <= 0;
  }).length;

  const tabCounts = {
    'Belum Dikirim': reminderList.filter(r => r.statusKirim !== 'Sudah Dikirim').length,
    'Sudah Dikirim': reminderList.filter(r => r.statusKirim === 'Sudah Dikirim').length,
    'Perlu Dikirim': perluDikirimCount,
  };

  /* ─── Reminder card (shared renderer) ────────────────── */
  const renderReminderCard = (reminder: any) => {
    const pelanggan    = pelangganMap.get(reminder.pelangganId);
    const isSelected   = selectedReminder === reminder.id;
    const sudahDikirim = reminder.statusKirim === 'Sudah Dikirim';

    return (
      <div
        key={reminder.id}
        onClick={() => handleSelectReminder(reminder.id)}
        className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition ${
          isSelected ? 'ring-2 ring-red-500 shadow-lg' : 'hover:shadow-lg'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-3 rounded-lg">
              <Bell className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{pelanggan?.nama}</h3>
              <p className="text-sm text-gray-600">{pelanggan?.jenisKendaraan} - {pelanggan?.nomorPolisi}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getColorByJarak(reminder.jarakWaktu)}`}>
            {reminder.jarakWaktu}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Servis Terakhir</p>
            <p className="font-semibold text-gray-900 text-sm">
              {reminder.tanggalServisTerakhir?.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Estimasi Berikutnya</p>
            <p className="font-semibold text-gray-900 text-sm">
              {reminder.tanggalServisBerikutnya?.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">Jadwal Kirim Reminder</p>
            <p className="font-semibold text-blue-900 text-sm">
              {reminder.tanggalReminderDikirim?.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Status</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
              sudahDikirim ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
            }`}>
              {reminder.statusKirim}
            </span>
          </div>
        </div>

        {sudahDikirim && reminder.tanggalAktualDikirim && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-green-700 font-semibold">Tanggal Aktual Dikirim</p>
            <p className="text-sm text-green-900 font-semibold mt-0.5">
              {reminder.tanggalAktualDikirim.toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}{' '}
              {reminder.tanggalAktualDikirim.toLocaleTimeString('id-ID', {
                hour: '2-digit', minute: '2-digit'
              })} WIB
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className={`text-center py-2 px-1 rounded-lg ${getColorByFrekuensi(reminder.analisis.frekuensi)}`}>
            <p className="text-xs">Frekuensi Servis</p>
            <p className="font-semibold">{reminder.analisis.frekuensi}</p>
            <p className="text-xs mt-0.5 opacity-80">{getFrekuensiKeterangan(reminder.analisis.frekuensi)}</p>
          </div>
          <div className={`text-center py-2 px-1 rounded-lg ${getColorByIntensitas(reminder.analisis.intensitas)}`}>
            <p className="text-xs">Intensitas Pemakaian</p>
            <p className="font-semibold">{reminder.analisis.intensitas}</p>
            <p className="text-xs mt-0.5 opacity-80">{getIntensitasKeterangan(reminder.analisis.intensitas)}</p>
          </div>
        </div>

        <div className="space-y-2">
          {!sudahDikirim && (
            <button
              onClick={e => { e.stopPropagation(); handleSendWhatsApp(reminder); }}
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Kirim via WhatsApp
            </button>
          )}
          <div className="flex gap-2">
            <button
              disabled={sudahDikirim}
              onClick={e => { e.stopPropagation(); if (!sudahDikirim) handleMarkAsSent(reminder.id); }}
              className={`flex-1 font-semibold py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 text-sm ${
                sudahDikirim
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'border border-green-600 text-green-700 hover:bg-green-50 cursor-pointer'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {sudahDikirim ? 'Sudah Dikirim' : 'Tandai Sudah Dikirim'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(reminder.id); }}
              title="Hapus reminder ini"
              className="px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-500 rounded-lg transition flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ─── Time indicator badge ────────────────────────────── */
  const TimeIndicatorFuture = ({ days }: { days: number }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 font-bold text-sm tracking-wide">
        {days === 1 ? 'Besok' : `${days} HARI LAGI`}
      </span>
    </div>
  );

  const TimeIndicatorPast = ({ days }: { days: number }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-100 border border-red-300 text-red-700 font-bold text-sm tracking-wide">
        {days === 1 ? '1 HARI YANG LALU' : `${days} HARI YANG LALU`}
      </span>
    </div>
  );

  /* ─── Empty state ─────────────────────────────────────── */
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-5 py-4">
      <CheckCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );

  /* ─── render ──────────────────────────────────────────── */
  return (
    <div>
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl transition-all text-white ${
          toast.type === 'warning' ? 'bg-orange-500' : 'bg-green-600'
        }`}>
          {toast.type === 'warning'
            ? <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Modal Hapus */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900">Hapus Reminder</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus reminder pelanggan ini dari daftar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Rekomendasi Reminder</h1>
        <p className="text-gray-600 mt-1">Lihat hasil analisis dan rekomendasi waktu pengiriman reminder</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">

          {/* ── Tab Utama ── */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <div className="flex gap-2">
              {(['Belum Dikirim', 'Sudah Dikirim', 'Perlu Dikirim'] as FilterTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === tab
                      ? tab === 'Belum Dikirim'
                        ? 'bg-orange-500 text-white'
                        : tab === 'Sudah Dikirim'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Sub-tab "Perlu Dikirim" ── */}
          {activeTab === 'Perlu Dikirim' && (
            <div className="bg-white rounded-xl shadow-md p-4 mb-4">
              <div className="flex flex-wrap gap-2">
                {/* Hari Ini */}
                <button
                  onClick={() => { setActiveSubTab('hari-ini'); clearSelectedReminder(); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition flex-1 justify-center ${
                    activeSubTab === 'hari-ini'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
                  }`}
                >
                  <span>🔴</span>
                  <span>Hari Ini</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeSubTab === 'hari-ini' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {hariIniAll.length}
                  </span>
                </button>

                {/* Terdekat */}
                <button
                  onClick={() => { setActiveSubTab('terdekat'); clearSelectedReminder(); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition flex-1 justify-center ${
                    activeSubTab === 'terdekat'
                      ? 'bg-yellow-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-700'
                  }`}
                >
                  <span>🟡</span>
                  <span>Terdekat</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeSubTab === 'terdekat' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {terdekatAll.length}
                  </span>
                </button>

                {/* Terlewat */}
                <button
                  onClick={() => { setActiveSubTab('terlewat'); clearSelectedReminder(); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition flex-1 justify-center ${
                    activeSubTab === 'terlewat'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-700'
                  }`}
                >
                  <span>⚠️</span>
                  <span>Terlewat</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeSubTab === 'terlewat' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {terlewatAll.length}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── Search Bar ── */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama pelanggan atau nomor polisi..."
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* ── Content Area ── */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Memuat data reminder...</p>
            </div>

          ) : activeTab === 'Perlu Dikirim' ? (

            /* ══════════════════════════════════════
               PERLU DIKIRIM — one sub-tab at a time
               ══════════════════════════════════════ */
            <div>

              {/* 🔴 Hari Ini */}
              {activeSubTab === 'hari-ini' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg">
                      <span className="text-base">🔴</span>
                      <span className="font-bold text-sm">Perlu Dikirim Hari Ini</span>
                    </div>
                    {hariIniFiltered.length > 0 && (
                      <span className="text-sm text-gray-500 font-medium">
                        {hariIniFiltered.length} pelanggan
                      </span>
                    )}
                  </div>

                  {hariIniFiltered.length === 0 ? (
                    <EmptyState message={searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Tidak ada reminder yang perlu dikirim hari ini.'} />
                  ) : (
                    <div className="space-y-4">
                      {hariIniFiltered.map(r => renderReminderCard(r))}
                    </div>
                  )}
                </div>
              )}

              {/* 🟡 Terdekat */}
              {activeSubTab === 'terdekat' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg">
                      <span className="text-base">🟡</span>
                      <span className="font-bold text-sm">Terdekat dari Hari Ini</span>
                    </div>
                    {terdekatFiltered.length > 0 && (
                      <span className="text-sm text-gray-500 font-medium">
                        {terdekatFiltered.length} reminder
                      </span>
                    )}
                  </div>

                  {terdekatFiltered.length === 0 ? (
                    <EmptyState message={searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Tidak ada jadwal reminder yang akan datang.'} />
                  ) : (
                    <div className="space-y-6">
                      {groupByDate(terdekatFiltered).map(({ date, items }) => {
                        const days = getDaysDiff(date);
                        return (
                          <div key={date.getTime()}>
                            {/* Date group header */}
                            <div className="flex items-center gap-3 mb-3 px-1">
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Jadwal Reminder</p>
                                <p className="font-bold text-gray-800 text-sm">
                                  {date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                              <TimeIndicatorFuture days={days} />
                            </div>
                            <div className="space-y-4">
                              {items.map(r => renderReminderCard(r))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ⚠️ Terlewat */}
              {activeSubTab === 'terlewat' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-bold text-sm">Terlewat</span>
                    </div>
                    {terlewatFiltered.length > 0 && (
                      <span className="text-sm text-gray-500 font-medium">
                        {terlewatFiltered.length} pelanggan
                      </span>
                    )}
                  </div>

                  {terlewatFiltered.length === 0 ? (
                    <EmptyState message={searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Tidak ada reminder yang terlewat.'} />
                  ) : (
                    <div className="space-y-6">
                      {groupByDate(terlewatFiltered).map(({ date, items }) => {
                        const days = Math.abs(getDaysDiff(date));
                        return (
                          <div key={date.getTime()}>
                            {/* Date group header */}
                            <div className="flex items-center gap-3 mb-3 px-1">
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Jadwal Reminder</p>
                                <p className="font-bold text-gray-800 text-sm">
                                  {date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                              <TimeIndicatorPast days={days} />
                            </div>
                            <div className="space-y-4">
                              {items.map(r => renderReminderCard(r))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

          ) : (

            /* ══════════════════════════════════════
               BELUM / SUDAH DIKIRIM — paginated list
               ══════════════════════════════════════ */
            <div className="space-y-4">
              {filteredReminders.length === 0 && searchQuery ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Tidak ada hasil untuk &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-gray-400 text-sm mt-2">Coba kata kunci lain</p>
                </div>
              ) : filteredReminders.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    {activeTab === 'Belum Dikirim'
                      ? 'Tidak ada reminder yang belum dikirim'
                      : 'Belum ada reminder yang sudah dikirim'}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {activeTab === 'Belum Dikirim'
                      ? 'Semua reminder sudah ditandai terkirim'
                      : 'Input data servis untuk membuat rekomendasi reminder'}
                  </p>
                </div>
              ) : (
                paginatedReminders.map(reminder => renderReminderCard(reminder))
              )}
            </div>
          )}

          {/* ── Pagination — only for Belum/Sudah Dikirim ── */}
          {activeTab !== 'Perlu Dikirim' && filteredReminders.length > itemsPerPage && (
            <div className="mt-6 bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Menampilkan {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredReminders.length)} dari {filteredReminders.length} reminder
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-10 h-10 rounded-lg transition ${currentPage === page ? 'bg-red-600 text-white font-semibold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Detail Analisis ─────────────────────────────── */}
        <div>
          <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detail Analisis</h2>

            {selectedReminderData && selectedPelanggan ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <p className="font-semibold text-blue-900">Data Pelanggan</p>
                  </div>
                  <p className="text-sm text-blue-800">{selectedPelanggan.nama}</p>
                  <p className="text-xs text-blue-700">{selectedPelanggan.noHp || '-'}</p>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-gray-600" />
                      <p className="text-sm font-semibold text-gray-900">Analisis Perilaku</p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-600">Frekuensi Servis:</span>
                          <span className={`font-semibold px-2 py-0.5 rounded ${getColorByFrekuensi(selectedReminderData.analisis.frekuensi)}`}>
                            {selectedReminderData.analisis.frekuensi}
                          </span>
                        </div>
                        <p className={`text-xs px-2 py-1 rounded ${getColorByFrekuensi(selectedReminderData.analisis.frekuensi)} opacity-90`}>
                          {getFrekuensiKeterangan(selectedReminderData.analisis.frekuensi)}
                        </p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-600">Intensitas Pemakaian:</span>
                          <span className={`font-semibold px-2 py-0.5 rounded ${getColorByIntensitas(selectedReminderData.analisis.intensitas)}`}>
                            {selectedReminderData.analisis.intensitas}
                          </span>
                        </div>
                        <p className={`text-xs px-2 py-1 rounded ${getColorByIntensitas(selectedReminderData.analisis.intensitas)} opacity-90`}>
                          {getIntensitasKeterangan(selectedReminderData.analisis.intensitas)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <p className="text-sm font-semibold text-gray-900">Pola Servis Pelanggan</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hari Servis:</span>
                        <span className="font-semibold text-gray-900">{selectedReminderData.analisis.preferensiHari}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Waktu Servis:</span>
                        <span className="font-semibold text-gray-900">{selectedReminderData.analisis.preferensiWaktu}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-lg p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5" />
                      <p className="text-sm font-semibold">Rekomendasi</p>
                    </div>
                    <p className="text-2xl font-bold mb-1">{selectedReminderData.jarakWaktu}</p>
                    <p className="text-sm opacity-90">
                      Kirim reminder pada hari {selectedReminderData.hariPengiriman} waktu {selectedReminderData.waktuPengiriman}
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-yellow-900">📋 Catatan:</p>
                  <p className="text-xs text-yellow-800 mt-2">
                    Gunakan halaman ini untuk melihat rekomendasi reminder servis pelanggan. Setelah reminder diberikan kepada pelanggan, klik tombol <strong>Tandai Sudah Dikirim</strong> untuk memperbarui status reminder. Reminder yang sudah dikirim akan berpindah ke daftar <strong>Sudah Dikirim</strong> sebagai riwayat.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Pilih reminder untuk melihat detail analisis</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
