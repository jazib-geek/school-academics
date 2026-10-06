import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Coffee, Moon, Pause, Play, Timer } from 'lucide-react'
import { getLiveTimetable } from '../../services/campusTimeTableService'
import { getPakistanClock } from '../../utils/pakistanDate'

const TICK_MS = 15_000
const RELOAD_MS = 5 * 60_000
const PAGE_MS = 15_000
const FADE_MS = 900
const CHIP_GAP = 8
const PAGER_PADDING = 16

function toMinutes(hhmm) {
  if (!hhmm) return null
  const [h, m] = String(hhmm).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const suffix = h >= 12 ? 'pm' : 'am'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`
}

function buildModel(detail) {
  if (!detail) return null
  const slots = (detail.periods || [])
    .map((p) => ({
      periodNumber: p.periodNumber,
      label: p.label?.trim() || (p.isBreak ? 'Break' : `Period ${p.periodNumber}`),
      isBreak: Boolean(p.isBreak),
      start: toMinutes(p.startTime),
      end: toMinutes(p.endTime),
      sortOrder: p.sortOrder ?? p.periodNumber,
    }))
    .filter((p) => p.start != null && p.end != null && p.end > p.start)
    .sort((a, b) => a.start - b.start || a.sortOrder - b.sortOrder)
  const classes = [...(detail.classes || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  if (!slots.length || !classes.length) return null
  return { slots, classes, cells: detail.slots || [] }
}

function resolveLiveState(model, date) {
  const { slots } = model
  const { minutes } = getPakistanClock(date)
  const dayStart = slots[0].start
  const dayEnd = slots[slots.length - 1].end

  if (minutes < dayStart) return { phase: 'before', next: slots[0], dayStart, dayEnd }
  if (minutes >= dayEnd) return { phase: 'after', dayStart, dayEnd }

  const index = slots.findIndex((s) => minutes >= s.start && minutes < s.end)
  if (index < 0) {
    const next = slots.find((s) => s.start > minutes) || null
    return { phase: 'between', next, dayStart, dayEnd }
  }
  const slot = slots[index]
  return {
    phase: slot.isBreak ? 'break' : 'period',
    slot,
    next: slots[index + 1] || null,
    progress: (minutes - slot.start) / (slot.end - slot.start),
    minutesLeft: Math.max(1, Math.ceil(slot.end - minutes)),
    dayStart,
    dayEnd,
  }
}

function buildChips(model, periodNumber, today) {
  const forPeriod = model.cells.filter((c) => c.periodNumber === periodNumber)
  return model.classes.map((cls) => {
    const mine = forPeriod.filter((c) => c.sectionID === cls.sectionID)
    const todays = mine.filter((c) => c.dayOfWeek === today)
    const entries = (todays.length ? todays : mine.filter((c) => !c.dayOfWeek))
      .sort((a, b) => (a.lineIndex ?? 0) - (b.lineIndex ?? 0))
      .map((c) => ({
        subject: c.subjectShortName?.trim() || c.subjectName,
        teacher: c.employeeName,
      }))
    return { key: cls.sectionID, name: cls.className, entries }
  })
}

function ClassChip({ name, entries }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1 ring-1 ring-slate-100">
      <span className="text-xs font-semibold text-slate-700">{name}</span>
      <span className="h-3 w-px bg-slate-200" />
      {entries.length ? (
        entries.map((e, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {i > 0 ? <span className="text-slate-300">/</span> : null}
            <span className="text-xs font-medium text-indigo-700">{e.subject}</span>
            <span className="text-[11px] text-slate-400">{e.teacher}</span>
          </span>
        ))
      ) : (
        <span className="text-[11px] italic text-slate-400">Free period</span>
      )}
    </span>
  )
}

function packPages(widths, available) {
  const pages = []
  let current = []
  let used = 0
  widths.forEach((w, i) => {
    const needed = current.length ? used + CHIP_GAP + w : w
    if (current.length && needed > available) {
      pages.push(current)
      current = [i]
      used = w
    } else {
      current.push(i)
      used = needed
    }
  })
  if (current.length) pages.push(current)
  return pages
}

function FadingChipPager({ chips }) {
  const containerRef = useRef(null)
  const measureRef = useRef(null)
  const [pages, setPages] = useState([])
  const [page, setPage] = useState(0)
  const [visible, setVisible] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [playing, setPlaying] = useState(true)
  const paused = hovered || !playing

  useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return undefined
    const recompute = () => {
      const widths = Array.from(measure.children).map((el) => el.getBoundingClientRect().width)
      setPages(packPages(widths, container.clientWidth - PAGER_PADDING))
    }
    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(container)
    return () => observer.disconnect()
  }, [chips])

  useEffect(() => {
    if (pages.length < 2 || paused) return undefined
    let swapTimer
    const cycle = window.setInterval(() => {
      setVisible(false)
      swapTimer = window.setTimeout(() => {
        setPage((p) => (p + 1) % pages.length)
        setVisible(true)
      }, FADE_MS)
    }, PAGE_MS + FADE_MS)
    return () => {
      window.clearInterval(cycle)
      window.clearTimeout(swapTimer)
      setVisible(true)
    }
  }, [pages.length, paused])

  const activePage = pages.length ? page % pages.length : 0
  const shown = pages[activePage] || []

  return (
    <div
      ref={containerRef}
      className="relative h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex w-max gap-2">
        {chips.map((chip) => (
          <ClassChip key={chip.key} name={chip.name} entries={chip.entries} />
        ))}
      </div>
      <div
        className={`flex h-full items-center gap-2 px-2 transition-opacity ease-in-out motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
        {shown.map((i) => (
          <ClassChip key={chips[i].key} name={chips[i].name} entries={chips[i].entries} />
        ))}
      </div>
      {pages.length > 1 ? (
        <div className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
            title={playing ? 'Pause' : 'Play'}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
          </button>
          <div className="flex items-center gap-1">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Show page ${i + 1}`}
                className={`h-1 rounded-full transition-all duration-300 ${i === activePage ? 'w-3 bg-indigo-400' : 'w-1 bg-slate-200 hover:bg-slate-300'}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function LiveTimetableTicker() {
  const [detail, setDetail] = useState(null)
  const [now, setNow] = useState(() => new Date())

  const load = useCallback(async () => {
    try {
      setDetail(await getLiveTimetable())
    } catch {
      setDetail(null)
    }
  }, [])

  useEffect(() => {
    void load()
    const tick = window.setInterval(() => setNow(new Date()), TICK_MS)
    const reload = window.setInterval(() => void load(), RELOAD_MS)
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setNow(new Date())
      void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(tick)
      window.clearInterval(reload)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const model = useMemo(() => buildModel(detail), [detail])
  const live = useMemo(() => (model ? resolveLiveState(model, now) : null), [model, now])
  const currentPeriod = live?.phase === 'period' ? live.slot.periodNumber : null
  const weekday = getPakistanClock(now).isoWeekday
  const chips = useMemo(
    () => (model && currentPeriod != null ? buildChips(model, currentPeriod, weekday) : []),
    [model, currentPeriod, weekday],
  )

  if (!model || !live) return null

  const { phase, slot } = live
  const isBreak = phase === 'break'
  const isLive = phase === 'period' || isBreak
  const accent = isBreak
    ? { pill: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', bar: 'bg-amber-400' }
    : { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', bar: 'bg-indigo-500' }

  return (
    <section className="mb-4 flex items-stretch overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="relative flex shrink-0 items-center gap-3 border-r border-slate-100 px-3 py-2">
        {isLive ? (
          <>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${accent.pill}`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${accent.dot}`} />
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${accent.dot}`} />
              </span>
              Now
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                {isBreak ? <Coffee size={14} className="text-amber-500" /> : null}
                {slot.label}
              </div>
              <div className="text-[11px] tabular-nums text-slate-500">
                {formatTime(slot.start)} – {formatTime(slot.end)} · {live.minutesLeft} min left
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-100">
              <div className={`h-full ${accent.bar} transition-[width] duration-700`} style={{ width: `${Math.round(live.progress * 100)}%` }} />
            </div>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {phase === 'between' ? 'Next' : 'Off'}
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                {phase === 'between' ? <Timer size={14} className="text-slate-400" /> : <Moon size={14} className="text-slate-400" />}
                {phase === 'before' ? 'Before school' : phase === 'after' ? 'School day over' : 'Changing periods'}
              </div>
              <div className="text-[11px] tabular-nums text-slate-500">
                {formatTime(live.dayStart)} – {formatTime(live.dayEnd)}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        {phase === 'before' || phase === 'between' ? (
          <div className="flex h-full items-center px-3 text-xs text-slate-500">
            {live.next ? `${live.next.label} starts at ${formatTime(live.next.start)}.` : 'No classes right now.'}
          </div>
        ) : phase === 'after' ? (
          <div className="flex h-full items-center px-3 text-xs text-slate-500">
            All classes have finished for today.
          </div>
        ) : isBreak ? (
          <div className="flex h-full items-center px-3 text-xs text-amber-700">
            All classes are on break.
            {live.next ? <span className="ml-1 text-slate-500">{live.next.label} starts at {formatTime(live.next.start)}.</span> : null}
          </div>
        ) : (
          <FadingChipPager chips={chips} />
        )}
      </div>

      {phase === 'period' ? (
        <div className="hidden shrink-0 items-center border-l border-slate-100 px-3 text-[11px] text-slate-500 md:flex">
          {live.next ? (
            <>
              Next:&nbsp;<span className="font-medium text-slate-700">{live.next.label}</span>&nbsp;at {formatTime(live.next.start)}
            </>
          ) : (
            <>
              <span className="font-medium text-slate-700">Last period</span>&nbsp;· day ends at {formatTime(live.dayEnd)}
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
