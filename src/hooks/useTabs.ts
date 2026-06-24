import { useCallback } from 'react'
import type { Tab } from '../types'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEY, DEFAULT_CONTENT } from '../constants'

function createTab(title = 'Untitled', content = ''): Tab {
  return { id: crypto.randomUUID(), title, content }
}

const initialTabs: Tab[] = [createTab('Welcome', DEFAULT_CONTENT)]
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
    const tab = createTab('Untitled')
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

  const renameTab = useCallback(
    (id: string, title: string) => {
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)))
    },
    [setTabs],
  )

  const updateContent = useCallback(
    (id: string, content: string) => {
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)))
    },
    [setTabs],
  )

  const loadShared = useCallback(
    (content: string) => {
      const tab = createTab('Shared', content)
      setState((prev) => ({ tabs: [tab, ...prev.tabs], activeTabId: tab.id }))
    },
    [setState],
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
  }
}
