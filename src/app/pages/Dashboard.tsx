import { useState } from 'react';
import { store } from '../store';
import { RuleBasedEngine } from '../ruleEngine';
import { Users, Wrench, Bell, TrendingUp, BarChart3, Target, Activity, Calendar } from 'lucide-react';

export function Dashboard() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const pelangganList = store.getPelanggan();
  const servisList = store.getServis();
  const reminderList = store.getReminders();

  const filteredServis = servisList.filter(s => {
    const date = new Date(s.tanggalServis);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const filteredPelanggan = pelangganList.filter(p => {
    const riwayat = store.getServisByPelangganId(p.id);
    return riwayat.some(s => {
      const date = new Date(s.tanggalServis);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  });

  const filteredReminders = reminderList.filter(r => {
    const date = new Date(r.tanggalDibuat);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const stats = [
    {
      label: 'Pelanggan Aktif',
      value: filteredPelanggan.length,
      icon: Users,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      label: 'Total Servis',
      value: filteredServis.length,
      icon: Wrench,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      label: 'Total Reminder',
      value: filteredReminders.length,
      icon: Bell,
      color: 'bg-red-500',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      label: 'Pelanggan Rutin',
      value: pelangganList.filter(p => {
        const riwayat = store.getServisByPelangganId(p.id);
        return riwayat.length >= 3;
      }).length,
      icon: TrendingUp,
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
  ];

  const recentServis = filteredServis
    .sort((a, b) => new Date(b.tanggalServis).getTime() - new Date(a.tanggalServis).getTime())
    .slice(0, 5);

  const pelangganRutin = pelangganList.filter(p => {
    const riwayat = store.getServisByPelangganId(p.id);
    return riwayat.length >= 3;
  }).length;

  const perilakuInsights = () => {
    const frekuensiCount = { Tinggi: 0, Sedang: 0, Rendah: 0 };

    filteredPelanggan.forEach(pelanggan => {
      const riwayat = store.getServisByPelangganId(pelanggan.id);
      if (riwayat.length > 0) {
        const analisis = RuleBasedEngine.analyzePerilakuKonsumen(riwayat);
        frekuensiCount[analisis.frekuensi]++;
      }
    });

    return frekuensiCount;
  };

  const perilaku = perilakuInsights();

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Selamat datang di Sistem Smart Reminder AHASS Kirana Bekasi</p>
          </div>

          {/* Month and Year Filter */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.bgLight} p-4 rounded-xl`}>
                  <Icon className={`w-8 h-8 ${stat.textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Pelanggan Rutin</p>
              <p className="text-3xl font-bold mt-2">{pelangganRutin}</p>
              <p className="text-xs text-purple-200 mt-1">≥ 3x servis</p>
            </div>
            <Target className="w-12 h-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-red-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-semibold">Frekuensi Tinggi</p>
            <Activity className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{perilaku.Tinggi}</p>
          <p className="text-xs text-gray-500 mt-1">Pelanggan aktif</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-semibold">Frekuensi Sedang</p>
            <Activity className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-600">{perilaku.Sedang}</p>
          <p className="text-xs text-gray-500 mt-1">Pelanggan moderat</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-semibold">Frekuensi Rendah</p>
            <Activity className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{perilaku.Rendah}</p>
          <p className="text-xs text-gray-500 mt-1">Perlu perhatian</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-md p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-blue-600 p-3 rounded-xl">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Insight Perilaku Pelanggan</h2>
            <p className="text-sm text-gray-600">Analisis otomatis dari data historis</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Analisis</p>
            <p className="text-2xl font-bold text-gray-900">{perilaku.Tinggi + perilaku.Sedang + perilaku.Rendah}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Dominan</p>
            <p className="text-2xl font-bold text-blue-600">
              {perilaku.Tinggi >= perilaku.Sedang && perilaku.Tinggi >= perilaku.Rendah ? 'Tinggi' :
               perilaku.Sedang >= perilaku.Rendah ? 'Sedang' : 'Rendah'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Reminder Aktif</p>
            <p className="text-2xl font-bold text-purple-600">{reminderList.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Servis Terbaru</h2>
          <div className="space-y-3">
            {recentServis.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Belum ada data servis</p>
            ) : (
              recentServis.map((servis) => {
                const pelanggan = store.getPelangganById(servis.pelangganId);
                return (
                  <div key={servis.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{pelanggan?.nama}</p>
                      <p className="text-sm text-gray-600">{servis.jenisServis}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">{new Date(servis.tanggalServis).toLocaleDateString('id-ID')}</p>
                      <p className="text-xs text-gray-500">{servis.kilometer.toLocaleString()} km</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tentang Sistem</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>Sistem Informasi Smart Reminder Servis</strong> adalah sistem yang dirancang
              untuk menganalisis perilaku konsumen dan memberikan rekomendasi waktu pengiriman
              reminder yang personal.
            </p>
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
              <p className="font-semibold text-red-900">Fitur Utama:</p>
              <ul className="mt-2 space-y-1 text-sm text-red-800">
                <li>• Analisis Frekuensi & Intensitas Servis</li>
                <li>• Rule-based Reminder (H-2, H-5, H-7)</li>
                <li>• Preferensi Hari & Waktu Pelanggan</li>
                <li>• Rekomendasi Personal</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 italic">
              Berbasis penelitian Business Intelligence dengan metode SDLC Waterfall
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
