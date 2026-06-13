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
          </n-space>
        </div>
        <div class="header-right">
          <n-space>
            <n-button
              size="small"
              type="primary"
              :disabled="!templateStore.isCurrentComplete"
              @click="showExportDialog = true"
            >
              导出版式
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
          <TemplateList />
        </aside>

        <main class="canvas-area">
          <CanvasView :show-double-page="showDoublePage" />
        </main>

        <aside class="sidebar-right">
          <PropertyPanel />
        </aside>
      </div>

      <ExportDialog v-model:show="showExportDialog" />
      <SpreadPreview v-model:show="showSpreadPreview" @export="showExportDialog = true" />
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NConfigProvider, NButton, NSpace, NDropdown, NIcon, useMessage } from 'naive-ui'
import { ChevronDown } from '@vicons/ionicons5'
import { useTemplateStore } from '@/stores/template'
import { useCanvasStore } from '@/stores/canvas'
import TemplateList from '@/components/TemplateList.vue'
import PropertyPanel from '@/components/PropertyPanel.vue'
import CanvasView from '@/components/CanvasView.vue'
import ExportDialog from '@/components/ExportDialog.vue'
import SpreadPreview from '@/components/SpreadPreview.vue'

const templateStore = useTemplateStore()
const canvasStore = useCanvasStore()
const message = useMessage()

const showDoublePage = ref(false)
const showExportDialog = ref(false)
const showSpreadPreview = ref(false)
const theme = computed(() => undefined)

const menuOptions = [
  { label: '新建版式', key: 'new' },
  { label: '导入版式', key: 'import' },
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

function handleMenuSelect(key: string) {
  switch (key) {
    case 'new':
      templateStore.addTemplate()
      message.success('已创建新版式')
      break
    case 'import':
      handleImport()
      break
    case 'clear-guides':
      canvasStore.clearGuides()
      message.success('辅助线已清空')
      break
  }
}

function handleImport() {
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
        message.success('导入成功')
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
}

.sidebar-left {
  width: 260px;
  background-color: #fff;
  border-right: 1px solid #e8e8e8;
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
  width: 320px;
  background-color: #fff;
  border-left: 1px solid #e8e8e8;
  overflow-y: auto;
}
</style>
