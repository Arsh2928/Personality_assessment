import { useEffect, useState, useCallback, useMemo, memo, useTransition, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { DIMENSIONS, QUESTIONNAIRE } from '../data/questionnaire'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

function authHeader() {
  const token = localStorage.getItem('adminToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="glass-card p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200">
      <div
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
        style={{ background: `radial-gradient(circle at top right, ${color}, transparent 70%)` }}
      />
      <div className="flex items-start justify-between mb-2">
        <p className="text-slate-400 text-xs uppercase tracking-widest">{label}</p>
        <span className="text-lg opacity-60">{icon}</span>
      </div>
      <p className="font-extrabold text-3xl" style={{ color }}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ─── Score mini-pills ────────────────────────────────────────────────────────
function ScoreMini({ scores }) {
  if (!scores) return null
  return (
    <div className="flex gap-1 flex-wrap">
      {Object.entries(DIMENSIONS).map(([k, d]) => (
        <span
          key={k}
          className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
          style={{ background: d.color + '20', color: d.color }}
          title={d.label}
        >
          {d.label.split(' ')[0][0]}: {scores[k]}
        </span>
      ))}
    </div>
  )
}

// ─── Score bar ───────────────────────────────────────────────────────────────
function ScoreBar({ label, score, color, band }) {
  const pct = Math.round((score / 35) * 100)
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-300 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: color + '20', color }}
          >
            {band}
          </span>
          <span className="text-sm font-bold" style={{ color }}>
            {score}<span className="text-slate-500 font-normal">/35</span>
          </span>
        </div>
      </div>
      <div className="progress-bar-track">
        <div
          className="dim-bar"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  )
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl fade-in-up"
      style={{
        background: isError ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)',
        border: `1px solid ${isError ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
        backdropFilter: 'blur(16px)',
      }}
    >
      <span className="text-lg">{isError ? '⚠️' : '✅'}</span>
      <p className="text-sm font-medium" style={{ color: isError ? '#fca5a5' : '#6ee7b7' }}>
        {toast.msg}
      </p>
      <button onClick={onClose} className="text-slate-500 hover:text-white ml-2 text-xs">
        ✕
      </button>
    </div>
  )
}

// ─── Payment Proof Viewer ────────────────────────────────────────────────────
function ProofViewer({ url, paymentReference }) {
  const isPdf = url && (url.includes('/raw/upload/') || url.toLowerCase().endsWith('.pdf'))

  if (!url && !paymentReference) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/3 p-6 text-center text-slate-500 text-sm">
        No payment proof uploaded
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {url && (
        <div className="rounded-xl overflow-hidden border border-sky-500/20">
          {isPdf ? (
            <iframe
              src={url}
              title="Payment Proof PDF"
              className="w-full"
              style={{ height: '420px', background: '#fff' }}
            />
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer" title="Open fullsize">
              <img
                src={url}
                alt="Payment proof screenshot"
                className="w-full object-contain max-h-96 cursor-zoom-in hover:opacity-90 transition-opacity"
                style={{ background: '#0f1f3d' }}
              />
            </a>
          )}
          <div className="px-3 py-2 bg-white/3 flex items-center justify-between">
            <span className="text-xs text-slate-500 truncate">Stored on Cloudinary</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 ml-2 whitespace-nowrap"
            >
              Open ↗
            </a>
          </div>
        </div>
      )}

      {paymentReference && (
        <div
          className="flex items-center gap-4 rounded-xl border p-4"
          style={{
            background: 'rgba(16,185,129,0.06)',
            borderColor: 'rgba(16,185,129,0.25)',
          }}
        >
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ background: 'rgba(16,185,129,0.15)' }}
          >
            🧾
          </div>
          <div>
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-0.5">
              UPI Transaction ID
            </p>
            <p className="text-white font-mono text-sm tracking-wide select-all">
              {paymentReference}
            </p>
            {!url && (
              <p className="text-slate-500 text-xs mt-1">
                No screenshot — verified by transaction ID only
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
function DetailModal({ responseId, onClose, onToast }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('report')

  useEffect(() => {
    if (!responseId) return
    setLoading(true)
    setError('')
    axios
      .get(`/api/admin/responses/${responseId}`, { headers: authHeader() })
      .then((r) => setDetail(r.data))
      .catch(() => setError('Failed to load details.'))
      .finally(() => setLoading(false))
  }, [responseId])

  async function handleSendEmail() {
    if (!detail) return
    setSending(true)
    try {
      const r = await axios.post(
        `/api/admin/responses/${responseId}/send-email`,
        {},
        { headers: authHeader() }
      )
      onToast({ type: 'success', msg: `Report emailed to ${r.data.sentTo}` })
      onClose()
    } catch (err) {
      onToast({ type: 'error', msg: err.response?.data?.error || 'Failed to send email' })
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(6,15,30,0.92)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="glass-card w-full max-w-3xl max-h-[92vh] flex flex-col fade-in-up"
        style={{ border: '1px solid rgba(56,189,248,0.2)', boxShadow: '0 0 60px rgba(14,165,233,0.12)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">
              {loading ? 'Loading…' : detail?.participantName || 'Participant Details'}
            </h2>
            {detail && (
              <p className="text-slate-400 text-xs mt-0.5">
                {detail.participantEmail}
                {detail.participantPhone && (
                  <span className="ml-2 text-slate-500">📞 {detail.participantPhone}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {detail?.paymentStatus === 'paid' && (
              <>
                <a
                  href={`/api/assessment/${responseId}/report-pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs py-1.5 px-3"
                  id="modal-download-pdf-btn"
                >
                  📥 PDF
                </a>
                <button
                  onClick={handleSendEmail}
                  disabled={sending}
                  className="btn-primary text-xs py-1.5 px-3"
                  id="modal-send-email-btn"
                >
                  {sending ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    '✉ Send Email'
                  )}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors text-xl leading-none ml-1"
              id="modal-close-btn"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex border-b border-white/8 px-6 shrink-0">
          {[
            { id: 'report', label: '📄 Full Report' },
            { id: 'proof', label: '🧾 Payment Proof' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
              id={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-9 h-9 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
            </div>
          )}
          {error && <div className="text-red-400 text-sm py-8 text-center">{error}</div>}
          {detail && activeTab === 'report' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="glass-card-light rounded-lg p-3">
                  <p className="text-slate-500 text-xs mb-0.5">Submitted</p>
                  <p className="text-slate-200 font-medium">
                    {new Date(detail.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="glass-card-light rounded-lg p-3">
                  <p className="text-slate-500 text-xs mb-0.5">Payment</p>
                  <span className={detail.paymentStatus === 'paid' ? 'chip-high' : 'chip-low'}>
                    {detail.paymentStatus}
                  </span>
                </div>
                <div className="glass-card-light rounded-lg p-3">
                  <p className="text-slate-500 text-xs mb-0.5">Amount</p>
                  <p className="text-slate-200 font-medium">
                    {detail.paymentAmount > 0 ? `₹${detail.paymentAmount}` : 'Free'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider text-slate-400">
                  OCEAN Scores
                </h3>
                {Object.entries(DIMENSIONS).map(([k, d]) => {
                  const score = detail.scores?.[k] ?? 0
                  const bandLabel =
                    detail.labels?.[k]?.band || (score >= 26 ? 'High' : score >= 15 ? 'Mid' : 'Low')
                  return (
                    <ScoreBar
                      key={k}
                      label={d.label}
                      score={score}
                      color={d.color}
                      band={bandLabel}
                    />
                  )
                })}
              </div>

              {detail.report?.sections ? (
                <div>
                  <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider text-slate-400">
                    Narrative Profile
                  </h3>
                  <div className="space-y-4">
                    {detail.report.sections.map((section, idx) => (
                      <div key={idx} className="glass-card-light rounded-xl p-4">
                        <h4 className="text-white font-bold text-sm mb-1">{section.title}</h4>
                        {section.style && (
                          <p className="text-indigo-400 font-semibold text-xs mb-1">
                            {section.style}
                          </p>
                        )}
                        {section.content && (
                          <p className="text-slate-400 text-xs leading-relaxed mt-1">
                            {section.content.replace(/\*\*/g, '')}
                          </p>
                        )}
                        {section.items && (
                          <ul className="mt-1 space-y-0.5">
                            {section.items.map((item, j) => (
                              <li key={j} className="text-slate-400 text-xs flex gap-1.5">
                                <span className="text-sky-500 mt-0.5">›</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {section.tips && (
                          <div className="mt-2 space-y-0.5">
                            <p className="text-slate-300 text-xs font-semibold">Tips:</p>
                            {section.tips.map((t, j) => (
                              <p key={j} className="text-slate-400 text-xs pl-3">
                                • {t}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : detail.paymentStatus !== 'paid' ? (
                <div className="glass-card-light rounded-xl p-5 text-center">
                  <p className="text-slate-500 text-sm">Full narrative report available only after payment</p>
                </div>
              ) : null}
            </div>
          )}

          {detail && activeTab === 'proof' && (
            <div className="space-y-4">
              <div className="glass-card-light rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">Payment Proof Screenshot</h3>
                  {detail.paymentReference && (
                    <span className="text-xs text-slate-500">Ref: {detail.paymentReference}</span>
                  )}
                </div>
                <ProofViewer
                  url={detail.paymentProofFile}
                  paymentReference={detail.paymentReference}
                />
              </div>
              {detail.paymentStatus === 'paid' && (
                <div className="flex justify-center">
                  <button
                    onClick={handleSendEmail}
                    disabled={sending}
                    className="btn-primary py-2.5 px-6"
                    id="proof-tab-send-email-btn"
                  >
                    {sending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
                        Sending report…
                      </span>
                    ) : (
                      '✉ Send Report to Participant'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SCALE COLOURS (1–7) ─────────────────────────────────────────────────────
const SCALE_COLORS = ['#ef4444', '#f97316', '#facc15', '#a3e635', '#34d399', '#22d3ee', '#818cf8']

// ─── Circular Progress SVG ────────────────────────────────────────────────────
function CircularProgress({ pct, color, size = 64, stroke = 5 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ * (1 - pct / 100)), 120)
    return () => clearTimeout(t)
  }, [pct, circ])
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, displayValue, sub, color, delay = 0 }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 group cursor-default"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 400ms ease ${delay}ms, transform 400ms ease ${delay}ms`,
      }}
    >
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500"
        style={{ background: color, filter: 'blur(24px)' }}
      />
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: color + '20', border: `1px solid ${color}30` }}
        >
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
      <p className="text-3xl font-extrabold text-white tracking-tight">{displayValue}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ─── Trait Card ───────────────────────────────────────────────────────────────
function TraitCard({ label, avg, color, rank, total, delay = 0 }) {
  const pct = Math.round((avg / 7) * 100)
  const band = avg >= 5.5 ? 'High' : avg >= 3.5 ? 'Mid' : 'Low'
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div
      className="relative rounded-2xl p-4 sm:p-5 group cursor-default flex flex-col justify-between h-full"
      style={{
        background: `linear-gradient(135deg, ${color}10 0%, rgba(255,255,255,0.02) 100%)`,
        border: `1px solid ${color}28`,
        backdropFilter: 'blur(16px)',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.03)'
        e.currentTarget.style.boxShadow = `0 0 30px ${color}25`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] xl:text-xs font-bold uppercase tracking-wider mb-1 truncate"
            style={{ color }}
            title={label}
          >
            {label}
          </p>
          <p className="text-white text-xl sm:text-2xl font-extrabold whitespace-nowrap">
            {avg.toFixed(2)}
            <span className="text-slate-500 text-xs sm:text-sm font-normal">/7</span>
          </p>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5 inline-block"
            style={{ background: color + '20', color }}
          >
            {band}
          </span>
        </div>
        <div className="relative shrink-0">
          <CircularProgress pct={pct} color={color} size={54} stroke={4.5} />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color }}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <div className="h-1 flex-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
          />
        </div>
        <span className="text-[10px] text-slate-500 shrink-0">#{rank}/{total}</span>
      </div>
    </div>
  )
}

// ─── Question Card ────────────────────────────────────────────────────────────
const QuestionCard = memo(function QuestionCard({ q, dim, qText, cardIdx, visible }) {
  const total = q.count || 1
  const stagger = Math.min(cardIdx * 20, 160)
  const avgPct = ((q.mean - 1) / 6) * 100
  return (
    <div
      className="group rounded-2xl p-5 cursor-default"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${dim?.color || '#38bdf8'}20`,
        borderLeft: `3px solid ${dim?.color || '#38bdf8'}`,
        backdropFilter: 'blur(12px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 280ms ease ${stagger}ms, transform 280ms ease ${stagger}ms, box-shadow 200ms`,
        contain: 'layout style paint',
        willChange: 'opacity, transform',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 4px 28px ${dim?.color || '#38bdf8'}18`)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="shrink-0 mt-0.5 text-xs font-bold px-2 py-0.5 rounded-lg"
            style={{
              background: (dim?.color || '#38bdf8') + '18',
              color: dim?.color || '#38bdf8',
              border: `1px solid ${dim?.color || '#38bdf8'}25`,
            }}
          >
            Q{q.questionIndex}
          </span>
          <p className="text-slate-200 text-sm leading-snug">{qText}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Avg</p>
            <p className="text-base font-extrabold" style={{ color: dim?.color || '#38bdf8' }}>
              {q.mean.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Mode</p>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: SCALE_COLORS[q.mode - 1] + '22', color: SCALE_COLORS[q.mode - 1] }}
            >
              {q.mode}
            </span>
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full hidden sm:block font-medium"
            style={{
              background: (dim?.color || '#38bdf8') + '12',
              color: dim?.color || '#38bdf8',
              border: `1px solid ${dim?.color || '#38bdf8'}20`,
            }}
          >
            {dim?.label?.split(' ')[0]}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((v) => {
          const cnt = q.distribution[v] || 0
          const pct = (cnt / total) * 100
          return (
            <div key={v} className="flex items-center gap-2">
              <span className="text-[10px] w-3 text-center font-bold" style={{ color: SCALE_COLORS[v - 1], opacity: 0.85 }}>
                {v}
              </span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: visible ? `${pct}%` : '0%',
                    background: SCALE_COLORS[v - 1],
                    transition: `width 500ms cubic-bezier(.4,0,.2,1) ${stagger + v * 30}ms`,
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-500 w-8 text-right">{cnt > 0 ? `${pct.toFixed(0)}%` : ''}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 relative">
        <div className="h-px w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div
          className="absolute top-0 w-2 h-2 rounded-full -translate-y-1/2 -translate-x-1/2"
          style={{
            left: `${avgPct}%`,
            background: dim?.color || '#38bdf8',
            boxShadow: `0 0 8px ${dim?.color || '#38bdf8'}80`,
            transition: 'left 800ms ease',
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-slate-600">1</span>
          <span className="text-[9px] text-slate-400">avg {q.mean.toFixed(1)}</span>
          <span className="text-[9px] text-slate-600">7</span>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-slate-600">{q.count} responses</div>
    </div>
  )
})

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16, r = 8 }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: 'rgba(255,255,255,0.06)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  )
}

// ─── Insights Panel ───────────────────────────────────────────────────────────
function InsightsPanel({ dimSummary, questions }) {
  const insights = useMemo(() => {
    if (!dimSummary.length || !questions.length) return []
    const sorted = [...dimSummary].sort((a, b) => b.avg - a.avg)
    const highest = sorted[0]
    const lowest = sorted[sorted.length - 1]
    const varByDim = dimSummary.map(({ key, dim, avg }) => {
      const qs = questions.filter((q) => q._dimKey === key)
      const variance = qs.length ? qs.reduce((s, q) => s + Math.pow(q.mean - avg, 2), 0) / qs.length : 0
      return { key, dim, variance }
    })
    const highestVar = [...varByDim].sort((a, b) => b.variance - a.variance)[0]
    const highRatingQ = [...questions].sort((a, b) => {
      const ha = ((a.distribution[6] || 0) + (a.distribution[7] || 0)) / (a.count || 1)
      const hb = ((b.distribution[6] || 0) + (b.distribution[7] || 0)) / (b.count || 1)
      return hb - ha
    })[0]
    const highPct = highRatingQ
      ? Math.round((((highRatingQ.distribution[6] || 0) + (highRatingQ.distribution[7] || 0)) / (highRatingQ.count || 1)) * 100)
      : 0
    const avgOverall = questions.reduce((s, q) => s + q.mean, 0) / questions.length
    return [
      {
        icon: '✨',
        text: `${highest?.dim?.label} is the highest-scoring trait with an average of ${highest?.avg.toFixed(2)}/7.`,
        color: '#10b981',
      },
      {
        icon: '📊',
        text: `${lowest?.dim?.label} scores the lowest (${lowest?.avg.toFixed(2)}/7) — indicating the most room for growth.`,
        color: '#f59e0b',
      },
      {
        icon: '📈',
        text: `${highestVar?.dim?.label} shows the greatest response variance — participants have widely different experiences here.`,
        color: '#818cf8',
      },
      {
        icon: '🎯',
        text: `${highPct}% of respondents chose 6 or 7 on Q${highRatingQ?.questionIndex} — the most strongly endorsed item.`,
        color: '#0ea5e9',
      },
      {
        icon: '🌡️',
        text: `Overall average: ${avgOverall.toFixed(2)}/7 — ${
          avgOverall >= 5
            ? 'indicating a strongly positive self-assessment.'
            : avgOverall >= 3.5
            ? 'reflecting moderate trait expression.'
            : 'suggesting conservative self-ratings overall.'
        }`,
        color: '#ec4899',
      },
    ]
  }, [dimSummary, questions])

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {insights.map((ins, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 hover:scale-[1.02] transition-transform cursor-default"
          style={{ background: ins.color + '0d', border: `1px solid ${ins.color}25` }}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">{ins.icon}</span>
            <p className="text-slate-300 text-sm leading-relaxed">{ins.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterDim, setFilterDim] = useState('all')
  const [sortBy, setSortBy] = useState('index')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [visible, setVisible] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef(null)

  function handleSearch(e) {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => startTransition(() => setDebouncedSearch(val)), 200)
  }
  function applySort(v) {
    setVisible(false)
    startTransition(() => {
      setSortBy(v)
      setTimeout(() => setVisible(true), 60)
    })
  }
  function applyFilter(d) {
    setVisible(false)
    startTransition(() => {
      setFilterDim(d)
      setTimeout(() => setVisible(true), 60)
    })
  }

  function fetchAnalytics() {
    setLoading(true)
    setError('')
    axios
      .get('/api/admin/analytics', { headers: authHeader() })
      .then((r) => {
        setData(r.data)
        setTimeout(() => setVisible(true), 80)
      })
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    fetchAnalytics()
  }, [])

  const qDimMap = useMemo(() => {
    const m = {}
    Object.entries(DIMENSIONS).forEach(([k, d]) => d.items.forEach((qi) => { m[qi] = k }))
    return m
  }, [])
  const qTextMap = useMemo(() => {
    const m = {}
    QUESTIONNAIRE.forEach((q) => { m[q.id] = q.text })
    return m
  }, [])

  const annotatedQuestions = useMemo(() => {
    return data?.questions?.map((q) => ({ ...q, _dimKey: qDimMap[q.questionIndex] })) || []
  }, [data, qDimMap])

  const dimSummary = useMemo(() => {
    return data
      ? Object.entries(DIMENSIONS).map(([key, dim]) => {
          const qs = annotatedQuestions.filter((q) => q._dimKey === key)
          const avg = qs.length ? qs.reduce((s, q) => s + q.mean, 0) / qs.length : 0
          return { key, dim, avg }
        })
      : []
  }, [annotatedQuestions, data])

  const radarData = useMemo(() => {
    return dimSummary.map(({ dim, avg }) => ({
      trait: dim.label.split(' ')[0],
      score: parseFloat(avg.toFixed(2)),
      fullMark: 7,
    }))
  }, [dimSummary])

  const barData = useMemo(() => {
    return dimSummary.map(({ dim, avg }) => ({
      name: dim.label.split(' ')[0],
      avg: parseFloat(avg.toFixed(2)),
      color: dim.color,
    }))
  }, [dimSummary])

  const sortedTraits = useMemo(() => [...dimSummary].sort((a, b) => b.avg - a.avg), [dimSummary])
  const totalResponses = data?.totalResponses || 0
  const overallAvg = useMemo(() => {
    return dimSummary.length ? dimSummary.reduce((s, d) => s + d.avg, 0) / dimSummary.length : 0
  }, [dimSummary])
  const highestTrait = sortedTraits[0]
  const lowestTrait = sortedTraits[sortedTraits.length - 1]

  const filtered = useMemo(() => {
    let list = annotatedQuestions.filter((q) => {
      if (filterDim !== 'all' && q._dimKey !== filterDim) return false
      if (debouncedSearch.trim()) {
        const txt = qTextMap[q.questionIndex] || ''
        if (!txt.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
      }
      return true
    })
    if (sortBy === 'avg-desc') list = [...list].sort((a, b) => b.mean - a.mean)
    if (sortBy === 'avg-asc') list = [...list].sort((a, b) => a.mean - b.mean)
    return list
  }, [annotatedQuestions, filterDim, debouncedSearch, sortBy, qTextMap])

  if (loading)
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} h={110} r={16} />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton h={300} r={20} />
          <Skeleton h={300} r={20} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} h={130} r={16} />
          ))}
        </div>
      </div>
    )
  if (error)
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-3">{error}</p>
        <button onClick={fetchAnalytics} className="btn-secondary text-sm px-4 py-2">
          Retry
        </button>
      </div>
    )
  if (!data) return null

  const NAV_SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'questions', label: 'Questions' },
  ]

  return (
    <div className="space-y-8">
      {/* Section nav + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={
                activeSection === s.id
                  ? { background: 'rgba(99,102,241,0.28)', color: '#a5b4fc', boxShadow: '0 0 20px rgba(99,102,241,0.18)' }
                  : { color: '#64748b' }
              }
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              fetchAnalytics()
            }}
            className="text-slate-400 hover:text-sky-400 text-sm flex items-center gap-1.5 transition-colors"
          >
            <span>↺</span> Refresh
          </button>
          <a
            href={`/api/admin/export?token=${localStorage.getItem('adminToken')}`}
            className="btn-primary text-xs py-1.5 px-3"
            download
          >
            <span>⬇ Export</span>
          </a>
        </div>
      </div>

      {/* OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon="👥"
              label="Total Responses"
              displayValue={totalResponses}
              sub="assessment submissions"
              color="#0ea5e9"
              delay={0}
            />
            <KpiCard
              icon="📊"
              label="Overall Avg"
              displayValue={overallAvg.toFixed(2) + '/7'}
              sub="across all OCEAN traits"
              color="#6366f1"
              delay={80}
            />
            <KpiCard
              icon="🏆"
              label="Highest Trait"
              displayValue={highestTrait?.dim?.label?.split(' ')[0] || '—'}
              sub={`avg ${highestTrait?.avg?.toFixed(2) || '—'}/7`}
              color="#10b981"
              delay={160}
            />
            <KpiCard
              icon="📉"
              label="Lowest Trait"
              displayValue={lowestTrait?.dim?.label?.split(' ')[0] || '—'}
              sub={`avg ${lowestTrait?.avg?.toFixed(2) || '—'}/7`}
              color="#f59e0b"
              delay={240}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">OCEAN Radar</p>
              <p className="text-slate-600 text-xs mb-4">Average trait score per dimension (1–7 scale)</p>
              <ResponsiveContainer width="100%" height={270}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.07)" />
                  <PolarAngleAxis dataKey="trait" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 7]} tick={{ fill: '#475569', fontSize: 9 }} tickCount={4} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#818cf8"
                    fill="#818cf8"
                    fillOpacity={0.18}
                    strokeWidth={2}
                    dot={{ fill: '#a5b4fc', r: 4 }}
                    isAnimationActive
                    animationDuration={900}
                  />
                  <ReTooltip
                    contentStyle={{
                      background: 'rgba(15,31,61,0.95)',
                      border: '1px solid rgba(129,140,248,0.3)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                    formatter={(v) => [v + '/7', 'Score']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Trait Comparison</p>
              <p className="text-slate-600 text-xs mb-4">Group average per dimension</p>
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 7]} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip
                    contentStyle={{
                      background: 'rgba(15,31,61,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v) => [v + '/7', 'Avg']}
                  />
                  <Bar dataKey="avg" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={800}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Trait Breakdown</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {sortedTraits.map(({ key, dim, avg }, i) => (
                <TraitCard
                  key={key}
                  label={dim.label.split(' ')[0]}
                  avg={avg}
                  color={dim.color}
                  rank={i + 1}
                  total={sortedTraits.length}
                  delay={i * 60}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">💡 Auto Insights</p>
            <InsightsPanel dimSummary={dimSummary} questions={annotatedQuestions} />
          </div>
        </div>
      )}

      {/* QUESTIONS */}
      {activeSection === 'questions' && (
        <div className="space-y-5">
          <div
            className="flex flex-col sm:flex-row gap-3 sticky top-16 z-10 py-3 -mx-1 px-1"
            style={{ backdropFilter: 'blur(20px)', background: 'rgba(6,15,30,0.85)' }}
          >
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search questions…"
                value={searchInput}
                onChange={handleSearch}
                className="field-input pl-9 text-sm w-full"
                id="q-search"
              />
            </div>
            <div className="relative" style={{ maxWidth: 180 }}>
              <select
                value={sortBy}
                onChange={(e) => applySort(e.target.value)}
                className="field-input text-sm w-full appearance-none pr-8"
                id="q-sort"
              >
                <option value="index">Sort: Q#</option>
                <option value="avg-desc">Avg ↓ High first</option>
                <option value="avg-asc">Avg ↑ Low first</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
                {isPending ? '⟳' : '▾'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                filterDim === 'all'
                  ? 'bg-slate-200 text-slate-900'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {Object.entries(DIMENSIONS).map(([key, dim]) => (
              <button
                key={key}
                onClick={() => applyFilter(key === filterDim ? 'all' : key)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={
                  filterDim === key
                    ? { background: dim.color, color: '#0f1f3d' }
                    : { background: dim.color + '18', color: dim.color, border: `1px solid ${dim.color}40` }
                }
              >
                {dim.label.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 text-[11px]">Scale:</span>
            {[1, 2, 3, 4, 5, 6, 7].map((v) => (
              <div key={v} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: SCALE_COLORS[v - 1] }} />
                <span className="text-slate-500 text-[11px]">{v}</span>
              </div>
            ))}
            <span className="text-slate-600 text-[11px] ml-1">(1=Disagree, 7=Agree)</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((q, i) => (
              <QuestionCard
                key={q.questionIndex}
                q={q}
                dim={DIMENSIONS[q._dimKey]}
                qText={qTextMap[q.questionIndex] || `Q${q.questionIndex}`}
                cardIdx={i}
                visible={visible}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              {debouncedSearch ? `No questions match "${debouncedSearch}"` : 'No data yet.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helper: decode role from stored JWT without a library ───────────────────
function getTokenPayload() {
  try {
    const token = localStorage.getItem('adminToken')
    if (!token) return {}
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return {}
  }
}

// ─── Admins Panel (superadmin only) ──────────────────────────────────────────
function AdminsPanel({ onToast }) {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [editPasswordId, setEditPasswordId] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const me = getTokenPayload()

  function load() {
    setLoading(true)
    axios
      .get('/api/admin/admins', { headers: authHeader() })
      .then((r) => setAdmins(r.data))
      .catch(() => onToast({ type: 'error', msg: 'Failed to load admins' }))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await axios.post('/api/admin/admins', form, { headers: authHeader() })
      onToast({ type: 'success', msg: `Admin "${form.name}" created` })
      setShowAdd(false)
      setForm({ name: '', email: '', password: '', role: 'admin' })
      load()
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create admin')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      await axios.delete(`/api/admin/admins/${id}`, { headers: authHeader() })
      onToast({ type: 'success', msg: 'Admin removed' })
      setAdmins((prev) => prev.filter((a) => a._id !== id))
    } catch (err) {
      onToast({ type: 'error', msg: err.response?.data?.error || 'Failed to delete' })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleChangePassword(id) {
    if (!newPassword.trim()) return
    setChangingPw(true)
    try {
      await axios.patch(
        `/api/admin/admins/${id}/password`,
        { password: newPassword },
        { headers: authHeader() }
      )
      onToast({ type: 'success', msg: 'Password updated successfully' })
      setEditPasswordId(null)
      setNewPassword('')
    } catch (err) {
      onToast({ type: 'error', msg: err.response?.data?.error || 'Failed to update password' })
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Admin Accounts</h2>
          <p className="text-slate-500 text-xs mt-0.5">Manage dashboard access and permissions</p>
        </div>
        <button
          onClick={() => {
            setShowAdd(!showAdd)
            setFormError('')
          }}
          className="btn-accent text-sm py-2 px-4 flex items-center gap-2"
          id="add-admin-btn"
        >
          {showAdd ? '✕ Cancel' : '+ Add Admin'}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="glass-card-light rounded-xl p-5 space-y-4 max-w-lg fade-in-up"
        >
          <h3 className="text-white font-semibold text-sm">Create New Admin</h3>
          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="field-input text-sm w-full"
                id="new-admin-name"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="admin@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="field-input text-sm w-full"
                id="new-admin-email"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="field-input text-sm w-full"
                id="new-admin-password"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="field-input text-sm w-full"
                id="new-admin-role"
              >
                <option value="admin">Admin (Read-only responses, view analytics)</option>
                <option value="superadmin">Superadmin (Full control, manage admins)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs py-2 px-5"
              id="submit-admin-btn"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
                  Creating…
                </span>
              ) : (
                'Create Admin'
              )}
            </button>
          </div>
        </form>
      )}

      <div className="glass-card-light rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Admin</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {admins.map((a) => (
                <tr key={a._id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {a.name?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm leading-snug">{a.name}</p>
                        <p className="text-slate-400 text-xs">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                        a.role === 'superadmin'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                      }`}
                    >
                      {a.role === 'superadmin' ? '⭐ Superadmin' : '🔧 Admin'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(a.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editPasswordId === a._id ? (
                        <>
                          <input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="field-input text-xs py-1 px-2"
                            style={{ maxWidth: 140 }}
                            id={`pw-input-${a._id}`}
                            autoFocus
                          />
                          <button
                            onClick={() => handleChangePassword(a._id)}
                            disabled={changingPw || !newPassword.trim()}
                            className="text-xs px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditPasswordId(null)
                              setNewPassword('')
                            }}
                            className="text-xs px-2 py-1 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditPasswordId(a._id)
                            setNewPassword('')
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 hover:text-sky-400 transition-colors"
                          id={`pw-btn-${a._id}`}
                          title="Change password"
                        >
                          🔑 Password
                        </button>
                      )}

                      {a._id !== me.id && (
                        <>
                          {confirmId === a._id ? (
                            <button
                              onClick={() => handleDelete(a._id)}
                              disabled={deletingId === a._id}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-500/30 text-red-300 font-bold border border-red-500/50 hover:bg-red-500/40 transition-colors"
                            >
                              Confirm?
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmId(a._id)}
                              disabled={deletingId === a._id}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                              id={`del-btn-${a._id}`}
                            >
                              🗑 Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {admins.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">No admins found.</div>
        )}
      </div>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [toast, setToast] = useState(null)
  const [dashTab, setDashTab] = useState('responses') // 'responses' | 'analytics' | 'admins'

  const navigate = useNavigate()
  const tokenPayload = getTokenPayload()
  const myRole = tokenPayload.role || 'admin'

  const fetchData = useCallback(
    async (p = 1) => {
      setLoading(true)
      setError('')
      try {
        const [statsData, resData] = await Promise.all([
          axios.get('/api/admin/stats', { headers: authHeader() }),
          axios.get(`/api/admin/responses?page=${p}&limit=10`, { headers: authHeader() }),
        ])
        setStats(statsData.data)
        setResponses(resData.data.responses)
        setTotalPages(resData.data.totalPages)
        setPage(resData.data.page)
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('adminToken')
          navigate('/admin')
        } else {
          setError('Failed to load dashboard data.')
        }
      } finally {
        setLoading(false)
      }
    },
    [navigate]
  )

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/admin')
      return
    }
    fetchData(1)
  }, [fetchData, navigate])

  function logout() {
    localStorage.removeItem('adminToken')
    navigate('/admin')
  }

  function downloadExcel() {
    const token = localStorage.getItem('adminToken')
    window.open(`/api/admin/export?token=${token}`, '_blank')
  }

  const closeModal = useCallback(() => setSelectedId(null), [])

  async function handleDelete(id) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId((prev) => (prev === id ? null : prev)), 4000)
      return
    }
    setDeletingId(id)
    setConfirmDeleteId(null)
    try {
      await axios.delete(`/api/admin/responses/${id}`, { headers: authHeader() })
      setResponses((prev) => prev.filter((r) => r._id !== id))
      setToast({ type: 'success', msg: 'Response deleted successfully' })
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Failed to delete' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="hero-gradient min-h-screen pb-16">
      {/* Topbar */}
      <div
        className="border-b border-white/5 px-6 py-4 sticky top-0 z-50"
        style={{ background: 'rgba(6,15,30,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">IP</span>
            </div>
            <span className="text-white font-semibold">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadExcel}
              className="btn-secondary text-sm py-1.5 px-4"
              id="download-excel-btn"
            >
              📥 Excel
            </button>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-white text-sm transition-colors"
              id="admin-logout-btn"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Participants" value={stats.totalParticipants} color="#0ea5e9" icon="👥" />
            <StatCard label="Paid Reports" value={stats.paidParticipants} color="#10b981" icon="✅" />
            <StatCard
              label="Free (Unpaid)"
              value={stats.totalParticipants - stats.paidParticipants}
              color="#94a3b8"
              icon="⏳"
            />
            <StatCard
              label="Total Revenue"
              value={`₹${stats.totalRevenue}`}
              sub="from paid reports"
              color="#f59e0b"
              icon="💰"
            />
          </div>
        )}

        {/* Dashboard tabs */}
        <div className="flex gap-1 mb-6 glass-card-light rounded-xl p-1 w-fit">
          {[
            { id: 'responses', label: '📋 Responses' },
            { id: 'analytics', label: '📊 Analytics' },
            ...(myRole === 'superadmin' ? [{ id: 'admins', label: '👥 Admins' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDashTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                dashTab === tab.id
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              id={`dash-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Responses table */}
        {dashTab === 'responses' && (
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-white font-bold">Assessment Responses</h2>
              <button
                onClick={() => fetchData(page)}
                className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
                id="refresh-btn"
              >
                ↺ Refresh
              </button>
            </div>

            {error && <div className="px-6 py-4 text-red-400 text-sm">{error}</div>}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
              </div>
            ) : responses.length === 0 ? (
              <div className="text-center py-16 text-slate-500">No responses yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Date', 'Name', 'Email', 'OCEAN Scores', 'Payment', 'Amount', 'Actions'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r, i) => (
                      <tr
                        key={r._id}
                        className={`border-b border-white/5 transition-colors ${
                          i % 2 === 0 ? '' : 'bg-white/[0.01]'
                        } hover:bg-sky-500/5`}
                      >
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                          {r.participantName}
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {r.participantEmail}
                        </td>
                        <td className="px-4 py-3">
                          <ScoreMini scores={r.scores} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={r.paymentStatus === 'paid' ? 'chip-high' : 'chip-low'}>
                            {r.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {r.paymentAmount > 0 ? `₹${r.paymentAmount}` : 'Free'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedId(r._id)}
                              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:scale-105"
                              style={{
                                background: 'rgba(14,165,233,0.12)',
                                color: '#38bdf8',
                                border: '1px solid rgba(14,165,233,0.25)',
                              }}
                              id={`view-btn-${r._id}`}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDelete(r._id)}
                              disabled={deletingId === r._id}
                              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50"
                              style={
                                deletingId === r._id
                                  ? {
                                      background: 'rgba(248,113,113,0.08)',
                                      color: '#94a3b8',
                                      border: '1px solid rgba(148,163,184,0.2)',
                                    }
                                  : confirmDeleteId === r._id
                                  ? {
                                      background: 'rgba(248,113,113,0.25)',
                                      color: '#fca5a5',
                                      border: '1px solid rgba(248,113,113,0.5)',
                                    }
                                  : {
                                      background: 'rgba(248,113,113,0.08)',
                                      color: '#f87171',
                                      border: '1px solid rgba(248,113,113,0.2)',
                                    }
                              }
                              id={`delete-btn-${r._id}`}
                            >
                              {deletingId === r._id ? (
                                <span className="flex items-center gap-1">
                                  <span className="w-3 h-3 border border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                                  Deleting...
                                </span>
                              ) : confirmDeleteId === r._id ? (
                                'Confirm?'
                              ) : (
                                '🗑 Delete'
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <button
                  disabled={page === 1}
                  onClick={() => fetchData(page - 1)}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                  id="prev-page-btn"
                >
                  Previous
                </button>
                <span className="text-slate-400 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => fetchData(page + 1)}
                  className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
                  id="next-page-btn"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analytics Panel */}
        {dashTab === 'analytics' && (
          <div className="glass-card p-6">
            <AnalyticsPanel />
          </div>
        )}

        {/* Admins Panel (superadmin only) */}
        {dashTab === 'admins' && myRole === 'superadmin' && (
          <div className="glass-card p-6">
            <AdminsPanel onToast={setToast} />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <DetailModal responseId={selectedId} onClose={closeModal} onToast={setToast} />
      )}

      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}