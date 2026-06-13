<template>
  <div class="canvas-wrapper" ref="wrapperRef">
    <div class="page-navigator" v-if="hasPages">
      <n-space justify="center">
        <n-button size="small" :disabled="bookStore.currentPageIndex <= 0" @click="bookStore.navigatePrevPage">
          <template #icon><n-icon><ChevronBack /></n-icon></template>
          上一页
        </n-button>
        <n-pagination
          v-model:page="currentPageDisplay"
          :page-count="totalPageCount"
          size="small"
          :show-size-picker="false"
          simple
        />
        <n-button size="small" :disabled="bookStore.currentPageIndex >= totalPageCount - 1" @click="bookStore.navigateNextPage">
          下一页
          <template #icon><n-icon><ChevronForward /></n-icon></template>
        </n-button>
        <n-divider vertical />
        <n-button size="small" :type="showSpreadView ? 'primary' : 'default'" @click="toggleSpread">
          <template #icon><n-icon><Albums /></n-icon></template>
          {{ showSpreadView ? '单页' : '对开校样' }}
        </n-button>
        <n-tag v-if="currentBookPage" size="small" :type="currentBookPage.pageSide === 'left' ? 'default' : 'info'">
          {{ currentBookPage.pageSide === 'left' ? '左页' : '右页' }} · 第{{ currentBookPage.pageNumber }}页
        </n-tag>
        <n-tag v-if="currentBookPage && currentBookPage.violations.length > 0" size="small" type="warning">
          {{ currentBookPage.violations.length }} 项违规
        </n-tag>
        <n-tag
          v-if="currentBookPage && currentBookPage.collationMatches && currentBookPage.collationMatches.length > 0"
          size="small"
          type="info"
        >
          {{ currentBookPage.collationMatches.filter(m => m.status === 'pending').length }}/{{ currentBookPage.collationMatches.length }} 校勘
        </n-tag>
      </n-space>
    </div>

    <v-stage
      :config="stageConfig"
      ref="stageRef"
      @wheel="handleWheel"
      @mousedown="handleStageMouseDown"
      @mousemove="handleStageMouseMove"
      @mouseup="handleStageMouseUp"
      @dblclick="handleStageDblClick"
    >
      <v-layer>
        <template v-if="showSpreadView && hasPages">
          <template v-for="(p, idx) in spreadPageList" :key="'spread-' + idx">
            <PageRenderer
              v-if="p && getTemplateForPage(p)"
              :template="getTemplateForPage(p)"
              :page-side="p.pageSide"
              :x="getSpreadPageX(idx)"
              :y="pageY"
              :scale="canvasStore.scale"
              :violations="p.violations"
              :elements="p.elements"
              :collation-matches="p.collationMatches"
              :content="p.content"
              :show-violations="true"
              :show-collation="true"
              :show-handles="false"
              @element-click="handleElementClick"
              @collation-match-click="handleCollationMatchClick"
            />
            <v-text
              v-if="p"
              :config="{
                x: getSpreadPageX(idx) + (getTemplateForPage(p)?.pageSize.width || 400) / 2 - 30,
                y: pageY - 28,
                text: `第${p.pageNumber}页 · ${p.pageSide === 'left' ? '左' : '右'}`,
                fontSize: 13,
                fontFamily: 'sans-serif',
                fill: '#666'
              }"
            />
          </template>
        </template>
        <template v-else-if="currentBookPage && currentPageTemplate">
          <PageRenderer
            :template="currentPageTemplate"
            :page-side="currentBookPage.pageSide"
            :x="singlePageX"
            :y="pageY"
            :scale="canvasStore.scale"
            :violations="currentBookPage.violations"
            :elements="currentBookPage.elements"
            :collation-matches="currentBookPage.collationMatches"
            :content="currentBookPage.content"
            :show-violations="true"
            :show-collation="true"
            :show-handles="!hasPages"
            @element-click="handleElementClick"
            @collation-match-click="handleCollationMatchClick"
          />
        </template>
        <template v-else>
          <template v-if="showDoublePage">
            <PageRenderer
              :template="template"
              :page-side="'left'"
              :x="doublePageLeftX"
              :y="pageY"
              :scale="canvasStore.scale"
            />
            <PageRenderer
              :template="template"
              :page-side="'right'"
              :x="doublePageRightX"
              :y="pageY"
              :scale="canvasStore.scale"
            />
          </template>
          <template v-else>
            <PageRenderer
              :template="template"
              :page-side="'single'"
              :x="singlePageX"
              :y="pageY"
              :scale="canvasStore.scale"
            />
          </template>
        </template>

        <template v-if="canvasStore.showGuides">
          <v-line
            v-for="guide in canvasStore.guides"
            :key="guide.id"
            :config="getGuideConfig(guide)"
            @mousedown.stop="handleGuideMouseDown($event, guide)"
            @dblclick.stop="handleGuideDblClick(guide.id)"
          />
        </template>

        <v-line
          v-if="creatingGuide"
          :config="creatingGuideConfig"
        />
      </v-layer>
    </v-stage>

    <div
      v-if="canvasStore.showRuler"
      class="ruler ruler-h"
      @mousedown="handleRulerMouseDown($event, 'vertical')"
    >
      <div class="ruler-content">
        <span
          v-for="tick in horizontalTicks"
          :key="tick.pos"
          class="ruler-tick"
          :style="{ left: tick.pos + 'px' }"
        >
          <span class="tick-line" :class="{ major: tick.major }"></span>
          <span v-if="tick.major" class="tick-label">{{ tick.label }}</span>
        </span>
      </div>
    </div>
    <div
      v-if="canvasStore.showRuler"
      class="ruler ruler-v"
      @mousedown="handleRulerMouseDown($event, 'horizontal')"
    >
      <div class="ruler-content">
        <span
          v-for="tick in verticalTicks"
          :key="tick.pos"
          class="ruler-tick vertical"
          :style="{ top: tick.pos + 'px' }"
        >
          <span class="tick-line" :class="{ major: tick.major }"></span>
          <span v-if="tick.major" class="tick-label">{{ tick.label }}</span>
        </span>
      </div>
    </div>
    <div v-if="canvasStore.showRuler" class="ruler-corner"></div>

    <div class="canvas-info">
      <span>缩放: {{ canvasStore.scalePercent }}%</span>
      <span v-if="displayTemplate">
        页面: {{ displayTemplate.pageSize.width }} × {{ displayTemplate.pageSize.height }}px
      </span>
      <span v-if="canvasStore.guides.length > 0">辅助线: {{ canvasStore.guides.length }} (双击删除)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useCanvasStore } from '@/stores/canvas'
