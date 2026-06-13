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
  format: 'png' | 'svg' | 'json'
  includeBothPages: boolean
  dpi: number
}
