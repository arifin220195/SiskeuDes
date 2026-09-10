import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../lib/auth'
import AdminLayout from '../components/layout/AdminLayout'
import RequireAuth from '../components/RequireAuth'
import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import SasaranPage from '../pages/SasaranPage'
import KegiatanPage from '../pages/KegiatanPage'
import ImunisasiPage from '../pages/ImunisasiPage'
import LogistikPage from '../pages/LogistikPage'
import SkriningPage from '../pages/SkriningPage'
import KaderPage from '../pages/KaderPage'
import VerifikasiPage from '../pages/VerifikasiPage'
import LaporanPage from '../pages/laporan/LaporanPage'
import KonfigurasiPage from '../pages/konfigurasi/KonfigurasiPage'
import NotFoundPage from '../pages/NotFoundPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Halaman posyandu — wajib login */}
        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sasaran" element={<SasaranPage />} />
            <Route path="/kegiatan" element={<KegiatanPage />} />
            <Route path="/imunisasi" element={<ImunisasiPage />} />
            <Route path="/logistik" element={<LogistikPage />} />
            <Route path="/skrining" element={<SkriningPage />} />
            <Route path="/kader" element={<KaderPage />} />
            <Route path="/verifikasi" element={<VerifikasiPage />} />
            <Route path="/laporan" element={<LaporanPage />} />
            <Route path="/konfigurasi" element={<KonfigurasiPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}