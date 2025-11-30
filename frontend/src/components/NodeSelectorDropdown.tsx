import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, NodeIcon } from './Icons'

interface NodeSelectorDropdownProps {
  nodes: string[]
  selectedNode: string
  onSelectNode: (node: string) => void
}

const NodeSelectorDropdown = ({ nodes, selectedNode, onSelectNode }: NodeSelectorDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !buttonRef.current || !dropdownRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const dropdownRect = dropdownRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    let top = buttonRect.bottom + 8
    let left = buttonRect.left

    // Adjust if dropdown goes off screen
    if (top + dropdownRect.height > viewportHeight) {
      top = buttonRect.top - dropdownRect.height - 8
    }
    if (left + dropdownRect.width > window.innerWidth) {
      left = window.innerWidth - dropdownRect.width - 16
    }
    if (left < 16) {
      left = 16
    }

    dropdownRef.current.style.top = `${top}px`
    dropdownRef.current.style.left = `${left}px`
  }, [isOpen])

  return (
    <div className="node-selector-dropdown">
      <button
        ref={buttonRef}
        className="node-selector-dropdown__button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="node-selector-dropdown__icon">
          <NodeIcon width={16} height={16} />
        </span>
        <span className="node-selector-dropdown__text">{selectedNode}</span>
        <span className={`node-selector-dropdown__arrow ${isOpen ? 'node-selector-dropdown__arrow--open' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>
      {isOpen && (
        <div ref={dropdownRef} className="node-selector-dropdown__menu">
          <div className="node-selector-dropdown__header">
            <span className="node-selector-dropdown__header-text">Select Node</span>
          </div>
          <div className="node-selector-dropdown__divider"></div>
          {nodes.map((node) => (
            <button
              key={node}
              className={`node-selector-dropdown__item ${selectedNode === node ? 'node-selector-dropdown__item--selected' : ''}`}
              onClick={() => {
                onSelectNode(node)
                setIsOpen(false)
              }}
            >
              <span className="node-selector-dropdown__item-icon">
                <NodeIcon width={16} height={16} />
              </span>
              <span className="node-selector-dropdown__item-text">{node}</span>
              {selectedNode === node && (
                <span className="node-selector-dropdown__item-check">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 8L6 10L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default NodeSelectorDropdown

