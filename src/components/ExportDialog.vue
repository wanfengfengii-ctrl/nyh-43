<template>
  <n-modal
    :show="show"
    :mask-closable="false"
    preset="dialog"
    title="导出版式/书籍"
    positive-text="导出"
    negative-text="取消"
    :positive-button-props="{ disabled: !canExport }"
    @positive-click="handleExport"
    @negative-click="handleClose"
    @close="handleClose"
  >
    <div class="export-tabs">
      <n-radio-group v-model:value="exportMode" size="small">
        <n-radio-button value="template">导出版式</n-radio-button>
        <n-radio-button value="book" :disabled="!hasBook">导出书籍</n-radio-button>
      </n-radio-group>
    </div>

    <div v-if="exportMode === 'template'">
      <div v-if="!template" class="empty-state">
        <n-empty description="请先选择一个版式" />
      </div>
      <template v-else>
        <div class="export-form">
          <n-form-item label="导出格式">
            <n-radio-group v-model:value="tplOptions.format">
              <n-radio value="png">PNG 图片</n-radio>
              <n-radio value="svg">SVG 矢量图</n-radio>
              <n-radio value="json">JSON 数据</n-radio>
            </n-radio-group>
          </n-form-item>

          <n-form-item label="导出范围">
            <n-radio-group v-model:value="tplOptions.includeBothPages">
              <n-radio :value="false">单页</n-radio>
              <n-radio :value="true">左右对开</n-radio>
            </n-radio-group>
          </n-form-item>

          <n-form-item v-if="tplOptions.format === 'png'" label="DPI">
            <n-select v-model:value="tplOptions.dpi" :options="dpiOptions" style="width: 200px" />
          </n-form-item>

          <n-alert v-if="!isComplete" type="warning" size="small" style="margin-top: 12px">
            当前版式定义不完整，部分参数可能缺失，建议先完善版式后再导出。
          </n-alert>

          <div class="preview-hint">
            <n-divider style="margin: 12px 0">导出预览</n-divider>
            <div class="preview-container">
              <div class="preview-page" :style="tplPreviewStyle">
                <span class="preview-label">
                  {{ tplOptions.includeBothPages ? '左右页对开预览' : '单页预览' }}
                </span>
                <span class="preview-size">
                  {{ tplPreviewWidth }} × {{ tplPreviewHeight }}px
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-else>
      <div v-if="!bookStore.currentBook" class="empty-state">
        <n-empty description="请先在书籍管理中创建或选择书籍" />
      </div>
      <template v-else>
        <div class="export-form">
          <n-form-item label="书籍信息">
            <div class="book-info">
              <n-space>
                <n-tag>{{ bookStore.currentBook.title }}</n-tag>
                <n-tag type="info">共 {{ bookStore.currentBook.totalPages }} 页</n-tag>
                <n-tag type="success">{{ bookStore.currentBook.chapters.length }} 章</n-tag>
              </n-space>
            </div>
          </n-form-item>

          <n-form-item label="导出格式">
            <n-radio-group v-model:value="bookConfig.format">
              <n-radio value="pdf">PDF 文档</n-radio>
              <n-radio value="png">PNG 图片（逐页）</n-radio>
            </n-radio-group>
          </n-form-item>

          <n-form-item label="导出范围">
            <n-radio-group v-model:value="bookConfig.range">
              <n-radio value="all">全部页面</n-radio>
              <n-radio value="current">当前章节</n-radio>
              <n-radio value="custom">自定义页码</n-radio>
            </n-radio-group>
          </n-form-item>

          <n-form-item v-if="bookConfig.range === 'custom'" label="页码范围">
            <n-space vertical style="width: 100%">
              <n-input
                v-model:value="bookConfig.customRange"
                placeholder="例如: 1-5, 8, 10-15"
                style="width: 280px"
              />
              <span class="range-hint">{{ rangeHint }}</span>
            </n-space>
          </n-form-item>

          <n-form-item label="DPI">
            <n-select v-model:value="bookConfig.dpi" :options="dpiOptions" style="width: 200px" />
          </n-form-item>

          <n-form-item label="文件名">
            <n-input v-model:value="bookConfig.filename" placeholder="请输入文件名" style="width: 280px" />
          </n-form-item>

          <n-form-item label="导出选项">
            <n-checkbox v-model:checked="bookConfig.includeViolations">
              包含违规项高亮标记
            </n-checkbox>
          </n-form-item>

          <n-form-item label="水印文字">
            <n-input
              v-model:value="bookConfig.watermark"
              placeholder="可选，留空则不添加水印"
              style="width: 280px"
            />
          </n-form-item>
        </div>
      </template>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NModal, NFormItem, NRadioGroup, NRadio, NRadioButton, NSelect, NAlert,
  NEmpty, NDivider, useMessage, NSpace, NTag, NCheckbox, NInput
} from 'naive-ui'
import { useTemplateStore } from '@/stores/template'
import { useBookStore } from '@/stores/book'
import { validateTemplate } from '@/utils/validation'
import { exportBook, parsePageRangeForUI } from '@/utils/exporter'
import type { ExportOptions, PageTemplate, BatchExportConfig } from '@/types'

