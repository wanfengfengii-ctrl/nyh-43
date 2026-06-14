<template>
  <div class="collation-panel">
    <div class="panel-header">
      <n-space justify="space-between" style="width: 100%">
        <span class="panel-title">古籍校勘</span>
        <n-space>
          <n-button size="tiny" @click="handleShowReport">
            <template #icon><n-icon><Document /></n-icon></template>
            导出报告
          </n-button>
        </n-space>
      </n-space>
    </div>

    <div class="scan-section">
      <n-space vertical style="width: 100%">
        <n-space style="width: 100%">
          <n-select
            v-model:value="scanScope"
            size="small"
            :options="scanScopeOptions"
            style="flex: 1"
          />
          <n-button
            size="small"
            type="primary"
            :disabled="!bookStore.currentBookId || isScanning"
            :loading="isScanning"
            @click="handleStartScan"
          >
            <template #icon><n-icon><Search /></n-icon></template>
            {{ isScanning ? '扫描中...' : '开始扫描' }}
          </n-button>
        </n-space>

        <n-select
          v-model:value="selectedChapterIds"
          size="small"
          multiple
          clearable
          :options="chapterOptions"
          placeholder="选择扫描章节（默认全部）"
          v-if="scanScope === 'selected'"
          style="width: 100%"
        />
      </n-space>
    </div>

    <div class="collation-summary" v-if="allMatches.length > 0">
      <n-space wrap>
        <n-tag type="warning" size="small">待处理: {{ pendingCount }}</n-tag>
        <n-tag type="success" size="small">已确认: {{ confirmedCount }}</n-tag>
        <n-tag type="default" size="small">已忽略: {{ ignoredCount }}</n-tag>
        <n-tag type="info" size="small">自定义: {{ customCount }}</n-tag>
        <n-tag size="small">总计: {{ allMatches.length }}</n-tag>
      </n-space>
    </div>

    <div class="filter-bar" v-if="allMatches.length > 0">
      <n-space vertical style="width: 100%">
        <n-space style="width: 100%">
          <n-radio-group v-model:value="filterStatus" size="small">
            <n-radio-button value="all">全部</n-radio-button>
            <n-radio-button value="pending">待处理</n-radio-button>
            <n-radio-button value="confirmed">已确认</n-radio-button>
            <n-radio-button value="ignored">已忽略</n-radio-button>
          </n-radio-group>
        </n-space>
        <n-space style="width: 100%">
          <n-select
            v-model:value="filterChapter"
            size="small"
            clearable
            :options="chapterFilterOptions"
            placeholder="按章节筛选"
            style="flex: 1"
          />
          <n-select
            v-model:value="filterType"
            size="small"
            clearable
            :options="typeFilterOptions"
            placeholder="按类型筛选"
            style="width: 140px"
          />
        </n-space>
        <n-space style="width: 100%">
          <n-slider
            v-model:value="confidenceRange"
            :min="0"
            :max="1"
            :step="0.05"
            range
            style="flex: 1"
          />
          <span class="confidence-label">
            {{ (confidenceRange[0] * 100).toFixed(0) }}% - {{ (confidenceRange[1] * 100).toFixed(0) }}%
          </span>
        </n-space>
      </n-space>
    </div>

    <div class="batch-actions" v-if="filteredMatches.length > 0">
      <n-space>
        <n-button size="tiny" type="success" @click="handleBatchConfirm">
          <template #icon><n-icon><Checkmark /></n-icon></template>
          批量确认 ({{ filteredPendingCount }})
        </n-button>
        <n-button size="tiny" type="default" @click="handleBatchIgnore">
          <template #icon><n-icon><Close /></n-icon></template>
          批量忽略 ({{ filteredPendingCount }})
        </n-button>
        <n-button size="tiny" type="error" quaternary @click="handleClearAll">
          清空结果
        </n-button>
      </n-space>
    </div>

    <div class="match-list" v-if="allMatches.length > 0">
      <n-list bordered size="small">
        <n-list-item
          v-for="match in filteredMatches"
          :key="match.id"
          class="match-item"
          :class="{ 'is-selected': selectedMatchId === match.id }"
          @click="handleSelectMatch(match)"
        >
          <n-space align="start" style="width: 100%">
            <div class="match-indicator" :style="{ backgroundColor: getTypeColor(match.type) }"></div>
            <div style="flex: 1; min-width: 0">
              <div class="match-header">
                <n-space align="center">
                  <n-tag
                    size="small"
                    :style="{ backgroundColor: getTypeColor(match.type), color: '#fff' }"
                    round
                  >
                    {{ getTypeLabel(match.type) }}
                  </n-tag>
                  <n-tag
                    size="small"
                    :type="getStatusTagType(match.status)"
                    round
                  >
                    {{ getStatusLabel(match.status) }}
                  </n-tag>
                  <span class="match-location" @click.stop="handleLocateMatch(match)">
                    {{ getChapterTitle(match.chapterId) }} · 第{{ getPageNumber(match.pageId) }}页
                    <n-icon class="locate-icon"><Navigate /></n-icon>
                  </span>
                </n-space>
              </div>
              <div class="match-chars">
                <span class="original-char">{{ match.originalChar }}</span>
                <n-icon class="arrow-icon"><ArrowForward /></n-icon>
                <span class="standard-char">{{ match.standardChar }}</span>
                <span class="confidence-badge">
                  置信度 {{ (match.confidence * 100).toFixed(0) }}%
                </span>
              </div>
              <div class="match-source">出处: {{ match.source }}</div>
              <div class="match-description">{{ match.description }}</div>
              <div class="match-actions" v-if="match.status === 'pending'">
                <n-space>
                  <n-button
                    size="tiny"
                    type="success"
                    @click.stop="handleConfirm(match)"
                  >
                    <template #icon><n-icon><Checkmark /></n-icon></template>
                    确认
                  </n-button>
                  <n-button
                    size="tiny"
                    type="default"
                    @click.stop="handleIgnore(match)"
                  >
                    <template #icon><n-icon><Close /></n-icon></template>
                    忽略
                  </n-button>
                  <n-button
                    size="tiny"
                    type="primary"
                    @click.stop="handleAddToRules(match)"
                  >
                    <template #icon><n-icon><Add /></n-icon></template>
                    加入规则
                  </n-button>
                </n-space>
              </div>
              <div class="match-actions" v-else>
                <n-space>
                  <n-button
                    size="tiny"
                    type="warning"
                    quaternary
                    @click.stop="handleReset(match)"
                  >
                    <template #icon><n-icon><Refresh /></n-icon></template>
                    重新处理
                  </n-button>
                  <n-button
                    v-if="match.status !== 'custom'"
                    size="tiny"
                    type="primary"
                    quaternary
                    @click.stop="handleAddToRules(match)"
                  >
                    <template #icon><n-icon><Add /></n-icon></template>
                    加入规则
                  </n-button>
                </n-space>
              </div>
            </div>
          </n-space>
        </n-list-item>
      </n-list>
    </div>

    <div v-else-if="!isScanning" class="empty-state">
      <n-empty :description="bookStore.currentBook ? '点击上方开始扫描按钮进行校勘' : '请先创建或选择一本书籍'" />
    </div>

    <CollationReportDialog
      v-model:show="showReportDialog"
      :book-id="bookStore.currentBookId || ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NSpace, NButton, NIcon, NTag, NList, NListItem, NInput,
  NRadioGroup, NRadioButton, NSelect, NSlider, NEmpty, useMessage, useDialog
} from 'naive-ui'
import {
  Search, Document, ArrowForward, Checkmark, Close, Add, Refresh, Navigate
} from '@vicons/ionicons5'
import { useBookStore } from '@/stores/book'
import { useCollationRuleStore } from '@/stores/collation-rules'
import { useCollationHistoryStore } from '@/stores/collation-history'
import type { CollationMatch, CollationRuleType } from '@/types'
import {
  getRuleTypeLabel, getRuleTypeColor, getMatchStatusLabel, getMatchStatusColor,
  buildRulesForScan
} from '@/utils/collation'
import CollationReportDialog from './CollationReportDialog.vue'