import { useBookStore } from '@/stores/book'
import type { PageTemplate, GuideLine, BookPage, PageElement, CollationMatch } from '@/types'
import { NButton, NSpace, NIcon, NPagination, NTag, NDivider, useMessage } from 'naive-ui'
import { ChevronBack, ChevronForward, Albums } from '@vicons/ionicons5'
import PageRenderer from './PageRenderer.vue'

const props = defineProps<{
  showDoublePage: boolean
}>()

const emit = defineEmits<{
  (e: 'locateViolation', pageId: string): void
}>()

const templateStore = useTemplateStore()
const canvasStore = useCanvasStore()
const bookStore = useBookStore()
const message = useMessage()

const wrapperRef = ref<HTMLDivElement | null>(null)
const stageRef = ref<any>(null)
const stageWidth = ref(800)
const stageHeight = ref(600)

const RULER_SIZE = 20
const BINDING_MARGIN = 30
const NAV_HEIGHT = 48

const template = computed<PageTemplate | null>(() => templateStore.currentTemplate)

const hasPages = computed(() => bookStore.allPages.length > 0)
const showSpreadView = computed(() => bookStore.showSpreadView)
const totalPageCount = computed(() => bookStore.allPages.length)

const currentPageDisplay = computed({
  get: () => Math.max(1, bookStore.currentPageIndex + 1),
  set: (v: number) => {
    const pages = bookStore.allPages
    if (pages[v - 1]) {
      bookStore.selectPage(pages[v - 1].id)
    }
  }
})

const currentBookPage = computed<BookPage | null>(() => bookStore.currentPage)

const currentPageTemplate = computed<PageTemplate | null>(() => {
  if (!currentBookPage.value) return null
  return templateStore.templates.find(t => t.id === currentBookPage.value?.templateId) || template.value
})

const displayTemplate = computed(() => currentPageTemplate.value || template.value)

const spreadPageList = computed(() => {
  if (!hasPages.value) return []
  return bookStore.spreadPages
})

function getTemplateForPage(page: BookPage | null): PageTemplate | null {
  if (!page) return null
  return templateStore.templates.find(t => t.id === page.templateId) || template.value
}

