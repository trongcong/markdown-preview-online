import { useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Element, Text } from 'hast'
import 'highlight.js/styles/atom-one-dark.css'

// Lazy-load MermaidBlock so the heavy mermaid bundle is only fetched when a
// diagram is first encountered, not on initial page load.
const MermaidBlock = lazy(() =>
  import('./MermaidBlock').then((m) => ({ default: m.MermaidBlock })),
)

interface Props {
  content: string
  onScroll: (ratio: number) => void
  scrollTo: number | null
}

type PreProps = React.HTMLAttributes<HTMLPreElement> & { node?: Element }

function getMermaidCode(node: Element | undefined): string | null {
  if (!node) return null
  const codeEl = node.children.find(
    (c): c is Element => c.type === 'element' && c.tagName === 'code',
  )
  if (!codeEl) return null
  const classes = Array.isArray(codeEl.properties?.className)
    ? (codeEl.properties.className as string[])
    : []
  if (!classes.some((c) => c === 'language-mermaid')) return null
  const textNode = codeEl.children.find((c): c is Text => c.type === 'text')
  return textNode ? textNode.value : ''
}

const markdownComponents = {
  pre({ node, children, ...props }: PreProps) {
    const mermaidCode = getMermaidCode(node)
    if (mermaidCode !== null) return (
      <Suspense fallback={<div className="my-2 rounded border border-gray-100 p-3 text-sm text-gray-400">Loading diagram…</div>}>
        <MermaidBlock code={mermaidCode} />
      </Suspense>
    )
    return <pre {...props}>{children}</pre>
  },
}

export function Preview({ content, onScroll, scrollTo }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isScrollingFromSync = useRef(false)

  useEffect(() => {
    if (scrollTo === null || !ref.current) return
    const el = ref.current
    const maxScroll = el.scrollHeight - el.clientHeight
    if (maxScroll <= 0) return
    isScrollingFromSync.current = true
    el.scrollTop = scrollTo * maxScroll
    requestAnimationFrame(() => { isScrollingFromSync.current = false })
  }, [scrollTo])

  const handleScroll = useCallback(() => {
    if (isScrollingFromSync.current || !ref.current) return
    const el = ref.current
    const maxScroll = el.scrollHeight - el.clientHeight
    if (maxScroll <= 0) return
    onScroll(el.scrollTop / maxScroll)
  }, [onScroll])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 border-b border-gray-200 uppercase tracking-wide shrink-0">
        Preview
      </div>
      <div ref={ref} className="flex-1 overflow-auto" onScroll={handleScroll}>
        <div className="prose max-w-none p-5 prose-img:rounded-lg prose-a:text-blue-600 prose-blockquote:border-l-blue-400 prose-blockquote:text-gray-600">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
