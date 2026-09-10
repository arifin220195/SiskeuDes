import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

interface AdminHeaderProps {
  onMenuClick: () => void
  title: string
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  return now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

export default function AdminHeader({ onMenuClick, title }: AdminHeaderProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const time = useClock()
  const initials = (profile?.nama ?? '??')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-30 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-surface-container-high">
      <div className="h-16 px-space-md lg:px-space-lg flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <button
            className="lg:hidden p-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
            onClick={onMenuClick}
            aria-label="Buka menu"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
          <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-space-sm">
          <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-xxs bg-surface-container-low rounded-lg">
            <span className="material-symbols-outlined text-primary text-base">
              cloud_sync
            </span>
            <span className="font-label-xs text-label-xs text-on-surface-variant">
              Tersinkron{' '}
              <span className="font-semibold text-on-surface">{time} WIB</span>
            </span>
          </div>

          <button
            className="p-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
            title="Sinkronkan Ulang"
            onClick={() => navigate(0)}
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>

          <button
            className="flex items-center gap-space-xs p-space-xs rounded-lg hover:bg-surface-container transition-colors"
            onClick={() => navigate('/konfigurasi')}
          >
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
              <span className="font-label-xs text-label-xs font-bold">{initials}</span>
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="font-label-xs text-label-xs text-on-surface font-bold">
                {profile?.nama ?? 'Belum ada nama'}
              </span>
              <span className="font-label-xs text-label-xs text-on-surface-variant">
                {profile?.role === 'superadmin' ? 'Super Admin' : (profile?.jabatan ?? 'Bendahara')} · {profile?.desa ?? 'Desa'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}