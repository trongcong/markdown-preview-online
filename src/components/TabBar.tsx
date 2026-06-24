import { useState, useRef, useEffect } from 'react'
import type { Tab } from '../types'

interface Props {
  tabs: Tab[]
  activeTabId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onClose: (id: string) => void
  onRename: (id: string, title: string) => void
}

export function TabBar({ tabs, activeTabId, onSelect, onAdd, onClose, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  function startEdit(tab: Tab) {
    setEditingId(tab.id)
    setEditValue(tab.title)
  }

  function commitEdit() {
    if (editingId) {
      const trimmed = editValue.trim()
      if (trimmed) onRename(editingId, trimmed)
      setEditingId(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingId(null)
  }

  return (
    <div className="flex items-center border-b border-gray-200 bg-gray-50 overflow-x-auto dark:bg-slate-900 dark:border-slate-700">
      <div role="tablist" aria-label="Document tabs" className="flex min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const isEditing = editingId === tab.id

          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.title}
              tabIndex={isActive ? 0 : -1}
              className={`group flex items-center gap-1 px-3 py-2 border-r border-gray-200 dark:border-slate-700 cursor-pointer min-w-0 shrink-0 select-none ${
                isActive
                  ? 'bg-white text-gray-900 border-b-2 border-b-blue-500 -mb-px dark:bg-slate-800 dark:text-slate-100'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
              onClick={() => !isEditing && onSelect(tab.id)}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  className="w-24 text-sm outline-none border border-blue-400 rounded px-1 bg-white dark:bg-slate-700 dark:text-slate-100"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="text-sm truncate max-w-32"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    startEdit(tab)
                  }}
                  title={tab.title}
                >
                  {tab.title}
                </span>
              )}
              {tabs.length > 1 && (
                <button
                  className="ml-1 w-4 h-4 flex items-center justify-center rounded text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 transition-opacity shrink-0 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose(tab.id)
                  }}
                  title={`Close ${tab.title}`}
                  aria-label={`Close ${tab.title}`}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button
        className="px-3 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0 text-lg leading-none dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
        onClick={onAdd}
        title="New tab"
        aria-label="New tab"
      >
        +
      </button>
    </div>
  )
}
