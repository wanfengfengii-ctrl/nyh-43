<template>
  <div class="rule-library-panel">
    <div class="panel-header">
      <n-space justify="space-between" style="width: 100%">
        <span class="panel-title">异体字与避讳字规则库</span>
        <n-space>
          <n-button size="tiny" @click="showAddModal = true">
            <template #icon><n-icon><Add /></n-icon></template>
            新增规则
          </n-button>
        </n-space>
      </n-space>
    </div>

    <div class="stats-bar">
      <n-space>
        <n-tag size="small" :style="{ backgroundColor: getTypeColor('variant'), color: '#fff' }">
          异体字: {{ ruleCountByType.variant }}
        </n-tag>
        <n-tag size="small" :style="{ backgroundColor: getTypeColor('borrowed'), color: '#fff' }">
          通假字: {{ ruleCountByType.borrowed }}
        </n-tag>
        <n-tag size="small" :style="{ backgroundColor: getTypeColor('taboo'), color: '#fff' }">
          避讳字: {{ ruleCountByType.taboo }}
        </n-tag>
        <n-tag size="small">总计: {{ ruleCountByType.total }}</n-tag>
      </n-space>
    </div>

    <div class="filter-bar">
      <n-space style="width: 100%">
        <n-input
          v-model:value="searchKeyword"
          size="small"
          placeholder="搜索原字、规范字、出处..."
          clearable
          style="flex: 1"
        >
          <template #prefix>
            <n-icon><Search /></n-icon>
          </template>
        </n-input>
        <n-radio-group v-model:value="selectedRuleType" size="small">
          <n-radio-button value="all">全部</n-radio-button>
          <n-radio-button value="variant">异体字</n-radio-button>
          <n-radio-button value="borrowed">通假字</n-radio-button>
          <n-radio-button value="taboo">避讳字</n-radio-button>
        </n-radio-group>
      </n-space>
    </div>

    <div class="rule-list">
      <n-list bordered size="small">
        <n-list-item
          v-for="rule in filteredRules"
          :key="rule.id"
          class="rule-item"
        >
          <n-space align="start" style="width: 100%">
            <n-tag
              size="small"
              :style="{ backgroundColor: getTypeColor(rule.type), color: '#fff' }"
              round
            >
              {{ getTypeLabel(rule.type) }}
            </n-tag>
            <div style="flex: 1; min-width: 0">
              <div class="rule-chars">
                <span class="original-char">{{ rule.originalChar }}</span>
                <n-icon class="arrow-icon"><ArrowForward /></n-icon>
                <span class="standard-char">{{ rule.standardChar }}</span>
              </div>
              <div class="rule-source">出处: {{ rule.source }}</div>
              <div class="rule-description">{{ rule.description }}</div>
              <div class="rule-meta">
                <n-space>
                  <n-tag size="tiny" :type="rule.isBuiltIn ? 'info' : 'success'">
                    {{ rule.isBuiltIn ? '系统内置' : '自定义' }}
                  </n-tag>
                  <n-tag size="tiny">
                    置信度: {{ (rule.confidence * 100).toFixed(0) }}%
                  </n-tag>
                </n-space>
              </div>
            </div>
            <div class="rule-actions">
              <n-space v-if="!rule.isBuiltIn">
                <n-button
                  size="tiny"
                  type="primary"
                  quaternary
                  @click="handleEdit(rule)"
                >
                  编辑
                </n-button>
                <n-button
                  size="tiny"
                  type="error"
                  quaternary
                  @click="handleDelete(rule)"
                >
                  删除
                </n-button>
              </n-space>
            </div>
          </n-space>
        </n-list-item>
      </n-list>
    </div>

    <div v-if="filteredRules.length === 0" class="empty-state">
      <n-empty description="未找到匹配的规则" />
    </div>

    <n-divider style="margin: 12px 0" />

    <div class="action-bar">
      <n-space>
        <n-button size="tiny" @click="handleImport">
          <template #icon><n-icon><CloudUpload /></n-icon></template>
          导入规则
        </n-button>
        <n-button size="tiny" @click="handleExport">
          <template #icon><n-icon><CloudDownload /></n-icon></template>
          导出规则
        </n-button>
        <n-button size="tiny" @click="handleReset">
          <template #icon><n-icon><Refresh /></n-icon></template>
          恢复默认
        </n-button>
      </n-space>
    </div>

    <n-modal v-model:show="showAddModal" preset="dialog" title="新增规则" :mask-closable="false">
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="top">
        <n-form-item label="类型" path="type">
          <n-radio-group v-model:value="formData.type">
            <n-radio value="variant">异体字</n-radio>
            <n-radio value="borrowed">通假字</n-radio>
            <n-radio value="taboo">避讳字</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="原字" path="originalChar">
          <n-input v-model:value="formData.originalChar" placeholder="请输入原字" maxlength="10" />
        </n-form-item>
        <n-form-item label="规范字" path="standardChar">
          <n-input v-model:value="formData.standardChar" placeholder="请输入规范字" maxlength="10" />
        </n-form-item>
        <n-form-item label="出处" path="source">
          <n-input v-model:value="formData.source" placeholder="如：《说文解字》" />
        </n-form-item>
        <n-form-item label="说明" path="description">
          <n-input v-model:value="formData.description" placeholder="请输入规则说明" type="textarea" :rows="3" />
        </n-form-item>
        <n-form-item label="置信度" path="confidence">
          <n-slider v-model:value="formData.confidence" :min="0.5" :max="1" :step="0.05" :marks="{0.5: '50%', 0.75: '75%', 1: '100%'}" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="showAddModal = false">取消</n-button>
          <n-button type="primary" @click="handleSaveRule">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showEditModal" preset="dialog" title="编辑规则" :mask-closable="false">
      <n-form ref="editFormRef" :model="editFormData" :rules="formRules" label-placement="top">
        <n-form-item label="类型" path="type">
          <n-radio-group v-model:value="editFormData.type">
            <n-radio value="variant">异体字</n-radio>
            <n-radio value="borrowed">通假字</n-radio>
            <n-radio value="taboo">避讳字</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="原字" path="originalChar">
          <n-input v-model:value="editFormData.originalChar" placeholder="请输入原字" maxlength="10" />
        </n-form-item>
        <n-form-item label="规范字" path="standardChar">
          <n-input v-model:value="editFormData.standardChar" placeholder="请输入规范字" maxlength="10" />
        </n-form-item>
        <n-form-item label="出处" path="source">
          <n-input v-model:value="editFormData.source" placeholder="如：《说文解字》" />
        </n-form-item>
        <n-form-item label="说明" path="description">
          <n-input v-model:value="editFormData.description" placeholder="请输入规则说明" type="textarea" :rows="3" />
        </n-form-item>
        <n-form-item label="置信度" path="confidence">
          <n-slider v-model:value="editFormData.confidence" :min="0.5" :max="1" :step="0.05" :marks="{0.5: '50%', 0.75: '75%', 1: '100%'}" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" @click="handleUpdateRule">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import {
  NSpace, NButton, NIcon, NTag, NList, NListItem, NInput,
  NRadioGroup, NRadioButton, NDivider, NEmpty, NModal, NForm,
  NFormItem, NRadio, NSlider, useMessage, useDialog
} from 'naive-ui'
import { Add, Search, ArrowForward, CloudUpload, CloudDownload, Refresh } from '@vicons/ionicons5'
import { useCollationRuleStore } from '@/stores/collation-rules'
import type { CollationRule, CollationRuleType } from '@/types'
import { getRuleTypeLabel, getRuleTypeColor } from '@/utils/collation'
import type { FormRules, FormInst } from 'naive-ui'

