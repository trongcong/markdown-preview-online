import { useState, useRef, useEffect } from 'react'
import type { LayoutMode } from '../types'

interface Props {
  layoutMode: LayoutMode
  onLayoutChange: (mode: LayoutMode) => void
  syncScroll: boolean
  onSyncScrollToggle: () => void
  mobilePanel: 'editor' | 'preview'
  onMobilePanelToggle: () => void
  showMobileToggle: boolean
  onShare: () => void
  shareCopied: boolean
  isDark: boolean
  onDarkToggle: () => void
  fontSize: number
  onFontSizeChange: (size: number) => void
  onExportMD: () => void
  onExportHTML: () => void
}

const modes: { mode: LayoutMode; label: string; title: string }[] = [
  { mode: 'editor', label: 'Editor', title: 'Editor only' },
  { mode: 'split', label: 'Split', title: 'Split view' },
  { mode: 'preview', label: 'Preview', title: 'Preview only' },
]

const MIN_FONT = 12
const MAX_FONT = 22

export function Toolbar({
  layoutMode,
  onLayoutChange,
  syncScroll,
  onSyncScrollToggle,
  mobilePanel,
  onMobilePanelToggle,
  showMobileToggle,
  onShare,
  shareCopied,
  isDark,
  onDarkToggle,
  fontSize,
  onFontSizeChange,
  onExportMD,
  onExportHTML,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [exportOpen])

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 shrink-0 gap-2 dark:bg-slate-900 dark:border-slate-700">
      <span className="text-sm font-semibold text-gray-700 shrink-0 hidden sm:block dark:text-slate-200">
        Markdown Preview Online
      </span>
      <span className="text-sm font-semibold text-gray-700 shrink-0 sm:hidden dark:text-slate-200">MPO</span>

      <div className="flex items-center gap-2 ml-auto flex-wrap">
        {showMobileToggle && (
          <button
            className="md:hidden text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            onClick={onMobilePanelToggle}
            aria-label={mobilePanel === 'editor' ? 'Switch to preview panel' : 'Switch to editor panel'}
          >
            {mobilePanel === 'editor' ? 'Show Preview' : 'Show Editor'}
          </button>
        )}

        {/* Font size A- / A+ */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onFontSizeChange(Math.max(MIN_FONT, fontSize - 1))}
            disabled={fontSize <= MIN_FONT}
            title="Decrease font size"
            aria-label="Decrease editor font size"
            className="flex items-center justify-center w-6 h-6 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <span className="text-[11px] font-medium leading-none">A−</span>
          </button>
          <button
            onClick={() => onFontSizeChange(Math.min(MAX_FONT, fontSize + 1))}
            disabled={fontSize >= MAX_FONT}
            title="Increase font size"
            aria-label="Increase editor font size"
            className="flex items-center justify-center w-6 h-6 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <span className="text-[13px] font-medium leading-none">A+</span>
          </button>
        </div>

        {/* Export dropdown */}
        <div ref={exportRef} className="relative">
          <button
            onClick={() => setExportOpen((o) => !o)}
            title="Export file"
            aria-label="Export file"
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gray-200 text-gray-500 bg-white hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M8 2v8" /><path d="M5 7.5L8 11l3-3.5" /><path d="M3 13h10" />
            </svg>
            Export
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1 dark:bg-slate-800 dark:border-slate-600">
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700"
                onClick={() => { onExportMD(); setExportOpen(false) }}
              >
                .md file
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700"
                onClick={() => { onExportHTML(); setExportOpen(false) }}
              >
                .html file
              </button>
            </div>
          )}
        </div>

        {/* Share */}
        <button
          onClick={onShare}
          title="Share via URL"
          aria-label="Share current tab via URL"
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
            shareCopied
              ? 'border-green-300 text-green-600 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-900/30'
              : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="3" r="1.5" />
            <circle cx="12" cy="13" r="1.5" />
            <circle cx="4" cy="8" r="1.5" />
            <line x1="10.6" y1="3.8" x2="5.4" y2="7.2" />
            <line x1="10.6" y1="12.2" x2="5.4" y2="8.8" />
          </svg>
          {shareCopied ? 'Copied!' : 'Share'}
        </button>

        {/* Sync scroll */}
        <button
          title={syncScroll ? 'Disable sync scroll' : 'Enable sync scroll'}
          aria-label={syncScroll ? 'Disable sync scroll' : 'Enable sync scroll'}
          aria-pressed={syncScroll}
          onClick={onSyncScrollToggle}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
            syncScroll
              ? 'border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50'
              : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50 dark:border-slate-600 dark:text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4l3-3 3 3" />
            <path d="M10 8l-3 3-3-3" />
            <line x1="5" y1="1" x2="5" y2="11" />
            <line x1="7" y1="1" x2="7" y2="11" />
          </svg>
          Sync
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={onDarkToggle}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          {isDark ? (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="8" cy="8" r="3" />
              <line x1="8" y1="1" x2="8" y2="2.5" />
              <line x1="8" y1="13.5" x2="8" y2="15" />
              <line x1="1" y1="8" x2="2.5" y2="8" />
              <line x1="13.5" y1="8" x2="15" y2="8" />
              <line x1="3.05" y1="3.05" x2="4.12" y2="4.12" />
              <line x1="11.88" y1="11.88" x2="12.95" y2="12.95" />
              <line x1="12.95" y1="3.05" x2="11.88" y2="4.12" />
              <line x1="4.12" y1="11.88" x2="3.05" y2="12.95" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" />
            </svg>
          )}
        </button>

        {/* Layout mode buttons */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 dark:bg-slate-700">
          {modes.map(({ mode, label, title }) => (
            <button
              key={mode}
              title={title}
              aria-label={title}
              aria-current={layoutMode === mode ? 'true' : undefined}
              onClick={() => onLayoutChange(mode)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                layoutMode === mode
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
