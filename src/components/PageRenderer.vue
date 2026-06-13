<template>
  <v-group v-if="template" :config="{ x, y }">
    <v-rect
      :config="{
        width: template.pageSize.width,
        height: template.pageSize.height,
        fill: '#f5f0e6',
        stroke: '#d9d2c3',
        strokeWidth: 1,
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowBlur: 10,
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        listening: false
      }"
    />

    <v-group :config="{ x: typeSettingX, y: typeSettingY }">
      <v-rect
        :config="{
          width: typeSettingWidth,
          height: typeSettingHeight,
          fill: '#faf6ed',
          listening: false
        }"
      />
      <v-rect
        :config="{
          width: typeSettingWidth,
          height: typeSettingHeight,
          stroke: template.border.color,
          strokeWidth: template.border.lineWidth,
          listening: true,
          name: 'border'
        }"
      />

      <v-group v-if="template.centerLine.enabled">
        <v-line
          :config="{
            points: [typeSettingWidth / 2, 0, typeSettingWidth / 2, typeSettingHeight],
            stroke: template.centerLine.color,
            strokeWidth: template.centerLine.lineWidth,
            listening: false
          }"
        />
      </v-group>

      <v-group v-for="(col, index) in columnLines" :key="index">
        <v-line
          :config="{
            points: [col, 0, col, typeSettingHeight],
            stroke: template.column.color,
            strokeWidth: template.column.lineWidth,
            listening: false
          }"
        />
      </v-group>

      <template v-if="template.fishTail.position === 'top' || template.fishTail.position === 'both'">
        <FishTail
          :x="typeSettingWidth / 2 - template.fishTail.width / 2"
          :y="fishTailTopY"
          :width="template.fishTail.width"
          :height="template.fishTail.height"
          :style="template.fishTail.style"
          :line-width="template.fishTail.lineWidth"
          :color="template.column.color"
          :orientation="'down'"
        />
      </template>

      <template v-if="template.fishTail.position === 'bottom' || template.fishTail.position === 'both'">
        <FishTail
          :x="typeSettingWidth / 2 - template.fishTail.width / 2"
          :y="fishTailBottomY"
          :width="template.fishTail.width"
          :height="template.fishTail.height"
          :style="template.fishTail.style"
          :line-width="template.fishTail.lineWidth"
          :color="template.column.color"
          :orientation="'up'"
        />
      </template>

      <v-group v-if="showHandles">
        <v-rect
          :config="topHandleConfig"
          @mousedown.stop="handleHandleMouseDown($event, 'top')"
          @mousemove.stop="handleHandleMouseMove"
          @mouseup.stop="handleHandleMouseUp"
        />
        <v-rect
          :config="bottomHandleConfig"
          @mousedown.stop="handleHandleMouseDown($event, 'bottom')"
          @mousemove.stop="handleHandleMouseMove"
          @mouseup.stop="handleHandleMouseUp"
        />
        <v-rect
          :config="leftHandleConfig"
          @mousedown.stop="handleHandleMouseDown($event, 'left')"
          @mousemove.stop="handleHandleMouseMove"
          @mouseup.stop="handleHandleMouseUp"
        />
        <v-rect
          :config="rightHandleConfig"
          @mousedown.stop="handleHandleMouseDown($event, 'right')"
          @mousemove.stop="handleHandleMouseMove"
          @mouseup.stop="handleHandleMouseUp"
        />
      </v-group>

      <MarginLabels
        :margins="template.margins"
        :page-size="template.pageSize"
        :type-setting-width="typeSettingWidth"
        :type-setting-height="typeSettingHeight"
        :page-side="pageSide"
      />
    </v-group>

    <PageLabels
      :template="template"
      :page-side="pageSide"
      :type-setting-x="typeSettingX"
      :type-setting-y="typeSettingY"
      :type-setting-width="typeSettingWidth"
      :type-setting-height="typeSettingHeight"
    />
  </v-group>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTemplateStore } from '@/stores/template'
import type { PageTemplate, PageSide } from '@/types'
import FishTail from './FishTail.vue'
import MarginLabels from './MarginLabels.vue'
import PageLabels from './PageLabels.vue'

const props = defineProps<{
  template: PageTemplate | null
  pageSide: PageSide
  x: number
  y: number
  scale: number
}>()

const emit = defineEmits<{
  (e: 'select', element: string): void
}>()

const templateStore = useTemplateStore()
const showHandles = ref(true)

const typeSettingX = computed(() => {
  if (!props.template) return 0
  return props.template.margins.left
})

const typeSettingY = computed(() => {
  if (!props.template) return 0
  return props.template.margins.top
})

const typeSettingWidth = computed(() => {
  if (!props.template) return 0
  return props.template.pageSize.width - props.template.margins.left - props.template.margins.right
})

const typeSettingHeight = computed(() => {
  if (!props.template) return 0
  return props.template.pageSize.height - props.template.margins.top - props.template.margins.bottom
})

