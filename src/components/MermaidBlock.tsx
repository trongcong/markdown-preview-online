import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

let instanceCount = 0

interface Props {
  code: string
}

function downloadSVG(svg: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: 'diagram.svg' })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadPNG(svgStr: string) {
  const dim = getSVGDimensions(svgStr)
  const scale = 2
  const w = (dim?.w ?? 800) * scale
  const h = (dim?.h ?? 600) * scale

  const responsiveSvgStr = (() => {
    try {
      const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml')
      const el = doc.documentElement
      el.setAttribute('width', String(w))
      el.setAttribute('height', String(h))
      return new XMLSerializer().serializeToString(doc)
    } catch { return svgStr }
  })()

  const blob = new Blob([responsiveSvgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    URL.revokeObjectURL(url)
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return
      const pngUrl = URL.createObjectURL(pngBlob)
      const a = Object.assign(document.createElement('a'), { href: pngUrl, download: 'diagram.png' })
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(pngUrl)
    }, 'image/png')
  }
  img.src = url
}

// Read natural pixel dimensions from mermaid SVG (width/height attrs or viewBox)
function getSVGDimensions(svgStr: string): { w: number; h: number } | null {
  try {
    const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml')
    const el = doc.documentElement
    const w = parseFloat(el.getAttribute('width') ?? '0')
    const h = parseFloat(el.getAttribute('height') ?? '0')
    if (w > 0 && h > 0) return { w, h }
    const vb = (el.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { w: vb[2], h: vb[3] }
    return null
  } catch { return null }
}

// Strip fixed dimensions so the SVG fills its container width (height stays proportional)
function toResponsiveSVG(svgStr: string): string {
  try {
    const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml')
    const el = doc.documentElement
    el.removeAttribute('width')
    el.removeAttribute('height')
    el.setAttribute('style', 'width:100%;height:auto;display:block;')
    return new XMLSerializer().serializeToString(doc)
  } catch {
    return svgStr
  }
}

const DownloadIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M8 2v8" /><path d="M5 7.5L8 11l3-3.5" /><path d="M3 13h10" />
  </svg>
)

const ZoomInIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="6.5" cy="6.5" r="4.5" />
    <line x1="10.2" y1="10.2" x2="14" y2="14" />
    <line x1="4.5" y1="6.5" x2="8.5" y2="6.5" />
    <line x1="6.5" y1="4.5" x2="6.5" y2="8.5" />
  </svg>
)

