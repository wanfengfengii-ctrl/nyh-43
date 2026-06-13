<template>
  <n-modal
    :show="show"
    preset="card"
    title="左右页对开预览"
    style="width: 90vw; max-width: 1200px"
    @close="handleClose"
  >
    <template #header-extra>
      <n-space>
        <n-button size="small" @click="zoomIn">放大</n-button>
        <n-button size="small" @click="zoomOut">缩小</n-button>
        <n-button size="small" @click="resetZoom">重置</n-button>
        <span class="zoom-label">{{ Math.round(previewScale * 100) }}%</span>
      </n-space>
    </template>

    <div v-if="!template" class="empty-state">
      <n-empty description="请先选择一个版式" />
    </div>

    <div v-else class="preview-wrapper" ref="wrapperRef">
      <div
        class="spread-container"
        :style="{ transform: `scale(${previewScale})` }"
      >
        <div class="page-page left-page" :style="leftPageStyle">
          <div class="page-paper">
            <div class="type-setting-area" :style="typeSettingStyle">
              <div class="border-frame" :style="borderStyle"></div>
              <div v-if="template.centerLine.enabled" class="center-line" :style="centerLineStyle"></div>
              <div
                v-for="(col, idx) in columnLines"
                :key="idx"
                class="column-line"
                :style="{ left: col + 'px', ...columnLineStyle }"
              ></div>
              <div
                v-if="template.fishTail.position === 'top' || template.fishTail.position === 'both'"
                class="fish-tail fish-tail-top"
                :style="fishTailTopStyle"
              >
                <svg :viewBox="`0 0 ${template.fishTail.width} ${template.fishTail.height}`" :style="fishTailSvgStyle">
                  <path :d="fishTailPath('down', false)" :stroke="template.column.color" :stroke-width="template.fishTail.lineWidth" fill="none" />
                  <path v-if="template.fishTail.style === 'double' || template.fishTail.style === 'white'" :d="fishTailPath('down', true)" :stroke="template.column.color" :stroke-width="template.fishTail.lineWidth" fill="none" />
                </svg>
              </div>
              <div
                v-if="template.fishTail.position === 'bottom' || template.fishTail.position === 'both'"
                class="fish-tail fish-tail-bottom"
                :style="fishTailBottomStyle"
              >
                <svg :viewBox="`0 0 ${template.fishTail.width} ${template.fishTail.height}`" :style="fishTailSvgStyle">
                  <path :d="fishTailPath('up', false)" :stroke="template.column.color" :stroke-width="template.fishTail.lineWidth" fill="none" />
                  <path v-if="template.fishTail.style === 'double' || template.fishTail.style === 'white'" :d="fishTailPath('up', true)" :stroke="template.column.color" :stroke-width="template.fishTail.lineWidth" fill="none" />
                </svg>
              </div>
            </div>
          </div>
          <div class="page-label">左页 · {{ template.code }}</div>
          <div class="binding-indicator binding-left">装订边 →</div>
        </div>

        <div class="binding-gap">
          <div class="binding-line"></div>
          <div class="binding-text">装订缝</div>
        </div>

        <div class="page-page right-page" :style="rightPageStyle">
          <div class="page-paper">
            <div class="type-setting-area" :style="typeSettingStyle">
              <div class="border-frame" :style="borderStyle"></div>
              <div v-if="template.centerLine.enabled" class="center-line" :style="centerLineStyle"></div>
              <div
                v-for="(col, idx) in columnLines"
                :key="idx"
                class="column-line"
                :style="{ left: col + 'px', ...columnLineStyle }"
              ></div>
              <div
                v-if="template.fishTail.position === 'top' || template.fishTail.position === 'both'"
                class="fish-tail fish-tail-top"
                :style="fishTailTopStyle"
              >
                <svg :viewBox="`0 0 ${template.fishTail.width} ${template.fishTail.height}`" :style="fishTailSvgStyle">
                  <path :d="fishTailPath('down', false)" :stroke="template.column.color" :stroke-width="template.fishTail.lineWidth" fill="none" />
                  <path v-if="template.fishTail.style === 'double' || template.fishTail.style === 'white'" :d="fishTailPath('down', true)" :stroke="template.column.color" :stroke-width="template.fishTail.lineWidth" fill="none" />
                </svg>
              </div>
              <div
                v-if="template.fishTail.position === 'bottom' || template.fishTail.position === 'both'"
                class="fish-tail fish-tail-bottom"
                :style="fishTailBottomStyle"
              >
                <svg :viewBox="`0 0 ${template.fishTail.width} ${template.fishTail.height}`" :style="fishTailSvgStyle">
                  <path :d="fishTailPath('up', false)" :stroke="template.column.color" :stroke-width="template.fishTail.lineWidth" fill="none" />
                  <path v-if="template.fishTail.style === 'double' || template.fishTail.style === 'white'" :d="fishTailPath('up', true)" :stroke="template.column.color" :stroke-width="template.fishTail.lineWidth" fill="none" />
                </svg>
              </div>
            </div>
          </div>
          <div class="page-label">右页 · {{ template.code }}</div>
          <div class="binding-indicator binding-right">← 装订边</div>
        </div>
      </div>
    </div>

    <template #footer>
      <n-space justify="space-between">
        <div class="footer-info">
          <span>页面尺寸: {{ template?.pageSize.width }} × {{ template?.pageSize.height }}px</span>
          <span>装订间距: {{ bindingGap }}px</span>
        </div>
        <n-space>
          <n-button @click="handleClose">关闭</n-button>
          <n-button type="primary" @click="handleExportFromPreview">导出此视图</n-button>
        </n-space>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NModal, NSpace, NButton, NEmpty } from 'naive-ui'
