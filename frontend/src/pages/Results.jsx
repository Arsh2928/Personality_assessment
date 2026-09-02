import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { DIMENSIONS, INTERPRETATIONS, PAYMENT_AMOUNT } from '../data/questionnaire'

const DIM_KEYS = ['extraversion', 'agreeableness', 'adjustment', 'conscientiousness', 'openness']

function bandOf(score) {
  if (score >= 26) return 'high'
  if (score >= 15) return 'mid'
  return 'low'
}

function BandChip({ score }) {
  const b = bandOf(score)
  const cls = b === 'high' ? 'chip-high' : b === 'mid' ? 'chip-mid' : 'chip-low'
  const label = b === 'high' ? 'High' : b === 'mid' ? 'Mid' : 'Low'
  return <span className={cls}>{label} · {score}/35</span>
}

function ScoreBar({ score, color }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth((score / 35) * 100), 100)
    return () => clearTimeout(t)
  }, [score])
  return (
    <div className="progress-bar-track">
      <div className="dim-bar" style={{ width: `${width}%`, background: color }} />
    </div>
  )
}

// Custom radar tooltip
function CustomRadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="glass-card px-3 py-2 text-sm">
      <p className="text-white font-semibold">{d.payload.dimension}</p>
      <p style={{ color: d.color }}>{d.value}/35</p>
    </div>
  )
}

