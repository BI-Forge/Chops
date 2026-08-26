import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { TimeSelect } from './TimeSelect'
import {
  getDialogFocusableElements,
  isInsideTimeSelectDropdown,
  isTimeSelectDropdownOpen,
  trapTabKey,
} from '../utils/focusTrap'
import {
  formatTimeRangeLabel,
  PERIOD_CONFIGURATIONS,
  validateAbsoluteRange,
  type TimeRangeValue,
} from '../utils/metricStep'

export type { TimeRangeValue }

interface TimeRangePickerProps {
  value: TimeRangeValue
  onChange: (value: TimeRangeValue) => void
  validateRange?: (from: string, to: string) => string | null
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const DIALOG_ID = 'time-range-picker-dialog'
const DIALOG_TITLE_ID = 'time-range-picker-title'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toLocalDateTime(d: Date, time: string): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${time}`
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function parseLocalParts(val: string): { date?: Date; time: string } {
  if (!val) return { time: '00:00' }
  const [datePart, timePart = '00:00'] = val.split(/[T ]/)
  const [y, m, d] = datePart.split('-').map(Number)
  if (!y || !m || !d) return { time: timePart.substring(0, 5) }
  return {
    date: new Date(y, m - 1, d),
    time: timePart.substring(0, 5),
  }
}

export function TimeRangePicker({ value, onChange, validateRange }: TimeRangePickerProps) {
  const { theme } = useTheme()
  const light = theme === 'light'
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 560, maxHeight: 480 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef(false)

  const initialFrom = value.kind === 'absolute' ? parseLocalParts(value.from) : { time: '00:00' }
  const initialTo = value.kind === 'absolute' ? parseLocalParts(value.to) : { time: '23:59' }

  const [rangeFrom, setRangeFrom] = useState<Date | null>(initialFrom.date ?? null)
  const [rangeTo, setRangeTo] = useState<Date | null>(initialTo.date ?? null)
  const [timeFrom, setTimeFrom] = useState(initialFrom.time)
  const [timeTo, setTimeTo] = useState(initialTo.time)
  const [rangeError, setRangeError] = useState('')
  const [openTimeField, setOpenTimeField] = useState<'from' | 'to' | null>(null)
  const [viewDate, setViewDate] = useState(() => startOfDay(initialFrom.date || new Date()))

  useEffect(() => {
    if (!isOpen) return
    if (value.kind === 'absolute') {
      const f = parseLocalParts(value.from)
      const t = parseLocalParts(value.to)
      setRangeFrom(f.date ?? null)
      setRangeTo(t.date ?? null)
      setTimeFrom(f.time)
      setTimeTo(t.time)
      if (f.date) setViewDate(startOfDay(f.date))
    } else {
      setRangeFrom(null)
      setRangeTo(null)
      setTimeFrom('00:00')
      setTimeTo('23:59')
      setViewDate(startOfDay(new Date()))
    }
    setRangeError('')
  }, [isOpen, value])

  const updatePosition = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const width = Math.min(560, window.innerWidth - 16)
    const estimatedHeight = 440
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - 8)
    const spaceAbove = Math.max(0, rect.top - 8)
    const openBelow = spaceBelow >= Math.min(estimatedHeight, 280) || spaceBelow >= spaceAbove
    const available = openBelow ? spaceBelow : spaceAbove
    const maxHeight = Math.min(estimatedHeight, available > 0 ? available : window.innerHeight - 16)
    const top = openBelow
      ? rect.bottom + 4
      : Math.max(8, rect.top - maxHeight - 4)
    setPosition({
      top,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      maxHeight,
    })
  }

  const closeDialog = useCallback(() => {
    restoreFocusRef.current = true
    setOpenTimeField(null)
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (isOpen || !restoreFocusRef.current) return
    restoreFocusRef.current = false
    buttonRef.current?.focus()
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen) updatePosition()
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return
    const focusable = getDialogFocusableElements(dropdownRef.current)
    const first = focusable[0]
    if (first) first.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const root = document.getElementById('root')
    const prevInert = root?.inert ?? false
    if (root) root.inert = true
    return () => {
      if (root) root.inert = prevInert
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (isInsideTimeSelectDropdown(target)) return
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        closeDialog()
      }
    }
    const onScrollOrResize = () => updatePosition()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isTimeSelectDropdownOpen()) return
        event.preventDefault()
        closeDialog()
        return
      }
      if (event.key === 'Tab' && dropdownRef.current) {
        trapTabKey(getDialogFocusableElements(dropdownRef.current), event)
      }
    }
    document.addEventListener('click', onOutside)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('click', onOutside)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [isOpen, closeDialog])

  const selectRelative = (period: string) => {
    onChange({ kind: 'relative', period })
    closeDialog()
  }

  const handleDayClick = (day: number) => {
    const clicked = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    if (!rangeFrom || (rangeFrom && rangeTo)) {
      setRangeFrom(clicked)
      setRangeTo(null)
      setRangeError('')
      return
    }
    if (clicked < rangeFrom) {
      setRangeTo(rangeFrom)
      setRangeFrom(clicked)
    } else {
      setRangeTo(clicked)
    }
    setRangeError('')
  }

  const applyAbsolute = () => {
    if (!rangeFrom || !rangeTo) {
      setRangeError('Select start and end dates')
      return
    }
    const from = toLocalDateTime(rangeFrom, timeFrom || '00:00')
    const to = toLocalDateTime(rangeTo, timeTo || '23:59')
    const validationError = (validateRange ?? validateAbsoluteRange)(from, to)
    if (validationError) {
      setRangeError(validationError)
      return
    }
    setRangeError('')
    onChange({ kind: 'absolute', from, to })
    closeDialog()
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startingDayOfWeek = new Date(year, month, 1).getDay()
  const today = startOfDay(new Date())

  const inRange = (day: number) => {
    if (!rangeFrom || !rangeTo) return false
    const d = new Date(year, month, day)
    return d > rangeFrom && d < rangeTo
  }

  const isRangeEdge = (day: number, edge: Date | null) => {
    if (!edge) return false
    return sameDay(new Date(year, month, day), edge)
  }

  const presetEntries = Object.entries(PERIOD_CONFIGURATIONS)
  const stack = position.width < 520

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Time range"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={DIALOG_ID}
        onClick={handleToggle}
        className={`min-w-[260px] max-w-[420px] flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all duration-200 ${
          isOpen
            ? light
              ? 'border-amber-500/50 bg-amber-50 shadow-sm'
              : 'border-yellow-500/50 bg-gray-700/30 shadow-lg shadow-yellow-500/5'
            : light
              ? 'border-gray-300 bg-white hover:border-amber-500/50'
              : 'border-gray-700/50 bg-gray-800/50 hover:border-yellow-500/30'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className={`w-4 h-4 flex-shrink-0 ${light ? 'text-amber-600' : 'text-yellow-400'}`} />
          <span className={`truncate ${light ? 'text-gray-800' : 'text-white'}`}>
            {formatTimeRangeLabel(value)}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} ${
            light ? 'text-gray-700' : 'text-gray-500'
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            id={DIALOG_ID}
            role="dialog"
            aria-modal="true"
            aria-labelledby={DIALOG_TITLE_ID}
            className={`fixed z-[9999] rounded-xl border backdrop-blur-md shadow-xl overflow-hidden ${
              light ? 'bg-white/95 border-amber-500/30' : 'bg-gray-800/95 border-yellow-500/20'
            }`}
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p id={DIALOG_TITLE_ID} className="sr-only">
              Select time range
            </p>
            <div
              className={`flex h-full overflow-y-auto custom-scrollbar ${stack ? 'flex-col' : 'flex-row'}`}
              style={{ maxHeight: position.maxHeight }}
            >
              <div
                className={`flex-shrink-0 ${stack ? 'w-full border-b' : 'w-44 border-r'} ${
                  light ? 'border-amber-500/20' : 'border-yellow-500/20'
                }`}
              >
                <div className={`px-3 py-2 text-xs font-medium sticky top-0 ${light ? 'bg-white/95 text-gray-500' : 'bg-gray-800/95 text-gray-400'}`}>
                  Relative
                </div>
                <div className={stack ? 'flex flex-wrap gap-1 px-2 pb-2' : ''}>
                  {presetEntries.map(([period, config]) => {
                    const selected = value.kind === 'relative' && value.period === period
                    return (
                      <button
                        key={period}
                        type="button"
                        onClick={() => selectRelative(period)}
                        className={`${stack ? 'px-2.5 py-1.5 rounded-lg text-xs' : 'w-full px-3 py-2 text-left text-sm border-l-2'} transition-colors ${
                          selected
                            ? light
                              ? stack
                                ? 'bg-amber-500/15 text-amber-700'
                                : 'bg-amber-500/10 text-amber-700 border-l-amber-500'
                              : stack
                                ? 'bg-yellow-500/15 text-yellow-400'
                                : 'bg-yellow-500/10 text-yellow-400 border-l-yellow-500'
                            : light
                              ? stack
                                ? 'text-gray-700 hover:bg-amber-50'
                                : 'text-gray-800 hover:bg-amber-50 border-l-transparent'
                              : stack
                                ? 'text-gray-300 hover:bg-gray-700/50'
                                : 'text-gray-300 hover:bg-gray-700/50 border-l-transparent'
                        }`}
                      >
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 min-w-0 p-3">
                <div className={`mb-2 text-xs font-medium ${light ? 'text-gray-500' : 'text-gray-400'}`}>
                  Absolute range
                </div>

                <div className={`flex items-center justify-between mb-2 ${light ? 'text-gray-800' : 'text-white'}`}>
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setViewDate(new Date(year, month - 1, 1))}
                    className={`p-1.5 rounded-lg ${
                      light ? 'hover:bg-amber-100 text-gray-700' : 'hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium">
                    {MONTH_NAMES[month]} {year}
                  </span>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => setViewDate(new Date(year, month + 1, 1))}
                    className={`p-1.5 rounded-lg ${
                      light ? 'hover:bg-amber-100 text-gray-700' : 'hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAY_NAMES.map((d) => (
                    <div
                      key={d}
                      className={`text-center text-[11px] py-1 ${light ? 'text-gray-500' : 'text-gray-500'}`}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`e-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dayDate = new Date(year, month, day)
                    const isToday = sameDay(dayDate, today)
                    const isStart = isRangeEdge(day, rangeFrom)
                    const isEnd = isRangeEdge(day, rangeTo)
                    const middle = inRange(day)
                    const selected = isStart || isEnd

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDayClick(day)
                        }}
                        className={`aspect-square rounded-lg text-sm transition-colors ${
                          selected
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                            : middle
                              ? light
                                ? 'bg-amber-100 text-amber-900 rounded-none'
                                : 'bg-yellow-500/20 text-yellow-200 rounded-none'
                              : isToday
                                ? light
                                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-400'
                                  : 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/50'
                                : light
                                  ? 'text-gray-700 hover:bg-amber-50'
                                  : 'text-gray-300 hover:bg-gray-700/50'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className={`flex items-center gap-1 text-xs mb-1 ${light ? 'text-gray-600' : 'text-gray-400'}`}>
                      <Clock className="w-3 h-3" /> Start
                    </label>
                    <TimeSelect
                      value={timeFrom}
                      onChange={setTimeFrom}
                      ariaLabel="Start time"
                      open={openTimeField === 'from'}
                      onOpenChange={(next) => setOpenTimeField(next ? 'from' : null)}
                    />
                  </div>
                  <div>
                    <label className={`flex items-center gap-1 text-xs mb-1 ${light ? 'text-gray-600' : 'text-gray-400'}`}>
                      <Clock className="w-3 h-3" /> End
                    </label>
                    <TimeSelect
                      value={timeTo}
                      onChange={setTimeTo}
                      ariaLabel="End time"
                      open={openTimeField === 'to'}
                      onOpenChange={(next) => setOpenTimeField(next ? 'to' : null)}
                    />
                  </div>
                </div>

                {rangeError && (
                  <p role="alert" className={`mt-2 text-xs ${light ? 'text-red-600' : 'text-red-400'}`}>{rangeError}</p>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={applyAbsolute}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      light
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-500/30'
                        : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}
                  >
                    Apply range
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
