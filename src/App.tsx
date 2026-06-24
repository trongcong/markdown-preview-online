import { useState, useCallback, useRef, useEffect } from 'react'
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { LayoutMode } from './types'
import { useTabs } from './hooks/useTabs'
import { useLocalStorage } from './hooks/useLocalStorage'
import { TabBar } from './components/TabBar'
import { Toolbar } from './components/Toolbar'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'

export default function App() {
  const { tabs, activeTab, activeTabId, setActiveTabId, addTab, closeTab, renameTab, updateContent, loadShared } =
    useTabs()

  const [layoutMode, setLayoutMode] = useLocalStorage<LayoutMode>('mpo-layout', 'split')
  const [syncScroll, setSyncScroll] = useLocalStorage<boolean>('mpo-sync', true)
  const [splitPercent, setSplitPercent] = useLocalStorage<number>('mpo-split', 50)
  const [mobilePanel, setMobilePanel] = useState<'editor' | 'preview'>('editor')
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)

  const [shareCopied, setShareCopied] = useState(false)
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [editorScrollTo, setEditorScrollTo] = useState<number | null>(null)
  const [previewScrollTo, setPreviewScrollTo] = useState<number | null>(null)
  const lastScrollSource = useRef<'editor' | 'preview' | null>(null)

  // Cleanup share timer on unmount
  useEffect(() => () => { if (shareTimer.current) clearTimeout(shareTimer.current) }, [])

  // Load shared content from URL hash on first mount
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#share=')) return
    const decoded = decompressFromEncodedURIComponent(hash.slice(7))
    if (decoded) {
      loadShared(decoded)
      history.replaceState(null, '', window.location.pathname)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — run once on mount

  // Track desktop breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  // Reset scroll on tab switch
  useEffect(() => {
    setEditorScrollTo(null)
    setPreviewScrollTo(null)
  }, [activeTabId])

  // Sync scroll handlers
  const handleEditorScroll = useCallback(
    (ratio: number) => {
      if (!syncScroll || lastScrollSource.current === 'preview') return
      lastScrollSource.current = 'editor'
      setPreviewScrollTo(ratio)
      requestAnimationFrame(() => { lastScrollSource.current = null })
    },
    [syncScroll],
  )

  const handlePreviewScroll = useCallback(
    (ratio: number) => {
      if (!syncScroll || lastScrollSource.current === 'editor') return
      lastScrollSource.current = 'preview'
      setEditorScrollTo(ratio)
      requestAnimationFrame(() => { lastScrollSource.current = null })
    },
    [syncScroll],
  )

  // Share current tab content via URL hash
  const handleShare = useCallback(() => {
    const encoded = compressToEncodedURIComponent(activeTab.content)
    const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encoded}`
    history.replaceState(null, '', `#share=${encoded}`)
    navigator.clipboard.writeText(shareUrl).catch(() => {
      // clipboard failed; URL is still updated in the address bar
    })
    setShareCopied(true)
    if (shareTimer.current) clearTimeout(shareTimer.current)
    shareTimer.current = setTimeout(() => setShareCopied(false), 2000)
  }, [activeTab.content])

  // Resize handle
  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      document.body.classList.add('is-resizing')

      const handleMove = (ev: MouseEvent) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const pct = Math.max(15, Math.min(85, ((ev.clientX - rect.left) / rect.width) * 100))
        setSplitPercent(pct)
      }

      const handleUp = () => {
        document.body.classList.remove('is-resizing')
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleUp)
      }

      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleUp)
    },
    [setSplitPercent],
  )

  const showEditor = layoutMode === 'split' || layoutMode === 'editor'
  const showPreview = layoutMode === 'split' || layoutMode === 'preview'

  const editorStyle =
    showPreview && isDesktop ? { width: `${splitPercent}%` } : undefined

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <Toolbar
        layoutMode={layoutMode}
        onLayoutChange={setLayoutMode}
        syncScroll={syncScroll}
        onSyncScrollToggle={() => setSyncScroll((v) => !v)}
        mobilePanel={mobilePanel}
        onMobilePanelToggle={() => setMobilePanel((p) => (p === 'editor' ? 'preview' : 'editor'))}
        showMobileToggle={layoutMode === 'split'}
        onShare={handleShare}
        shareCopied={shareCopied}
      />
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onAdd={addTab}
        onClose={closeTab}
        onRename={renameTab}
      />

      <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden">
        {/* Editor panel */}
        {showEditor && (
          <div
            className={[
              'flex flex-col min-h-0 overflow-hidden shrink-0',
              showPreview
                ? mobilePanel === 'editor'
                  ? 'flex w-full md:w-auto'
                  : 'hidden md:flex'
                : 'flex flex-1',
            ].join(' ')}
            style={editorStyle}
          >
            <Editor
              content={activeTab.content}
              onChange={(val) => updateContent(activeTab.id, val)}
              onScroll={handleEditorScroll}
              scrollTo={syncScroll ? editorScrollTo : null}
            />
          </div>
        )}

        {/* Resize handle — desktop only, split mode only */}
        {showEditor && showPreview && (
          <div
            className="hidden md:flex w-1 shrink-0 bg-gray-200 hover:bg-blue-400 active:bg-blue-500 cursor-col-resize transition-colors"
            onMouseDown={startResize}
          />
        )}

        {/* Preview panel */}
        {showPreview && (
          <div
            className={[
              'flex flex-col min-h-0 overflow-hidden flex-1',
              showEditor
                ? mobilePanel === 'preview'
                  ? 'flex'
                  : 'hidden md:flex'
                : 'flex',
            ].join(' ')}
          >
            <Preview
              content={activeTab.content}
              onScroll={handlePreviewScroll}
              scrollTo={syncScroll ? previewScrollTo : null}
            />
          </div>
        )}
      </div>
    </div>
  )
}
