<template>
  <div class="collation-history-panel">
    <div class="panel-header">
      <n-space justify="space-between" style="width: 100%">
        <span class="panel-title">校勘历史</span>
        <n-space v-if="histories.length > 0">
          <n-button
            size="tiny"
            type="error"
            quaternary
            :disabled="!currentBookId"
            @click="handleClearByBook"
          >
            <template #icon><n-icon><Trash /></n-icon></template>
            清除本书记录
          </n-button>
        </n-space>
      </n-space>
    </div>

    <div class="filter-section" v-if="histories.length > 0">
      <n-space style="width: 100%">
        <n-select
          v-model:value="filterBookId"
          size="small"
          clearable
          :options="bookOptions"
          placeholder="按书籍筛选"
          style="flex: 1"
        />
        <n-button
          size="tiny"
          type="default"
          @click="handleClearAll"
        >
          <template #icon><n-icon><Refresh /></n-icon></template>
          清空全部
        </n-button>
      </n-space>
    </div>

    <div class="history-list" v-if="filteredHistories.length > 0">
      <n-timeline :type="'line'" size="medium">
        <n-timeline-item
          v-for="history in filteredHistories"
          :key="history.id"
          :type="getTimelineType(history)"
          :title="history.bookTitle"
          :time="formatTime(history.startTime)"
        >
          <div class="history-card" :class="{ 'is-current': history.id === historyStore.currentHistoryId }">
            <div class="history-header">
              <n-space justify="space-between" style="width: 100%">
                <n-space>
                  <n-tag
                    v-if="history.id === historyStore.currentHistoryId"
                    size="small"
                    type="info"
                    round
                  >
                    当前
                  </n-tag>
                  <span class="history-book">{{ history.bookTitle }}</span>
                </n-space>
                <n-space>
                  <n-button
                    size="tiny"
                    text
                    type="primary"
                    @click="handleSelectHistory(history)"
                  >
                    查看详情
                  </n-button>
                  <n-button
                    size="tiny"
                    text
                    type="error"
                    @click="handleDelete(history)"
                  >
                    <template #icon><n-icon><Trash /></n-icon></template>
                  </n-button>
                </n-space>
              </n-space>
            </div>

            <div class="history-stats">
              <n-space wrap>
                <div class="stat-item">
                  <span class="stat-label">扫描范围</span>
                  <span class="stat-value">{{ getChapterNames(history) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">处理时长</span>
                  <span class="stat-value">{{ formatDuration(history.startTime, history.endTime) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">操作人</span>
                  <span class="stat-value">{{ history.operator }}</span>
                </div>
              </n-space>
            </div>

            <div class="history-result">
              <n-space>
                <n-progress
                  type="line"
                  :percentage="getProgressPercent(history)"
                  :show-indicator="false"
                  :status="getProgressStatus(history)"
                  :height="6"
                  style="flex: 1; min-width: 100px"
                />
                <div class="result-tags">
                  <n-tag type="warning" size="small">待处理 {{ history.totalMatches - history.confirmedCount - history.ignoredCount - history.customCount }}</n-tag>
                  <n-tag type="success" size="small">已确认 {{ history.confirmedCount }}</n-tag>
                  <n-tag type="default" size="small">已忽略 {{ history.ignoredCount }}</n-tag>
                  <n-tag type="info" size="small">自定义 {{ history.customCount }}</n-tag>
                  <n-tag size="small">共 {{ history.totalMatches }} 项</n-tag>
                </div>
              </n-space>
            </div>
          </div>
        </n-timeline-item>
      </n-timeline>
    </div>

    <div v-else class="empty-state">
      <n-empty description="暂无校勘历史记录，完成扫描后会自动记录" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NSpace, NButton, NIcon, NTag, NEmpty, NTimeline, NTimelineItem,
  NSelect, NProgress, useMessage, useDialog
} from 'naive-ui'
import { Trash, Refresh } from '@vicons/ionicons5'
import { useCollationHistoryStore } from '@/stores/collation-history'
import { useBookStore } from '@/stores/book'
import type { CollationHistory } from '@/types'

const historyStore = useCollationHistoryStore()
const bookStore = useBookStore()
const message = useMessage()
const dialog = useDialog()

const filterBookId = ref<string | null>(null)

const histories = computed(() => historyStore.allHistories)

const currentBookId = computed(() => bookStore.currentBookId)

const bookOptions = computed(() => {
  const bookMap = new Map<string, string>()
  for (const h of histories.value) {
    bookMap.set(h.bookId, h.bookTitle)
  }
  return Array.from(bookMap.entries()).map(([id, title]) => ({
    label: title,
    value: id
  }))
})

const filteredHistories = computed(() => {
  if (!filterBookId.value) return histories.value
  return histories.value.filter(h => h.bookId === filterBookId.value)
})

function getTimelineType(history: CollationHistory): 'default' | 'success' | 'warning' | 'info' | 'error' {
  if (history.id === historyStore.currentHistoryId) return 'info'
  const pending = history.totalMatches - history.confirmedCount - history.ignoredCount - history.customCount
  if (pending === 0) return 'success'
  if (pending > history.confirmedCount) return 'warning'
  return 'default'
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function formatDuration(start: number, end: number): string {
  const diff = Math.max(0, end - start)
  if (diff < 1000) return '不足1秒'
  if (diff < 60000) return `${Math.floor(diff / 1000)}秒`
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return `${minutes}分${seconds}秒`
}

function getChapterNames(history: CollationHistory): string {
  const chapterIds = history.chapterIds
  let names: string[] = []
  if (history.chapters && history.chapters.length > 0) {
    names = history.chapters.map(c => c.title)
  } else if (bookStore.currentBook) {
    for (const cid of chapterIds) {
      const chapter = bookStore.currentBook.chapters.find(c => c.id === cid)
      if (chapter) names.push(chapter.title)
    }
  }
  if (names.length === 0) {
    return chapterIds.length === 0 ? '全书' : `${chapterIds.length}个章节`
  }
  if (names.length <= 3) return names.join('、')
  return `${names.slice(0, 3).join('、')}等${names.length}章`
}

function getProgressPercent(history: CollationHistory): number {
  if (history.totalMatches === 0) return 100
  const processed = history.confirmedCount + history.ignoredCount + history.customCount
  return Math.round((processed / history.totalMatches) * 100)
}

function getProgressStatus(history: CollationHistory): 'success' | 'warning' | 'error' | 'info' {
  const pending = history.totalMatches - history.confirmedCount - history.ignoredCount - history.customCount
  if (pending === 0) return 'success'
  const percent = getProgressPercent(history)
  if (percent < 30) return 'error'
  if (percent < 60) return 'warning'
  return 'info'
}

function handleSelectHistory(history: CollationHistory) {
  historyStore.selectHistory(history.id)
  if (bookStore.books.some(b => b.id === history.bookId)) {
    bookStore.selectBook(history.bookId)
  }
  message.info(`已切换到历史记录：${history.bookTitle}`)
}

function handleDelete(history: CollationHistory) {
  dialog.warning({
    title: '删除历史记录',
    content: `确定要删除「${history.bookTitle}」的校勘记录吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      historyStore.deleteHistory(history.id)
      message.success('历史记录已删除')
    }
  })
}

function handleClearByBook() {
  if (!currentBookId.value) return
  const bookTitle = bookStore.currentBook?.title || '当前书籍'
  dialog.warning({
    title: '清除本书记录',
    content: `确定要清除「${bookTitle}」的所有校勘历史记录吗？此操作不可恢复。`,
    positiveText: '清除',
    negativeText: '取消',
    onPositiveClick: () => {
      historyStore.clearHistoriesByBook(currentBookId.value!)
      message.success('已清除本书校勘记录')
    }
  })
}

function handleClearAll() {
  dialog.warning({
    title: '清空全部历史',
    content: '确定要清空所有校勘历史记录吗？此操作不可恢复。',
    positiveText: '清空',
    negativeText: '取消',
    onPositiveClick: () => {
      historyStore.clearAllHistories()
      message.success('已清空全部校勘记录')
    }
  })
}
</script>

<style scoped>
.collation-history-panel {
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

.filter-section {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-right: 4px;
}

.history-card {
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.history-card:hover {
  background: #f5f5f5;
  border-color: #e0e0e0;
}

.history-card.is-current {
  background: #e6f7ff;
  border-color: #91d5ff;
}

.history-header {
  margin-bottom: 10px;
}

.history-book {
  font-weight: 600;
  font-size: 13px;
  color: #1f1f1f;
}

.history-stats {
  margin-bottom: 10px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.stat-label {
  color: #888;
}

.stat-value {
  color: #333;
  font-weight: 500;
}

.history-result {
  padding-top: 10px;
  border-top: 1px dashed #e8e8e8;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 200px;
}

.empty-state {
  padding: 40px 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