const bindingGap = computed(() => {
  const t = displayTemplate.value
  if (!t) return BINDING_MARGIN
  return Math.max(BINDING_MARGIN, t.margins.left + t.margins.right)
})

const pageY = computed(() => {
  const t = displayTemplate.value
  if (!t) return 100 + NAV_HEIGHT
  const rulerOffset = canvasStore.showRuler ? RULER_SIZE / canvasStore.scale : 0
  const navOffset = NAV_HEIGHT / canvasStore.scale
  return (stageHeight.value - t.pageSize.height * canvasStore.scale) / 2 / canvasStore.scale + rulerOffset + navOffset
})

const singlePageX = computed(() => {
  const t = displayTemplate.value
  if (!t) return 100
  const rulerOffset = canvasStore.showRuler ? RULER_SIZE / canvasStore.scale : 0
  return (stageWidth.value - t.pageSize.width * canvasStore.scale) / 2 / canvasStore.scale + rulerOffset
})

const doublePageLeftX = computed(() => {
  const t = displayTemplate.value
  if (!t) return 50
  const rulerOffset = canvasStore.showRuler ? RULER_SIZE / canvasStore.scale : 0
  const totalWidth = t.pageSize.width * 2 * canvasStore.scale + bindingGap.value * canvasStore.scale
  const startX = (stageWidth.value - totalWidth) / 2 / canvasStore.scale + rulerOffset
  return startX
})

const doublePageRightX = computed(() => {
  const t = displayTemplate.value
  if (!t) return 400
  return doublePageLeftX.value + t.pageSize.width + bindingGap.value
})

function getSpreadPageX(idx: number): number {
  const t = displayTemplate.value
  if (!t) return 100 + idx * 400
  const rulerOffset = canvasStore.showRuler ? RULER_SIZE / canvasStore.scale : 0
  const totalWidth = t.pageSize.width * 2 * canvasStore.scale + bindingGap.value * canvasStore.scale
  const startX = (stageWidth.value - totalWidth) / 2 / canvasStore.scale + rulerOffset
  if (idx === 0) return startX
  return startX + t.pageSize.width + bindingGap.value
}

const stageConfig = computed(() => ({
  width: stageWidth.value,
  height: stageHeight.value,
  scaleX: canvasStore.scale,
  scaleY: canvasStore.scale,
  x: canvasStore.offsetX,
  y: canvasStore.offsetY,
  draggable: false
}))

const horizontalTicks = computed(() => {
  const ticks: { pos: number; major: boolean; label: string }[] = []
  const step = 50
  const majorStep = 100
  for (let i = 0; i < stageWidth.value; i += step) {
    ticks.push({
      pos: i,
      major: i % majorStep === 0,
      label: String(i)
    })
  }
  return ticks
})

const verticalTicks = computed(() => {
  const ticks: { pos: number; major: boolean; label: string }[] = []
  const step = 50
  const majorStep = 100
  for (let i = 0; i < stageHeight.value; i += step) {
    ticks.push({
      pos: i,
      major: i % majorStep === 0,
      label: String(i)
    })
  }
  return ticks
})

function getGuideConfig(guide: GuideLine) {
  const isHorizontal = guide.type === 'horizontal'
  return {
    points: isHorizontal
      ? [0, guide.position, stageWidth.value, guide.position]
      : [guide.position, 0, guide.position, stageHeight.value],
    stroke: '#ff4d4f',
    strokeWidth: 1 / canvasStore.scale,
    dash: [4 / canvasStore.scale, 4 / canvasStore.scale],
    listening: true,
    hitStrokeWidth: 10 / canvasStore.scale,
    cursor: isHorizontal ? 'ns-resize' : 'ew-resize'
  }
}

const creatingGuide = ref<{ type: 'horizontal' | 'vertical'; position: number } | null>(null)

const creatingGuideConfig = computed(() => {
  if (!creatingGuide.value) return {}
  const isHorizontal = creatingGuide.value.type === 'horizontal'
  return {
    points: isHorizontal
      ? [0, creatingGuide.value.position, stageWidth.value, creatingGuide.value.position]
      : [creatingGuide.value.position, 0, creatingGuide.value.position, stageHeight.value],
    stroke: '#1890ff',
    strokeWidth: 1 / canvasStore.scale,
    dash: [4 / canvasStore.scale, 4 / canvasStore.scale],
    listening: false
  }
})