const props = defineProps<{ show: boolean }>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
}>()

const templateStore = useTemplateStore()
const bookStore = useBookStore()
const message = useMessage()

const exportMode = ref<'template' | 'book'>('template')

const template = computed<PageTemplate | null>(() => templateStore.currentTemplate)
const hasBook = computed(() => !!bookStore.currentBook && bookStore.currentBook.totalPages > 0)

const isComplete = computed(() => {
  if (!template.value) return false
  return validateTemplate(template.value).valid
})

const canExport = computed(() => {
  if (exportMode.value === 'template') return template.value !== null
  return hasBook.value
})

const dpiOptions = [
  { label: '72 DPI (屏幕)', value: 72 },
  { label: '96 DPI (标准)', value: 96 },
  { label: '150 DPI (高清)', value: 150 },
  { label: '300 DPI (印刷)', value: 300 }
]

const tplOptions = ref<ExportOptions>({
  format: 'png',
  includeBothPages: false,
  dpi: 96
})

const bookConfig = ref<BatchExportConfig>({
  format: 'pdf',
  dpi: 150,
  range: 'all',
  customRange: '',
  includeViolations: true,
  watermark: '',
  filename: 'ancient-book'
})

const tplPreviewWidth = computed(() => {
  if (!template.value) return 0
  const base = template.value.pageSize.width
  return tplOptions.value.includeBothPages ? base * 2 + 30 : base
})

const tplPreviewHeight = computed(() => {
  if (!template.value) return 0
  return template.value.pageSize.height
})

const tplPreviewStyle = computed(() => {
  const maxW = 400
  const maxH = 200
  const scale = Math.min(maxW / tplPreviewWidth.value, maxH / tplPreviewHeight.value, 1)
  return {
    width: tplPreviewWidth.value * scale + 'px',
    height: tplPreviewHeight.value * scale + 'px'
  }
})

const rangeHint = computed(() => {
  if (!bookConfig.value.customRange) return '支持格式: 1-5 表示第1到第5页, 多个范围用逗号分隔'
  const result = parsePageRangeForUI(bookConfig.value.customRange)
  return result.message
})

watch(
  () => props.show,
  (val) => {
    if (val) {
      tplOptions.value = { format: 'png', includeBothPages: false, dpi: 96 }
      bookConfig.value = {
        format: 'pdf',
        dpi: 150,
        range: 'all',
        customRange: '',
        includeViolations: true,
        watermark: '',
        filename: bookStore.currentBook?.title?.replace(/\s+/g, '-') || 'ancient-book'
      }
      exportMode.value = hasBook.value ? 'book' : 'template'
    }
  }
)

function handleClose() {
  emit('update:show', false)
  emit('close')
}

async function handleExport() {
  if (exportMode.value === 'template') {
    await exportTemplate()
  } else {
    await handleBookExport()
  }
}

async function exportTemplate() {
  if (!template.value) {
    message.warning('请先选择一个版式')
    return
  }
  if (!validateTemplate(template.value).valid) {
    message.warning('版式定义不完整，请先完善后再导出')
    return
  }
  switch (tplOptions.value.format) {
    case 'json':
      exportJSON()
      break
    case 'png':
      exportPNG()
      break
    case 'svg':
      exportSVG()
      break
  }
}

async function handleBookExport() {
  if (!bookStore.currentBook) {
    message.warning('请先选择书籍')
    return
  }
  if (bookConfig.value.range === 'custom') {
    const r = parsePageRangeForUI(bookConfig.value.customRange || '')
    if (!r.valid) {
      message.warning(r.message)
      return
    }
  }
  try {
    message.loading('正在导出，请稍候...')
    const templatesMap: Record<string, PageTemplate> = {}
    for (const t of templateStore.templates) {
      templatesMap[t.id] = t
    }
    await exportBook(bookStore.currentBook, templatesMap, bookConfig.value)
    message.success('导出已启动，请查看浏览器下载')
    handleClose()
  } catch (e: any) {
    message.error(e?.message || '导出失败')
  }
}

function exportJSON() {
  if (!template.value) return
  const json = templateStore.exportTemplate(template.value.id)
  downloadFile(json, `${getTplFilename()}.json`, 'application/json')
  message.success('JSON 导出成功')
  handleClose()
}

