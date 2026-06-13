<template>
  <n-modal
    :show="show" @update:show="(v: boolean) => emit('update:show', v)"
    preset="card"
    title="版式版本对比"
    style="width: 90vw; max-width: 1000px"
    @close="handleClose"
  >
    <template #header-extra>
      <n-button size="small" type="primary" :disabled="!currentTemplate" @click="saveNewVersion">
        保存当前版本
      </n-button>
    </template>

    <div v-if="!currentTemplate" class="empty-state">
      <n-empty description="请先选择一个版式" />
    </div>

    <template v-else>
      <div class="version-selector">
        <n-space>
          <div class="selector-item">
            <div class="selector-label">版本 A</div>
            <n-select
              v-model:value="versionAId"
              :options="versionOptions"
              placeholder="选择版本 A"
              style="width: 240px"
            />
          </div>
          <n-icon size="24" color="#999"><ArrowForward /></n-icon>
          <div class="selector-item">
            <div class="selector-label">版本 B</div>
            <n-select
              v-model:value="versionBId"
              :options="versionOptionsWithCurrent"
              placeholder="选择版本 B（含当前）"
              style="width: 240px"
            />
          </div>
        </n-space>
      </div>

      <div v-if="diffs.length > 0" class="diff-content">
        <div class="diff-summary">
          <n-space>
            <n-tag type="success" size="small">变更字段: {{ diffs.length }}</n-tag>
          </n-space>
        </div>
        <n-data-table
          :columns="diffColumns"
          :data="diffTableData"
          :pagination="false"
          size="small"
          bordered
          :max-height="400"
        />
      </div>
      <div v-else-if="versionAId && versionBId" class="empty-state">
        <n-empty description="两个版本完全一致，无差异" />
      </div>
      <div v-else class="empty-state">
        <n-empty description="请选择两个版本进行对比" />
      </div>

      <n-divider style="margin: 16px 0" />

      <div class="version-history">
        <div class="history-title">版本历史 ({{ versions.length }})</div>
        <n-timeline v-if="versions.length > 0">
          <n-timeline-item
            v-for="v in versions"
            :key="v.id"
            :type="v.id === latestVersionId ? 'success' : 'default'"
            :title="`版本 ${v.version}${v.id === latestVersionId ? ' (最新)' : ''}`"
            :time="formatTime(v.createdAt)"
          >
            <div class="timeline-content">
              <div v-if="v.note" class="version-note">{{ v.note }}</div>
              <div class="version-meta">作者: {{ v.author }}</div>
              <n-space style="margin-top: 6px">
                <n-button size="tiny" quaternary @click="handleRestore(v)">
                  <template #icon><n-icon><Refresh /></n-icon></template>
                  恢复此版本
                </n-button>
              </n-space>
            </div>
          </n-timeline-item>
        </n-timeline>
        <div v-else class="empty-state">
          <n-empty description="暂无历史版本，请先保存版本" />
        </div>
      </div>
    </template>

    <template #footer>
      <n-space justify="end">
        <n-button @click="handleClose">关闭</n-button>
      </n-space>
    </template>

    <n-modal v-model:show="showSaveDialog" preset="card" title="保存版本" style="width: 420px">
      <n-form label-placement="left" label-width="80px">
        <n-form-item label="版本说明">
          <n-input v-model:value="saveNote" type="textarea" placeholder="请输入本次保存的说明" :rows="3" />
        </n-form-item>
        <n-form-item label="保存人">
          <n-input v-model:value="saveAuthor" placeholder="请输入作者名" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showSaveDialog = false">取消</n-button>
          <n-button type="primary" @click="confirmSaveVersion">确认保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal, NSpace, NSelect, NIcon, NEmpty, NTag, NDataTable,
  NDivider, NTimeline, NTimelineItem, NButton, NForm, NFormItem,
  NInput, useMessage, useDialog
} from 'naive-ui'
import { ArrowForward, Refresh } from '@vicons/ionicons5'
import { useTemplateStore } from '@/stores/template'
import { useTemplateVersionStore, diffTemplates } from '@/stores/template-version'
import type { TemplateDiff, PageTemplate } from '@/types'
import { formatDate } from '@/utils/validation'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{
  (e: 'update:show', v: boolean): void
  (e: 'close'): void
  (e: 'restore', template: PageTemplate): void
}>()

