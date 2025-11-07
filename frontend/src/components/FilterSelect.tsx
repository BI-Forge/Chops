import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDownIcon } from './Icons'
import '../styles/FilterSelect.css'

export interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string
  options: FilterSelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel?: string
  emptyPlaceholder?: string
  id?: string
}

const FilterSelect = ({ value, options, onChange, disabled = false, ariaLabel, emptyPlaceholder, id }: FilterSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value])
  const displayLabel = selectedOption?.label ?? emptyPlaceholder ?? 'Select option'

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        listRef.current &&
        !listRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !buttonRef.current) {
      return
    }

    const { bottom, left, width, height } = buttonRef.current.getBoundingClientRect()
    const dropdownHeight = listRef.current?.getBoundingClientRect().height ?? 0
    const viewportHeight = window.innerHeight

    let top = bottom + 8
    if (top + dropdownHeight > viewportHeight) {
      top = bottom - dropdownHeight - height - 8
    }

    setMenuPosition({
      top,
      left,
      width,
    })
  }, [isOpen])

  const toggleOpen = () => {
    if (disabled) {
      return
    }
    setIsOpen((prev) => !prev)
  }

  const handleSelect = (nextValue: string) => {
    if (nextValue === value) {
      setIsOpen(false)
      return
    }
    onChange(nextValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`filter-select ${disabled ? 'filter-select--disabled' : ''}`}>
      <button
        type="button"
        ref={buttonRef}
        className="filter-select__button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        id={id}
      >
        <span className="filter-select__label">{displayLabel}</span>
        <span className={`filter-select__chevron ${isOpen ? 'filter-select__chevron--open' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen && options.length > 0 && menuPosition && (
        <div
          ref={listRef}
          className="filter-select__menu"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, minWidth: `${menuPosition.width}px` }}
        >
          <div className="filter-select__menu-content" role="listbox">
            {options.map((option) => {
              const isSelected = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`filter-select__option ${isSelected ? 'filter-select__option--selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="filter-select__option-label">{option.label}</span>
                  {isSelected && (
                    <span className="filter-select__option-check" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M4 8L6.5 10.5L12 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default FilterSelect

