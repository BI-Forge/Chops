const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function isFocusable(el: HTMLElement): boolean {
  if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('disabled')) return false
  return el.getClientRects().length > 0
}

/** Collect focusable elements for modal trapping (nested TimeSelect gets its own trap). */
export function getDialogFocusableElements(dialogEl: HTMLElement): HTMLElement[] {
  const openTimeSelect = document.querySelector<HTMLElement>('[data-time-select-dropdown]')
  if (openTimeSelect) {
    return collectFocusable(openTimeSelect)
  }
  return collectFocusable(dialogEl)
}

function collectFocusable(root: HTMLElement): HTMLElement[] {
  const focusable: HTMLElement[] = []
  for (const el of root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) {
    if (isFocusable(el)) focusable.push(el)
  }
  return focusable
}

/** Keep Tab / Shift+Tab cycling within the provided focusable list. */
export function trapTabKey(focusable: HTMLElement[], event: KeyboardEvent): void {
  if (event.key !== 'Tab' || focusable.length === 0) return
  const active = document.activeElement as HTMLElement | null
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey) {
    if (active === first || (active && !focusable.includes(active))) {
      event.preventDefault()
      last.focus()
    }
  } else if (active === last || (active && !focusable.includes(active))) {
    event.preventDefault()
    first.focus()
  }
}

export function isInsideTimeSelectDropdown(target: Node): boolean {
  return target instanceof Element && !!target.closest('[data-time-select-dropdown]')
}

export function isTimeSelectDropdownOpen(): boolean {
  return document.querySelector('[data-time-select-dropdown]') !== null
}
