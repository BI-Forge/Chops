let controller = new AbortController()

export function pageSignal(): AbortSignal {
  return controller.signal
}

// Abort in-flight requests from the previous route and start a new scope.
export function beginPageScope(): void {
  controller.abort()
  controller = new AbortController()
}
