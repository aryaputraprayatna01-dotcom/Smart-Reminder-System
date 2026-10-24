import { Outlet, Link, Navigate, useNavigate, useLocation } from 'react-router';
import { store } from '../store';
import {
  Users,
  Wrench,
  Bell,
  History,
  LogOut,
  Menu,
  X,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const user = store.getCurrentUser();

  if (!store.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    store.logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard/pelanggan', label: 'Data Pelanggan', icon: Users },
    { path: '/dashboard/servis', label: 'Input Servis', icon: Wrench },
    { path: '/dashboard/reminder', label: 'Reminder', icon: Bell },
    { path: '/dashboard/riwayat', label: 'Riwayat', icon: History },
    { path: '/dashboard/import', label: 'Import Excel', icon: Upload },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Modal Konfirmasi Logout ── */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            style={{ animation: 'modalIn 0.18s ease-out' }}
          >
            {/* Strip merah atas */}
            <div className="h-1.5 bg-red-600 w-full" />

            <div className="p-7">
              {/* Ikon */}
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-red-600" />
                </div>
              </div>

              {/* Teks */}
              <div className="text-center mb-7">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Konfirmasi Logout
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Apakah Anda yakin ingin keluar dari sistem?
                  <br />
                  <span className="text-gray-400 text-xs">
                    Sesi Anda akan diakhiri secara aman.
                  </span>
                </p>
              </div>

              {/* Tombol aksi */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Ya, Logout
                </button>
              </div>
            </div>
          </div>

          {/* Animasi */}
          <style>{`
            @keyframes modalIn {
              from { opacity: 0; transform: scale(0.93) translateY(-8px); }
              to   { opacity: 1; transform: scale(1)    translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className="bg-red-600 text-white shadow-lg">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-red-700 rounded-lg transition"
            >
              {sidebarOpen ? <X /> : <Menu />}
            </button>
          
            <div>
              <h1 className="font-bold text-lg">AHASS KIRANA BEKASI</h1>
              <p className="text-xs text-red-100">Smart Reminder System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium">{user?.nama}</p>
              <p className="text-xs text-red-100">Resepsionis</p>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Sidebar + Konten ── */}
      <div className="flex">
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:transform-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-2 mt-16 lg:mt-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition
                    ${isActive
                      ? 'bg-red-50 text-red-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
