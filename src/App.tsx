import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { DragEvent } from 'react'
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { LayoutMode } from './types'
import { useTabs } from './hooks/useTabs'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useDarkMode } from './hooks/useDarkMode'
import { TabBar } from './components/TabBar'
import { Toolbar } from './components/Toolbar'
import { Editor } from './components/Editor'
import { Preview, type PreviewHandle } from './components/Preview'

export default function App() {
  const { tabs, activeTab, activeTabId, setActiveTabId, addTab, closeTab, renameTab, updateContent, loadShared, loadFile } =
    useTabs()

  const [layoutMode, setLayoutMode] = useLocalStorage<LayoutMode>('mpo-layout', 'split')
  const [syncScroll, setSyncScroll] = useLocalStorage<boolean>('mpo-sync', true)
  const [splitPercent, setSplitPercent] = useLocalStorage<number>('mpo-split', 50)
  const [fontSize, setFontSize] = useLocalStorage<number>('mpo-font-size', 15)
  const [mobilePanel, setMobilePanel] = useState<'editor' | 'preview'>('editor')
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)

  const [dark, setDark] = useDarkMode()

  const [shareCopied, setShareCopied] = useState(false)
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Drag & drop .md files
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    if (Array.from(e.dataTransfer.items).some((i) => i.kind === 'file')) {
      dragCounter.current++
      setIsDraggingFile(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDraggingFile(false)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDraggingFile(false)
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.type === 'text/markdown' || f.type === 'text/plain'
    )
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result
        if (typeof content === 'string') {
          const title = file.name.replace(/\.(md|markdown)$/i, '')
          loadFile(content, title)
        }
      }
      reader.readAsText(file)
    })
  }, [loadFile])

  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<PreviewHandle>(null)
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
    navigator.clipboard.writeText(shareUrl).catch(() => {})
    setShareCopied(true)
    if (shareTimer.current) clearTimeout(shareTimer.current)
    shareTimer.current = setTimeout(() => setShareCopied(false), 2000)
  }, [activeTab.content])

  // Export .md
  const handleExportMD = useCallback(() => {
    const blob = new Blob([activeTab.content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${activeTab.title.replace(/[^a-z0-9]/gi, '-')}.md`,
    })
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [activeTab.content, activeTab.title])

  // Export PDF via browser print dialog
  const handleExportPDF = useCallback(() => {
    const prev = document.title
    document.title = activeTab.title
    window.print()
    document.title = prev
  }, [activeTab.title])

  // Export .html (uses the rendered preview HTML)
  const handleExportHTML = useCallback(() => {
    const inner = previewRef.current?.getHTML() ?? ''
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${activeTab.title}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.7; color: #1e293b; }
  pre { background: #282c34; color: #abb2bf; padding: 1em 1.25em; border-radius: 0.5rem; overflow-x: auto; }
  code { font-family: ui-monospace, Menlo, monospace; font-size: 0.875em; }
  :not(pre) > code { color: #9d174d; background: #fdf2f8; padding: 0.1em 0.38em; border-radius: 0.25rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e2e8f0; padding: 0.5em 0.75em; }
  th { background: #f8fafc; }
  blockquote { border-left: 4px solid #60a5fa; margin: 0; padding-left: 1em; color: #475569; }
  img { max-width: 100%; }
</style>
</head>
<body>
${inner}
</body>
</html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${activeTab.title.replace(/[^a-z0-9]/gi, '-')}.html`,
    })
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [activeTab.title])

  // Word / char / line counts
  const stats = useMemo(() => {
    const text = activeTab.content
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
    const chars = text.length
    const lines = text === '' ? 0 : text.split('\n').length
    return { words, chars, lines }
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
    <div
      className="flex flex-col h-screen bg-white overflow-hidden dark:bg-slate-800 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag-over overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-500/10 backdrop-blur-[1px] pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-blue-400 bg-white/90 dark:bg-slate-800/90 px-14 py-10 shadow-xl">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <p className="text-base font-semibold text-blue-600 dark:text-blue-400">Drop .md file to open</p>
          </div>
        </div>
      )}
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
        isDark={dark}
        onDarkToggle={() => setDark((d) => !d)}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        onExportMD={handleExportMD}
        onExportHTML={handleExportHTML}
        onExportPDF={handleExportPDF}
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
              fontSize={fontSize}
              isDark={dark}
            />
          </div>
        )}

        {/* Resize handle — desktop only, split mode only */}
        {showEditor && showPreview && (
          <div
            className="hidden md:flex w-1 shrink-0 bg-gray-200 hover:bg-blue-400 active:bg-blue-500 cursor-col-resize transition-colors dark:bg-slate-600 dark:hover:bg-blue-500"
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
              ref={previewRef}
              content={activeTab.content}
              onScroll={handlePreviewScroll}
              scrollTo={syncScroll ? previewScrollTo : null}
              isDark={dark}
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center px-4 py-1 text-[11px] text-gray-400 bg-gray-50 border-t border-gray-200 shrink-0 select-none dark:bg-slate-900 dark:border-slate-700 dark:text-slate-500">
        <span>{stats.words} words</span>
        <span className="mx-2 opacity-40">·</span>
        <span>{stats.chars} chars</span>
        <span className="mx-2 opacity-40">·</span>
        <span>{stats.lines} lines</span>
      </div>
    </div>
  )
}
