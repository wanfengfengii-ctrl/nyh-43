import type { Book, Chapter, BookPage, PageTemplate, BatchExportConfig } from '@/types'
import { downloadJSON } from './validation'
import { jsPDF } from 'jspdf'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function parsePageRange(rangeStr: string): number[] {
  const result: number[] = []
  const parts = rangeStr.split(/[,，]/)
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.includes('-') || trimmed.includes('—')) {
      const [startStr, endStr] = trimmed.split(/[-—]/)
      const start = parseInt(startStr.trim(), 10)
      const end = parseInt(endStr.trim(), 10)
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          result.push(i)
        }
      }
    } else {
      const num = parseInt(trimmed, 10)
      if (!isNaN(num)) {
        result.push(num)
      }
    }
  }
  return [...new Set(result)].sort((a, b) => a - b)
}

function collectPages(book: Book, config: BatchExportConfig): BookPage[] {
  const allPages = book.chapters.flatMap(c => c.pages)
  let globalPageNum = 1
  const pagesWithGlobalNum: Array<{ page: BookPage; globalNum: number }> = []
  for (const chapter of book.chapters) {
    for (const page of chapter.pages) {
      pagesWithGlobalNum.push({ page, globalNum: globalPageNum++ })
    }
  }

  if (config.range === 'all') {
    return allPages
  } else if (config.range === 'current') {
    const chapter = book.chapters.find(c => c.id === config.currentChapterId)
    if (chapter) return chapter.pages
    if (allPages.length === 0) return []
    return [allPages[0]]
  } else if (config.range === 'custom' && config.customRange) {
    const nums = parsePageRange(config.customRange)
    return pagesWithGlobalNum
      .filter(p => nums.includes(p.globalNum))
      .map(p => p.page)
  }
  return allPages
}

function renderPageToSvg(page: BookPage, template: PageTemplate, scale: number = 1): string {
  const w = template.pageSize.width * scale
  const h = template.pageSize.height * scale
  const tsx = template.margins.left * scale
  const tsy = template.margins.top * scale
  const tsw = (template.pageSize.width - template.margins.left - template.margins.right) * scale
  const tsh = (template.pageSize.height - template.margins.top - template.margins.bottom) * scale

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  svg += `<rect x="0" y="0" width="${w}" height="${h}" fill="#f5f0e6"/>`
  svg += `<rect x="${tsx}" y="${tsy}" width="${tsw}" height="${tsh}" fill="#faf6ed"/>`
  svg += `<rect x="${tsx}" y="${tsy}" width="${tsw}" height="${tsh}" fill="none" stroke="${template.border.color}" stroke-width="${template.border.lineWidth * scale}"/>`

  if (template.centerLine.enabled) {
    const cx = tsx + tsw / 2
    svg += `<line x1="${cx}" y1="${tsy}" x2="${cx}" y2="${tsy + tsh}" stroke="${template.centerLine.color}" stroke-width="${template.centerLine.lineWidth * scale}"/>`
  }

  if (template.column.count > 1) {
    const count = template.column.count
    const spacing = template.column.spacing * scale
    const totalSpacing = (count - 1) * spacing
    const contentWidth = tsw - totalSpacing
    const columnWidth = contentWidth / count
    for (let i = 1; i < count; i++) {
      const lx = tsx + i * columnWidth + (i - 1) * spacing + spacing / 2
      svg += `<line x1="${lx}" y1="${tsy}" x2="${lx}" y2="${tsy + tsh}" stroke="${template.column.color}" stroke-width="${template.column.lineWidth * scale}"/>`
    }
  }

  if (page.violations && page.violations.length > 0) {
    for (const v of page.violations) {
      const color = v.severity === 'error' ? 'rgba(255,77,79,0.3)' : 'rgba(250,173,20,0.3)'
      const borderColor = v.severity === 'error' ? '#ff4d4f' : '#faad14'
      svg += `<rect x="${v.rect.x * scale}" y="${v.rect.y * scale}" width="${v.rect.width * scale}" height="${v.rect.height * scale}" fill="${color}" stroke="${borderColor}" stroke-width="2" stroke-dasharray="4,4"/>`
    }
  }

  svg += '</svg>'
  return svg
}