// ── Payment section ────────────────────────────────────────────────────────────
function PaymentSection({ responseId, onUnlock }) {
  const [step, setStep] = useState('prompt') // prompt | upload | done
  const [file, setFile] = useState(null)
  const [upiRef, setUpiRef] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [config, setConfig] = useState(null) // { upiId, paymentAmount }

  // Fetch UPI config from backend on first render
  useEffect(() => {
    axios.get('/api/assessment/config')
      .then(r => setConfig(r.data))
      .catch(() => setConfig({ upiId: '', paymentAmount: PAYMENT_AMOUNT }))
  }, [])

  const amount = config?.paymentAmount || PAYMENT_AMOUNT
  const upiId  = config?.upiId || ''
  // Treat 'placeholder@upi' (or empty) as unconfigured
  const isPlaceholder = !upiId || upiId.toLowerCase().includes('placeholder')
  // Standard UPI deep-link — GPay, PhonePe, Paytm all support this
  // Note: pn (payee name) is intentionally omitted — apps show the registered account name
  const upiString = !isPlaceholder
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&am=${amount}&cu=INR&tn=OCEAN+Report`
    : ''

  async function submit() {
    if (!file && !upiRef.trim()) { setError('Please upload a screenshot or enter your UPI reference.'); return }
    setUploading(true); setError('')
    const fd = new FormData()
    if (file) fd.append('screenshot', file)
    if (upiRef) fd.append('upiRef', upiRef)
    try {
      const { data } = await axios.post(`/api/assessment/${responseId}/payment-proof`, fd)
      onUnlock(data.report, data.labels)
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (step === 'done') return null

  return (
    <div className="glass-card p-6 mt-6 border-amber-400/20">
      <div className="flex items-start gap-4">
        <div className="text-3xl">🔒</div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg mb-1">Unlock Your Full Personality Report</h3>
          <p className="text-slate-400 text-sm mb-4">
            Leadership potential, career suitability, communication style, stress tendencies, motivational drivers, and a personalised action plan — all derived from your exact score combination.
          </p>

          {step === 'prompt' && (
            <>
              <div className="flex flex-wrap gap-2 mb-5 text-sm text-slate-300">
                {['Overall Personality Profile','Leadership Potential','Communication Style','Career Suitability','Stress & Coping','30-Day Action Plan'].map(f => (
                  <span key={f} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">✦ {f}</span>
                ))}
              </div>
              <button onClick={() => setStep('upload')} className="btn-accent" id="unlock-report-btn">
                Unlock Full Report — ₹{amount}
              </button>
            </>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              {/* UPI payment box */}
              <div className="flex flex-col sm:flex-row gap-6 items-center p-4 bg-white/5 rounded-xl border border-white/10">

                {/* QR Code */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-36 h-36 bg-white rounded-xl p-2 flex items-center justify-center">
                    {config === null ? (
                      // Still loading
                      <div className="w-[120px] h-[120px] bg-slate-200 rounded animate-pulse" />
                    ) : isPlaceholder ? (
                      // UPI ID not configured — show warning instead of broken QR
                      <div className="w-[120px] h-[120px] flex flex-col items-center justify-center gap-1 text-center">
                        <span className="text-2xl">⚙️</span>
                        <p className="text-slate-500 text-[10px] leading-tight">QR unavailable<br/>Contact admin</p>
                      </div>
                    ) : (
                      <QRCodeSVG
                        value={upiString}
                        size={120}
                        bgColor="#ffffff"
                        fgColor="#0f1f3d"
                        level="M"
                        includeMargin={false}
                      />
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {!isPlaceholder ? 'Scan to pay' : 'Configure UPI in .env'}
                  </span>
                </div>

                {/* UPI details */}
                <div>
                  <p className="text-white font-semibold mb-1">Pay ₹{amount} via UPI</p>
                  {config === null ? (
                    <div className="h-4 w-40 bg-white/10 rounded animate-pulse mb-2" />
                  ) : isPlaceholder ? (
                    <p className="text-amber-400 text-sm mb-2">⚠ UPI ID not configured yet</p>
                  ) : (
                    <p className="text-slate-400 text-sm mb-2">
                      UPI ID: <span className="text-teal-300 font-mono select-all">{upiId}</span>
                    </p>
                  )}
                  <p className="text-slate-500 text-xs">
                    After paying, take a screenshot of the confirmation and upload it below, or enter your UPI transaction reference.
                  </p>
                </div>
              </div>

              {/* Screenshot upload */}
              <div className="field-group">
                <label className="field-label">Payment Screenshot</label>
                <input
                  id="payment-screenshot-input"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setFile(e.target.files[0])}
                  className="field-input text-sm cursor-pointer"
                />
              </div>

              <div className="field-group">
                <label className="field-label">Or enter UPI Transaction Reference</label>
                <input
                  id="upi-ref-input"
                  type="text"
                  placeholder="e.g. 123456789012"
                  value={upiRef}
                  onChange={e => setUpiRef(e.target.value)}
                  className="field-input"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep('prompt')} className="btn-secondary text-sm px-4 py-2">Cancel</button>
                <button
                  onClick={submit}
                  disabled={uploading}
                  className="btn-accent"
                  id="submit-payment-btn"
                >
                  {uploading ? 'Verifying…' : 'Submit Payment Proof'}
                </button>
              </div>
              <p className="text-slate-600 text-xs">
                Our team reviews payments within minutes during working hours. Your full report unlocks instantly upon verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Full report section ────────────────────────────────────────────────────────
function FullReport({ report, labels, responseId }) {
  return (
    <div className="mt-8 fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-2xl">📋</div>
        <h2 className="text-2xl font-bold text-white">Your Full Personality Report</h2>
        <span className="chip-high ml-auto">Paid</span>
      </div>

      <div className="grid gap-4">
        {report.map((section, i) => (
          <div key={i} className="glass-card p-6 fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
            <h3 className="text-sky-400 font-bold text-base mb-2 uppercase tracking-wide text-xs">
              {section.title}
            </h3>
            {(section.typeName || section.style) && (
              <p className="text-white font-bold text-lg mb-2">{section.typeName || section.style}</p>
            )}
            {section.content && (
              <p className="text-slate-300 text-sm leading-relaxed">
                {section.content.replace(/\*\*/g, '')}
              </p>
            )}
            {section.items && (
              <ul className="mt-3 space-y-2">
                {section.items.map((item, j) => (
                  <li key={j} className="flex gap-2 text-slate-300 text-sm">
                    <span className="text-sky-400 flex-shrink-0">→</span>
                    <span>{typeof item === 'string' ? item : <><strong className="text-white">{item.driver}:</strong> {item.detail}</>}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.tendencies && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-white font-semibold text-sm mb-1">Stress Tendencies</p>
                  <ul className="space-y-1">
                    {section.tendencies.map((t, j) => <li key={j} className="text-slate-300 text-sm flex gap-2"><span className="text-sky-400">→</span>{t}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">Coping Strategies</p>
                  <ul className="space-y-1">
                    {section.coping.map((c, j) => <li key={j} className="text-slate-300 text-sm flex gap-2"><span className="text-green-400">✓</span>{c}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {section.tips && (
              <ul className="mt-3 space-y-1">
                {section.tips.map((t, j) => <li key={j} className="text-slate-300 text-sm flex gap-2"><span className="text-amber-400">💡</span>{t}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* PDF download */}
      <div className="mt-6 flex justify-center">
        <a
          href={`/api/assessment/${responseId}/report-pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          id="download-pdf-btn"
        >
          <span>📄 Download PDF Report</span>
        </a>
      </div>
    </div>
  )
}

