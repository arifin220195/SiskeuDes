export interface NavItem {
  path: string
  label: string
  icon: string
}

export const adminNav: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard PWS', icon: 'dashboard' },
  { path: '/sasaran', label: 'Registri Sasaran', icon: 'group' },
  { path: '/kegiatan', label: '5 Meja Posyandu', icon: 'deck' },
  { path: '/imunisasi', label: 'Imunisasi', icon: 'syringe' },
  { path: '/logistik', label: 'Logistik & Farmasi', icon: 'inventory_2' },
  { path: '/skrining', label: 'Skrining & PTM', icon: 'monitor_heart' },
  { path: '/kader', label: 'Kunjungan & Kader', icon: 'home_health' },
  { path: '/verifikasi', label: 'Verifikasi Nakes', icon: 'fact_check' },
  { path: '/laporan', label: 'Laporan & Ekspor', icon: 'description' },
  { path: '/konfigurasi', label: 'Konfigurasi', icon: 'tune' },
]