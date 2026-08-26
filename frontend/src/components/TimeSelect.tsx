import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Clock } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface TimeSelectProps {
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function parseTime(value: string): { hour: string; minute: string } {
  const [hour = '00', minute = '00'] = value.split(':')
  return {
    hour: HOURS.includes(hour) ? hour : '00',
    minute: MINUTES.includes(minute.substring(0, 2)) ? minute.substring(0, 2) : '00',
  }
}

export function TimeSelect({ value, onChange, ariaLabel, open, onOpenChange }: TimeSelectProps) {
  const { theme } = useTheme()
  const light = theme === 'light'
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next)
    else setInternalOpen(next)
  }
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, openAbove: false })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)
  const { hour, minute } = parseTime(value)

  const updatePosition = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const panelHeight = 220
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const openAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow
    setPosition({
      top: openAbove ? Math.max(8, rect.top - panelHeight - 4) : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 180) - 8)),
      width: rect.width,
      openAbove,
    })
  }

  useEffect(() => {
    if (!isOpen) return
    const scrollSelected = (container: HTMLDivElement | null, selected: string) => {
      const el = container?.querySelector(`[data-value="${selected}"]`)
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: 'center' })
      }
    }
    scrollSelected(hourListRef.current, hour)
    scrollSelected(minuteListRef.current, minute)
  }, [isOpen, hour, minute])

  useEffect(() => {
    if (!isOpen) return
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    const onScrollOrResize = () => updatePosition()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        buttonRef.current?.focus()
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
  }, [isOpen])

  const pickHour = (h: string) => {
    onChange(`${h}:${minute}`)
  }

  const pickMinute = (m: string) => {
    onChange(`${hour}:${m}`)
  }

  const setNow = () => {
    const now = new Date()
    onChange(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    setOpen(false)
  }

  const handleToggle = (e: MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) updatePosition()
    setOpen(!isOpen)
  }

  const itemClass = (selected: boolean) =>
    `w-full px-2 py-1.5 text-center text-sm rounded-md transition-colors ${
      selected
        ? light
          ? 'bg-amber-500/15 text-amber-700 font-medium'
          : 'bg-yellow-500/15 text-yellow-400 font-medium'
        : light
          ? 'text-gray-700 hover:bg-amber-50'
          : 'text-gray-300 hover:bg-gray-700/50'
    }`

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel || 'Select time'}
        aria-expanded={isOpen}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all duration-200 ${
          isOpen
            ? light
              ? 'border-amber-500/50 bg-amber-50 shadow-sm'
              : 'border-yellow-500/50 bg-gray-700/30 shadow-lg shadow-yellow-500/5'
            : light
              ? 'border-gray-300 bg-white text-gray-800 hover:border-amber-500/50'
              : 'border-gray-700/50 bg-gray-800/50 text-white hover:border-yellow-500/30'
        }`}
      >
        <span className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${light ? 'text-amber-600' : 'text-yellow-400'}`} />
          {hour}:{minute}
        </span>
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
            data-time-select-dropdown
            className={`fixed z-[10000] rounded-lg border shadow-xl overflow-hidden backdrop-blur-md ${
              light ? 'bg-white/95 border-amber-500/30' : 'bg-gray-800/95 border-yellow-500/20'
            }`}
            style={{
              top: position.top,
              left: position.left,
              width: Math.max(position.width, 180),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex divide-x ${light ? 'divide-amber-500/20' : 'divide-yellow-500/20'}`}>
              <div className="flex-1 min-w-0">
                <div
                  className={`px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide ${
                    light ? 'text-gray-500 bg-gray-50' : 'text-gray-400 bg-gray-900/40'
                  }`}
                >
                  Hour
                </div>
                <div ref={hourListRef} className="max-h-36 overflow-y-auto custom-scrollbar py-1">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      data-value={h}
                      onClick={() => pickHour(h)}
                      className={itemClass(h === hour)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide ${
                    light ? 'text-gray-500 bg-gray-50' : 'text-gray-400 bg-gray-900/40'
                  }`}
                >
                  Min
                </div>
                <div ref={minuteListRef} className="max-h-36 overflow-y-auto custom-scrollbar py-1">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-value={m}
                      onClick={() => pickMinute(m)}
                      className={itemClass(m === minute)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={`border-t p-2 ${light ? 'border-amber-500/20' : 'border-yellow-500/20'}`}>
              <button
                type="button"
                onClick={setNow}
                className={`w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  light
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-500/30'
                    : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}
              >
                Now
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