const bookStore = useBookStore()
const ruleStore = useCollationRuleStore()
const historyStore = useCollationHistoryStore()
const message = useMessage()
const dialog = useDialog()

const isScanning = ref(false)
const scanScope = ref<'all' | 'current' | 'selected'>('all')
const selectedChapterIds = ref<string[]>([])
const selectedMatchId = ref<string | null>(null)
const showReportDialog = ref(false)

const filterStatus = ref<'all' | 'pending' | 'confirmed' | 'ignored' | 'custom'>('all')
const filterChapter = ref<string | null>(null)
const filterType = ref<string | null>(null)
const confidenceRange = ref<[number, number]>([0, 1])

const scanScopeOptions = [
  { label: '扫描全书', value: 'all' },
  { label: '扫描当前章节', value: 'current' },
  { label: '扫描指定章节', value: 'selected' }
]

const chapterOptions = computed(() => {
  if (!bookStore.currentBook) return []
  return bookStore.currentBook.chapters.map(c => ({
    label: c.title,
    value: c.id
  }))
})

const chapterFilterOptions = computed(() => {
  if (!bookStore.currentBook) return []
  return bookStore.currentBook.chapters.map(c => ({
    label: c.title,
    value: c.id
  }))
})

const typeFilterOptions = [
  { label: '异体字', value: 'variant' },
  { label: '通假字', value: 'borrowed' },
  { label: '避讳字', value: 'taboo' }
]

