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
}

const modes: { mode: LayoutMode; label: string; title: string }[] = [
  { mode: 'editor', label: 'Editor', title: 'Editor only' },
  { mode: 'split', label: 'Split', title: 'Split view' },
  { mode: 'preview', label: 'Preview', title: 'Preview only' },
]

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
}: Props) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 shrink-0 gap-2">
      <span className="text-sm font-semibold text-gray-700 shrink-0 hidden sm:block">
        Markdown Preview Online
      </span>
      <span className="text-sm font-semibold text-gray-700 shrink-0 sm:hidden">MPO</span>

      <div className="flex items-center gap-2 ml-auto">
        {showMobileToggle && (
          <button
            className="md:hidden text-xs font-medium px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
            onClick={onMobilePanelToggle}
            aria-label={mobilePanel === 'editor' ? 'Switch to preview panel' : 'Switch to editor panel'}
          >
            {mobilePanel === 'editor' ? 'Show Preview' : 'Show Editor'}
          </button>
        )}

        <button
          onClick={onShare}
          title="Share via URL"
          aria-label="Share current tab via URL"
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
            shareCopied
              ? 'border-green-300 text-green-600 bg-green-50'
              : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
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

        <button
          title={syncScroll ? 'Disable sync scroll' : 'Enable sync scroll'}
          aria-label={syncScroll ? 'Disable sync scroll' : 'Enable sync scroll'}
          aria-pressed={syncScroll}
          onClick={onSyncScrollToggle}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
            syncScroll
              ? 'border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100'
              : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 4l3-3 3 3" />
            <path d="M10 8l-3 3-3-3" />
            <line x1="5" y1="1" x2="5" y2="11" />
            <line x1="7" y1="1" x2="7" y2="11" />
          </svg>
          Sync
        </button>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {modes.map(({ mode, label, title }) => (
            <button
              key={mode}
              title={title}
              aria-label={title}
              aria-current={layoutMode === mode ? 'true' : undefined}
              onClick={() => onLayoutChange(mode)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                layoutMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
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
