<template>
  <div class="violation-panel">
    <div class="panel-header">
      <n-space justify="space-between" style="width: 100%">
        <span class="panel-title">版式校验</span>
        <n-space>
          <n-button size="tiny" @click="runCurrentPageCheck">
            <template #icon><n-icon><Search /></n-icon></template>
            当前页
          </n-button>
          <n-button size="tiny" type="primary" :disabled="!bookStore.currentBookId" @click="runBookCheck">
            <template #icon><n-icon><CheckmarkCircle /></n-icon></template>
            全书校验
          </n-button>
        </n-space>
      </n-space>
    </div>

    <div class="violation-summary" v-if="allViolations.length > 0">
      <n-space>
        <n-tag type="error" size="small">错误: {{ errorCount }}</n-tag>
        <n-tag type="warning" size="small">警告: {{ warningCount }}</n-tag>
        <n-tag size="small">共 {{ allViolations.length }} 项</n-tag>
      </n-space>
    </div>

    <div class="filter-bar" v-if="allViolations.length > 0">
      <n-radio-group v-model:value="filterType" size="small">
        <n-radio-button value="all">全部</n-radio-button>
        <n-radio-button value="error">错误</n-radio-button>
        <n-radio-button value="warning">警告</n-radio-button>
      </n-radio-group>
    </div>

    <div class="violation-list" v-if="filteredViolations.length > 0">
      <n-list bordered size="small">
        <n-list-item
          v-for="v in filteredViolations"
          :key="v.id"
          class="violation-item"
          @click="handleViolationClick(v)"
        >
          <n-space align="start" style="width: 100%">
            <n-tag :type="v.severity === 'error' ? 'error' : 'warning'" size="small" round>
              {{ v.severity === 'error' ? '错误' : '警告' }}
            </n-tag>
            <div style="flex: 1; min-width: 0">
              <div class="violation-type">{{ getViolationLabel(v.type) }}</div>
              <div class="violation-message">{{ v.message }}</div>
              <div class="violation-location">
                位置: ({{ Math.round(v.rect.x) }}, {{ Math.round(v.rect.y) }}) {{ Math.round(v.rect.width) }}×{{ Math.round(v.rect.height) }}
              </div>
            </div>
          </n-space>
        </n-list-item>
      </n-list>
    </div>

    <div v-else class="empty-state">
      <n-empty :description="runCount === 0 ? '点击按钮开始校验' : '未发现违规项，版式合规'" />
    </div>

    <n-divider style="margin: 12px 0" />

    <div class="legend-section">
      <div class="legend-title">违规类型说明</div>
      <n-space vertical size="small">
        <n-space>
          <n-tag type="error" size="small">错误</n-tag>
          <span class="legend-text">版心越界: 元素超出版心区域</span>
        </n-space>
        <n-space>
          <n-tag type="error" size="small">错误</n-tag>
          <span class="legend-text">鱼尾遮挡: 元素与鱼尾标记重叠</span>
        </n-space>
        <n-space>
          <n-tag type="warning" size="small">警告</n-tag>
          <span class="legend-text">栏线冲突: 元素与栏线位置交叉</span>
        </n-space>
        <n-space>
          <n-tag type="warning" size="small">警告</n-tag>
          <span class="legend-text">装订边冲突: 元素靠近装订区域</span>
        </n-space>
      </n-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NSpace, NButton, NIcon, NTag, NList, NListItem, NEmpty,
  NRadioGroup, NRadioButton, NDivider, useMessage
} from 'naive-ui'
import { Search, CheckmarkCircle } from '@vicons/ionicons5'
import { useBookStore } from '@/stores/book'
import { useTemplateStore } from '@/stores/template'
import type { ViolationItem, ViolationType } from '@/types'

const emit = defineEmits<{
  (e: 'locate', violation: ViolationItem): void
}>()

const bookStore = useBookStore()
const templateStore = useTemplateStore()
const message = useMessage()

const filterType = ref<'all' | 'error' | 'warning'>('all')
const runCount = ref(0)

const allViolations = computed<ViolationItem[]>(() => {
  if (!bookStore.currentBook) return []
  return bookStore.currentBook.chapters.flatMap(c => c.pages.flatMap(p => p.violations || []))
})

const filteredViolations = computed(() => {
  if (filterType.value === 'all') return allViolations.value
  return allViolations.value.filter(v => v.severity === filterType.value)
})

const errorCount = computed(() => allViolations.value.filter(v => v.severity === 'error').length)
const warningCount = computed(() => allViolations.value.filter(v => v.severity === 'warning').length)

function getViolationLabel(type: ViolationType): string {
  const map: Record<ViolationType, string> = {
    margin_overflow: '版心越界',
    column_conflict: '栏线冲突',
    fishtail_occlusion: '鱼尾遮挡',
    binding_conflict: '装订边冲突'
  }
  return map[type] || type
}

function runCurrentPageCheck() {
  if (!bookStore.currentPage) {
    message.warning('请先选择一个页面')
    return
  }
  const template = templateStore.templates.find(t => t.id === bookStore.currentPage?.templateId)
  if (!template) {
    message.warning('该页面未绑定版式')
    return
  }
  const violations = bookStore.runPageValidation(bookStore.currentPage.id)
  runCount.value++
  if (violations.length > 0) {
    message.warning(`发现 ${violations.length} 项违规`)
  } else {
    message.success('当前页校验通过')
  }
}

function runBookCheck() {
  if (!bookStore.currentBookId) {
    message.warning('请先选择一本书籍')
    return
  }
  const violations = bookStore.runBookValidation(bookStore.currentBookId)
  runCount.value++
  if (violations.length > 0) {
    message.warning(`全书共发现 ${violations.length} 项违规`)
  } else {
    message.success('全书校验通过')
  }
}

function handleViolationClick(v: ViolationItem) {
  bookStore.selectPage(v.pageId)
  emit('locate', v)
}
</script>

<style scoped>
.violation-panel {
  padding: 12px;
}

.panel-header {
  margin-bottom: 12px;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.violation-summary {
  margin-bottom: 10px;
}

.filter-bar {
  margin-bottom: 10px;
}

.violation-list {
  max-height: 320px;
  overflow-y: auto;
}

.violation-item {
  cursor: pointer;
  transition: background-color 0.15s;
}

.violation-item:hover {
  background-color: #f5f5f5;
}

.violation-type {
  font-size: 12px;
  font-weight: 600;
  color: #1f1f1f;
}

.violation-message {
  font-size: 12px;
  color: #555;
  margin-top: 2px;
}

.violation-location {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.empty-state {
  padding: 20px 0;
}

.legend-section {
  padding: 0 4px;
}

.legend-title {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

.legend-text {
  font-size: 12px;
  color: #666;
}
</style>
