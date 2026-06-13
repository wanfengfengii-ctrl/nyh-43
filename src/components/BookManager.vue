<template>
  <div class="book-manager">
    <div class="section-header">
      <n-space justify="space-between" style="width: 100%">
        <span class="section-title">书籍管理</span>
        <n-button size="tiny" type="primary" @click="showNewBookDialog = true">
          新建书籍
        </n-button>
      </n-space>
    </div>

    <n-tabs type="line" size="small" animated>
      <n-tab-pane name="books" tab="书籍">
        <div v-if="bookStore.books.length === 0" class="empty-state">
          <n-empty description="暂无书籍，点击新建" />
        </div>
        <n-list v-else bordered size="small">
          <n-list-item
            v-for="book in bookStore.books"
            :key="book.id"
            :class="{ active: book.id === bookStore.currentBookId }"
            @click="bookStore.selectBook(book.id)"
          >
            <n-space justify="space-between" style="width: 100%">
              <div class="book-item">
                <div class="book-title">{{ book.title }}</div>
                <div class="book-meta">
                  {{ book.author || '佚名' }} · {{ book.totalPages }}页 · {{ book.chapters.length }}章
                </div>
              </div>
              <n-dropdown
                trigger="click"
                :options="getBookMenuOptions(book.id)"
                @select="(k: string) => handleBookMenu(k, book.id)"
              >
                <n-button size="tiny" quaternary @click.stop>
                  <template #icon><n-icon><EllipsisHorizontal /></n-icon></template>
                </n-button>
              </n-dropdown>
            </n-space>
          </n-list-item>
        </n-list>
      </n-tab-pane>

      <n-tab-pane name="chapters" tab="章节">
        <div v-if="!bookStore.currentBook" class="empty-state">
          <n-empty description="请先选择书籍" />
        </div>
        <template v-else>
          <div class="chapter-actions">
            <n-button size="tiny" type="primary" @click="addCurrentChapter">
              <template #icon><n-icon><Add /></n-icon></template>
              新增章节
            </n-button>
            <n-button
              size="tiny"
              type="primary"
              quaternary
              :disabled="!templateStore.currentTemplateId"
              @click="applyTemplateToBook"
            >
              应用版式到全书
            </n-button>
          </div>
          <n-collapse v-if="bookStore.currentBook.chapters.length > 0">
            <n-collapse-item
              v-for="chapter in sortedChapters"
              :key="chapter.id"
              :title="chapter.title"
              :name="chapter.id"
            >
              <div class="chapter-info">
                <n-space vertical size="small" style="width: 100%">
                  <n-space>
                    <n-tag size="small">起始页: {{ chapter.startPageNumber }}</n-tag>
                    <n-tag size="small" type="info">共 {{ chapter.pageCount }} 页</n-tag>
                    <n-select
                      v-model:value="chapter.templateId"
                      size="tiny"
                      placeholder="选择版式"
                      :options="templateOptions"
                      style="width: 180px"
                      @update:value="() => handleChapterTemplateChange(chapter)"
                    />
                    <n-button size="tiny" type="primary" quaternary @click="handleAddPage(chapter.id)">
                      新增页面
                    </n-button>
                    <n-button
                      size="tiny"
                      type="primary"
                      quaternary
                      :disabled="!chapter.templateId"
                      @click="emitShowImport(chapter.id)"
                    >
                      导入文稿
                    </n-button>
                  </n-space>
                  <n-data-table
                    :columns="pageColumns"
                    :data="chapter.pages"
                    :pagination="false"
                    size="small"
                    bordered
                    :row-class-name="(row) => row.id === bookStore.currentPageId ? 'active-page' : ''"
                    @click:row="(row) => bookStore.selectPage(row.id)"
                  />
                </n-space>
              </div>
            </n-collapse-item>
          </n-collapse>
          <div v-else class="empty-state">
            <n-empty description="暂无章节" />
          </div>
        </template>
      </n-tab-pane>
    </n-tabs>

    <n-modal v-model:show="showNewBookDialog" preset="card" title="新建书籍" style="width: 480px">
      <n-form label-placement="left" label-width="80px">
        <n-form-item label="书名">
          <n-input v-model:value="newBookForm.title" placeholder="请输入书名" />
        </n-form-item>
        <n-form-item label="作者">
          <n-input v-model:value="newBookForm.author" placeholder="请输入作者" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="newBookForm.description" type="textarea" placeholder="书籍简介" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showNewBookDialog = false">取消</n-button>
          <n-button type="primary" @click="handleCreateBook">确认创建</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import {
  NList, NListItem, NSpace, NButton, NIcon, NEmpty, NTabs, NTabPane,
  NCollapse, NCollapseItem, NTag, NSelect, NDataTable, NModal, NForm,
  NFormItem, NInput, useMessage, NDropdown
} from 'naive-ui'
import { Add, Trash, EllipsisHorizontal } from '@vicons/ionicons5'
import { useBookStore } from '@/stores/book'
import { useTemplateStore } from '@/stores/template'
import type { DataTableColumns } from 'naive-ui'

