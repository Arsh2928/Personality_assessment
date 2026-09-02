import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { QUESTIONNAIRE, DIMENSIONS } from '../data/questionnaire'

const GROUPS = [0, 1, 2, 3, 4].map(g =>
  QUESTIONNAIRE.slice(g * 5, g * 5 + 5)
)

const ANCHORS = [
  { val: 1, label: 'Not Like Me' },
  { val: 4, label: 'Somewhat Like Me' },
  { val: 7, label: 'Like Me' },
]

function DimensionTag({ itemId }) {
  for (const [key, dim] of Object.entries(DIMENSIONS)) {
    if (dim.items.includes(itemId)) {
      return (
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: dim.color + '20', color: dim.color }}
        >
          {dim.label}
        </span>
      )
    }
  }
  return null
}

export default function Questionnaire() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState({}) // { [statementId]: 1-7 }
  const [activeGroup, setActiveGroup] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Load participant from session storage
  const participant = (() => {
    try { return JSON.parse(sessionStorage.getItem('participant') || '{}') }
    catch { return {} }
  })()

  useEffect(() => {
    if (!participant.name || !participant.email) navigate('/intake')
  }, [])

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === 25

  const currentGroup = GROUPS[activeGroup]
  const groupAnswered = currentGroup.every(q => answers[q.id])

  function setAnswer(id, val) {
    setAnswers(prev => ({ ...prev, [id]: val }))
  }

  function handleNext() {
    if (activeGroup < 4) {
      setActiveGroup(g => g + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handlePrev() {
    if (activeGroup > 0) {
      setActiveGroup(g => g - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function handleSubmit() {
    if (!allAnswered) { setError('Please answer all 25 statements before submitting.'); return }

    // Build answers array in order (statement 1 → index 0, etc.)
    const answersArray = QUESTIONNAIRE.map(q => answers[q.id])

    // Validate range
    if (answersArray.some(a => a < 1 || a > 7)) {
      setError('Some answers are out of range. Please review and resubmit.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const { data } = await axios.post('/api/assessment/submit', {
        participantName: participant.name,
        participantEmail: participant.email,
        participantPhone: participant.phone || undefined,
        answers: answersArray,
      })
      // Store scores in session so results page has them immediately
      sessionStorage.setItem('lastScores', JSON.stringify(data.scores))
      navigate(`/results/${data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="hero-gradient min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="section-badge">Step 2 of 3 · Questions {activeGroup * 5 + 1}–{Math.min(activeGroup * 5 + 5, 25)}</div>
            <span className="text-slate-400 text-sm font-medium">{answeredCount}/25 answered</span>
          </div>

          {/* Progress bar */}
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${(answeredCount / 25) * 100}%` }} />
          </div>

          {/* Group tabs */}
          <div className="flex gap-2 mt-4">
            {GROUPS.map((g, i) => {
              const done = g.every(q => answers[q.id])
              return (
                <button
                  key={i}
                  onClick={() => setActiveGroup(i)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeGroup === i
                      ? 'bg-sky-500 text-white'
                      : done
                      ? 'bg-sky-900/40 text-sky-400 border border-sky-800/50'
                      : 'bg-white/5 text-slate-400 border border-white/8 hover:border-sky-800/50'
                  }`}
                  id={`group-tab-${i}`}
                >
                  {done ? '✓' : i + 1} · Q{i * 5 + 1}–{i * 5 + 5}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scale anchors header */}
        <div className="glass-card-light p-3 mb-4 flex justify-between text-xs text-slate-400 font-medium">
          <span>1 = Not Like Me</span>
          <span>4 = Somewhat Like Me</span>
          <span>7 = Like Me</span>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-4">
          {currentGroup.map((q, idx) => (
            <div
              key={q.id}
              className={`glass-card p-5 fade-in-up transition-all ${answers[q.id] ? 'border-sky-500/30' : ''}`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sky-400 font-bold text-sm">Q{q.id}</span>
                    <DimensionTag itemId={q.id} />
                  </div>
                  <p className="text-white text-sm sm:text-base leading-relaxed">{q.text}</p>
                </div>
                {answers[q.id] && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                    <span className="text-sky-400 font-bold text-sm">{answers[q.id]}</span>
                  </div>
                )}
              </div>

              {/* 1-7 Likert buttons */}
              <div className="flex items-center justify-between gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(val => (
                  <button
                    key={val}
                    id={`q${q.id}-val${val}`}
                    onClick={() => setAnswer(q.id, val)}
                    className={`likert-btn ${answers[q.id] === val ? 'selected' : ''}`}
                    title={ANCHORS.find(a => a.val === val)?.label}
                  >
                    {val}
                  </button>
                ))}
              </div>

              {/* Anchor labels below */}
              <div className="flex justify-between text-xs text-slate-500 mt-1.5 px-1">
                <span>Not Like Me</span>
                <span>Somewhat</span>
                <span>Like Me</span>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {activeGroup > 0 && (
            <button onClick={handlePrev} className="btn-secondary flex-shrink-0" id="prev-group-btn">
              ← Previous
            </button>
          )}
          {activeGroup < 4 ? (
            <button
              onClick={handleNext}
              disabled={!groupAnswered}
              className="btn-primary flex-1"
              id="next-group-btn"
            >
              <span>{groupAnswered ? 'Next Group →' : `Answer all 5 to continue`}</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="btn-primary flex-1"
              id="submit-assessment-btn"
            >
              <span>
                {submitting
                  ? 'Submitting…'
                  : !allAnswered
                  ? `${25 - answeredCount} unanswered — go back`
                  : 'Submit & See Results →'}
              </span>
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
