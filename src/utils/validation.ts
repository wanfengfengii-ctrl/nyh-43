import type {
  PageTemplate,
  ValidationResult,
  BookPage,
  PageElement,
  ViolationItem,
  ViolationType,
  PageSide
} from '@/types'

function rectIntersect(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function getTypeSettingRect(template: PageTemplate) {
  return {
    x: template.margins.left,
    y: template.margins.top,
    width: template.pageSize.width - template.margins.left - template.margins.right,
    height: template.pageSize.height - template.margins.top - template.margins.bottom
  }
}

function getColumnLines(template: PageTemplate): number[] {
  if (template.column.count <= 1) return []
  const lines: number[] = []
  const count = template.column.count
  const spacing = template.column.spacing
  const ts = getTypeSettingRect(template)
  const totalSpacing = (count - 1) * spacing
  const contentWidth = ts.width - totalSpacing
  const columnWidth = contentWidth / count
  for (let i = 1; i < count; i++) {
    lines.push(i * columnWidth + (i - 1) * spacing + spacing / 2)
  }
  return lines
}

function getFishTailRect(template: PageTemplate): { top?: { x: number; y: number; w: number; h: number }; bottom?: { x: number; y: number; w: number; h: number } } {
  const ts = getTypeSettingRect(template)
  const result: { top?: { x: number; y: number; w: number; h: number }; bottom?: { x: number; y: number; w: number; h: number } } = {}
  const fw = template.fishTail.width
  const fh = template.fishTail.height
  const fx = ts.width / 2 - fw / 2
  if (template.fishTail.position === 'top' || template.fishTail.position === 'both') {
    result.top = { x: ts.x + fx, y: ts.y + 10, w: fw, h: fh }
  }
  if (template.fishTail.position === 'bottom' || template.fishTail.position === 'both') {
    result.bottom = { x: ts.x + fx, y: ts.y + ts.height - fh - 10, w: fw, h: fh }
  }
  return result
}

function makeViolation(
  type: ViolationType,
  severity: 'error' | 'warning',
  message: string,
  pageId: string,
  x: number, y: number, w: number, h: number
): ViolationItem {
  return {
    id: generateId(),
    type,
    severity,
    message,
    pageId,
    rect: { x, y, width: w, height: h }
  }
}

export function checkMarginOverflow(
  element: PageElement,
  template: PageTemplate,
  pageId: string
): ViolationItem | null {
  const ts = getTypeSettingRect(template)
  const ex = element.x
  const ey = element.y
  const ew = element.width
  const eh = element.height
  if (ex < ts.x || ey < ts.y || ex + ew > ts.x + ts.width || ey + eh > ts.y + ts.height) {
    const overlapX = Math.max(ts.x, Math.min(ex, ts.x + ts.width))
    const overlapY = Math.max(ts.y, Math.min(ey, ts.y + ts.height))
    const overlapW = Math.min(ex + ew, ts.x + ts.width) - overlapX
    const overlapH = Math.min(ey + eh, ts.y + ts.height) - overlapY
    return makeViolation(
      'margin_overflow',
      'error',
      `元素超出版心范围 (${Math.round(ex)}, ${Math.round(ey)})`,
      pageId,
      overlapX > 0 ? overlapX : ex,
      overlapY > 0 ? overlapY : ey,
      overlapW > 0 ? overlapW : ew,
      overlapH > 0 ? overlapH : eh
    )
  }
  return null
}

export function checkColumnConflict(
  element: PageElement,
  template: PageTemplate,
  pageId: string
): ViolationItem | null {
  const lines = getColumnLines(template)
  const ts = getTypeSettingRect(template)
  if (lines.length === 0) return null
  const lineWidth = template.column.lineWidth
  for (const line of lines) {
    const lineX = ts.x + line - lineWidth / 2
    if (rectIntersect(element.x, element.y, element.width, element.height, lineX, ts.y, lineWidth, ts.height)) {
      return makeViolation(
        'column_conflict',
        'warning',
        `元素与栏线位置冲突 (栏线 x=${Math.round(ts.x + line)})`,
        pageId,
        lineX - 2,
        element.y,
        lineWidth + 4,
        element.height
      )
    }
  }
  return null
}

export function checkFishTailOcclusion(
  element: PageElement,
  template: PageTemplate,
  pageId: string
): ViolationItem | null {
  const ft = getFishTailRect(template)
  if (ft.top) {
    if (rectIntersect(element.x, element.y, element.width, element.height, ft.top.x, ft.top.y, ft.top.w, ft.top.h)) {
      return makeViolation(
        'fishtail_occlusion',
        'error',
        '元素与顶部鱼尾位置重叠',
        pageId,
        ft.top.x,
        ft.top.y,
        ft.top.w,
        ft.top.h
      )
    }
  }
  if (ft.bottom) {
    if (rectIntersect(element.x, element.y, element.width, element.height, ft.bottom.x, ft.bottom.y, ft.bottom.w, ft.bottom.h)) {
      return makeViolation(
        'fishtail_occlusion',
        'error',
        '元素与底部鱼尾位置重叠',
        pageId,
        ft.bottom.x,
        ft.bottom.y,
        ft.bottom.w,
        ft.bottom.h
      )
    }
  }
  return null
}

export function checkBindingConflict(
  element: PageElement,
  template: PageTemplate,
  pageSide: PageSide,
  pageId: string
): ViolationItem | null {
  const ts = getTypeSettingRect(template)
  const bindingMargin = 20
  if (pageSide === 'left') {
    const bindingX = ts.x + ts.width - bindingMargin
    if (rectIntersect(element.x, element.y, element.width, element.height, bindingX, ts.y, bindingMargin, ts.height)) {
      return makeViolation(
        'binding_conflict',
        'warning',
        `元素靠近左页装订边 (距右边缘 ${Math.round(ts.x + ts.width - element.x - element.width)}px)`,
        pageId,
        bindingX,
        element.y,
        bindingMargin,
        element.height
      )
    }
  } else if (pageSide === 'right') {
    const bindingX = ts.x
    if (rectIntersect(element.x, element.y, element.width, element.height, bindingX, ts.y, bindingMargin, ts.height)) {
      return makeViolation(
        'binding_conflict',
        'warning',
        `元素靠近右页装订边 (距左边缘 ${Math.round(element.x - ts.x)}px)`,
        pageId,
        bindingX,
        element.y,
        bindingMargin,
        element.height
      )
    }
  }
  return null
}

export function validatePage(page: BookPage, template?: PageTemplate): ViolationItem[] {
  const violations: ViolationItem[] = []
  if (!template) return violations
  for (const element of page.elements) {
    const marginViolation = checkMarginOverflow(element, template, page.id)
    if (marginViolation) violations.push(marginViolation)
    const columnViolation = checkColumnConflict(element, template, page.id)
    if (columnViolation) violations.push(columnViolation)
    const fishTailViolation = checkFishTailOcclusion(element, template, page.id)
    if (fishTailViolation) violations.push(fishTailViolation)
    const bindingViolation = checkBindingConflict(element, template, page.pageSide, page.id)
    if (bindingViolation) violations.push(bindingViolation)
  }
  return violations
}

export function validateTemplate(template: PageTemplate): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!template.code || template.code.trim() === '') {
    errors.push('版式编号不能为空')
  }

  if (!template.name || template.name.trim() === '') {
    errors.push('版式名称不能为空')
  }

  if (template.pageSize.width <= 0 || template.pageSize.height <= 0) {
    errors.push('页面尺寸必须大于 0')
  }

  if (template.margins.top < 0 || template.margins.bottom < 0 ||
      template.margins.left < 0 || template.margins.right < 0) {
    errors.push('页边距不能为负数')
  }

  const typeSettingWidth = template.pageSize.width - template.margins.left - template.margins.right
  const typeSettingHeight = template.pageSize.height - template.margins.top - template.margins.bottom

  if (typeSettingWidth <= 0 || typeSettingHeight <= 0) {
    errors.push('版心区域尺寸无效，页边距过大')
  }

  if (template.column.count < 1) {
    errors.push('栏数必须大于等于 1')
  }

  if (template.column.lineWidth <= 0) {
    errors.push('栏线宽度必须大于 0')
  }

  if (template.border.lineWidth <= 0) {
    errors.push('版框线宽度必须大于 0')
  }

  if (template.fishTail.width <= 0 || template.fishTail.height <= 0) {
    errors.push('鱼尾尺寸必须大于 0')
  }

  if (template.fishTail.lineWidth <= 0) {
    errors.push('鱼尾线宽度必须大于 0')
  }

  if (template.column.count > 1) {
    const totalColumnWidth = template.column.count * template.column.lineWidth +
      (template.column.count - 1) * template.column.spacing
    if (totalColumnWidth > typeSettingWidth) {
      warnings.push('栏线总宽度可能超出可用版心宽度')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function isTemplateComplete(template: PageTemplate): boolean {
  const result = validateTemplate(template)
  return result.valid
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
