import type { PageTemplate, ValidationResult } from '@/types'

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
