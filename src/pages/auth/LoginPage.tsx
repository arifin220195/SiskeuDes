import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useIdentitas } from '../../lib/identitas'

export default function LoginPage() {
  const { user, signIn, signUp, loading } = useAuth()
  const id = useIdentitas()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [nama, setNama] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
      else navigate('/dashboard')
    } else {
      const { error } = await signUp(email, password, nama)
      if (error) setError(error)
      else setError('Registrasi berhasil. Silakan cek email untuk konfirmasi.')
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-space-md">
      <div className="w-full max-w-md">
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-primary-container p-space-lg text-on-primary">
            <div className="flex items-center gap-space-sm mb-space-xs">
              <span className="material-symbols-outlined text-3xl">child_care</span>
              <div>
                <h1 className="font-headline-lg text-headline-lg font-bold">
                  POSYANDUKU
                </h1>
                <p className="font-label-xs text-label-xs opacity-90 uppercase tracking-wider">
                  Posyandu Digital · Desa {id.desa}
                </p>
              </div>
            </div>
          </div>

          <div className="p-space-lg flex flex-col gap-space-md">
            <div className="flex rounded-lg bg-surface-container p-space-xxs">
              <button
                className={`flex-1 py-space-xs rounded-lg font-headline-sm text-headline-sm transition-colors ${
                  mode === 'login'
                    ? 'bg-primary-container text-on-primary font-bold'
                    : 'text-on-surface-variant'
                }`}
                onClick={() => {
                  setMode('login')
                  setError(null)
                }}
              >
                Masuk
              </button>
              <button
                className={`flex-1 py-space-xs rounded-lg font-headline-sm text-headline-sm transition-colors ${
                  mode === 'register'
                    ? 'bg-primary-container text-on-primary font-bold'
                    : 'text-on-surface-variant'
                }`}
                onClick={() => {
                  setMode('register')
                  setError(null)
                }}
              >
                Daftar
              </button>
            </div>

            <form className="flex flex-col gap-space-sm" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="flex flex-col gap-1">
                  <label className="font-label-xs text-label-xs text-on-surface-variant font-semibold">
                    Nama Lengkap
                  </label>
                  <input
                    className="w-full px-space-sm py-space-xs rounded-lg bg-surface text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-label-xs text-label-xs text-on-surface-variant font-semibold">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-space-sm py-space-xs rounded-lg bg-surface text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-xs text-label-xs text-on-surface-variant font-semibold">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full px-space-sm py-space-xs rounded-lg bg-surface text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="font-body-sm text-body-sm text-error bg-error-container/40 px-space-sm py-space-xs rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-space-xs bg-primary-container hover:bg-primary text-on-primary py-space-sm rounded-lg font-headline-sm text-headline-sm font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting
                  ? 'Memproses...'
                  : mode === 'login'
                    ? 'Masuk ke Dashboard'
                    : 'Daftar Akun'}
              </button>
            </form>

            <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
              Data posyandu desa · Registri, 5 Meja, Gizi, Imunisasi &amp; Laporan
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}