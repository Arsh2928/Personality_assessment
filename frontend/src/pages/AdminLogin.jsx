import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(ev) {
    ev.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await axios.post('/api/admin/login', form)
      localStorage.setItem('adminToken', data.token)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hero-gradient min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm fade-in-up">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-700 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">IP</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
          <p className="text-slate-400 text-sm mt-1">Industrial Psychology Consultants</p>
        </div>

        <div className="glass-card p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="field-group">
              <label className="field-label" htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                className="field-input"
                placeholder="admin@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                className="field-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary mt-1" id="admin-login-btn">
              <span>{loading ? 'Signing in…' : 'Sign In'}</span>
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            ← Back to Assessment
          </button>
        </p>
      </div>
    </div>
  )
}
