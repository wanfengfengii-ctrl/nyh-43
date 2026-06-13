<template>
  <n-modal
    :show="show" @update:show="(v: boolean) => emit('update:show', v)"
    preset="card"
    title="导入多页文稿"
    style="width: 640px"
    @close="handleClose"
  >
    <n-form label-placement="left" label-width="100px">
      <n-form-item label="导入章节" required>
        <n-select
          v-model:value="importForm.chapterId"
          :options="chapterOptions"
          placeholder="选择导入的目标章节"
        />
      </n-form-item>

      <n-form-item label="应用版式" required>
        <n-select
          v-model:value="importForm.templateId"
          :options="templateOptions"
          placeholder="选择要应用的版式"
        />
      </n-form-item>

      <n-form-item label="导入方式">
        <n-radio-group v-model:value="importForm.source">
          <n-radio value="file">上传文件</n-radio>
          <n-radio value="text">直接输入文本</n-radio>
        </n-radio-group>
      </n-form-item>

      <n-form-item v-if="importForm.source === 'file'" label="选择文件">
        <n-upload
          :show-file-list="false"
          accept=".txt,.md,.json"
          :custom-request="handleFileUpload"
        >
          <n-button>
            <template #icon><n-icon><CloudUpload /></n-icon></template>
            选择文件
          </n-button>
        </n-upload>
        <div v-if="fileName" class="file-name">已选择: {{ fileName }}</div>
      </n-form-item>

      <n-form-item v-if="importForm.source === 'text'" label="文稿内容">
        <n-input
          v-model:value="importForm.content"
          type="textarea"
          placeholder="请粘贴文稿内容，系统将按版式自动分页..."
          :rows="10"
        />
      </n-form-item>

      <n-form-item label="每页字符数">
        <n-input-number
          v-model:value="importForm.charsPerPage"
          :min="100"
          :max="5000"
          :step="50"
          style="width: 160px"
        />
      </n-form-item>

      <n-form-item label="起始页侧">
        <n-radio-group v-model:value="importForm.startSide">
          <n-radio value="right">右页（奇数页）</n-radio>
          <n-radio value="left">左页（偶数页）</n-radio>
        </n-radio-group>
      </n-form-item>

      <n-divider />

      <div class="preview-section" v-if="paginationResult.totalPages > 0">
        <n-space justify="space-between" style="width: 100%; margin-bottom: 10px">
          <span class="preview-title">分页预览</span>
          <n-space>
            <n-tag size="small">共 {{ paginationResult.totalPages }} 页</n-tag>
            <n-tag size="small" type="info">约 {{ paginationResult.estimatedChars }} 字</n-tag>
          </n-space>
        </n-space>
        <div class="preview-scroll">
          <n-space vertical size="small" style="width: 100%">
            <div
              v-for="(page, idx) in paginationResult.pages.slice(0, 10)"
              :key="idx"
              class="preview-page"
            >
              <n-space justify="space-between" style="width: 100%">
                <n-tag size="small" :type="page.pageSide === 'left' ? 'default' : 'info'">
                  第 {{ idx + 1 }} 页 · {{ page.pageSide === 'left' ? '左' : '右' }}
                </n-tag>
                <span v-if="page.chapterTitle" class="chapter-tag">{{ page.chapterTitle }}</span>
              </n-space>
              <div class="page-preview-text">
                {{ page.content.slice(0, 120) }}{{ page.content.length > 120 ? '...' : '' }}
              </div>
            </div>
            <div v-if="paginationResult.pages.length > 10" class="more-hint">
              ... 还有 {{ paginationResult.pages.length - 10 }} 页未显示
            </div>
          </n-space>
        </div>
      </div>
    </n-form>

    <template #footer>
      <n-space justify="space-between" style="width: 100%">
        <n-button @click="previewPagination">预览分页</n-button>
        <n-space>
          <n-button @click="handleClose">取消</n-button>
          <n-button type="primary" :disabled="!canImport" @click="handleImport">确认导入</n-button>
        </n-space>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import {
  NModal, NForm, NFormItem, NSelect, NRadioGroup, NRadio, NInput,
  NInputNumber, NButton, NIcon, NSpace, NDivider, NTag, NUpload,
  useMessage
} from 'naive-ui'
import { CloudUpload } from '@vicons/ionicons5'
import { useBookStore } from '@/stores/book'
import { useTemplateStore } from '@/stores/template'
import { paginateContent, estimatePageCount } from '@/utils/pagination'
import type { PaginationResult, PageSide } from '@/types'