import { useTemplateStore } from '@/stores/template'
import type { PageTemplate } from '@/types'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'close'): void
  (e: 'export'): void
}>()

const templateStore = useTemplateStore()
const template = computed<PageTemplate | null>(() => templateStore.currentTemplate)

const wrapperRef = ref<HTMLDivElement | null>(null)
const previewScale = ref(0.5)

const bindingGap = computed(() => {
  if (!template.value) return 30
  return Math.max(30, template.value.margins.left + template.value.margins.right)
})

const leftPageStyle = computed(() => {
  if (!template.value) return {}
  return {
    width: template.value.pageSize.width + 'px',
    height: template.value.pageSize.height + 'px'
  }
})

const rightPageStyle = computed(() => leftPageStyle.value)

const typeSettingStyle = computed(() => {
  if (!template.value) return {}
  const t = template.value
  return {
    left: t.margins.left + 'px',
    top: t.margins.top + 'px',
    width: (t.pageSize.width - t.margins.left - t.margins.right) + 'px',
    height: (t.pageSize.height - t.margins.top - t.margins.bottom) + 'px'
  }
})

const borderStyle = computed(() => {
  if (!template.value) return {}
  return {
    borderWidth: template.value.border.lineWidth + 'px',
    borderColor: template.value.border.color
  }
})

const centerLineStyle = computed(() => {
  if (!template.value) return {}
  return {
    width: template.value.centerLine.lineWidth + 'px',
    backgroundColor: template.value.centerLine.color
  }
})

const columnLines = computed(() => {
  if (!template.value || template.value.column.count <= 1) return []
  const t = template.value
  const lines: number[] = []
  const count = t.column.count
  const spacing = t.column.spacing
  const tw = t.pageSize.width - t.margins.left - t.margins.right
  const totalSpacing = (count - 1) * spacing
  const contentWidth = tw - totalSpacing
  const columnWidth = contentWidth / count

  for (let i = 1; i < count; i++) {
    lines.push(i * columnWidth + (i - 1) * spacing + spacing / 2)
  }
  return lines
})

const columnLineStyle = computed(() => {
  if (!template.value) return {}
  return {
    width: template.value.column.lineWidth + 'px',
    backgroundColor: template.value.column.color
  }
})

const fishTailTopStyle = computed(() => {
  if (!template.value) return {}
  return {
    left: `calc(50% - ${template.value.fishTail.width / 2}px)`,
    top: '10px',
    width: template.value.fishTail.width + 'px',
    height: template.value.fishTail.height + 'px'
  }
})

const fishTailBottomStyle = computed(() => {
  if (!template.value) return {}
  return {
    left: `calc(50% - ${template.value.fishTail.width / 2}px)`,
    bottom: '10px',
    width: template.value.fishTail.width + 'px',
    height: template.value.fishTail.height + 'px'
  }
})

const fishTailSvgStyle = computed(() => {
  if (!template.value) return {}
  return {
    width: template.value.fishTail.width + 'px',
    height: template.value.fishTail.height + 'px'
  }
})

function fishTailPath(orientation: 'up' | 'down', inner: boolean): string {
  if (!template.value) return ''
  const t = template.value.fishTail
  const w = inner ? t.width * (t.style === 'double' ? 0.5 : 0.4) : t.width
  const h = inner ? t.height * 0.5 : t.height
  const offsetX = inner ? (t.width - w) / 2 : 0
  const offsetY = inner ? (orientation === 'down' ? 0 : t.height - h) : 0

  if (orientation === 'down') {
    return `M ${offsetX} ${offsetY} L ${offsetX + w / 2} ${offsetY + h} L ${offsetX + w} ${offsetY}`
  } else {
    return `M ${offsetX} ${offsetY + h} L ${offsetX + w / 2} ${offsetY} L ${offsetX + w} ${offsetY + h}`
  }
}

function zoomIn() {
  previewScale.value = Math.min(previewScale.value + 0.1, 2)
}

function zoomOut() {
  previewScale.value = Math.max(previewScale.value - 0.1, 0.1)
}

function resetZoom() {
  previewScale.value = 0.5
}

function handleClose() {
  emit('update:show', false)
  emit('close')
}

function handleExportFromPreview() {
  emit('export')
  handleClose()
}
</script>

<style scoped>
.empty-state {
  padding: 40px 0;
}

.preview-wrapper {
  overflow: auto;
  max-height: 60vh;
  background-color: #2c2c2c;
  padding: 40px;
  border-radius: 4px;
}

.spread-container {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  transform-origin: top center;
  transition: transform 0.2s ease;
}

.page-page {
  position: relative;
  flex-shrink: 0;
}

.page-paper {
  width: 100%;
  height: 100%;
  background-color: #f5f0e6;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  position: relative;
}

.type-setting-area {
  position: absolute;
  background-color: #faf6ed;
}

.border-frame {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-style: solid;
}

.center-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}

.column-line {
  position: absolute;
  top: 0;
  bottom: 0;
}

.fish-tail {
  position: absolute;
  pointer-events: none;
}

.binding-gap {
  flex-shrink: 0;
  width: 30px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.binding-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    #666 0px,
    #666 4px,
    transparent 4px,
    transparent 8px
  );
}

.binding-text {
  font-size: 11px;
  color: #999;
  background-color: #2c2c2c;
  padding: 4px 0;
  writing-mode: vertical-rl;
  z-index: 1;
}

.page-label {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #ccc;
  white-space: nowrap;
}

.binding-indicator {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: #c53d43;
  white-space: nowrap;
}

.binding-left {
  right: -60px;
}

.binding-right {
  left: -60px;
}

.zoom-label {
  font-size: 12px;
  color: #666;
  min-width: 50px;
  text-align: center;
}

.footer-info {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #999;
}
</style>
