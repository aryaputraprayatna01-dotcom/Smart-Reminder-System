import { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';



type Pelanggan = {
  id_pelanggan: number;
  nama_konsumen: string;
  no_hp: string | null;
  alamat: string | null;
  type_motor: string;
  no_polisi: string;
};

export function PelangganPage() {
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const formatNopol = (nopol: string) => {
  if (!nopol) return '-';

  const clean = nopol.replace(/\s+/g, '').toUpperCase();

  const match = clean.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})$/);

  if (!match) return nopol;

  return `${match[1]} ${match[2]} ${match[3]}`;
};

  const [formData, setFormData] = useState({
    nama: '',
    noHp: '',
    alamat: '',
    jenisKendaraan: '',
    nomorPolisi: ''
  });

  const API_URL = 'http://localhost:3001/api/pelanggan';

  const fetchPelanggan = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil data pelanggan');
      }

      setPelangganList(data);
    } catch (error) {
      console.error('Gagal mengambil pelanggan:', error);
      alert('Gagal mengambil data pelanggan dari database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPelanggan();
  }, []);

  useEffect(() => {

    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    },300);

    return () => clearTimeout(timer);

  },[searchTerm]);

const filteredPelanggan = useMemo(() => {

  let result = pelangganList;


  if(debouncedSearch){

    const q = debouncedSearch.toLowerCase();

    result = pelangganList.filter((p)=>{

      const nama =
      p.nama_konsumen?.toLowerCase() || '';

      const hp =
      p.no_hp?.toLowerCase() || '';

      const nopol =
      p.no_polisi?.toLowerCase() || '';

      const motor =
      p.type_motor?.toLowerCase() || '';


      return(
        nama.includes(q) ||
        hp.includes(q) ||
        nopol.includes(q) ||
        motor.includes(q)
      );

    });

  }


  return result.slice(0,100);


},[pelangganList,debouncedSearch]);

const handleSearchChange = (value:string)=>{
    setSearchTerm(value);
};

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      nama: '',
      noHp: '',
      alamat: '',
      jenisKendaraan: '',
      nomorPolisi: ''
    });
    setShowModal(true);
  };

  const handleEdit = (pelanggan: Pelanggan) => {
    setEditingId(pelanggan.id_pelanggan);

    setFormData({
      nama: pelanggan.nama_konsumen || '',
      noHp: pelanggan.no_hp || '',
      alamat: pelanggan.alamat || '',
      jenisKendaraan: pelanggan.type_motor || '',
      nomorPolisi: pelanggan.no_polisi || ''
    });

    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pelanggan ini?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal menghapus pelanggan');
      }

      await fetchPelanggan();
    } catch (error) {
      console.error('Gagal hapus pelanggan:', error);
      alert('Gagal menghapus pelanggan.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nama || !formData.jenisKendaraan || !formData.nomorPolisi) {
      alert('Field Nama, Jenis Kendaraan, dan Nomor Polisi harus diisi!');
      return;
    }

    const payload = {
      nama: formData.nama,
      noHp: formData.noHp || null,
      alamat: formData.alamat || 'Bekasi',
      jenisKendaraan: formData.jenisKendaraan,
      nomorPolisi: formData.nomorPolisi
    };

    try {
      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal menyimpan pelanggan');
      }

      setShowModal(false);
      await fetchPelanggan();
    } catch (error) {
      console.error('Gagal simpan pelanggan:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Gagal menyimpan pelanggan.'
      );
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Data Pelanggan
            </h1>
            <p className="text-gray-600 mt-1">
              Kelola data pelanggan bengkel
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition shadow-md"
          >
            <Plus className="w-5 h-5" />
            Tambah Pelanggan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />

            <input
              type="text"
              placeholder="Cari pelanggan (nama, no HP, atau nopol)..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  ID
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Nama
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  No HP
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Kendaraan
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Nopol
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-gray-500"
                  >
                    Memuat data pelanggan...
                  </td>
                </tr>
              ) : filteredPelanggan.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-gray-500"
                  >
                    {searchTerm
                      ? 'Tidak ada pelanggan yang ditemukan'
                      : 'Belum ada data pelanggan'}
                  </td>
                </tr>
              ) : (
                filteredPelanggan.map((pelanggan) => (
                  <tr
                    key={pelanggan.id_pelanggan}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-gray-900">
                      P{String(pelanggan.id_pelanggan).padStart(3, '0')}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900">
                        {pelanggan.nama_konsumen}
                      </p>
                      <p className="text-sm text-gray-600">
                        {pelanggan.alamat || 'Bekasi'}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-gray-900">
                      {pelanggan.no_hp || '-'}
                    </td>

                    <td className="py-3 px-4 text-gray-900">
                      {pelanggan.type_motor}
                    </td>

                    <td className="py-3 px-4 text-gray-900">
  {formatNopol(pelanggan.no_polisi)}
</td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(pelanggan)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(pelanggan.id_pelanggan)
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Pelanggan *
                </label>

                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  No HP
                </label>

                <input
                  type="text"
                  value={formData.noHp}
                  onChange={(e) =>
                    setFormData({ ...formData, noHp: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Contoh: 08123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alamat
                </label>

                <textarea
                  value={formData.alamat}
                  onChange={(e) =>
                    setFormData({ ...formData, alamat: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  rows={3}
                  placeholder="Contoh: Bekasi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Kendaraan *
                </label>

                <input
                  type="text"
                  value={formData.jenisKendaraan}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      jenisKendaraan: e.target.value
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Contoh: Honda Beat"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Polisi *
                </label>

                <input
                  type="text"
                  value={formData.nomorPolisi}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nomorPolisi: e.target.value
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Contoh: B 1234 XYZ"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-md"
                >
                  {editingId ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}