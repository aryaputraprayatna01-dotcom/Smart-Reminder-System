import { createBrowserRouter, redirect } from 'react-router';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { PelangganPage } from './pages/PelangganPage';
import { ServisPage } from './pages/ServisPage';
import { ReminderPage } from './pages/ReminderPage';
import { RiwayatPage } from './pages/RiwayatPage';
import { BIPage } from './pages/BIPage';
import { ImportPage } from './pages/ImportPage';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
  },
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/register',
    Component: RegisterPage,
  },
  {
    path: '/dashboard',
    Component: DashboardLayout,
    children: [
      {
        index: true,
        loader: () => redirect('/dashboard/pelanggan'),
      },
      {
        path: 'pelanggan',
        Component: PelangganPage,
      },
      {
        path: 'servis',
        Component: ServisPage,
      },
      {
        path: 'reminder',
        Component: ReminderPage,
      },
      {
        path: 'riwayat',
        Component: RiwayatPage,
      },
      {
        path: 'business-intelligence',
        Component: BIPage,
      },
      {
        path: 'import',
        Component: ImportPage,
      },
    ],
  },
  {
    path: '*',
    Component: NotFound,
  },
]);
