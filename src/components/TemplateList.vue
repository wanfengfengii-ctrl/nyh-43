<template>
  <div class="template-list">
    <div class="list-header">
      <h3 class="list-title">版式方案</h3>
      <n-button size="small" type="primary" @click="handleAdd">
        <template #icon>
          <n-icon><Add /></n-icon>
        </template>
        新建
      </n-button>
    </div>

    <div class="template-items">
      <div
        v-for="tpl in templateStore.templates"
        :key="tpl.id"
        class="template-item"
        :class="{ active: tpl.id === templateStore.currentTemplateId }"
        @click="handleSelect(tpl.id)"
      >
        <div class="item-main">
          <span class="item-code">{{ tpl.code }}</span>
          <span class="item-name">{{ tpl.name }}</span>
        </div>
        <div class="item-status">
          <n-tag size="small" :type="isTemplateComplete(tpl) ? 'success' : 'warning'">
            {{ isTemplateComplete(tpl) ? '完整' : '未完成' }}
          </n-tag>
        </div>
        <div class="item-actions">
          <n-dropdown :options="getItemOptions(tpl.id)" @select="(k: string) => handleItemAction(k, tpl.id)">
            <n-button size="tiny" text>
              <n-icon><EllipsisHorizontal /></n-icon>
            </n-button>
          </n-dropdown>
        </div>
      </div>
    </div>

    <div v-if="templateStore.templates.length === 0" class="empty-tip">
      暂无版式方案，点击新建创建
    </div>

    <div class="list-footer">
      <n-divider style="margin: 8px 0" />
      <div class="stat-row">
        <span>共 {{ templateStore.templates.length }} 个版式</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NTag, NDropdown, NDivider, useMessage, useDialog } from 'naive-ui'
import { Add, EllipsisHorizontal } from '@vicons/ionicons5'
import { useTemplateStore } from '@/stores/template'
import { isTemplateComplete } from '@/utils/validation'
import type { PageTemplate } from '@/types'

const templateStore = useTemplateStore()
const message = useMessage()
const dialog = useDialog()

function handleAdd() {
  templateStore.addTemplate()
  message.success('已创建新版式')
}

function handleSelect(id: string) {
  templateStore.selectTemplate(id)
}

function getItemOptions(_id: string) {
  return [
    { label: '复制版式', key: 'duplicate' },
    { label: '导出JSON', key: 'export' },
    { label: '删除版式', key: 'delete', disabled: templateStore.templates.length <= 1 }
  ]
}

function handleItemAction(key: string, id: string) {
  switch (key) {
    case 'duplicate':
      templateStore.duplicateTemplate(id)
      message.success('已复制版式')
      break
    case 'export':
      handleExport(id)
      break
    case 'delete':
      handleDelete(id)
      break
  }
}

function handleExport(id: string) {
  const tpl = templateStore.templates.find(t => t.id === id)
  if (!tpl) return
  if (!isTemplateComplete(tpl)) {
    message.error('该版式未完成基础定义，不能导出')
    return
  }
  const json = templateStore.exportTemplate(id)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${tpl.code}-${tpl.name}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  message.success('导出成功')
}

function handleDelete(id: string) {
  const tpl = templateStore.templates.find(t => t.id === id)
  if (!tpl) return
  dialog.warning({
    title: '确认删除',
    content: `确定要删除版式「${tpl.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      templateStore.deleteTemplate(id)
      message.success('已删除')
    }
  })
}
</script>

<style scoped>
.template-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.template-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.template-item:hover {
  background-color: #f5f5f5;
}

.template-item.active {
  background-color: #e8f3ff;
  border-color: #18a0fb;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-code {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #18a0fb;
  margin-bottom: 2px;
}

.item-name {
  display: block;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-status {
  flex-shrink: 0;
}

.item-actions {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.template-item:hover .item-actions {
  opacity: 1;
}

.empty-tip {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.list-footer {
  padding: 0 12px 12px;
  border-top: 1px solid #f0f0f0;
}

.stat-row {
  font-size: 12px;
  color: #999;
  text-align: center;
}
</style>
