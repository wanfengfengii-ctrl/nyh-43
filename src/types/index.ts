export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Position, Size {}

export type PageSide = 'left' | 'right' | 'single'

export type FishTailPosition = 'top' | 'bottom' | 'both'

export type FishTailStyle = 'single' | 'double' | 'black' | 'white'

export interface FishTailConfig {
  position: FishTailPosition
  style: FishTailStyle
  width: number
  height: number
  lineWidth: number
}

export interface ColumnConfig {
  count: number
  lineWidth: number
  spacing: number
  color: string
}

export interface BorderConfig {
  lineWidth: number
  color: string
}

export interface PageMargins {
  top: number
  bottom: number
  left: number
  right: number
}

export interface PageTemplate {
  id: string
  code: string
  name: string
  description: string
  pageSize: Size
  margins: PageMargins
  border: BorderConfig
  column: ColumnConfig
  fishTail: FishTailConfig
  centerLine: {
    enabled: boolean
    lineWidth: number
    color: string
  }
  createdAt: number
  updatedAt: number
}

export interface GuideLine {
  id: string
  type: 'horizontal' | 'vertical'
  position: number
}

export interface RulerConfig {
  enabled: boolean
  unit: 'mm' | 'px' | 'cun'
  showTicks: boolean
}

export interface CanvasState {
  scale: number
  offsetX: number
  offsetY: number
  showRuler: boolean
  showGuides: boolean
  guides: GuideLine[]
  ruler: RulerConfig
  selectedElement: string | null
}

export interface PerTemplateCanvasState {
  scale: number
  offsetX: number
  offsetY: number
  guides: GuideLine[]
  selectedElement: string | null
  showRuler: boolean
  showGuides: boolean
}

export type TemplateCanvasStates = Record<string, PerTemplateCanvasState>

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'json' | 'pdf'
  includeBothPages: boolean
  dpi: number
}

export type ViolationType =
  | 'margin_overflow'
  | 'column_conflict'
  | 'fishtail_occlusion'
  | 'binding_conflict'

export interface ViolationRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ViolationItem {
  id: string
  type: ViolationType
  severity: 'error' | 'warning'
  message: string
  pageId: string
  rect: ViolationRect
}

export type PageElementType = 'text' | 'image' | 'comment' | 'seal'

export interface PageElement {
  id: string
  type: PageElementType
  x: number
  y: number
  width: number
  height: number
  content: string
  rotation?: number
  zIndex?: number
}

export interface BookPage {
  id: string
  chapterId: string
  pageNumber: number
  pageSide: PageSide
  templateId: string
  elements: PageElement[]
  violations: ViolationItem[]
  content: string
  collationMatches: CollationMatch[]
}

export interface Chapter {
  id: string
  bookId: string
  title: string
  order: number
  startPageNumber: number
  pageCount: number
  templateId: string
  pages: BookPage[]
}

export interface Book {
  id: string
  title: string
  author: string
  description: string
  totalPages: number
  createdAt: number
  updatedAt: number
  chapters: Chapter[]
  defaultTemplateId: string | null
}

export interface TemplateVersion {
  id: string
  templateId: string
  version: number
  snapshot: PageTemplate
  note: string
  createdAt: number
  author: string
}

export interface TemplateDiff {
  field: string
  oldValue: unknown
  newValue: unknown
  path: string
}

export interface BatchExportConfig {
  format: 'pdf' | 'png'
  dpi: number
  range: 'all' | 'current' | 'custom'
  currentChapterId?: string
  customRange?: string
  includeViolations: boolean
  watermark?: string
  filename: string
}

export interface ImportManuscriptConfig {
  content: string
  source: 'text' | 'file'
  filename?: string
  encoding?: string
  autoPaginate: boolean
  charactersPerPage: number
  startChapter: string
}

export interface PaginationResult {
  pages: Array<{
    content: string
    pageSide: PageSide
    chapterTitle?: string
  }>
  totalPages: number
  estimatedChars: number
}

export type CollationRuleType = 'variant' | 'borrowed' | 'taboo'

export interface CollationRule {
  id: string
  type: CollationRuleType
  originalChar: string
  standardChar: string
  source: string
  description: string
  confidence: number
  isBuiltIn: boolean
  createdAt: number
  createdBy: string
}

export interface CollationMatch {
  id: string
  ruleId: string
  type: CollationRuleType
  originalChar: string
  standardChar: string
  position: number
  pageId: string
  chapterId: string
  source: string
  description: string
  confidence: number
  status: 'pending' | 'confirmed' | 'ignored' | 'custom'
  rect?: ViolationRect
  charIndex?: number
}

export interface CollationHistory {
  id: string
  bookId: string
  bookTitle: string
  startTime: number
  endTime: number
  totalMatches: number
  confirmedCount: number
  ignoredCount: number
  customCount: number
  chapterIds: string[]
  chapters: Array<{ id: string; title: string }>
  operator: string
}

export interface CollationReportConfig {
  bookId: string
  includeConfirmed: boolean
  includeIgnored: boolean
  includePending: boolean
  format: 'txt' | 'json' | 'csv'
  filename: string
}

export interface BookPageCollation {
  pageId: string
  matches: CollationMatch[]
}
