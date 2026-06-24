import { useRef, useEffect, useCallback, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'

interface Props {
  content: string
  onChange: (value: string) => void
  onScroll: (ratio: number) => void
  scrollTo: number | null
}

// ── Editor theme ───────────────────────────────────────────────
const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '15px' },
  '.cm-scroller': {
    fontFamily:
      'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
    lineHeight: '1.65',
    overflow: 'auto',
  },
  '.cm-content': { padding: '12px 0', caretColor: '#2563eb' },
  '.cm-line': { padding: '0 16px' },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
    border: 'none',
    borderRight: '1px solid #e2e8f0',
    userSelect: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 10px 0 6px',
    minWidth: '2.5rem',
    textAlign: 'right',
    fontSize: '12px',
  },
  '.cm-activeLineGutter': { backgroundColor: '#f1f5f9', color: '#475569' },
  '.cm-activeLine': { backgroundColor: '#f8fafc' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#2563eb' },
  '.cm-selectionBackground': { backgroundColor: '#dbeafe' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#bfdbfe' },
})

// ── Markdown syntax colours ────────────────────────────────────
const mdHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], fontWeight: '700', color: '#0f172a' },
    { tag: t.strong, fontWeight: '700' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through', color: '#94a3b8' },
    { tag: t.link, color: '#2563eb', textDecoration: 'underline' },
    { tag: t.url, color: '#64748b' },
    { tag: t.monospace, color: '#9d174d', backgroundColor: '#fdf2f8' },
    { tag: t.quote, color: '#64748b', fontStyle: 'italic' },
    { tag: t.meta, color: '#7c3aed' },
    { tag: t.processingInstruction, color: '#7c3aed' },
    { tag: t.list, color: '#0369a1' },
    { tag: t.punctuation, color: '#94a3b8' },
    { tag: t.labelName, color: '#0369a1' },
  ])
)

export function Editor({ content, onChange, onScroll, scrollTo }: Props) {
  const editorViewRef = useRef<EditorView | null>(null)
  const isScrollingFromSync = useRef(false)
  const onScrollRef = useRef(onScroll)
  useEffect(() => { onScrollRef.current = onScroll }, [onScroll])

  // Programmatic scroll from sync
  useEffect(() => {
    if (scrollTo === null || !editorViewRef.current) return
    const el = editorViewRef.current.scrollDOM
    const max = el.scrollHeight - el.clientHeight
    if (max <= 0) return
    isScrollingFromSync.current = true
    el.scrollTop = scrollTo * max
    requestAnimationFrame(() => { isScrollingFromSync.current = false })
  }, [scrollTo])

  // Stable scroll-event extension (uses ref to avoid stale closure)
  const scrollExt = useMemo(
    () =>
      EditorView.domEventHandlers({
        scroll(_e, view) {
          if (isScrollingFromSync.current) return false
          const el = view.scrollDOM
          const max = el.scrollHeight - el.clientHeight
          if (max <= 0) return false
          onScrollRef.current(el.scrollTop / max)
          return false
        },
      }),
    []
  )

  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      mdHighlight,
      editorTheme,
      scrollExt,
      keymap.of([indentWithTab]),
      EditorView.lineWrapping,
    ],
    [scrollExt]
  )

  const handleCreate = useCallback((view: EditorView) => {
    editorViewRef.current = view
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 border-b border-gray-200 uppercase tracking-wide shrink-0">
        Editor
      </div>
      <CodeMirror
        value={content}
        onChange={onChange}
        onCreateEditor={handleCreate}
        extensions={extensions}
        height="100%"
        className="flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-editor]:outline-none"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: false,
          history: true,
          foldGutter: false,
          drawSelection: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: false,
          syntaxHighlighting: false,
          bracketMatching: false,
          closeBrackets: false,
          autocompletion: false,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: false,
          closeBracketsKeymap: false,
          defaultKeymap: true,
          searchKeymap: false,
          historyKeymap: true,
          foldKeymap: false,
          completionKeymap: false,
          lintKeymap: false,
          tabSize: 2,
        }}
      />
    </div>
  )
}
