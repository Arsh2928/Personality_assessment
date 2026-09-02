import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Intake() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email address is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Please enter a valid email'
    return e
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    // Store in sessionStorage so Questionnaire can pick it up
    sessionStorage.setItem('participant', JSON.stringify(form))
    navigate('/questionnaire')
  }

  function field(key, label, type = 'text', placeholder = '', required = false) {
    return (
      <div className="field-group">
        <label className="field-label" htmlFor={`intake-${key}`}>
          {label}{required && <span className="text-sky-400 ml-1">*</span>}
        </label>
        <input
          id={`intake-${key}`}
          type={type}
          className={`field-input ${errors[key] ? 'border-red-400/60' : ''}`}
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: '' })) }}
        />
        {errors[key] && <p className="text-red-400 text-xs mt-1">{errors[key]}</p>}
      </div>
    )
  }

  return (
    <div className="hero-gradient min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md fade-in-up">
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-8 transition-colors"
        >
          ← Back to home
        </button>

        <div className="glass-card p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="section-badge mb-4 w-fit">Step 1 of 3</div>
            <h1 className="text-3xl font-bold text-white mb-2">Before We Begin</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your information is used only to personalise your report. We never share it with third parties.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {field('name', 'Full Name', 'text', 'e.g. Priya Sharma', true)}
            {field('email', 'Email Address', 'email', 'e.g. priya@example.com', true)}
            {field('phone', 'Phone Number', 'tel', 'Optional — for follow-up only')}

            <button type="submit" className="btn-primary mt-2" id="intake-continue-btn">
              <span>Continue to Assessment →</span>
            </button>
          </form>
        </div>

        <p className="text-slate-600 text-xs text-center mt-6">
          25 statements · Rated 1-7 · Takes about 10 minutes
        </p>
      </div>
    </div>
  )
}