function exportPNG() {
  if (!template.value) return
  const tpl = template.value
  const dpiScale = tplOptions.value.dpi / 96
  const w = tplOptions.value.includeBothPages ? tpl.pageSize.width * 2 + 30 : tpl.pageSize.width
  const h = tpl.pageSize.height
  const canvas = document.createElement('canvas')
  canvas.width = w * dpiScale
  canvas.height = h * dpiScale
  const ctx = canvas.getContext('2d')
  if (!ctx) { message.error('Canvas 初始化失败'); return }
  ctx.scale(dpiScale, dpiScale)
  ctx.fillStyle = '#f5f0e6'
  if (tplOptions.value.includeBothPages) {
    drawPage(ctx, tpl, 0, 0)
    drawPage(ctx, tpl, tpl.pageSize.width + 30, 0)
  } else {
    drawPage(ctx, tpl, 0, 0)
  }
  canvas.toBlob((blob) => {
    if (!blob) { message.error('PNG 生成失败'); return }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${getTplFilename()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('PNG 导出成功')
    handleClose()
  }, 'image/png')
}

function drawPage(ctx: CanvasRenderingContext2D, tpl: PageTemplate, offsetX: number, offsetY: number) {
  const { pageSize, margins, border, column, fishTail, centerLine } = tpl
  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.fillStyle = '#f5f0e6'
  ctx.fillRect(0, 0, pageSize.width, pageSize.height)
  const tx = margins.left
  const ty = margins.top
  const tw = pageSize.width - margins.left - margins.right
  const th = pageSize.height - margins.top - margins.bottom
  ctx.fillStyle = '#faf6ed'
  ctx.fillRect(tx, ty, tw, th)
  ctx.strokeStyle = border.color
  ctx.lineWidth = border.lineWidth
  ctx.strokeRect(tx, ty, tw, th)
  if (centerLine.enabled) {
    ctx.strokeStyle = centerLine.color
    ctx.lineWidth = centerLine.lineWidth
    ctx.beginPath()
    ctx.moveTo(tx + tw / 2, ty)
    ctx.lineTo(tx + tw / 2, ty + th)
    ctx.stroke()
  }
  if (column.count > 1) {
    ctx.strokeStyle = column.color
    ctx.lineWidth = column.lineWidth
    const count = column.count
    const spacing = column.spacing
    const totalSpacing = (count - 1) * spacing
    const contentWidth = tw - totalSpacing
    const columnWidth = contentWidth / count
    for (let i = 1; i < count; i++) {
      const x = tx + i * columnWidth + (i - 1) * spacing + spacing / 2
      ctx.beginPath()
      ctx.moveTo(x, ty)
      ctx.lineTo(x, ty + th)
      ctx.stroke()
    }
  }
  if (fishTail.position === 'top' || fishTail.position === 'both') {
    drawFishTail(ctx, tx + tw / 2, ty + 10, fishTail, 'down', column.color)
  }
  if (fishTail.position === 'bottom' || fishTail.position === 'both') {
    drawFishTail(ctx, tx + tw / 2, ty + th - fishTail.height - 10, fishTail, 'up', column.color)
  }
  ctx.restore()
}

function drawFishTail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  ft: PageTemplate['fishTail'],
  orientation: 'up' | 'down',
  color: string
) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = ft.lineWidth
  const w = ft.width
  const h = ft.height
  const x = cx - w / 2
  ctx.beginPath()
  if (orientation === 'down') {
    ctx.moveTo(x, y)
    ctx.lineTo(x + w / 2, y + h)
    ctx.lineTo(x + w, y)
  } else {
    ctx.moveTo(x, y + h)
    ctx.lineTo(x + w / 2, y)
    ctx.lineTo(x + w, y + h)
  }
  if (ft.style === 'black') { ctx.closePath(); ctx.fill() } else { ctx.stroke() }
  if (ft.style === 'double' || ft.style === 'white') {
    const iw = w * (ft.style === 'double' ? 0.5 : 0.4)
    const ih = h * 0.5
    const ix = cx - iw / 2
    const iy = orientation === 'down' ? y : y + h - ih
    ctx.beginPath()
    if (orientation === 'down') {
      ctx.moveTo(ix, iy)
      ctx.lineTo(ix + iw / 2, iy + ih)
      ctx.lineTo(ix + iw, iy)
    } else {
      ctx.moveTo(ix, iy + ih)
      ctx.lineTo(ix + iw / 2, iy)
      ctx.lineTo(ix + iw, iy + ih)
    }
    ctx.stroke()
  }
}

