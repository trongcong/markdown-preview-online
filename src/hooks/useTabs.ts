import { useCallback } from 'react'
import type { Tab } from '../types'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEY, DEFAULT_CONTENT, NEW_TAB_CONTENT } from '../constants'

function extractH1(content: string): string | null {
  const match = content.match(/^#{1,6}\s+(.+)/m)
  return match ? match[1].trim() : null
}

function createTab(title = 'Untitled', content = '', autoTitle = false): Tab {
  return { id: crypto.randomUUID(), title, content, autoTitle }
}

const initialTabs: Tab[] = [createTab('Welcome', DEFAULT_CONTENT, false)]
const initialActiveId = initialTabs[0].id

interface StoredState {
  tabs: Tab[]
  activeTabId: string
}

export function useTabs() {
  const [state, setState] = useLocalStorage<StoredState>(STORAGE_KEY, {
    tabs: initialTabs,
    activeTabId: initialActiveId,
  })

  const { tabs, activeTabId } = state
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]

  const setTabs = useCallback(
    (updater: (prev: Tab[]) => Tab[]) => {
      setState((prev) => ({ ...prev, tabs: updater(prev.tabs) }))
    },
    [setState],
  )

  const setActiveTabId = useCallback(
    (id: string) => {
      setState((prev) => ({ ...prev, activeTabId: id }))
    },
    [setState],
  )

  const addTab = useCallback(() => {
    const tab = createTab('Untitled', NEW_TAB_CONTENT, true)
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
  }, [setTabs, setActiveTabId])

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length === 1) return prev
        const next = prev.filter((t) => t.id !== id)
        if (id === activeTabId) {
          const idx = prev.findIndex((t) => t.id === id)
          const fallback = next[Math.min(idx, next.length - 1)]
          setActiveTabId(fallback.id)
        }
        return next
      })
    },
    [activeTabId, setTabs, setActiveTabId],
  )

  // Manual rename locks autoTitle off so we stop following H1
  const renameTab = useCallback(
    (id: string, title: string) => {
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title, autoTitle: false } : t)))
    },
    [setTabs],
  )

  // Auto-sync title to first H1 when autoTitle is true
  const updateContent = useCallback(
    (id: string, content: string) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t
          if (!t.autoTitle) return { ...t, content }
          const h1 = extractH1(content)
          return { ...t, content, title: h1 ?? 'Untitled' }
        }),
      )
    },
    [setTabs],
  )

  // Shared/file tabs keep their own names (autoTitle: false)
  const loadShared = useCallback(
    (content: string) => {
      const h1 = extractH1(content)
      const title = h1 ? `Share: ${h1}` : 'Shared'
      const tab = createTab(title, content, false)
      setState((prev) => ({ tabs: [tab, ...prev.tabs], activeTabId: tab.id }))
    },
    [setState],
  )

  const loadFile = useCallback(
    (content: string, title: string) => {
      const tab = createTab(title, content, false)
      setState((prev) => ({ tabs: [...prev.tabs, tab], activeTabId: tab.id }))
    },
    [setState],
  )

  const reorderTabs = useCallback(
    (fromId: string, toId: string) => {
      setTabs((prev) => {
        const from = prev.findIndex((t) => t.id === fromId)
        const to = prev.findIndex((t) => t.id === toId)
        if (from === -1 || to === -1 || from === to) return prev
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      })
    },
    [setTabs],
  )

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    renameTab,
    updateContent,
    loadShared,
    loadFile,
    reorderTabs,
  }
}