let isPanning = false
let startX = 0
let startY = 0
let startOffsetX = 0
let startOffsetY = 0

let isDraggingGuide = false
let draggingGuideId: string | null = null
let isCreatingFromRuler = false

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  canvasStore.setScale(canvasStore.scale + delta)
}

function handleStageMouseDown(e: any) {
  const evt = e.evt || e
  if (evt.button === 1 || (evt.button === 0 && evt.altKey)) {
    isPanning = true
    startX = evt.clientX
    startY = evt.clientY
    startOffsetX = canvasStore.offsetX
    startOffsetY = canvasStore.offsetY
    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
  }
}

function handleStageMouseMove(e: any) {
  if (isDraggingGuide && draggingGuideId) {
    const pos = getStagePointerPosition(e)
    const guide = canvasStore.guides.find(g => g.id === draggingGuideId)
    if (guide) {
      const newPos = guide.type === 'horizontal' ? pos.y : pos.x
      canvasStore.updateGuide(draggingGuideId, newPos)
    }
  }
}

function handleStageMouseUp() {
  if (isCreatingFromRuler) return
  isDraggingGuide = false
  draggingGuideId = null
}

function handleStageDblClick() {}

function handleWindowMouseMove(e: MouseEvent) {
  if (!isPanning) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  canvasStore.setOffset(startOffsetX + dx, startOffsetY + dy)
}

function handleWindowMouseUp() {
  isPanning = false
  window.removeEventListener('mousemove', handleWindowMouseMove)
  window.removeEventListener('mouseup', handleWindowMouseUp)
}

function getStagePointerPosition(e: any): { x: number; y: number } {
  if (!stageRef.value) return { x: 0, y: 0 }
  const stage = stageRef.value.getStage()
  const pos = stage.getPointerPosition()
  if (!pos) return { x: 0, y: 0 }
  return {
    x: (pos.x - canvasStore.offsetX) / canvasStore.scale,
    y: (pos.y - canvasStore.offsetY) / canvasStore.scale
  }
}

function handleRulerMouseDown(e: MouseEvent, type: 'horizontal' | 'vertical') {
  e.preventDefault()
  if (!stageRef.value) return
  const stage = stageRef.value.getStage()
  const pos = stage.getPointerPosition()
  if (!pos) return

  const stagePos = {
    x: (pos.x - canvasStore.offsetX) / canvasStore.scale,
    y: (pos.y - canvasStore.offsetY) / canvasStore.scale
  }

  creatingGuide.value = {
    type,
    position: type === 'horizontal' ? stagePos.y : stagePos.x
  }
  isCreatingFromRuler = true

  window.addEventListener('mousemove', handleRulerMouseMove)
  window.addEventListener('mouseup', handleRulerMouseUp)
}

function handleRulerMouseMove(e: MouseEvent) {
  if (!creatingGuide.value || !stageRef.value) return
  const stage = stageRef.value.getStage()
  const pos = stage.getPointerPosition()
  if (!pos) return
  const stagePos = {
    x: (pos.x - canvasStore.offsetX) / canvasStore.scale,
    y: (pos.y - canvasStore.offsetY) / canvasStore.scale
  }
  if (creatingGuide.value.type === 'horizontal') {
    creatingGuide.value.position = stagePos.y
  } else {
    creatingGuide.value.position = stagePos.x
  }
}

function handleRulerMouseUp() {
  if (creatingGuide.value && isCreatingFromRuler) {
    canvasStore.addGuide(creatingGuide.value.type, creatingGuide.value.position)
    creatingGuide.value = null
    isCreatingFromRuler = false
  }
  window.removeEventListener('mousemove', handleRulerMouseMove)
  window.removeEventListener('mouseup', handleRulerMouseUp)
}

function handleGuideMouseDown(e: any, guide: GuideLine) {
  e.cancelBubble = true
  isDraggingGuide = true
  draggingGuideId = guide.id
}

function handleGuideDblClick(id: string) {
  canvasStore.removeGuide(id)
}

function toggleSpread() {
  bookStore.toggleSpreadView()
}

function handleElementClick(el: PageElement) {
  message.info(`选中元素: ${el.type} - ${el.content.slice(0, 20)}`)
  canvasStore.selectElement(el.id)
}

const focusedPulse = ref(false)