function exportSVG() {
  if (!template.value) return
  const tpl = template.value
  const w = tplOptions.value.includeBothPages ? tpl.pageSize.width * 2 + 30 : tpl.pageSize.width
  const h = tpl.pageSize.height
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  svgContent += `<style>.page-bg { fill: #f5f0e6; } .type-bg { fill: #faf6ed; } .border-stroke { stroke: ${tpl.border.color}; stroke-width: ${tpl.border.lineWidth}; fill: none; } .line-stroke { stroke: ${tpl.column.color}; stroke-width: ${tpl.column.lineWidth}; fill: none; }</style>`
  if (tplOptions.value.includeBothPages) {
    svgContent += generatePageSVG(tpl, 0, 0)
    svgContent += generatePageSVG(tpl, tpl.pageSize.width + 30, 0)
  } else {
    svgContent += generatePageSVG(tpl, 0, 0)
  }
  svgContent += '</svg>'
  downloadFile(svgContent, `${getTplFilename()}.svg`, 'image/svg+xml')
  message.success('SVG 导出成功')
  handleClose()
}

function generatePageSVG(tpl: PageTemplate, offsetX: number, offsetY: number): string {
  const { pageSize, margins, border, column, fishTail, centerLine } = tpl
  const tx = offsetX + margins.left
  const ty = offsetY + margins.top
  const tw = pageSize.width - margins.left - margins.right
  const th = pageSize.height - margins.top - margins.bottom
  let svg = ''
  svg += `<rect class="page-bg" x="${offsetX}" y="${offsetY}" width="${pageSize.width}" height="${pageSize.height}"/>`
  svg += `<rect class="type-bg border-stroke" x="${tx}" y="${ty}" width="${tw}" height="${th}"/>`
  if (centerLine.enabled) {
    svg += `<line x1="${tx + tw / 2}" y1="${ty}" x2="${tx + tw / 2}" y2="${ty + th}" stroke="${centerLine.color}" stroke-width="${centerLine.lineWidth}"/>`
  }
  if (column.count > 1) {
    const count = column.count
    const spacing = column.spacing
    const totalSpacing = (count - 1) * spacing
    const contentWidth = tw - totalSpacing
    const columnWidth = contentWidth / count
    for (let i = 1; i < count; i++) {
      const x = tx + i * columnWidth + (i - 1) * spacing + spacing / 2
      svg += `<line class="line-stroke" x1="${x}" y1="${ty}" x2="${x}" y2="${ty + th}"/>`
    }
  }
  if (fishTail.position === 'top' || fishTail.position === 'both') {
    svg += generateFishTailSVG(tx + tw / 2, ty + 10, fishTail, 'down', column.color)
  }
  if (fishTail.position === 'bottom' || fishTail.position === 'both') {
    svg += generateFishTailSVG(tx + tw / 2, ty + th - fishTail.height - 10, fishTail, 'up', column.color)
  }
  return svg
}

function generateFishTailSVG(
  cx: number,
  y: number,
  ft: PageTemplate['fishTail'],
  orientation: 'up' | 'down',
  color: string
): string {
  const w = ft.width
  const h = ft.height
  const x = cx - w / 2
  let points = ''
  if (orientation === 'down') {
    points = `${x},${y} ${x + w / 2},${y + h} ${x + w},${y}`
  } else {
    points = `${x},${y + h} ${x + w / 2},${y} ${x + w},${y + h}`
  }
  let svg = ''
  if (ft.style === 'black') {
    svg += `<polygon points="${points}" fill="${color}" stroke="${color}" stroke-width="${ft.lineWidth}"/>`
  } else {
    svg += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${ft.lineWidth}"/>`
  }
  if (ft.style === 'double' || ft.style === 'white') {
    const iw = w * (ft.style === 'double' ? 0.5 : 0.4)
    const ih = h * 0.5
    const ix = cx - iw / 2
    const iy = orientation === 'down' ? y : y + h - ih
    let innerPoints = ''
    if (orientation === 'down') {
      innerPoints = `${ix},${iy} ${ix + iw / 2},${iy + ih} ${ix + iw},${iy}`
    } else {
      innerPoints = `${ix},${iy + ih} ${ix + iw / 2},${iy} ${ix + iw},${iy + ih}`
    }
    svg += `<polyline points="${innerPoints}" fill="none" stroke="${color}" stroke-width="${ft.lineWidth}"/>`
  }
  return svg
}

function getTplFilename(): string {
  if (!template.value) return 'ancient-book'
  return `${template.value.code}-${template.value.name}`
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.export-tabs {
  margin-bottom: 16px;
}

.export-form {
  padding: 8px 0;
}

.empty-state {
  padding: 20px 0;
}

.preview-hint {
  margin-top: 8px;
}

.preview-container {
  display: flex;
  justify-content: center;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.preview-page {
  background-color: #f5f0e6;
  border: 1px solid #d9d2c3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.preview-label {
  font-size: 12px;
  color: #666;
}

.preview-size {
  font-size: 11px;
  color: #999;
}

.book-info {
  padding: 4px 0;
}

.range-hint {
  font-size: 12px;
  color: #999;
}
</style>