const allMatches = computed<CollationMatch[]>(() => {
  if (!bookStore.currentBookId) return []
  return bookStore.getBookCollationMatches(bookStore.currentBookId)
})

const filteredMatches = computed(() => {
  let result = allMatches.value
  if (filterStatus.value !== 'all') {
    if (filterStatus.value === 'custom') {
      result = result.filter(m => m.status === 'custom')
    } else {
      result = result.filter(m => m.status === filterStatus.value)
    }
  }
  if (filterChapter.value) {
    result = result.filter(m => m.chapterId === filterChapter.value)
  }
  if (filterType.value) {
    result = result.filter(m => m.type === filterType.value)
  }
  result = result.filter(m =>
    m.confidence >= confidenceRange.value[0] &&
    m.confidence <= confidenceRange.value[1]
  )
  return result
})

const filteredPendingCount = computed(() =>
  filteredMatches.value.filter(m => m.status === 'pending').length
)

const pendingCount = computed(() => allMatches.value.filter(m => m.status === 'pending').length)
const confirmedCount = computed(() => allMatches.value.filter(m => m.status === 'confirmed').length)
const ignoredCount = computed(() => allMatches.value.filter(m => m.status === 'ignored').length)
const customCount = computed(() => allMatches.value.filter(m => m.status === 'custom').length)

function getTypeLabel(type: CollationRuleType): string {
  return getRuleTypeLabel(type)
}

function getTypeColor(type: CollationRuleType): string {
  return getRuleTypeColor(type)
}

function getStatusLabel(status: CollationMatch['status']): string {
  return getMatchStatusLabel(status)
}

function getStatusTagType(status: CollationMatch['status']): 'success' | 'warning' | 'default' | 'info' {
  const map: Record<CollationMatch['status'], 'success' | 'warning' | 'default' | 'info'> = {
    pending: 'warning',
    confirmed: 'success',
    ignored: 'default',
    custom: 'info'
  }
  return map[status]
}

function getChapterTitle(chapterId: string): string {
  const chapter = bookStore.currentBook?.chapters.find(c => c.id === chapterId)
  return chapter?.title || '未知章节'
}

function getPageNumber(pageId: string): number {
  for (const chapter of bookStore.currentBook?.chapters || []) {
    const page = chapter.pages.find(p => p.id === pageId)
    if (page) return page.pageNumber
  }
  return 0
}

