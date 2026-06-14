import type { CollationMatch, CollationRule, CollationRuleType, CollationReportConfig } from '@/types'
import { generateId, downloadJSON } from './validation'

export interface ScanRule {
  ruleId: string
  originalChar: string
  standardChar: string
  type: string
  source: string
  description: string
  confidence: number
}

export function scanTextForCollation(
  text: string,
  pageId: string,
  chapterId: string,
  rules?: ScanRule[]
): CollationMatch[] {
  if (!text || !rules || rules.length === 0) return []
  
  const matches: CollationMatch[] = []
  
  for (const rule of rules) {
    const regex = new RegExp(escapeRegExp(rule.originalChar), 'g')
    let match: RegExpExecArray | null
    
    while ((match = regex.exec(text)) !== null) {
      const collationMatch: CollationMatch = {
        id: generateId(),
        ruleId: rule.ruleId,
        type: rule.type as CollationRuleType,
        originalChar: rule.originalChar,
        standardChar: rule.standardChar,
        position: match.index,
        pageId,
        chapterId,
        source: rule.source,
        description: rule.description,
        confidence: rule.confidence,
        status: 'pending',
        charIndex: match.index
      }
      matches.push(collationMatch)
    }
  }
  
  return matches.sort((a, b) => a.position - b.position)
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function calculateMatchRect(
  charIndex: number,
  text: string,
  template: {
    pageSize: { width: number; height: number }
    margins: { top: number; bottom: number; left: number; right: number }
    column: { count: number; spacing: number }
  },
  fontSize: number = 16,
  lineHeight: number = 24,
  charsPerLine: number = 20
): { x: number; y: number; width: number; height: number } | undefined {
  if (!text || charIndex < 0 || charIndex >= text.length) return undefined
  
  const contentWidth = template.pageSize.width - template.margins.left - template.margins.right
  const contentHeight = template.pageSize.height - template.margins.top - template.margins.bottom
  
  const colCount = Math.max(1, template.column.count)
  const colSpacing = template.column.spacing
  const totalSpacing = (colCount - 1) * colSpacing
  const colWidth = (contentWidth - totalSpacing) / colCount
  
  const actualCharsPerLine = Math.max(1, Math.floor(colWidth / fontSize))
  const linesPerCol = Math.max(1, Math.floor(contentHeight / lineHeight))
  
  const lineIndex = Math.floor(charIndex / actualCharsPerLine)
  const colIndex = Math.floor(lineIndex / linesPerCol)
  const lineInCol = lineIndex % linesPerCol
  const charInLine = charIndex % actualCharsPerLine
  
  const x = template.margins.left + colIndex * (colWidth + colSpacing) + charInLine * fontSize
  const y = template.margins.top + lineInCol * lineHeight
  
  return { x, y, width: fontSize, height: lineHeight }
}

export function getRuleTypeLabel(type: CollationRuleType): string {
  const map: Record<CollationRuleType, string> = {
    variant: '异体字',
    borrowed: '通假字',
    taboo: '避讳字'
  }
  return map[type] || type
}

export function getMatchStatusLabel(status: CollationMatch['status']): string {
  const map: Record<CollationMatch['status'], string> = {
    pending: '待处理',
    confirmed: '已确认',
    ignored: '已忽略',
    custom: '自定义'
  }
  return map[status] || status
}

export function getMatchStatusColor(status: CollationMatch['status']): string {
  const map: Record<CollationMatch['status'], string> = {
    pending: '#faad14',
    confirmed: '#52c41a',
    ignored: '#bfbfbf',
    custom: '#1890ff'
  }
  return map[status] || '#000'
}

export function getRuleTypeColor(type: CollationRuleType): string {
  const map: Record<CollationRuleType, string> = {
    variant: '#722ed1',
    borrowed: '#13c2c2',
    taboo: '#d4380d'
  }
  return map[type] || '#000'
}

export function exportCollationReport(
  matches: CollationMatch[],
  config: CollationReportConfig,
  bookTitle: string,
  chapters: Array<{ id: string; title: string }>
): void {
  const filteredMatches = matches.filter(m => {
    if (m.status === 'confirmed' && !config.includeConfirmed) return false
    if (m.status === 'ignored' && !config.includeIgnored) return false
    if (m.status === 'pending' && !config.includePending) return false
    return true
  })
  
  const chapterMap = new Map(chapters.map(c => [c.id, c.title]))
  
  if (config.format === 'json') {
    const data = {
      bookTitle,
      exportTime: new Date().toISOString(),
      totalMatches: filteredMatches.length,
      matches: filteredMatches.map(m => ({
        id: m.id,
        type: getRuleTypeLabel(m.type),
        originalChar: m.originalChar,
        standardChar: m.standardChar,
        chapter: chapterMap.get(m.chapterId) || '未知章节',
        pageId: m.pageId,
        position: m.position,
        source: m.source,
        description: m.description,
        confidence: m.confidence,
        status: getMatchStatusLabel(m.status)
      }))
    }
    downloadJSON(data, `${config.filename}.json`)
  } else if (config.format === 'csv') {
    const header = ['ID', '类型', '原字', '规范字', '章节', '页面ID', '位置', '出处', '说明', '置信度', '状态']
    const rows = filteredMatches.map(m => [
      m.id,
      getRuleTypeLabel(m.type),
      m.originalChar,
      m.standardChar,
      chapterMap.get(m.chapterId) || '未知章节',
      m.pageId,
      m.position,
      m.source,
      m.description,
      m.confidence,
      getMatchStatusLabel(m.status)
    ])
    
    const csvContent = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
    triggerDownload(blob, `${config.filename}.csv`)
  } else {
    let txtContent = `古籍校勘报告\n`
    txtContent += `书籍：${bookTitle}\n`
    txtContent += `导出时间：${new Date().toLocaleString()}\n`
    txtContent += `校勘结果：共 ${filteredMatches.length} 项\n`
    txtContent += '='.repeat(60) + '\n\n'
    
    for (let i = 0; i < filteredMatches.length; i++) {
      const m = filteredMatches[i]
      txtContent += `第 ${i + 1} 项\n`
      txtContent += `- 类型：${getRuleTypeLabel(m.type)}\n`
      txtContent += `- 原字：${m.originalChar}\n`
      txtContent += `- 建议规范字：${m.standardChar}\n`
      txtContent += `- 章节：${chapterMap.get(m.chapterId) || '未知章节'}\n`
      txtContent += `- 位置：${m.position}\n`
      txtContent += `- 出处：${m.source}\n`
      txtContent += `- 说明：${m.description}\n`
      txtContent += `- 置信度：${(m.confidence * 100).toFixed(0)}%\n`
      txtContent += `- 状态：${getMatchStatusLabel(m.status)}\n`
      txtContent += '\n'
    }
    
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' })
    triggerDownload(blob, `${config.filename}.txt`)
  }
}

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

export function buildRulesForScan(rules: CollationRule[]): ScanRule[] {
  return rules.map(rule => ({
    ruleId: rule.id,
    originalChar: rule.originalChar,
    standardChar: rule.standardChar,
    type: rule.type,
    source: rule.source,
    description: rule.description,
    confidence: rule.confidence
  }))
}

export const builtInVariantRules: Omit<CollationRule, 'id' | 'createdAt'>[] = [
  { type: 'variant', originalChar: '「', standardChar: '一', source: '《异体字表》', description: '「为一之异体', confidence: 0.95, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '乛', standardChar: '乙', source: '《异体字表》', description: '乛为乙之异体', confidence: 0.9, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '亠', standardChar: '二', source: '《异体字表》', description: '亠为二之异体', confidence: 0.85, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '冫', standardChar: '冰', source: '《异体字表》', description: '冫为冰之古字', confidence: 0.9, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '丷', standardChar: '八', source: '《异体字表》', description: '丷为八之异体', confidence: 0.85, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '兦', standardChar: '亡', source: '《说文解字》', description: '兦为亡之古字', confidence: 0.95, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '𠀀', standardChar: '一', source: '《甲骨文字典》', description: '𠀀为一之异体', confidence: 0.8, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '𠃌', standardChar: '乃', source: '《康熙字典》', description: '𠃌为乃之异体', confidence: 0.85, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '従', standardChar: '从', source: '《异体字表》', description: '従为从之异体', confidence: 0.9, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '恵', standardChar: '惠', source: '《异体字表》', description: '恵为惠之异体', confidence: 0.95, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '峯', standardChar: '峰', source: '《异体字表》', description: '峯为峰之异体', confidence: 0.9, isBuiltIn: true, createdBy: 'system' },
  { type: 'variant', originalChar: '槩', standardChar: '概', source: '《异体字表》', description: '槩为概之异体', confidence: 0.85, isBuiltIn: true, createdBy: 'system' }
]

export const builtInBorrowedRules: Omit<CollationRule, 'id' | 'createdAt'>[] = [
  { type: 'borrowed', originalChar: '说', standardChar: '悦', source: '《论语》注', description: '说通悦，表喜悦', confidence: 0.9, isBuiltIn: true, createdBy: 'system' },
  { type: 'borrowed', originalChar: '知', standardChar: '智', source: '《孟子》注', description: '知通智，表智慧', confidence: 0.85, isBuiltIn: true, createdBy: 'system' },
  { type: 'borrowed', originalChar: '反', standardChar: '返', source: '《左传》注', description: '反通返，表返回', confidence: 0.9, isBuiltIn: true, createdBy: 'system' },
  { type: 'borrowed', originalChar: '景', standardChar: '影', source: '《史记》注', description: '景通影，表影子', confidence: 0.8, isBuiltIn: true, createdBy: 'system' },
  { type: 'borrowed', originalChar: '乡', standardChar: '向', source: '《汉书》注', description: '乡通向，表朝向', confidence: 0.75, isBuiltIn: true, createdBy: 'system' },
  { type: 'borrowed', originalChar: '齐', standardChar: '脐', source: '《素问》注', description: '齐通脐，表肚脐', confidence: 0.7, isBuiltIn: true, createdBy: 'system' },
  { type: 'borrowed', originalChar: '错', standardChar: '措', source: '《战国策》注', description: '错通措，表放置', confidence: 0.8, isBuiltIn: true, createdBy: 'system' },
  { type: 'borrowed', originalChar: '庸', standardChar: '用', source: '《诗经》注', description: '庸通用，表功用', confidence: 0.75, isBuiltIn: true, createdBy: 'system' }
]

export const builtInTabooRules: Omit<CollationRule, 'id' | 'createdAt'>[] = [
  { type: 'taboo', originalChar: '玄', standardChar: '元', source: '清代避讳', description: '避康熙帝玄烨讳，改玄为元', confidence: 0.95, isBuiltIn: true, createdBy: 'system' },
  { type: 'taboo', originalChar: '弘', standardChar: '宏', source: '清代避讳', description: '避乾隆帝弘历讳，改弘为宏', confidence: 0.95, isBuiltIn: true, createdBy: 'system' },
  { type: 'taboo', originalChar: '曆', standardChar: '歷', source: '清代避讳', description: '避乾隆帝弘历讳，改曆为歷', confidence: 0.9, isBuiltIn: true, createdBy: 'system' },
  { type: 'taboo', originalChar: '胤', standardChar: '允', source: '清代避讳', description: '避雍正帝胤禛讳，改胤为允', confidence: 0.95, isBuiltIn: true, createdBy: 'system' },
  { type: 'taboo', originalChar: '禛', standardChar: '祯', source: '清代避讳', description: '避雍正帝胤禛讳，改禛为祯', confidence: 0.9, isBuiltIn: true, createdBy: 'system' },
  { type: 'taboo', originalChar: '寧', standardChar: '甯', source: '清代避讳', description: '避道光帝旻宁讳，改寧为甯', confidence: 0.9, isBuiltIn: true, createdBy: 'system' },
  { type: 'taboo', originalChar: '世', standardChar: '代', source: '唐代避讳', description: '避唐太宗李世民讳，改世为代', confidence: 0.85, isBuiltIn: true, createdBy: 'system' },
  { type: 'taboo', originalChar: '民', standardChar: '人', source: '唐代避讳', description: '避唐太宗李世民讳，改民为人', confidence: 0.85, isBuiltIn: true, createdBy: 'system' },
  { type: 'taboo', originalChar: '治', standardChar: '理', source: '宋代避讳', description: '避宋英宗赵曙讳，改治为理', confidence: 0.8, isBuiltIn: true, createdBy: 'system' },
  { type: 'taboo', originalChar: '桓', standardChar: '亘', source: '宋代避讳', description: '避宋钦宗赵桓讳，改桓为亘', confidence: 0.8, isBuiltIn: true, createdBy: 'system' }
]

export function getAllBuiltInRules(): Omit<CollationRule, 'id' | 'createdAt'>[] {
  return [...builtInVariantRules, ...builtInBorrowedRules, ...builtInTabooRules]
}
