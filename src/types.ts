export interface Tab {
  id: string
  title: string
  content: string
  autoTitle?: boolean  // true = title follows first H1; false = manually set
}

export type LayoutMode = 'split' | 'editor' | 'preview'
