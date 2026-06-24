import { useRef, useEffect, useCallback, lazy, Suspense, forwardRef, useImperativeHandle } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Element, Text } from 'hast'
import 'highlight.js/styles/atom-one-dark.css'

const MermaidBlock = lazy(() =>
  import('./MermaidBlock').then((m) => ({ default: m.MermaidBlock })),
)

export interface PreviewHandle {
  getHTML: () => string
}

interface Props {
  content: string
  onScroll: (ratio: number) => void
  scrollTo: number | null
  isDark: boolean
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

export const Preview = forwardRef<PreviewHandle, Props>(function Preview(
  { content, onScroll, scrollTo, isDark },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const proseRef = useRef<HTMLDivElement>(null)
  const isScrollingFromSync = useRef(false)

  useImperativeHandle(ref, () => ({
    getHTML: () => proseRef.current?.innerHTML ?? '',
  }))

  useEffect(() => {
    if (scrollTo === null || !scrollRef.current) return
    const el = scrollRef.current
    const maxScroll = el.scrollHeight - el.clientHeight
    if (maxScroll <= 0) return
    isScrollingFromSync.current = true
    el.scrollTop = scrollTo * maxScroll
    requestAnimationFrame(() => { isScrollingFromSync.current = false })
  }, [scrollTo])

  const handleScroll = useCallback(() => {
    if (isScrollingFromSync.current || !scrollRef.current) return
    const el = scrollRef.current
    const maxScroll = el.scrollHeight - el.clientHeight
    if (maxScroll <= 0) return
    onScroll(el.scrollTop / maxScroll)
  }, [onScroll])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 border-b border-gray-200 uppercase tracking-wide shrink-0 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-700">
        Preview
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto dark:bg-slate-800"
        onScroll={handleScroll}
      >
        <div
          ref={proseRef}
          className={[
            'prose max-w-none p-5 prose-img:rounded-lg prose-a:text-blue-600 prose-blockquote:border-l-blue-400 prose-blockquote:text-gray-600',
            isDark ? 'prose-invert prose-a:text-blue-400 prose-blockquote:text-slate-400' : '',
          ].join(' ')}
        >
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
})
