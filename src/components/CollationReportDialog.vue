<template>
  <n-modal
    :show="show"
    @update:show="handleUpdateShow"
    preset="dialog"
    title="导出校勘报告"
    :mask-closable="false"
    style="width: 520px"
    :positive-text="'导出'"
    :negative-text="'取消'"
    @positive-click="handleExport"
    @negative-click="handleUpdateShow(false)"
  >
    <div class="report-dialog">
      <n-form label-placement="top" label-align="left">
        <div class="section">
          <div class="section-title">
            <n-icon><InformationCircle /></n-icon>
            <span>报告概览</span>
          </div>
          <div class="summary-cards">
            <n-space wrap>
              <div class="summary-card total">
                <div class="card-num">{{ totalCount }}</div>
                <div class="card-label">校勘总数</div>
              </div>
              <div class="summary-card pending">
                <div class="card-num">{{ pendingCount }}</div>
                <div class="card-label">待处理</div>
              </div>
              <div class="summary-card confirmed">
                <div class="card-num">{{ confirmedCount }}</div>
                <div class="card-label">已确认</div>
              </div>
              <div class="summary-card ignored">
                <div class="card-num">{{ ignoredCount }}</div>
                <div class="card-label">已忽略</div>
              </div>
              <div class="summary-card custom">
                <div class="card-num">{{ customCount }}</div>
                <div class="card-label">自定义</div>
              </div>
            </n-space>
          </div>
        </div>

        <n-divider style="margin: 12px 0" />

        <div class="section">
          <div class="section-title">
            <n-icon><Options /></n-icon>
            <span>导出选项</span>
          </div>

          <n-form-item label="导出格式">
            <n-radio-group v-model:value="formData.format" size="medium">
              <n-space>
                <n-radio value="txt">
                  <n-space align="center">
                    <n-icon size="18"><DocumentText /></n-icon>
                    <span>TXT 文本</span>
                  </n-space>
                </n-radio>
                <n-radio value="csv">
                  <n-space align="center">
                    <n-icon size="18"><Grid /></n-icon>
                    <span>CSV 表格</span>
                  </n-space>
                </n-radio>
                <n-radio value="json">
                  <n-space align="center">
                    <n-icon size="18"><Code /></n-icon>
                    <span>JSON 数据</span>
                  </n-space>
                </n-radio>
              </n-space>
            </n-radio-group>
          </n-form-item>

          <n-form-item label="文件名">
            <n-input
              v-model:value="formData.filename"
              placeholder="请输入文件名"
              clearable
            >
              <template #suffix>.{{ formData.format }}</template>
            </n-input>
          </n-form-item>

          <n-form-item label="包含内容">
            <n-space vertical>
              <n-checkbox v-model:checked="formData.includePending">
                <span>包含待处理项（{{ pendingCount }}）</span>
              </n-checkbox>
              <n-checkbox v-model:checked="formData.includeConfirmed">
                <span>包含已确认项（{{ confirmedCount }}）</span>
              </n-checkbox>
              <n-checkbox v-model:checked="formData.includeIgnored">
                <span>包含已忽略项（{{ ignoredCount }}）</span>
              </n-checkbox>
              <n-checkbox v-model:checked="formData.includeCustom">
                <span>包含自定义规则项（{{ customCount }}）</span>
              </n-checkbox>
            </n-space>
          </n-form-item>

          <n-form-item label="筛选范围" v-if="chapterOptions.length > 0">
            <n-select
              v-model:value="formData.chapterIds"
              multiple
              clearable
              :options="chapterOptions"
              placeholder="选择章节（默认全部）"
              :max-tag-count="3"
            />
          </n-form-item>

          <n-form-item label="类型筛选">
            <n-checkbox-group v-model:value="formData.types">
              <n-space>
                <n-checkbox value="variant">
                  <n-tag size="small" :style="{ backgroundColor: '#722ed1', color: '#fff' }" round>异体字</n-tag>
                </n-checkbox>
                <n-checkbox value="borrowed">
                  <n-tag size="small" :style="{ backgroundColor: '#13c2c2', color: '#fff' }" round>通假字</n-tag>
                </n-checkbox>
                <n-checkbox value="taboo">
                  <n-tag size="small" :style="{ backgroundColor: '#d4380d', color: '#fff' }" round>避讳字</n-tag>
                </n-checkbox>
              </n-space>
            </n-checkbox-group>
          </n-form-item>
        </div>

        <n-divider style="margin: 12px 0" />

        <div class="section">
          <div class="section-title">
            <n-icon><Eye /></n-icon>
            <span>报告预览（前10项）</span>
            <n-tag size="small" type="info">共 {{ filteredCount }} 项将被导出</n-tag>
          </div>

          <div class="preview-list">
            <n-list bordered size="small" v-if="previewMatches.length > 0">
              <n-list-item
                v-for="m in previewMatches"
                :key="m.id"
                class="preview-item"
              >
                <n-space align="center" style="width: 100%">
                  <n-tag
                    size="small"
                    :style="{ backgroundColor: getTypeColor(m.type), color: '#fff' }"
                    round
                    style-width="64px"
                    :style-justify-content="'center'"
                  >
                    {{ getTypeLabel(m.type) }}
                  </n-tag>
                  <span class="preview-chars">
                    <span class="original">{{ m.originalChar }}</span>
                    <n-icon class="arrow"><ArrowForward /></n-icon>
                    <span class="standard">{{ m.standardChar }}</span>
                  </span>
                  <n-tag size="small" :type="getStatusTagType(m.status)" round style="margin-left: auto">
                    {{ getStatusLabel(m.status) }}
                  </n-tag>
                </n-space>
              </n-list-item>
            </n-list>
            <n-empty v-else description="没有符合条件的校勘项" size="small" />
          </div>
        </div>
      </n-form>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import {
  NModal, NForm, NFormItem, NInput, NRadioGroup, NRadio, NCheckbox,
  NCheckboxGroup, NSelect, NDivider, NSpace, NIcon, NTag, NList,
  NListItem, NEmpty, useMessage
} from 'naive-ui'
import {
  DocumentText, Grid, Code, ArrowForward, Eye, Options, InformationCircle
} from '@vicons/ionicons5'
import { useBookStore } from '@/stores/book'
import type { CollationReportConfig, CollationMatch, CollationRuleType } from '@/types'
import {
  getRuleTypeLabel, getRuleTypeColor, getMatchStatusLabel,
  exportCollationReport
} from '@/utils/collation'

