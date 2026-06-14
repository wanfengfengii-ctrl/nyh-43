<template>
  <n-config-provider :theme="theme">
    <div class="app-container">
      <header class="app-header">
        <div class="header-left">
          <h1 class="app-title">古籍数字化排版编辑器</h1>
          <span class="app-subtitle">Ancient Book Layout Editor</span>
        </div>
        <div class="header-center">
          <n-space>
            <n-button size="small" @click="showDoublePage = !showDoublePage">
              {{ showDoublePage ? '单页视图' : '对开视图' }}
            </n-button>
            <n-button size="small" @click="handleShowSpreadPreview">
              对开预览弹窗
            </n-button>
            <n-button size="small" @click="toggleRuler">
              {{ canvasStore.showRuler ? '隐藏标尺' : '显示标尺' }}
            </n-button>
            <n-button size="small" @click="toggleGuides">
              {{ canvasStore.showGuides ? '隐藏辅助线' : '显示辅助线' }}
            </n-button>
            <n-button size="small" @click="zoomIn">放大</n-button>
            <n-button size="small" @click="zoomOut">缩小</n-button>
            <n-button size="small" @click="resetZoom">重置</n-button>
            <n-divider vertical style="margin: 0 4px" />
            <n-button
              size="small"
              type="warning"
              quaternary
              :disabled="!bookStore.currentBookId"
              @click="handleQuickCollation"
            >
              <template #icon><n-icon><Search /></n-icon></template>
              校勘扫描
            </n-button>
          </n-space>
        </div>
        <div class="header-right">
          <n-space>
            <n-button
              size="small"
              type="primary"
              quaternary
              @click="showTemplateCompare = true"
            >
              <template #icon><n-icon><GitCompare /></n-icon></template>
              版本对比
            </n-button>
            <n-button
              size="small"
              type="primary"
              quaternary
              @click="showImportDialog = true"
            >
              <template #icon><n-icon><CloudUpload /></n-icon></template>
              导入文稿
            </n-button>
            <n-button
              size="small"
              type="primary"
              :disabled="!templateStore.isCurrentComplete && !bookStore.currentBook"
              @click="showExportDialog = true"
            >
              导出版式/书籍
            </n-button>
            <n-dropdown :options="menuOptions" @select="handleMenuSelect">
              <n-button size="small">
                更多
                <template #icon>
                  <n-icon><ChevronDown /></n-icon>
                </template>
              </n-button>
            </n-dropdown>
          </n-space>
        </div>
      </header>

      <div class="app-body">
        <aside class="sidebar-left">
          <n-tabs type="line" animated>
            <n-tab-pane name="templates" tab="版式方案">
              <TemplateList />
            </n-tab-pane>
            <n-tab-pane name="books" tab="书籍管理">
              <BookManager @show-import="handleShowImportFromBook" />
            </n-tab-pane>
            <n-tab-pane name="rules" tab="规则库">
              <RuleLibraryPanel />
            </n-tab-pane>
          </n-tabs>
        </aside>

        <main class="canvas-area">
          <CanvasView :show-double-page="showDoublePage" />
        </main>

        <aside class="sidebar-right">
          <n-tabs type="line" animated>
            <n-tab-pane name="properties" tab="属性编辑">
              <PropertyPanel />
            </n-tab-pane>
            <n-tab-pane name="validation" tab="版式校验">
              <ViolationPanel />
            </n-tab-pane>
            <n-tab-pane name="collation" tab="古籍校勘">
              <CollationPanel />
            </n-tab-pane>
            <n-tab-pane name="history" tab="校勘历史">
              <CollationHistoryPanel />
            </n-tab-pane>
          </n-tabs>
        </aside>
      </div>

      <ExportDialog v-model:show="showExportDialog" />
      <SpreadPreview v-model:show="showSpreadPreview" @export="showExportDialog = true" />
      <TemplateCompare
        v-model:show="showTemplateCompare"
        @restore="handleRestoreTemplate"
      />
      <ImportDialog
        v-model:show="showImportDialog"
        :default-chapter-id="defaultImportChapterId"
        @imported="handleImported"
      />
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NConfigProvider, NButton, NSpace, NDropdown, NIcon, useMessage, NTabPane, NTabs,
  NDivider
} from 'naive-ui'
import { ChevronDown, CloudUpload, GitCompare, Search, Book } from '@vicons/ionicons5'
import { useTemplateStore } from '@/stores/template'
import { useCanvasStore } from '@/stores/canvas'
import { useBookStore } from '@/stores/book'
import { useTemplateVersionStore } from '@/stores/template-version'
import { useCollationRuleStore } from '@/stores/collation-rules'
import { useCollationHistoryStore } from '@/stores/collation-history'
import TemplateList from '@/components/TemplateList.vue'
import PropertyPanel from '@/components/PropertyPanel.vue'
import CanvasView from '@/components/CanvasView.vue'
import ExportDialog from '@/components/ExportDialog.vue'
import SpreadPreview from '@/components/SpreadPreview.vue'
import BookManager from '@/components/BookManager.vue'
import ViolationPanel from '@/components/ViolationPanel.vue'
import TemplateCompare from '@/components/TemplateCompare.vue'
import ImportDialog from '@/components/ImportDialog.vue'
import RuleLibraryPanel from '@/components/RuleLibraryPanel.vue'
import CollationPanel from '@/components/CollationPanel.vue'
import CollationHistoryPanel from '@/components/CollationHistoryPanel.vue'
import type { PageTemplate } from '@/types'