function getCurrentPagePageX(): number {
  if (showSpreadView.value && hasPages.value) {
    const idx = bookStore.currentPageIndex
    const leftIdx = idx % 2 === 0 ? idx - 1 : idx
    if (idx === leftIdx) return getSpreadPageX(0)
    return getSpreadPageX(1)
  }
  return singlePageX.value
}

function scrollToCollationFocus() {
  const rect = bookStore.focusedCollationRect
  const pageId = bookStore.currentPageId
  if (!rect || !pageId || !bookStore.currentPage || !displayTemplate.value) return

  const tpl = displayTemplate.value
  const pageContentX = tpl.margins.left
  const pageContentY = tpl.margins.top

  const pageX = getCurrentPagePageX()
  const targetWorldX = pageX + rect.x
  const targetWorldY = pageY.value + rect.y

  const stageCenterX = stageWidth.value / 2
  const stageCenterY = stageHeight.value / 2

  const newOffsetX = stageCenterX - targetWorldX * canvasStore.scale
  const newOffsetY = stageCenterY - targetWorldY * canvasStore.scale

  canvasStore.setOffset(newOffsetX, newOffsetY)

  focusedPulse.value = true
  setTimeout(() => {
    focusedPulse.value = false
    bookStore.clearCollationFocus()
  }, 1200)
}

watch(
  () => [bookStore.focusedCollationMatchId, bookStore.currentPageId],
  async () => {
    if (bookStore.focusedCollationMatchId && bookStore.focusedCollationRect) {
      await nextTick()
      scrollToCollationFocus()
    }
  }
)

function handleCollationMatchClick(match: CollationMatch) {
  message.info(
    `${match.type === 'variant' ? '异体字' : match.type === 'borrowed' ? '通假字' : '避讳字'}: ${match.originalChar} → ${match.standardChar}`
  )
}

function updateSize() {
  if (!wrapperRef.value) return
  const rect = wrapperRef.value.getBoundingClientRect()
  stageWidth.value = rect.width
  stageHeight.value = rect.height
}

onMounted(() => {
  updateSize()
  window.addEventListener('resize', updateSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSize)
  window.removeEventListener('mousemove', handleWindowMouseMove)
  window.removeEventListener('mouseup', handleWindowMouseUp)
  window.removeEventListener('mousemove', handleRulerMouseMove)
  window.removeEventListener('mouseup', handleRulerMouseUp)
})
</script>

<style scoped>
.canvas-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  cursor: grab;
}

.canvas-wrapper:active {
  cursor: grabbing;
}

.page-navigator {
  position: absolute;
  top: 0;
  left: 20px;
  right: 0;
  height: 48px;
  z-index: 15;
  background-color: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ruler {
  position: absolute;
  background-color: #fafafa;
  border: 1px solid #d9d9d9;
  z-index: 10;
  overflow: hidden;
  user-select: none;
}

.ruler-h {
  top: 48px;
  left: 20px;
  right: 0;
  height: 20px;
  border-left: none;
  border-right: none;
  cursor: ns-resize;
}

.ruler-v {
  top: 68px;
  left: 0;
  bottom: 0;
  width: 20px;
  border-top: none;
  border-bottom: none;
  cursor: ew-resize;
}

.ruler-content {
  position: relative;
  width: 100%;
  height: 100%;
}

.ruler-tick {
  position: absolute;
  top: 0;
  font-size: 9px;
  color: #666;
}

.ruler-tick.vertical {
  left: 0;
}

.tick-line {
  position: absolute;
  background-color: #999;
}

.ruler-h .tick-line {
  left: 0;
  top: 0;
  width: 1px;
  height: 6px;
}

.ruler-h .tick-line.major {
  height: 10px;
  background-color: #666;
}

.ruler-v .tick-line {
  top: 0;
  left: 0;
  height: 1px;
  width: 6px;
}

.ruler-v .tick-line.major {
  width: 10px;
  background-color: #666;
}

.tick-label {
  position: absolute;
  white-space: nowrap;
}

.ruler-h .tick-label {
  left: 2px;
  top: 10px;
}

.ruler-v .tick-label {
  top: 2px;
  left: 10px;
  transform: rotate(-90deg);
  transform-origin: left top;
}

.ruler-corner {
  position: absolute;
  top: 48px;
  left: 0;
  width: 20px;
  height: 20px;
  background-color: #f0f0f0;
  border: 1px solid #d9d9d9;
  z-index: 11;
}

.canvas-info {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  gap: 12px;
  z-index: 20;
}
</style>
