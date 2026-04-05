/** Formats an ISO timestamp for display in admin tables. */
export function formatIsoDate(iso: string): string {
  try {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
  } catch {
    return iso
  }
}

/** Derives a short title from a permission code (segment after the first dot). */
export function permissionCodeTitle(code: string): string {
  const parts = code.split('.')
  if (parts.length < 2) return code
  return parts
    .slice(1)
    .join(' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