const templateStore = useTemplateStore()
const canvasStore = useCanvasStore()
const bookStore = useBookStore()
const versionStore = useTemplateVersionStore()
const collationRuleStore = useCollationRuleStore()
const collationHistoryStore = useCollationHistoryStore()
const message = useMessage()

const showDoublePage = ref(false)
const showExportDialog = ref(false)
const showSpreadPreview = ref(false)
const showTemplateCompare = ref(false)
const showImportDialog = ref(false)
const defaultImportChapterId = ref('')
const theme = computed(() => undefined)

const menuOptions = [
  { label: '新建版式', key: 'new' },
  { label: '保存版式版本', key: 'save-version' },
  { label: '导入版式', key: 'import' },
  { label: '新建书籍', key: 'new-book' },
  { type: 'divider' as const, key: 'divider1' },
  { label: '全书校勘扫描', key: 'scan-book' },
  { label: '当前章节校勘', key: 'scan-chapter' },
  { label: '清空校勘结果', key: 'clear-collation' },
  { type: 'divider' as const, key: 'divider2' },
  { label: '清空辅助线', key: 'clear-guides' }
]

function toggleRuler() {
  canvasStore.toggleRuler()
}

function toggleGuides() {
  canvasStore.toggleGuides()
}

function zoomIn() {
  canvasStore.zoomIn()
}

function zoomOut() {
  canvasStore.zoomOut()
}

function resetZoom() {
  canvasStore.resetZoom()
}

function handleShowSpreadPreview() {
  if (!templateStore.currentTemplate) {
    message.warning('请先选择一个版式')
    return
  }
  showSpreadPreview.value = true
}

function handleShowImportFromBook(chapterId: string) {
  defaultImportChapterId.value = chapterId
  showImportDialog.value = true
}

function handleImported(pageCount: number) {
  message.success(`成功导入 ${pageCount} 页文稿`)
}

function handleRestoreTemplate(tpl: PageTemplate) {
  if (!templateStore.currentTemplateId) return
  const { id, createdAt, updatedAt, ...rest } = tpl
  templateStore.updateTemplate(templateStore.currentTemplateId, rest)
  message.success('已恢复到指定版本')
}

async function runCollationScan(scope: 'book' | 'chapter') {
  if (!bookStore.currentBookId) {
    message.warning('请先创建或选择一本书籍')
    return
  }
  if (scope === 'chapter' && !bookStore.currentChapterId) {
    message.warning('请先选择章节')
    return
  }

  const { buildRulesForScan } = await import('@/utils/collation')
  const rules = buildRulesForScan(collationRuleStore.allRules)
  let chapterIds: string[] | undefined

  if (scope === 'chapter') {
    chapterIds = [bookStore.currentChapterId!]
  }

  const matches = bookStore.runBookCollation(bookStore.currentBookId, chapterIds, rules)

  if (bookStore.currentBook) {
    const historyChapterIds = chapterIds || bookStore.currentBook.chapters.map(c => c.id)
    collationHistoryStore.createHistory(
      bookStore.currentBookId,
      bookStore.currentBook.title,
      historyChapterIds,
      matches
    )
  }

  message.success(`扫描完成，共发现 ${matches.length} 处疑似字词`)
}

function handleQuickCollation() {
  runCollationScan('book')
}

function handleMenuSelect(key: string) {
  switch (key) {
    case 'new':
      templateStore.addTemplate()
      message.success('已创建新版式')
      break
    case 'save-version':
      if (!templateStore.currentTemplate) {
        message.warning('请先选择版式')
        return
      }
      versionStore.saveVersion(templateStore.currentTemplate, '手动保存', 'user')
      message.success('版式版本已保存')
      break
    case 'import':
      handleImportTemplate()
      break
    case 'new-book':
      bookStore.createBook()
      message.success('已创建新书籍')
      break
    case 'scan-book':
      runCollationScan('book')
      break
    case 'scan-chapter':
      runCollationScan('chapter')
      break
    case 'clear-collation':
      if (!bookStore.currentBookId) {
        message.warning('请先选择书籍')
        return
      }
      bookStore.clearBookCollation(bookStore.currentBookId)
      message.success('校勘结果已清空')
      break
    case 'clear-guides':
      canvasStore.clearGuides()
      message.success('辅助线已清空')
      break
  }
}

function handleImportTemplate() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string
        templateStore.importTemplate(content)
        message.success('版式导入成功')
      } catch {
        message.error('导入失败，文件格式不正确')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f0f2f5;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1f1f1f;
}

.app-subtitle {
  font-size: 12px;
  color: #999;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.sidebar-left {
  width: 300px;
  background-color: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-left :deep(.n-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-left :deep(.n-tabs-content) {
  flex: 1;
  overflow-y: auto;
}

.canvas-area {
  flex: 1;
  overflow: hidden;
  position: relative;
  background-color: #e8eaed;
  background-image:
    linear-gradient(45deg, #ddd 25%, transparent 25%),
    linear-gradient(-45deg, #ddd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ddd 75%),
    linear-gradient(-45deg, transparent 75%, #ddd 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.sidebar-right {
  width: 360px;
  background-color: #fff;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-right :deep(.n-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-right :deep(.n-tabs-content) {
  flex: 1;
  overflow-y: auto;
}
</style>