const columnLines = computed(() => {
  if (!props.template || props.template.column.count <= 1) return []
  const lines: number[] = []
  const count = props.template.column.count
  const spacing = props.template.column.spacing
  const totalSpacing = (count - 1) * spacing
  const contentWidth = typeSettingWidth.value - totalSpacing
  const columnWidth = contentWidth / count

  for (let i = 1; i < count; i++) {
    lines.push(i * columnWidth + (i - 1) * spacing + spacing / 2)
  }
  return lines
})

const fishTailTopY = computed(() => {
  if (!props.template) return 0
  return 10
})

const fishTailBottomY = computed(() => {
  if (!props.template) return 0
  return typeSettingHeight.value - props.template.fishTail.height - 10
})

const HANDLE_SIZE = 6

const topHandleConfig = computed(() => ({
  x: -HANDLE_SIZE / 2,
  y: -HANDLE_SIZE / 2,
  width: typeSettingWidth.value + HANDLE_SIZE,
  height: HANDLE_SIZE,
  fill: '#18a0fb',
  opacity: 0.3,
  cursor: 'ns-resize',
  listening: true
}))

const bottomHandleConfig = computed(() => ({
  x: -HANDLE_SIZE / 2,
  y: typeSettingHeight.value - HANDLE_SIZE / 2,
  width: typeSettingWidth.value + HANDLE_SIZE,
  height: HANDLE_SIZE,
  fill: '#18a0fb',
  opacity: 0.3,
  cursor: 'ns-resize',
  listening: true
}))

const leftHandleConfig = computed(() => ({
  x: -HANDLE_SIZE / 2,
  y: -HANDLE_SIZE / 2,
  width: HANDLE_SIZE,
  height: typeSettingHeight.value + HANDLE_SIZE,
  fill: '#18a0fb',
  opacity: 0.3,
  cursor: 'ew-resize',
  listening: true
}))

const rightHandleConfig = computed(() => ({
  x: typeSettingWidth.value - HANDLE_SIZE / 2,
  y: -HANDLE_SIZE / 2,
  width: HANDLE_SIZE,
  height: typeSettingHeight.value + HANDLE_SIZE,
  fill: '#18a0fb',
  opacity: 0.3,
  cursor: 'ew-resize',
  listening: true
}))

let isDraggingHandle = false
let dragHandleType: 'top' | 'bottom' | 'left' | 'right' | null = null
let dragStartX = 0
let dragStartY = 0
let dragStartMargins = { top: 0, bottom: 0, left: 0, right: 0 }

function handleHandleMouseDown(e: any, type: 'top' | 'bottom' | 'left' | 'right') {
  if (!props.template) return
  isDraggingHandle = true
  dragHandleType = type
  const evt = e.evt || e
  dragStartX = evt.clientX
  dragStartY = evt.clientY
  dragStartMargins = { ...props.template.margins }
  window.addEventListener('mousemove', handleWindowMouseMove)
  window.addEventListener('mouseup', handleWindowMouseUp)
}

function handleHandleMouseMove() {}

function handleHandleMouseUp() {}

function handleWindowMouseMove(e: MouseEvent) {
  if (!isDraggingHandle || !dragHandleType || !props.template) return

  const dx = (e.clientX - dragStartX) / props.scale
  const dy = (e.clientY - dragStartY) / props.scale
  const newMargins = { ...dragStartMargins }
  const tpl = props.template

  switch (dragHandleType) {
    case 'top':
      newMargins.top = Math.max(0, dragStartMargins.top + dy)
      if (tpl.pageSize.height - newMargins.top - newMargins.bottom <= 20) {
        newMargins.top = tpl.pageSize.height - newMargins.bottom - 20
      }
      break
    case 'bottom':
      newMargins.bottom = Math.max(0, dragStartMargins.bottom - dy)
      if (tpl.pageSize.height - newMargins.top - newMargins.bottom <= 20) {
        newMargins.bottom = tpl.pageSize.height - newMargins.top - 20
      }
      break
    case 'left':
      newMargins.left = Math.max(0, dragStartMargins.left + dx)
      if (tpl.pageSize.width - newMargins.left - newMargins.right <= 20) {
        newMargins.left = tpl.pageSize.width - newMargins.right - 20
      }
      break
    case 'right':
      newMargins.right = Math.max(0, dragStartMargins.right - dx)
      if (tpl.pageSize.width - newMargins.left - newMargins.right <= 20) {
        newMargins.right = tpl.pageSize.width - newMargins.left - 20
      }
      break
  }

  templateStore.updateTemplate(props.template.id, { margins: newMargins })
}

function handleWindowMouseUp() {
  isDraggingHandle = false
  dragHandleType = null
  window.removeEventListener('mousemove', handleWindowMouseMove)
  window.removeEventListener('mouseup', handleWindowMouseUp)
}
</script>