// ── Main Results page ─────────────────────────────────────────────────────────
export default function Results() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [scores, setScores] = useState(null)
  const [participantName, setParticipantName] = useState('')
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState('radar')
  const [fullReport, setFullReport] = useState(null)
  const [reportLabels, setReportLabels] = useState(null)
  const [barsAnimated, setBarsAnimated] = useState(false)
  const chartRef = useRef(null)

  useEffect(() => {
    // Try session cache first for instant render
    const cached = sessionStorage.getItem('lastScores')
    const cachedParticipant = sessionStorage.getItem('participant')
    if (cached) {
      setScores(JSON.parse(cached))
      if (cachedParticipant) setParticipantName(JSON.parse(cachedParticipant).name || '')
      setLoading(false)
      setBarsAnimated(true)
    }
    // Also fetch from API for accuracy
    axios.get(`/api/assessment/${id}`)
      .then(({ data }) => {
        setScores(data.scores)
        setParticipantName(data.participantName || '')
        if (data.paymentStatus === 'paid') {
          // Already paid — could fetch full report here if we stored it
        }
        setLoading(false)
        setTimeout(() => setBarsAnimated(true), 150)
      })
      .catch(() => {
        if (!cached) { setLoading(false) }
      })
  }, [id])

  function handleUnlock(report, labels) {
    setFullReport(report)
    setReportLabels(labels)
    sessionStorage.removeItem('lastScores') // cleanup
  }

  if (loading) {
    return (
      <div className="hero-gradient min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your results…</p>
        </div>
      </div>
    )
  }

  if (!scores) {
    return (
      <div className="hero-gradient min-h-screen flex items-center justify-center px-4">
        <div className="text-center glass-card p-10 max-w-md">
          <p className="text-white text-xl font-bold mb-2">Results not found</p>
          <p className="text-slate-400 mb-6">This assessment session may have expired.</p>
          <button onClick={() => navigate('/')} className="btn-primary"><span>Start Over</span></button>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const radarData = DIM_KEYS.map(k => ({
    dimension: DIMENSIONS[k].label,
    score: scores[k],
    fullMark: 35,
  }))

  const barData = DIM_KEYS.map(k => ({
    name: DIMENSIONS[k].label.split(' ')[0], // First word for compact labels
    fullName: DIMENSIONS[k].label,
    score: scores[k],
    color: DIMENSIONS[k].color,
  }))

  return (
    <div className="hero-gradient min-h-screen pb-16">
      <div className="max-w-4xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="text-center mb-10 fade-in-up">
          <div className="section-badge mb-4 mx-auto w-fit">
            <div className="pulse-dot" />
            Your Results Are In
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">
            {participantName ? `${participantName.split(' ')[0]}'s` : 'Your'} OCEAN Profile
          </h1>
          <p className="text-slate-400">Based on 25 statements · Big Five Personality Model</p>
        </div>

        {/* Chart */}
        <div className="glass-card p-6 mb-6 glow-teal fade-in-up">
          {/* Chart type toggle */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-lg">Personality Scores</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('radar')}
                id="chart-radar-btn"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${chartType === 'radar' ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                Radar
              </button>
              <button
                onClick={() => setChartType('bar')}
                id="chart-bar-btn"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${chartType === 'bar' ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                Bar
              </button>
            </div>
          </div>

          <div ref={chartRef} style={{ height: 320 }}>
            {chartType === 'radar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                  />
                  <PolarRadiusAxis domain={[0, 35]} tick={{ fill: '#475569', fontSize: 10 }} tickCount={5} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#0ea5e9"
                    fill="#0ea5e9"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    dot={{ fill: '#38bdf8', r: 4 }}
                    isAnimationActive
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <Tooltip content={<CustomRadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 35]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="glass-card px-3 py-2 text-sm">
                          <p className="text-white font-semibold">{d.fullName}</p>
                          <p style={{ color: d.color }}>{d.score}/35 · {bandOf(d.score).toUpperCase()}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={700}>
                    {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Score breakdown */}
        <div className="glass-card p-6 mb-6 fade-in-up">
          <h2 className="text-white font-bold text-lg mb-5">Score Breakdown</h2>
          <div className="space-y-5">
            {DIM_KEYS.map(k => (
              <div key={k}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: DIMENSIONS[k].color }} />
                    <span className="text-white font-medium text-sm">{DIMENSIONS[k].label}</span>
                  </div>
                  <BandChip score={scores[k]} />
                </div>
                <ScoreBar score={scores[k]} color={DIMENSIONS[k].color} />
              </div>
            ))}
          </div>
        </div>

        {/* Locked content — interpretations + full report */}
        {!fullReport ? (
          <>
            {/* Blurred teaser of interpretations */}
            <div className="relative mt-8 fade-in-up">
              {/* Blurred preview cards */}
              <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.55 }} aria-hidden="true">
                <h2 className="text-white font-bold text-xl mb-4">What Your Scores Mean</h2>
                <div className="grid gap-4">
                  {DIM_KEYS.slice(0, 2).map(k => {
                    const b = bandOf(scores[k])
                    const interp = INTERPRETATIONS[k][b]
                    return (
                      <div
                        key={k}
                        className="glass-card p-5"
                        style={{ borderLeftWidth: 3, borderLeftColor: DIMENSIONS[k].color }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: DIMENSIONS[k].color }}>
                              {DIMENSIONS[k].label}
                            </span>
                            <h3 className="text-white font-bold mt-0.5">{interp.headline}</h3>
                          </div>
                          <BandChip score={scores[k]} />
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{interp.body}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Lock overlay */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, transparent 0%, rgba(10,19,40,0.85) 35%, rgba(10,19,40,0.97) 70%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                  paddingBottom: '1.5rem',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
                  <p className="text-white font-bold text-base mb-1">Score insights are locked</p>
                  <p className="text-slate-400 text-sm">Unlock your full personality breakdown below</p>
                </div>
              </div>
            </div>

            {/* Payment section */}
            <PaymentSection responseId={id} onUnlock={handleUnlock} />
          </>
        ) : (
          <>
            {/* Interpretations — revealed after payment */}
            <div className="mt-8 fade-in-up">
              <h2 className="text-white font-bold text-xl mb-4">What Your Scores Mean</h2>
              <div className="grid gap-4">
                {DIM_KEYS.map(k => {
                  const b = bandOf(scores[k])
                  const interp = INTERPRETATIONS[k][b]
                  return (
                    <div
                      key={k}
                      className="glass-card p-5 fade-in-up"
                      style={{ borderLeftWidth: 3, borderLeftColor: DIMENSIONS[k].color }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: DIMENSIONS[k].color }}>
                            {DIMENSIONS[k].label}
                          </span>
                          <h3 className="text-white font-bold mt-0.5">{interp.headline}</h3>
                        </div>
                        <BandChip score={scores[k]} />
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{interp.body}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Full report */}
            <FullReport report={fullReport} labels={reportLabels} responseId={id} />
          </>
        )}

        {/* Retake */}
        <div className="mt-10 text-center">
          <button
            onClick={() => { sessionStorage.clear(); navigate('/') }}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← Return to Home
          </button>
        </div>
      </div>
    </div>
  )
}