const props = defineProps<{
  show: boolean
  defaultChapterId?: string
}>()

const emit = defineEmits<{
  (e: 'update:show', v: boolean): void
  (e: 'close'): void
  (e: 'imported', pageCount: number): void
}>()

const bookStore = useBookStore()
const templateStore = useTemplateStore()
const message = useMessage()

const fileName = ref('')
const paginationResult = ref<PaginationResult>({ pages: [], totalPages: 0, estimatedChars: 0 })

const importForm = reactive({
  chapterId: '' as string,
  templateId: '' as string,
  source: 'text' as 'text' | 'file',
  content: '',
  charsPerPage: 500,
  startSide: 'right' as PageSide
})

const chapterOptions = computed(() => {
  if (!bookStore.currentBook) return []
  return bookStore.currentBook.chapters.map(c => ({
    label: `第${c.order}章 · ${c.title} (${c.pageCount}页)`,
    value: c.id
  }))
})

const templateOptions = computed(() => {
  return templateStore.templates.map(t => ({
    label: `${t.code} ${t.name}`,
    value: t.id
  }))
})

const canImport = computed(() => {
  return (
    importForm.chapterId &&
    importForm.templateId &&
    importForm.content.trim().length > 0
  )
})

watch(
  () => props.show,
  (val) => {
    if (val) {
      importForm.chapterId = props.defaultChapterId || bookStore.currentChapterId || ''
      importForm.templateId = templateStore.currentTemplateId || templateStore.templates[0]?.id || ''
      importForm.content = ''
      importForm.source = 'text'
      importForm.charsPerPage = 500
      importForm.startSide = 'right'
      fileName.value = ''
      paginationResult.value = { pages: [], totalPages: 0, estimatedChars: 0 }
    }
  }
)

function handleFileUpload({ file, onFinish, onError }: any) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      importForm.content = e.target?.result as string
      fileName.value = file.name
      onFinish()
      message.success('文件已读取')
    } catch {
      onError()
      message.error('文件读取失败')
    }
  }
  reader.onerror = () => {
    onError()
    message.error('文件读取失败')
  }
  reader.readAsText(file.file, 'UTF-8')
}

function previewPagination() {
  if (!importForm.content.trim()) {
    message.warning('请先输入或导入文稿内容')
    return
  }
  paginationResult.value = paginateContent(
    importForm.content,
    importForm.charsPerPage,
    importForm.startSide
  )
  message.info(`预览完成，共 ${paginationResult.value.totalPages} 页`)
}

async function handleImport() {
  if (!canImport.value) {
    message.warning('请填写完整导入信息')
    return
  }
  try {
    const pages = await bookStore.importManuscriptToChapter(
      importForm.chapterId,
      importForm.content,
      importForm.templateId,
      importForm.charsPerPage,
      importForm.startSide
    )
    message.success(`成功导入 ${pages.length} 页文稿`)
    emit('imported', pages.length)
    handleClose()
  } catch (e: any) {
    message.error(e?.message || '导入失败')
  }
}

function handleClose() {
  emit('update:show', false)
  emit('close')
}
</script>

<style scoped>
.file-name {
  margin-top: 8px;
  font-size: 12px;
  color: #1890ff;
}

.preview-section {
  background-color: #fafafa;
  border-radius: 6px;
  padding: 12px;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.preview-scroll {
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}

.preview-page {
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
}

.chapter-tag {
  font-size: 11px;
  color: #1890ff;
}

.page-preview-text {
  margin-top: 8px;
  font-size: 12px;
  color: #555;
  line-height: 1.6;
  font-family: SimSun, serif;
}

.more-hint {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 8px;
}
</style>
