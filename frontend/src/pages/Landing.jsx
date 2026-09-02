import { useNavigate } from 'react-router-dom'

const OCEAN_DIMS = [
  { key: 'O', label: 'Openness', desc: 'Intellectual curiosity & creative imagination', color: '#ec4899' },
  { key: 'C', label: 'Conscientiousness', desc: 'Discipline, reliability & goal orientation', color: '#f59e0b' },
  { key: 'E', label: 'Extraversion', desc: 'Social energy, assertiveness & leadership drive', color: '#0ea5e9' },
  { key: 'A', label: 'Agreeableness', desc: 'Empathy, cooperation & interpersonal warmth', color: '#10b981' },
  { key: 'N', label: 'Adjustment', desc: 'Emotional stability, resilience & composure', color: '#6366f1' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="hero-gradient min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">IP</span>
          </div>
          <span className="font-semibold text-white text-sm tracking-wide">Industrial Psychology Consultants</span>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Admin
        </button>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center fade-in-up">
        <div className="section-badge mb-6 mx-auto w-fit">
          <div className="pulse-dot" />
          Validated Psychometric Assessment
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
          Discover Your{' '}
          <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            OCEAN
          </span>{' '}
          Personality Profile
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
          The Big Five personality model is the most rigorously validated framework in psychology.
          25 statements. 10 minutes. Instant, evidence-based insight into who you are and how you lead,
          communicate, and grow.
        </p>
        <button
          id="start-assessment-cta"
          onClick={() => navigate('/intake')}
          className="btn-primary text-lg px-10 py-4"
        >
          <span>Start Your Assessment</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </button>
        <p className="text-slate-500 text-sm mt-4">Free basic results · Full report ₹99 · Takes ~10 minutes</p>
      </div>

      {/* OCEAN dimension cards */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-center text-slate-400 text-sm uppercase tracking-widest mb-8 font-medium">
          The Five Dimensions Measured
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {OCEAN_DIMS.map((d, i) => (
            <div
              key={d.key}
              className="glass-card-light p-5 text-center fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="text-3xl font-extrabold mb-2"
                style={{ color: d.color, fontFamily: 'Outfit, sans-serif' }}
              >
                {d.key}
              </div>
              <div className="text-white font-semibold text-sm mb-1">{d.label}</div>
              <div className="text-slate-400 text-xs leading-relaxed">{d.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* What you get */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="glass-card p-8 glow-teal">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">What You'll Receive</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: '📊', title: 'Visual Score Chart', desc: 'Radar and bar chart of your five scores, animated and easy to share.' },
              { icon: '🔍', title: 'Plain-English Insights', desc: 'What your scores actually say about your strengths, style, and tendencies.' },
              { icon: '💡', title: 'Full Personality Report', desc: 'Leadership potential, career suitability, communication style, and more — for ₹99.' },
              { icon: '📄', title: 'Branded PDF Export', desc: 'Download a professional PDF report to keep, share, or include in a portfolio.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 items-start">
                <div className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <div className="text-white font-semibold mb-1">{item.title}</div>
                  <div className="text-slate-400 text-sm leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/intake')}
              className="btn-primary"
              id="start-assessment-cta-bottom"
            >
              <span>Begin Assessment →</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-slate-600 text-sm">
        © 2024 Industrial Psychology Consultants · HRM301 University Assignment
      </footer>
    </div>
  )
}
