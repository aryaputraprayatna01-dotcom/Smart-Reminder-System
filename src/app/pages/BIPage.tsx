import { useState } from 'react';
import { store } from '../store';
import { RuleBasedEngine } from '../ruleEngine';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Calendar, Clock, Activity, Target } from 'lucide-react';

export function BIPage() {
  const pelangganList = store.getPelanggan();
  const servisList = store.getServis();
  const reminderList = store.getReminders();

  // ANALISIS DESKRIPTIF
  const getFrekuensiDistribution = () => {
    const frekuensiCount = { Tinggi: 0, Sedang: 0, Rendah: 0 };

    pelangganList.forEach(pelanggan => {
      const riwayat = store.getServisByPelangganId(pelanggan.id);
      if (riwayat.length > 0) {
        const analisis = RuleBasedEngine.analyzePerilakuKonsumen(riwayat);
        frekuensiCount[analisis.frekuensi]++;
      }
    });

    return [
      { name: 'Tinggi', value: frekuensiCount.Tinggi, color: '#ef4444' },
      { name: 'Sedang', value: frekuensiCount.Sedang, color: '#f59e0b' },
      { name: 'Rendah', value: frekuensiCount.Rendah, color: '#10b981' }
    ];
  };

  const getIntensitasDistribution = () => {
    const intensitasCount = { Tinggi: 0, Sedang: 0, Rendah: 0 };

    pelangganList.forEach(pelanggan => {
      const riwayat = store.getServisByPelangganId(pelanggan.id);
      if (riwayat.length > 0) {
        const analisis = RuleBasedEngine.analyzePerilakuKonsumen(riwayat);
        intensitasCount[analisis.intensitas]++;
      }
    });

    return [
      { name: 'Tinggi', value: intensitasCount.Tinggi, color: '#ef4444' },
      { name: 'Sedang', value: intensitasCount.Sedang, color: '#f59e0b' },
      { name: 'Rendah', value: intensitasCount.Rendah, color: '#10b981' }
    ];
  };

  const getHariPreferensi = () => {
    const hariCount: Record<string, number> = {
      'Senin': 0, 'Selasa': 0, 'Rabu': 0, 'Kamis': 0,
      'Jumat': 0, 'Sabtu': 0, 'Minggu': 0
    };

    servisList.forEach(servis => {
      hariCount[servis.hariServis]++;
    });

    return Object.entries(hariCount).map(([name, value]) => ({ name, value }));
  };

  const getWaktuPreferensi = () => {
    const waktuCount = { Pagi: 0, Siang: 0, Sore: 0 };

    servisList.forEach(servis => {
      waktuCount[servis.waktuServis]++;
    });

    return [
      { name: 'Pagi', value: waktuCount.Pagi, color: '#3b82f6' },
      { name: 'Siang', value: waktuCount.Siang, color: '#f59e0b' },
      { name: 'Sore', value: waktuCount.Sore, color: '#8b5cf6' }
    ];
  };

  const getReminderDistribution = () => {
    const reminderCount = { 'H-2': 0, 'H-5': 0, 'H-7': 0 };

    reminderList.forEach(reminder => {
      reminderCount[reminder.jarakWaktu]++;
    });

    return [
      { name: 'H-2', value: reminderCount['H-2'], fill: '#10b981' },
      { name: 'H-5', value: reminderCount['H-5'], fill: '#f59e0b' },
      { name: 'H-7', value: reminderCount['H-7'], fill: '#ef4444' }
    ];
  };

  const getTopPelanggan = () => {
    return pelangganList
      .map(pelanggan => ({
        nama: pelanggan.nama,
        jumlahServis: store.getServisByPelangganId(pelanggan.id).length
      }))
      .filter(item => item.jumlahServis > 0)
      .sort((a, b) => b.jumlahServis - a.jumlahServis)
      .slice(0, 10);
  };

  const frekuensiData = getFrekuensiDistribution();
  const intensitasData = getIntensitasDistribution();
  const hariData = getHariPreferensi();
  const waktuData = getWaktuPreferensi();
  const reminderData = getReminderDistribution();
  const topPelanggan = getTopPelanggan();

  const totalPelangganAktif = pelangganList.filter(p => store.getServisByPelangganId(p.id).length > 0).length;
  const avgServisPerPelanggan = totalPelangganAktif > 0 ? (servisList.length / totalPelangganAktif).toFixed(1) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Business Intelligence Dashboard</h1>
        <p className="text-gray-600 mt-1">Analisis Deskriptif, Prediktif, dan Preskriptif</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Pelanggan Aktif</p>
              <p className="text-3xl font-bold mt-2">{totalPelangganAktif}</p>
            </div>
            <Users className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Servis</p>
              <p className="text-3xl font-bold mt-2">{servisList.length}</p>
            </div>
            <Activity className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Avg Servis/Pelanggan</p>
              <p className="text-3xl font-bold mt-2">{avgServisPerPelanggan}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-orange-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Total Reminder</p>
              <p className="text-3xl font-bold mt-2">{reminderList.length}</p>
            </div>
            <Target className="w-12 h-12 text-red-200" />
          </div>
        </div>
      </div>

      {/* ANALISIS DESKRIPTIF */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 Analisis Deskriptif</h2>
          <p className="text-gray-600 text-sm">Memahami kondisi berdasarkan data historis pelanggan</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Distribusi Frekuensi Servis</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={frekuensiData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {frekuensiData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-gray-600">
              <p>Frekuensi menunjukkan seberapa sering pelanggan melakukan servis</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Distribusi Intensitas Penggunaan</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={intensitasData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {intensitasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-gray-600">
              <p>Intensitas berdasarkan kilometer per bulan penggunaan kendaraan</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Preferensi Hari Servis</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hariData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-gray-600">
              <p>Hari-hari dengan kunjungan servis terbanyak</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Preferensi Waktu Servis</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={waktuData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {waktuData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-gray-600">
              <p>Waktu kedatangan pelanggan (Pagi: 06-12, Siang: 12-17, Sore: 17-21)</p>
            </div>
          </div>
        </div>
      </div>

      {/* ANALISIS PREDIKTIF */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">🔮 Analisis Prediktif</h2>
          <p className="text-gray-600 text-sm">Pola perilaku dan kecenderungan pelanggan</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Pelanggan Aktif</h3>
            <div className="space-y-3">
              {topPelanggan.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <p className="font-semibold text-gray-900">{item.nama}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{item.jumlahServis}x servis</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Insight Perilaku Konsumen</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <p className="font-semibold text-blue-900">🎯 Pola Frekuensi</p>
                <p className="text-sm text-blue-800 mt-2">
                  {frekuensiData.find(d => d.value === Math.max(...frekuensiData.map(x => x.value)))?.name} frekuensi
                  mendominasi ({Math.max(...frekuensiData.map(x => x.value))} pelanggan)
                </p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                <p className="font-semibold text-green-900">📈 Pola Intensitas</p>
                <p className="text-sm text-green-800 mt-2">
                  Intensitas {intensitasData.find(d => d.value === Math.max(...intensitasData.map(x => x.value)))?.name.toLowerCase()} paling banyak
                </p>
              </div>

              <div className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded">
                <p className="font-semibold text-orange-900">📅 Pola Hari</p>
                <p className="text-sm text-orange-800 mt-2">
                  Hari {hariData.find(d => d.value === Math.max(...hariData.map(x => x.value)))?.name} adalah hari tersibuk
                </p>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded">
                <p className="font-semibold text-purple-900">⏰ Pola Waktu</p>
                <p className="text-sm text-purple-800 mt-2">
                  Waktu {waktuData.find(d => d.value === Math.max(...waktuData.map(x => x.value)))?.name} paling ramai
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ANALISIS PRESKRIPTIF */}
      <div>
        <div className="bg-white rounded-xl shadow-md p-6 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">💡 Analisis Preskriptif</h2>
          <p className="text-gray-600 text-sm">Rekomendasi berdasarkan rule-based system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Distribusi Rekomendasi Reminder</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={reminderData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-700">H-2: Intensitas Rendah atau Frekuensi Tinggi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-gray-700">H-5: Intensitas & Frekuensi Sedang</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-700">H-7: Intensitas Tinggi & Frekuensi Rendah</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Rule-Based Decision Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 px-2 font-semibold">Intensitas</th>
                    <th className="text-left py-2 px-2 font-semibold">Frekuensi</th>
                    <th className="text-left py-2 px-2 font-semibold">Reminder</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-2">Tinggi</td>
                    <td className="py-2 px-2">Rendah</td>
                    <td className="py-2 px-2"><span className="bg-red-100 text-red-800 px-2 py-1 rounded">H-7</span></td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-2">Tinggi</td>
                    <td className="py-2 px-2">Sedang</td>
                    <td className="py-2 px-2"><span className="bg-red-100 text-red-800 px-2 py-1 rounded">H-7</span></td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-2">Tinggi</td>
                    <td className="py-2 px-2">Tinggi</td>
                    <td className="py-2 px-2"><span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">H-5</span></td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-2">Sedang</td>
                    <td className="py-2 px-2">Rendah/Sedang</td>
                    <td className="py-2 px-2"><span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">H-5</span></td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-2">Sedang</td>
                    <td className="py-2 px-2">Tinggi</td>
                    <td className="py-2 px-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded">H-2</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2">Rendah</td>
                    <td className="py-2 px-2">Semua</td>
                    <td className="py-2 px-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded">H-2</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-900">
                <strong>💡 Logika:</strong> Pelanggan dengan intensitas tinggi tapi frekuensi rendah perlu reminder lebih awal (H-7)
                untuk mendorong servis berkala.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