const ruleStore = useCollationRuleStore()
const message = useMessage()
const dialog = useDialog()

const showAddModal = ref(false)
const showEditModal = ref(false)
const formRef = ref<FormInst | null>(null)
const editFormRef = ref<FormInst | null>(null)
const editingRuleId = ref('')

const searchKeyword = computed({
  get: () => ruleStore.searchKeyword,
  set: (v) => { ruleStore.searchKeyword = v }
})

const selectedRuleType = computed({
  get: () => ruleStore.selectedRuleType,
  set: (v) => { ruleStore.selectedRuleType = v }
})

const filteredRules = computed(() => ruleStore.filteredRules)
const ruleCountByType = computed(() => ruleStore.ruleCountByType)

const formData = reactive({
  type: 'variant' as CollationRuleType,
  originalChar: '',
  standardChar: '',
  source: '',
  description: '',
  confidence: 0.8
})

const editFormData = reactive({
  type: 'variant' as CollationRuleType,
  originalChar: '',
  standardChar: '',
  source: '',
  description: '',
  confidence: 0.8
})

const formRules: FormRules = {
  originalChar: [
    { required: true, message: '请输入原字', trigger: 'blur' },
    { min: 1, max: 10, message: '原字长度在 1 到 10 个字符', trigger: 'blur' }
  ],
  standardChar: [
    { required: true, message: '请输入规范字', trigger: 'blur' },
    { min: 1, max: 10, message: '规范字长度在 1 到 10 个字符', trigger: 'blur' }
  ],
  source: [
    { required: true, message: '请输入出处', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入说明', trigger: 'blur' }
  ]
}

function getTypeLabel(type: CollationRuleType): string {
  return getRuleTypeLabel(type)
}

function getTypeColor(type: CollationRuleType): string {
  return getRuleTypeColor(type)
}

function resetForm() {
  formData.type = 'variant'
  formData.originalChar = ''
  formData.standardChar = ''
  formData.source = ''
  formData.description = ''
  formData.confidence = 0.8
}

function handleSaveRule() {
  formRef.value?.validate((errors) => {
    if (!errors) {
      ruleStore.addRule({
        type: formData.type,
        originalChar: formData.originalChar,
        standardChar: formData.standardChar,
        source: formData.source,
        description: formData.description,
        confidence: formData.confidence
      })
      message.success('规则添加成功')
      showAddModal.value = false
      resetForm()
    }
  })
}

function handleEdit(rule: CollationRule) {
  editingRuleId.value = rule.id
  editFormData.type = rule.type
  editFormData.originalChar = rule.originalChar
  editFormData.standardChar = rule.standardChar
  editFormData.source = rule.source
  editFormData.description = rule.description
  editFormData.confidence = rule.confidence
  showEditModal.value = true
}

function handleUpdateRule() {
  editFormRef.value?.validate((errors) => {
    if (!errors) {
      ruleStore.updateRule(editingRuleId.value, {
        type: editFormData.type,
        originalChar: editFormData.originalChar,
        standardChar: editFormData.standardChar,
        source: editFormData.source,
        description: editFormData.description,
        confidence: editFormData.confidence,
        createdBy: 'user'
      })
      message.success('规则更新成功')
      showEditModal.value = false
    }
  })
}

function handleDelete(rule: CollationRule) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除规则「${rule.originalChar} → ${rule.standardChar}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      ruleStore.deleteRule(rule.id)
      message.success('规则已删除')
    }
  })
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
        const data = JSON.parse(content)
        if (Array.isArray(data)) {
          const newRules = ruleStore.importRules(data)
          message.success(`成功导入 ${newRules.length} 条规则`)
        } else {
          message.error('文件格式不正确')
        }
      } catch {
        message.error('导入失败，文件格式不正确')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

function handleExport() {
  const content = ruleStore.exportRules()
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'collation-rules.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  message.success('规则导出成功')
}

function handleReset() {
  dialog.warning({
    title: '确认恢复',
    content: '确定要恢复默认规则吗？自定义规则将被清除。',
    positiveText: '恢复',
    negativeText: '取消',
    onPositiveClick: () => {
      ruleStore.resetToDefault()
      message.success('已恢复默认规则')
    }
  })
}
</script>

<style scoped>
.rule-library-panel {
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

.stats-bar {
  margin-bottom: 12px;
}

.filter-bar {
  margin-bottom: 12px;
}

.rule-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.rule-item {
  padding: 12px 16px !important;
}

.rule-chars {
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

.rule-source {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.rule-description {
  font-size: 12px;
  color: #555;
  margin-bottom: 6px;
}

.rule-meta {
  margin-bottom: 4px;
}

.rule-actions {
  flex-shrink: 0;
}

.empty-state {
  padding: 40px 0;
}

.action-bar {
  padding-top: 8px;
}
</style>