const emit = defineEmits<{
  (e: 'showImport', chapterId: string): void
}>()

const bookStore = useBookStore()
const templateStore = useTemplateStore()
const message = useMessage()

const showNewBookDialog = ref(false)
const newBookForm = reactive({ title: '', author: '', description: '' })

const sortedChapters = computed(() => {
  if (!bookStore.currentBook) return []
  return [...bookStore.currentBook.chapters].sort((a, b) => a.order - b.order)
})

const templateOptions = computed(() => {
  return templateStore.templates.map(t => ({ label: `${t.code} ${t.name}`, value: t.id }))
})

const pageColumns: DataTableColumns = [
  { title: '页码', key: 'pageNumber', width: 70 },
  { title: '页面', key: 'pageSide', width: 80, render: (row: any) => row.pageSide === 'left' ? '左页' : '右页' },
  { title: '元素数', key: 'elements', width: 80, render: (row: any) => row.elements?.length || 0 },
  { title: '违规', key: 'violations', width: 80, render: (row: any) => {
    const count = row.violations?.length || 0
    if (count === 0) return '—'
    const hasError = row.violations.some((v: any) => v.severity === 'error')
    return hasError ? `${count}项(错)` : `${count}项(警)`
  }},
  { title: '操作', key: 'actions', width: 90, render: (row: any) =>
    `(${row.id.slice(0, 4)}) 点击行选择`
  }
]

function emitShowImport(chapterId: string) {
  emit('showImport', chapterId)
}

function getBookMenuOptions(bookId: string) {
  return [
    { label: '重命名', key: 'rename' },
    { label: '删除', key: 'delete' }
  ]
}

function handleBookMenu(key: string, bookId: string) {
  if (key === 'delete') {
    bookStore.deleteBook(bookId)
    message.success('书籍已删除')
  } else if (key === 'rename') {
    message.info('请在属性面板中修改')
  }
}

function handleCreateBook() {
  if (!newBookForm.title.trim()) {
    message.warning('请输入书名')
    return
  }
  bookStore.createBook(newBookForm.title.trim(), newBookForm.author.trim())
  message.success('书籍创建成功')
  newBookForm.title = ''
  newBookForm.author = ''
  newBookForm.description = ''
  showNewBookDialog.value = false
}

function addCurrentChapter() {
  if (!bookStore.currentBookId) return
  bookStore.addChapter(bookStore.currentBookId)
  message.success('章节已创建')
}

function handleChapterTemplateChange(chapter: any) {
  bookStore.applyTemplateToChapter(chapter.id, chapter.templateId)
  message.success('版式已应用到章节')
}

function applyTemplateToBook() {
  if (!bookStore.currentBookId || !templateStore.currentTemplateId) return
  bookStore.applyTemplateToBook(bookStore.currentBookId, templateStore.currentTemplateId)
  message.success('版式已应用到整本书')
}

function handleAddPage(chapterId: string) {
  const page = bookStore.addPage(chapterId)
  if (page) {
    message.success('页面已创建')
  } else {
    message.warning('请先为章节设置版式')
  }
}
</script>

<style scoped>
.book-manager {
  padding: 12px;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
}

.empty-state {
  padding: 24px 0;
}

.book-item {
  flex: 1;
  min-width: 0;
}

.book-title {
  font-weight: 500;
  font-size: 13px;
  color: #1f1f1f;
}

.book-meta {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.n-list-item {
  cursor: pointer;
  transition: background-color 0.15s;
}

.n-list-item:hover {
  background-color: #f5f5f5;
}

.n-list-item.active {
  background-color: #e6f4ff;
  border-left: 3px solid #1890ff;
}

.chapter-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.chapter-info {
  padding: 4px 0;
}

.active-page {
  background-color: #e6f4ff !important;
}
</style>