const props = defineProps<{
  show: boolean
  bookId: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const bookStore = useBookStore()
const message = useMessage()

const formData = reactive<{
  format: 'txt' | 'csv' | 'json'
  filename: string
  includePending: boolean
  includeConfirmed: boolean
  includeIgnored: boolean
  includeCustom: boolean
  chapterIds: string[]
  types: string[]
}>({
  format: 'txt',
  filename: '',
  includePending: true,
  includeConfirmed: true,
  includeIgnored: true,
  includeCustom: true,
  chapterIds: [],
  types: ['variant', 'borrowed', 'taboo']
})

const allMatches = computed<CollationMatch[]>(() => {
  if (!props.bookId) return []
  return bookStore.getBookCollationMatches(props.bookId)
})

const chapterOptions = computed(() => {
  if (!bookStore.currentBook) return []
  return bookStore.currentBook.chapters.map(c => ({
    label: c.title,
    value: c.id
  }))
})

const pendingCount = computed(() => allMatches.value.filter(m => m.status === 'pending').length)
const confirmedCount = computed(() => allMatches.value.filter(m => m.status === 'confirmed').length)
const ignoredCount = computed(() => allMatches.value.filter(m => m.status === 'ignored').length)
const customCount = computed(() => allMatches.value.filter(m => m.status === 'custom').length)
const totalCount = computed(() => allMatches.value.length)

const filteredMatches = computed(() => {
  let result = allMatches.value

  const statuses: CollationMatch['status'][] = []
  if (formData.includePending) statuses.push('pending')
  if (formData.includeConfirmed) statuses.push('confirmed')
  if (formData.includeIgnored) statuses.push('ignored')
  if (formData.includeCustom) statuses.push('custom')
  result = result.filter(m => statuses.includes(m.status))

  if (formData.chapterIds.length > 0) {
    result = result.filter(m => formData.chapterIds.includes(m.chapterId))
  }

  if (formData.types.length > 0) {
    result = result.filter(m => formData.types.includes(m.type))
  }

  return result
})

const filteredCount = computed(() => filteredMatches.value.length)

const previewMatches = computed(() => filteredMatches.value.slice(0, 10))

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

function handleUpdateShow(value: boolean) {
  emit('update:show', value)
}

function handleExport() {
  if (filteredMatches.value.length === 0) {
    message.warning('没有可导出的校勘项，请调整筛选条件')
    return
  }

  const config: CollationReportConfig = {
    bookId: props.bookId,
    includeConfirmed: formData.includeConfirmed,
    includeIgnored: formData.includeIgnored,
    includePending: formData.includePending,
    format: formData.format,
    filename: formData.filename || `校勘报告_${new Date().toISOString().slice(0, 10)}`
  }

  const statuses: CollationMatch['status'][] = []
  if (config.includePending) statuses.push('pending')
  if (config.includeConfirmed) statuses.push('confirmed')
  if (config.includeIgnored) statuses.push('ignored')
  statuses.push('custom')

  let matchesToExport = bookStore.getBookCollationMatches(props.bookId, statuses, formData.types)
  if (formData.chapterIds.length > 0) {
    matchesToExport = matchesToExport.filter(m => formData.chapterIds.includes(m.chapterId))
  }

  const chapters = bookStore.currentBook?.chapters.map(c => ({
    id: c.id,
    title: c.title
  })) || []

  exportCollationReport(
    matchesToExport,
    config,
    bookStore.currentBook?.title || '未命名书籍',
    chapters
  )

  message.success(`校勘报告已导出（${filteredMatches.value.length} 项）`)
  handleUpdateShow(false)
}

watch(() => props.show, (val) => {
  if (val) {
    formData.filename = `校勘报告_${bookStore.currentBook?.title || '书籍'}_${new Date().toISOString().slice(0, 10)}`
    formData.chapterIds = []
  }
})
</script>

<style scoped>
.report-dialog {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}

.section {
  margin-bottom: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: #333;
  margin-bottom: 12px;
}

.summary-cards {
  margin-top: 8px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 16px;
  border-radius: 6px;
  min-width: 72px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
}

.summary-card.total {
  background: linear-gradient(135deg, #e6f7ff, #bae7ff);
  border-color: #91d5ff;
}

.summary-card.pending {
  background: linear-gradient(135deg, #fffbe6, #ffe58f);
  border-color: #ffd666;
}

.summary-card.confirmed {
  background: linear-gradient(135deg, #f6ffed, #d9f7be);
  border-color: #b7eb8f;
}

.summary-card.ignored {
  background: linear-gradient(135deg, #fafafa, #f5f5f5);
  border-color: #e8e8e8;
}

.summary-card.custom {
  background: linear-gradient(135deg, #e6f4ff, #bae0ff);
  border-color: #91caff;
}

.card-num {
  font-size: 22px;
  font-weight: 700;
  color: #1f1f1f;
  line-height: 1.2;
}

.card-label {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.preview-list {
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.preview-item {
  padding: 8px 12px !important;
}

.preview-chars {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 15px;
}

.preview-chars .original {
  color: #d4380d;
}

.preview-chars .standard {
  color: #52c41a;
}

.preview-chars .arrow {
  color: #999;
  font-size: 12px;
}
</style>
