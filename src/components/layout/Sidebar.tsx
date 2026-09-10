import { NavLink, useNavigate } from 'react-router-dom'
import { adminNav } from '../../config/navigation'
import { useAuth } from '../../lib/auth'
import { useIdentitas } from '../../lib/identitas'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const id = useIdentitas()
  const navigate = useNavigate()

  async function handleSignout() {
    await signOut()
    navigate('/login')
  }
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-primary-container text-on-primary z-50 flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.15)] transform transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-space-md flex items-center gap-space-sm bg-primary/20">
          <div className="w-9 h-9 rounded-full bg-surface-container-lowest/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">child_care</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-headline-sm text-headline-sm text-on-primary truncate">
              POSYANDUKU
            </span>
            <span className="font-label-xs text-label-xs text-on-primary-container tracking-wider uppercase truncate">
              Posyandu Desa {id.desa}
            </span>
          </div>
          <button
            className="p-space-xs rounded-lg hover:bg-on-primary/10 transition-colors lg:hidden"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="px-space-md py-space-sm bg-primary/40 flex items-center justify-between">
          <span className="font-label-xs text-label-xs text-on-primary-container font-semibold uppercase tracking-wider">
            Sinkronisasi
          </span>
          <span className="font-label-xs text-label-xs px-space-xs py-space-xxs rounded-full bg-secondary-container text-on-secondary-fixed-variant font-bold">
            ONLINE
          </span>
        </div>

        <nav className="flex-1 px-space-sm py-space-md flex flex-col gap-space-xxs overflow-y-auto">
          {adminNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-colors ${
                  isActive
                    ? 'bg-on-primary/15 text-on-primary font-bold rounded-lg'
                    : 'text-on-primary/80 hover:bg-on-primary/10 hover:text-on-primary'
                }`
              }
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span className="font-body-md text-body-md">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-space-md py-space-sm border-t border-on-primary/10 flex flex-col gap-space-xxs">
          {profile && (
            <div className="px-space-sm py-space-xs flex items-center gap-space-sm">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${profile.role === 'superadmin' ? 'bg-amber-400/30' : 'bg-on-primary/20'}`}>
                <span className="material-symbols-outlined text-lg">
                  {profile.role === 'superadmin' ? 'shield_person' : 'person'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-xs text-label-xs font-bold text-on-primary truncate">
                  {profile.nama}
                </span>
                <div className="flex items-center gap-space-xxs">
                  <span className="font-label-xs text-label-xs text-on-primary-container uppercase tracking-wider truncate">
                    {profile.role === 'superadmin' ? 'Super Admin' : profile.jabatan}
                  </span>
                  {profile.role === 'superadmin' && (
                    <span className="font-label-xs text-label-xs px-space-xxs py-px rounded bg-amber-400/30 text-amber-200 font-bold uppercase tracking-wider shrink-0">
                      SA
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          <button
            className="w-full flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg text-on-primary/80 hover:bg-on-primary/10 hover:text-on-primary transition-colors"
            onClick={handleSignout}
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span className="font-body-md text-body-md">Keluar</span>
          </button>
        </div>
      </aside>
    </>
  )
}