const templateStore = useTemplateStore()
const versionStore = useTemplateVersionStore()
const message = useMessage()
const dialog = useDialog()

const versionAId = ref<string | null>(null)
const versionBId = ref<string | null>(null)
const showSaveDialog = ref(false)
const saveNote = ref('')
const saveAuthor = ref('user')

const currentTemplate = computed(() => templateStore.currentTemplate)

const versions = computed(() => {
  if (!currentTemplate.value) return []
  return versionStore.getVersions(currentTemplate.value.id)
})

const latestVersionId = computed(() => versions.value[0]?.id || null)

const versionOptions = computed(() => {
  return versions.value.map(v => ({
    label: `版本 ${v.version} - ${v.note || '无备注'} (${formatDate(v.createdAt)})`,
    value: v.id
  }))
})

const versionOptionsWithCurrent = computed(() => {
  const opts = [...versionOptions.value]
  if (currentTemplate.value) {
    opts.unshift({ label: '当前 (未保存)', value: '__current__' })
  }
  return opts
})

const diffs = computed<TemplateDiff[]>(() => {
  if (!versionAId.value || !versionBId.value) return []
  const templateA = getTemplateById(versionAId.value)
  const templateB = getTemplateById(versionBId.value)
  if (!templateA || !templateB) return []
  return diffTemplates(templateA, templateB)
})

const diffColumns = [
  { title: '字段路径', key: 'path', width: 240 },
  { title: '版本 A', key: 'oldValue', width: 260, render: (row: any) => formatValue(row.oldValue, 'old') },
  { title: '版本 B', key: 'newValue', width: 260, render: (row: any) => formatValue(row.newValue, 'new') }
]

const diffTableData = computed(() => {
  return diffs.value.map(d => ({
    key: d.path,
    path: d.path,
    oldValue: d.oldValue,
    newValue: d.newValue
  }))
})

function getTemplateById(id: string): PageTemplate | null {
  if (id === '__current__') return currentTemplate.value
  const v = versionStore.versions.find(x => x.id === id)
  return v ? v.snapshot : null
}

function formatValue(v: unknown, _type: 'old' | 'new'): string {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function formatTime(ts: number) {
  return formatDate(ts)
}

function saveNewVersion() {
  if (!currentTemplate.value) return
  saveNote.value = ''
  showSaveDialog.value = true
}

function confirmSaveVersion() {
  if (!currentTemplate.value) return
  const v = versionStore.saveVersion(currentTemplate.value, saveNote.value, saveAuthor.value || 'user')
  message.success(`版本 ${v.version} 已保存`)
  showSaveDialog.value = false
}

function handleRestore(v: { snapshot: PageTemplate; version: number }) {
  dialog.warning({
    title: '确认恢复版本',
    content: `确定要恢复到版本 ${v.version} 吗？当前未保存的修改将丢失。`,
    positiveText: '恢复',
    negativeText: '取消',
    onPositiveClick: () => {
      emit('restore', v.snapshot)
      message.success(`已恢复到版本 ${v.version}`)
    }
  })
}

function handleClose() {
  emit('update:show', false)
  emit('close')
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      versionAId.value = versions.value[1]?.id || null
      versionBId.value = '__current__'
    }
  }
)
</script>

<style scoped>
.empty-state {
  padding: 30px 0;
}

.version-selector {
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
  margin-bottom: 16px;
}

.selector-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.selector-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.diff-summary {
  margin-bottom: 10px;
}

.diff-content {
  min-height: 120px;
}

.history-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.timeline-content {
  padding: 4px 0;
}

.version-note {
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
}

.version-meta {
  font-size: 12px;
  color: #999;
}
</style>
