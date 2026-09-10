import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function RequireAuth() {
  const { user, loading, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          progress_activity
        </span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  // Profile belum ada (trigger DB belum jalan) — tetap izinkan masuk
  // daripada redirect loop; halaman akan menampilkan data kosong dengan graceful fallback
  return <Outlet />
}