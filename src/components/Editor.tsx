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
  fontSize: number
  isDark: boolean
}

export function Editor({ content, onChange, onScroll, scrollTo, fontSize, isDark }: Props) {
  const editorViewRef = useRef<EditorView | null>(null)
  const isScrollingFromSync = useRef(false)
  const onScrollRef = useRef(onScroll)
  useEffect(() => { onScrollRef.current = onScroll }, [onScroll])

  useEffect(() => {
    if (scrollTo === null || !editorViewRef.current) return
    const el = editorViewRef.current.scrollDOM
    const max = el.scrollHeight - el.clientHeight
    if (max <= 0) return
    isScrollingFromSync.current = true
    el.scrollTop = scrollTo * max
    requestAnimationFrame(() => { isScrollingFromSync.current = false })
  }, [scrollTo])

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

  // ── Editor theme (dark/light + font size) ────────────────────
  const editorTheme = useMemo(() => EditorView.theme({
    '&': {
      height: '100%',
      fontSize: `${fontSize}px`,
      background: isDark ? '#0f172a' : '#ffffff',
      color: isDark ? '#cbd5e1' : '#1e293b',
    },
    '.cm-scroller': {
      fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
      lineHeight: '1.65',
      overflow: 'auto',
    },
    '.cm-content': {
      padding: '12px 0',
      caretColor: isDark ? '#60a5fa' : '#2563eb',
      color: isDark ? '#cbd5e1' : '#1e293b',
    },
    '.cm-line': { padding: '0 16px' },
    '.cm-gutters': {
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      color: isDark ? '#475569' : '#94a3b8',
      border: 'none',
      borderRight: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
      userSelect: 'none',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 10px 0 6px',
      minWidth: '2.5rem',
      textAlign: 'right',
      fontSize: '12px',
    },
    '.cm-activeLineGutter': { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#94a3b8' : '#475569' },
    '.cm-activeLine': { backgroundColor: isDark ? 'rgba(30,41,59,0.6)' : '#f8fafc' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: isDark ? '#60a5fa' : '#2563eb' },
    '.cm-searchMatch': { backgroundColor: isDark ? '#713f12' : '#fef08a', outline: '1px solid #ca8a04' },
    '.cm-searchMatch-selected': { backgroundColor: isDark ? '#d97706' : '#f59e0b' },
  }, { dark: isDark }), [fontSize, isDark])

  // ── Markdown syntax colours ───────────────────────────────────
  const mdHighlight = useMemo(() => syntaxHighlighting(
    HighlightStyle.define([
      { tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], fontWeight: '700', color: isDark ? '#f1f5f9' : '#0f172a' },
      { tag: t.strong, fontWeight: '700' },
      { tag: t.emphasis, fontStyle: 'italic' },
      { tag: t.strikethrough, textDecoration: 'line-through', color: isDark ? '#64748b' : '#94a3b8' },
      { tag: t.link, color: isDark ? '#60a5fa' : '#2563eb', textDecoration: 'underline' },
      { tag: t.url, color: isDark ? '#475569' : '#64748b' },
      { tag: t.monospace, color: isDark ? '#f9a8d4' : '#9d174d', backgroundColor: isDark ? '#2d1b3d' : '#fdf2f8' },
      { tag: t.quote, color: isDark ? '#475569' : '#64748b', fontStyle: 'italic' },
      { tag: t.meta, color: isDark ? '#a78bfa' : '#7c3aed' },
      { tag: t.processingInstruction, color: isDark ? '#a78bfa' : '#7c3aed' },
      { tag: t.list, color: isDark ? '#38bdf8' : '#0369a1' },
      { tag: t.punctuation, color: isDark ? '#475569' : '#94a3b8' },
      { tag: t.labelName, color: isDark ? '#38bdf8' : '#0369a1' },
    ])
  ), [isDark])

  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      mdHighlight,
      scrollExt,
      keymap.of([indentWithTab]),
      EditorView.lineWrapping,
    ],
    [scrollExt, mdHighlight]
  )

  const handleCreate = useCallback((view: EditorView) => {
    editorViewRef.current = view
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden dark:bg-slate-900">
      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 border-b border-gray-200 uppercase tracking-wide shrink-0 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-700">
        Editor
      </div>
      <CodeMirror
        value={content}
        onChange={onChange}
        onCreateEditor={handleCreate}
        extensions={extensions}
        theme={editorTheme}
        height="100%"
        className="flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-editor]:outline-none"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: false,
          history: true,
          foldGutter: false,
          drawSelection: false,
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
          searchKeymap: true,
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