export function MermaidBlock({ code }: Props) {
  const uid = useRef(`mermaid-${++instanceCount}`)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [zoomed, setZoomed] = useState(false)

  // Zoom + pan state
  const [scale, setScale] = useState(1)
  const [fitScale, setFitScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const scaleRef = useRef(1)
  const offsetRef = useRef({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  // Keep refs in sync for use inside event listeners
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { offsetRef.current = offset }, [offset])

  useEffect(() => {
    let cancelled = false
    const id = `${uid.current}-${Math.random().toString(36).slice(2)}`
    mermaid
      .render(id, code)
      .then(({ svg: rendered }) => {
        if (!cancelled) { setSvg(rendered); setError('') }
      })
      .catch((e: unknown) => {
        if (!cancelled) { setError(e instanceof Error ? e.message : 'Render error'); setSvg('') }
      })
    return () => { cancelled = true }
  }, [code])

  // Fit diagram inside canvas on open (useLayoutEffect → clientWidth is ready)
  useLayoutEffect(() => {
    if (!zoomed) return
    setOffset({ x: 0, y: 0 })
    const canvas = canvasRef.current
    const dim = getSVGDimensions(svg)
    if (!canvas || !dim || dim.w <= 0 || dim.h <= 0) { setScale(1); return }
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    if (cw <= 0 || ch <= 0) { setScale(1); return }
    // At scale=1 the SVG fills the canvas width; compute its height at that scale
    const svgHeightAtFull = cw * (dim.h / dim.w)
    // Scale down only if the SVG is taller than the canvas (with a little padding)
    const fit = Math.max(0.05, Math.min(1, (ch - 32) / svgHeightAtFull))
    setFitScale(fit)
    setScale(fit)
  }, [zoomed, svg])

  // Keyboard: Escape to close
  useEffect(() => {
    if (!zoomed) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoomed(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [zoomed])

  // Mouse-wheel: zoom toward cursor (non-passive so we can preventDefault)
  useEffect(() => {
    const el = canvasRef.current
    if (!el || !zoomed) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      // Cursor position relative to canvas center (= transform origin)
      const mx = e.clientX - rect.left - rect.width / 2
      const my = e.clientY - rect.top - rect.height / 2
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const newScale = Math.max(0.05, Math.min(10, scaleRef.current * factor))
      const ratio = newScale / scaleRef.current
      setScale(newScale)
      setOffset({
        x: mx - (mx - offsetRef.current.x) * ratio,
        y: my - (my - offsetRef.current.y) * ratio,
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomed])

  // Drag to pan — document-level so release outside canvas still works
  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    isDragging.current = true
    setDragging(true)
    dragStart.current = {
      x: e.clientX, y: e.clientY,
      ox: offsetRef.current.x, oy: offsetRef.current.y,
    }
    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return
      setOffset({
        x: dragStart.current.ox + ev.clientX - dragStart.current.x,
        y: dragStart.current.oy + ev.clientY - dragStart.current.y,
      })
    }
    function onUp() {
      isDragging.current = false
      setDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function zoomBy(factor: number) {
    setScale((s) => Math.max(0.05, Math.min(10, s * factor)))
  }
  function fitToCanvas() { setScale(fitScale); setOffset({ x: 0, y: 0 }) }
  function resetZoom() { setScale(1); setOffset({ x: 0, y: 0 }) }

  function handleDoubleClick(e: React.MouseEvent) {
    const el = canvasRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left - rect.width / 2
    const my = e.clientY - rect.top - rect.height / 2
    const factor = e.shiftKey ? 1 / 2 : 2
    const newScale = Math.max(0.05, Math.min(10, scaleRef.current * factor))
    const ratio = newScale / scaleRef.current
    setScale(newScale)
    setOffset({
      x: mx - (mx - offsetRef.current.x) * ratio,
      y: my - (my - offsetRef.current.y) * ratio,
    })
  }

  // Responsive SVG: strips fixed pixel dimensions so SVG fills its container
  const responsiveSvg = useMemo(() => (svg ? toResponsiveSVG(svg) : ''), [svg])

  const handleDownload = useCallback(() => downloadSVG(svg), [svg])
  const handleDownloadPNG = useCallback(() => downloadPNG(svg), [svg])

  if (error) {
    return (
      <div className="my-2 rounded border border-red-200 bg-red-50 p-3 font-mono text-sm text-red-600">
        {error}
      </div>
    )
  }
  if (!svg) {
    return (
      <div className="my-2 rounded border border-gray-100 p-3 text-sm text-gray-400">
        Rendering diagram…
      </div>
    )
  }

  return (
    <>
      {/* Inline diagram */}
      <div className="group relative my-3">
        <div
          className="flex justify-center overflow-x-auto rounded-lg border border-gray-100 bg-gray-50/50 p-4"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="absolute right-2 top-2 flex gap-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
          <button
            onClick={() => setZoomed(true)}
            className="flex items-center gap-1 rounded border border-gray-200 bg-white/95 px-2 py-1 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
            title="Open zoom view"
          >
            <ZoomInIcon />
            Zoom
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded border border-gray-200 bg-white/95 px-2 py-1 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
            title="Download SVG"
          >
            <DownloadIcon />
            SVG
          </button>
        </div>
      </div>

      {/* Zoom modal */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <div
            className="relative flex flex-col rounded-xl bg-white shadow-2xl"
            style={{ width: 'min(98vw, 1600px)', height: 'min(92vh, 900px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <span className="text-sm font-medium text-gray-600">Diagram</span>

              {/* Zoom controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => zoomBy(1 / 1.25)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 text-base leading-none"
                  title="Zoom out"
                >
                  −
                </button>
                <span className="w-14 text-center text-xs tabular-nums text-gray-500 select-none">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => zoomBy(1.25)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 text-base leading-none"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  onClick={fitToCanvas}
                  className="ml-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                  title="Fit to canvas"
                >
                  Fit
                </button>
                <button
                  onClick={resetZoom}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                  title="100% width"
                >
                  100%
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <DownloadIcon />
                  SVG
                </button>
                <button
                  onClick={handleDownloadPNG}
                  className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <DownloadIcon />
                  PNG
                </button>
                <button
                  onClick={() => setZoomed(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Close (Esc)"
                >
                  ×
                </button>
              </div>
            </div>

            {/*
              Canvas: relative so the absolute fill-layer is anchored here.
              The fill-layer (inset-0, flex center) positions the transform div
              such that its center == canvas center, making transform-origin:center
              mathematically equivalent to canvas center — needed for zoom-to-cursor.
            */}
            <div
              ref={canvasRef}
              className={`relative flex-1 overflow-hidden select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleMouseDown}
              onDoubleClick={handleDoubleClick}
            >
              <div
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                {/* transform div fills full width; SVG inside is responsive → fills 100% */}
                <div
                  style={{
                    width: '100%',
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: dragging ? 'none' : 'transform 0.08s ease-out',
                  }}
                  dangerouslySetInnerHTML={{ __html: responsiveSvg }}
                />
              </div>
            </div>

            {/* Footer hint */}
            <div className="shrink-0 border-t border-gray-100 px-4 py-1.5 text-center text-[11px] text-gray-400 select-none">
              Scroll to zoom · Double-click to zoom in · Shift+double-click to zoom out · Drag to pan
            </div>
          </div>
        </div>
      )}
    </>
  )
}