function svgToCanvas(svgStr: string, width: number, height: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG'))
    }
    img.src = url
  })
}

export async function exportPagesAsPng(
  pages: BookPage[],
  templates: Record<string, PageTemplate>,
  config: BatchExportConfig
): Promise<void> {
  const scale = config.dpi / 96
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const template = templates[page.templateId]
    if (!template) continue
    const w = template.pageSize.width * scale
    const h = template.pageSize.height * scale
    const svg = renderPageToSvg(page, template, scale)
    try {
      const canvas = await svgToCanvas(svg, w, h)
      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const filename = `${config.filename}_page_${String(i + 1).padStart(4, '0')}.png`
            triggerDownload(blob, filename)
          }
          resolve()
        }, 'image/png')
      })
    } catch (e) {
      console.error('PNG export failed for page', i, e)
    }
  }
}

export function exportPagesAsJson(
  book: Book,
  config: BatchExportConfig
): void {
  const pages = collectPages(book, config)
  const data = {
    book: { title: book.title, author: book.author, description: book.description },
    exportTime: new Date().toISOString(),
    pages: pages.map(p => ({
      pageNumber: p.pageNumber,
      pageSide: p.pageSide,
      content: p.content,
      elements: p.elements,
      violations: p.violations
    }))
  }
  downloadJSON(data, `${config.filename}.json`)
}

export async function exportBook(
  book: Book,
  templates: Record<string, PageTemplate>,
  config: BatchExportConfig
): Promise<void> {
  const pages = collectPages(book, config)
  if (pages.length === 0) {
    throw new Error('没有可导出的页面')
  }
  if (config.format === 'png') {
    await exportPagesAsPng(pages, templates, config)
  } else if (config.format === 'pdf') {
    await exportPagesAsPdf(pages, templates, config)
  }
}

async function exportPagesAsPdf(
  pages: BookPage[],
  templates: Record<string, PageTemplate>,
  config: BatchExportConfig
): Promise<void> {
  const scale = config.dpi / 96
  const firstTemplate = templates[pages[0].templateId]
  if (!firstTemplate) {
    throw new Error('未找到页面对应的版式')
  }

  const pageW = firstTemplate.pageSize.width * scale
  const pageH = firstTemplate.pageSize.height * scale
  const pdf = new jsPDF({
    unit: 'px',
    format: [pageW, pageH],
    orientation: pageW > pageH ? 'landscape' : 'portrait'
  })

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const template = templates[page.templateId]
    if (!template) continue

    const w = template.pageSize.width * scale
    const h = template.pageSize.height * scale
    const svg = renderPageToSvg(page, template, scale)
    const canvas = await svgToCanvas(svg, w, h)
    const dataUrl = canvas.toDataURL('image/png')

    if (i > 0) {
      const curW = template.pageSize.width * scale
      const curH = template.pageSize.height * scale
      pdf.addPage([curW, curH], curW > curH ? 'landscape' : 'portrait')
    }

    pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)

    if (config.watermark && config.watermark.trim()) {
      pdf.setFontSize(12)
      pdf.setTextColor(180, 180, 180)
      pdf.text(config.watermark, w / 2, h - 20, { align: 'center' })
    }
  }

  pdf.save(`${config.filename}.pdf`)
}

export function parsePageRangeForUI(rangeStr: string): { valid: boolean; pages: number[]; message: string } {
  if (!rangeStr || rangeStr.trim() === '') {
    return { valid: false, pages: [], message: '页码范围不能为空' }
  }
  const pages = parsePageRange(rangeStr)
  if (pages.length === 0) {
    return { valid: false, pages: [], message: '未解析到有效页码' }
  }
  return { valid: true, pages, message: `共 ${pages.length} 页` }
}