async function handleStartScan() {
  if (!bookStore.currentBookId) return
  isScanning.value = true

  try {
    const scanRules = buildRulesForScan(ruleStore.allRules)
    let chapterIdsToScan: string[] = []

    if (scanScope.value === 'current') {
      if (bookStore.currentChapterId) {
        chapterIdsToScan = [bookStore.currentChapterId]
      }
    } else if (scanScope.value === 'selected') {
      chapterIdsToScan = selectedChapterIds.value
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    const matches = bookStore.runBookCollation(
      bookStore.currentBookId,
      chapterIdsToScan.length > 0 ? chapterIdsToScan : undefined,
      scanRules
    )

    if (bookStore.currentBook) {
      const historyChapterIds = chapterIdsToScan.length > 0
        ? chapterIdsToScan
        : bookStore.currentBook.chapters.map(c => c.id)
      historyStore.createHistory(
        bookStore.currentBookId,
        bookStore.currentBook.title,
        historyChapterIds,
        matches
      )
    }

    message.success(`扫描完成，共发现 ${matches.length} 处疑似字词`)
  } catch (e) {
    message.error('扫描失败')
  } finally {
    isScanning.value = false
  }
}

function handleSelectMatch(match: CollationMatch) {
  selectedMatchId.value = match.id
}

function handleLocateMatch(match: CollationMatch) {
  bookStore.selectPage(match.pageId)
  message.info(`已定位到 ${getChapterTitle(match.chapterId)} 第${getPageNumber(match.pageId)}页`)
}

function handleConfirm(match: CollationMatch) {
  bookStore.updateCollationMatchStatus(match.id, 'confirmed')
  updateHistory()
  message.success('已确认')
}

function handleIgnore(match: CollationMatch) {
  bookStore.updateCollationMatchStatus(match.id, 'ignored')
  updateHistory()
  message.info('已忽略')
}

function handleReset(match: CollationMatch) {
  bookStore.updateCollationMatchStatus(match.id, 'pending')
  updateHistory()
}

function handleAddToRules(match: CollationMatch) {
  const rule = ruleStore.addMatchToRules({
    originalChar: match.originalChar,
    standardChar: match.standardChar,
    type: match.type,
    source: match.source,
    description: match.description,
    confidence: match.confidence
  })
  bookStore.updateCollationMatchStatus(match.id, 'custom')
  updateHistory()
  message.success(`已加入规则库: ${rule.originalChar} → ${rule.standardChar}`)
}

function handleBatchConfirm() {
  const pendingMatches = filteredMatches.value.filter(m => m.status === 'pending')
  if (pendingMatches.length === 0) {
    message.warning('没有待处理的项')
    return
  }
  dialog.warning({
    title: '批量确认',
    content: `确定要批量确认 ${pendingMatches.length} 项吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: () => {
      for (const m of pendingMatches) {
        bookStore.updateCollationMatchStatus(m.id, 'confirmed')
      }
      updateHistory()
      message.success(`已批量确认 ${pendingMatches.length} 项`)
    }
  })
}

function handleBatchIgnore() {
  const pendingMatches = filteredMatches.value.filter(m => m.status === 'pending')
  if (pendingMatches.length === 0) {
    message.warning('没有待处理的项')
    return
  }
  dialog.warning({
    title: '批量忽略',
    content: `确定要批量忽略 ${pendingMatches.length} 项吗？`,
    positiveText: '忽略',
    negativeText: '取消',
    onPositiveClick: () => {
      for (const m of pendingMatches) {
        bookStore.updateCollationMatchStatus(m.id, 'ignored')
      }
      updateHistory()
      message.info(`已批量忽略 ${pendingMatches.length} 项`)
    }
  })
}

function handleClearAll() {
  if (!bookStore.currentBookId) return
  dialog.warning({
    title: '清空校勘结果',
    content: '确定要清空所有校勘结果吗？此操作不可恢复。',
    positiveText: '清空',
    negativeText: '取消',
    onPositiveClick: () => {
      bookStore.clearBookCollation(bookStore.currentBookId!)
      message.success('已清空校勘结果')
    }
  })
}

function handleShowReport() {
  showReportDialog.value = true
}

function updateHistory() {
  if (historyStore.currentHistory && bookStore.currentBookId) {
    historyStore.updateHistoryStats(
      historyStore.currentHistory.id,
      bookStore.getBookCollationMatches(bookStore.currentBookId)
    )
  }
}

watch(() => bookStore.currentBookId, () => {
  selectedMatchId.value = null
  filterChapter.value = null
})
</script>

<style scoped>
.collation-panel {
  padding: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  margin-bottom: 12px;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.scan-section {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.collation-summary {
  margin-bottom: 12px;
}

.filter-bar {
  margin-bottom: 12px;
  padding: 10px;
  background-color: #fafafa;
  border-radius: 4px;
}

.confidence-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.batch-actions {
  margin-bottom: 12px;
}

.match-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.match-item {
  padding: 12px !important;
  cursor: pointer;
  transition: background-color 0.2s;
}

.match-item:hover {
  background-color: #f5f5f5;
}

.match-item.is-selected {
  background-color: #e6f7ff;
}

.match-indicator {
  width: 4px;
  height: 48px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-top: 4px;
}

.match-header {
  margin-bottom: 6px;
}

.match-location {
  font-size: 12px;
  color: #1890ff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.match-location:hover {
  text-decoration: underline;
}

.locate-icon {
  font-size: 12px;
}

.match-chars {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.original-char {
  color: #d4380d;
  font-size: 20px;
}

.standard-char {
  color: #52c41a;
  font-size: 20px;
}

.arrow-icon {
  color: #999;
  font-size: 14px;
}

.confidence-badge {
  font-size: 11px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
  font-weight: normal;
}

.match-source {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.match-description {
  font-size: 12px;
  color: #555;
  margin-bottom: 8px;
}

.match-actions {
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
}

.empty-state {
  padding: 40px 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
