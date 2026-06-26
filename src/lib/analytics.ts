declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type GtagEvent =
  | { name: 'share_link_copy' }
  | { name: 'shared_link_visit' }
  | { name: 'export_file'; type: 'md' | 'html' | 'pdf' }
  | { name: 'layout_change'; mode: 'split' | 'editor' | 'preview' }
  | { name: 'dark_mode_toggle'; enabled: boolean }

export function trackEvent(event: GtagEvent) {
  if (typeof window.gtag !== 'function') return
  const { name, ...params } = event
  window.gtag('event', name, params)
}
