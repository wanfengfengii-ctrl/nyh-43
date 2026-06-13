<template>
  <div class="property-panel">
    <div v-if="!template" class="empty-state">
      <n-empty description="请选择一个版式" />
    </div>

    <template v-else>
      <n-collapse default-expanded-names="['basic', 'page', 'margins']" accordion>
        <n-collapse-item title="基本信息" name="basic">
          <div class="form-group">
            <n-form-item label="版式编号">
              <n-input
                :value="template.code"
                @update:value="handleCodeChange"
                placeholder="请输入版式编号"
              />
            </n-form-item>
            <n-form-item label="版式名称">
              <n-input
                :value="template.name"
                @update:value="(v) => updateField('name', v)"
                placeholder="请输入版式名称"
              />
            </n-form-item>
            <n-form-item label="描述">
              <n-input
                :value="template.description"
                type="textarea"
                :rows="3"
                @update:value="(v) => updateField('description', v)"
                placeholder="版式说明"
              />
            </n-form-item>
          </div>
        </n-collapse-item>

        <n-collapse-item title="页面尺寸" name="page">
          <div class="form-group">
            <n-form-item label="页面宽度 (px)">
              <n-input-number
                :value="template.pageSize.width"
                @update:value="(v) => updatePageSize('width', v)"
                :min="50"
                :max="2000"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="页面高度 (px)">
              <n-input-number
                :value="template.pageSize.height"
                @update:value="(v) => updatePageSize('height', v)"
                :min="50"
                :max="2000"
                style="width: 100%"
              />
            </n-form-item>
          </div>
        </n-collapse-item>

        <n-collapse-item title="页边距（天头地脚）" name="margins">
          <div class="form-group">
            <n-form-item label="天头 (上)">
              <n-input-number
                :value="template.margins.top"
                @update:value="(v) => updateMargin('top', v)"
                :min="0"
                :max="500"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="地脚 (下)">
              <n-input-number
                :value="template.margins.bottom"
                @update:value="(v) => updateMargin('bottom', v)"
                :min="0"
                :max="500"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="左边距">
              <n-input-number
                :value="template.margins.left"
                @update:value="(v) => updateMargin('left', v)"
                :min="0"
                :max="500"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="右边距">
              <n-input-number
                :value="template.margins.right"
                @update:value="(v) => updateMargin('right', v)"
                :min="0"
                :max="500"
                style="width: 100%"
              />
            </n-form-item>
            <n-alert v-if="!marginsValid" type="warning" size="small">
              版心区域不能超出版框
            </n-alert>
          </div>
        </n-collapse-item>

        <n-collapse-item title="版框样式" name="border">
          <div class="form-group">
            <n-form-item label="框线宽度">
              <n-input-number
                :value="template.border.lineWidth"
                @update:value="(v) => updateBorder('lineWidth', v)"
                :min="0.5"
                :max="20"
                :step="0.5"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="框线颜色">
              <n-color-picker
                :value="template.border.color"
                @update:value="(v) => updateBorder('color', v)"
                :modes="['hex']"
                show-label
              />
            </n-form-item>
          </div>
        </n-collapse-item>

        <n-collapse-item title="栏线设置" name="column">
          <div class="form-group">
            <n-form-item label="栏数">
              <n-input-number
                :value="template.column.count"
                @update:value="(v) => updateColumn('count', v)"
                :min="1"
                :max="30"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="栏线宽度">
              <n-input-number
                :value="template.column.lineWidth"
                @update:value="(v) => updateColumn('lineWidth', v)"
                :min="0.1"
                :max="10"
                :step="0.1"
                style="width: 100%"
              />
              <div v-if="template.column.lineWidth <= 0" class="form-tip error">
                栏线宽度必须大于 0
              </div>
            </n-form-item>
            <n-form-item label="栏间距">
              <n-input-number
                :value="template.column.spacing"
                @update:value="(v) => updateColumn('spacing', v)"
                :min="0"
                :max="200"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="栏线颜色">
              <n-color-picker
                :value="template.column.color"
                @update:value="(v) => updateColumn('color', v)"
                :modes="['hex']"
                show-label
              />
            </n-form-item>
          </div>
        </n-collapse-item>

        <n-collapse-item title="鱼尾样式" name="fishtail">
          <div class="form-group">
            <n-form-item label="鱼尾位置">
              <n-select
                :value="template.fishTail.position"
                @update:value="(v) => updateFishTail('position', v)"
                :options="fishTailPositionOptions"
              />
            </n-form-item>
            <n-form-item label="鱼尾样式">
              <n-select
                :value="template.fishTail.style"
                @update:value="(v) => updateFishTail('style', v)"
                :options="fishTailStyleOptions"
              />
            </n-form-item>
            <n-form-item label="鱼尾宽度">
              <n-input-number
                :value="template.fishTail.width"
                @update:value="(v) => updateFishTail('width', v)"
                :min="5"
                :max="200"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="鱼尾高度">
              <n-input-number
                :value="template.fishTail.height"
                @update:value="(v) => updateFishTail('height', v)"
                :min="5"
                :max="200"
                style="width: 100%"
              />
            </n-form-item>
            <n-form-item label="鱼尾线宽">
              <n-input-number
                :value="template.fishTail.lineWidth"
                @update:value="(v) => updateFishTail('lineWidth', v)"
                :min="0.1"
                :max="10"
                :step="0.1"
                style="width: 100%"
              />
            </n-form-item>
          </div>
        </n-collapse-item>

        <n-collapse-item title="中缝（版心线）" name="centerline">
          <div class="form-group">
            <n-form-item label="启用中缝线">
              <n-switch
                :value="template.centerLine.enabled"
                @update:value="(v) => updateCenterLine('enabled', v)"
              />
            </n-form-item>
            <template v-if="template.centerLine.enabled">
              <n-form-item label="中线宽度">
                <n-input-number
                  :value="template.centerLine.lineWidth"
                  @update:value="(v) => updateCenterLine('lineWidth', v)"
                  :min="0.1"
                  :max="10"
                  :step="0.1"
                  style="width: 100%"
                />
              </n-form-item>
              <n-form-item label="中线颜色">
                <n-color-picker
                :value="template.centerLine.color"
                @update:value="(v) => updateCenterLine('color', v)"
                :modes="['hex']"
                show-label
              />
              </n-form-item>
            </template>
          </div>
        </n-collapse-item>
      </n-collapse>

      <div class="validation-section">
        <n-divider>版式校验</n-divider>
        <n-alert
          :type="validationResult.valid ? 'success' : 'error'"
          :title="validationResult.valid ? '版式定义完整' : '版式定义不完整'"
          size="small"
        >
          <template v-if="validationResult.errors.length">
            <div class="error-list">
              <div v-for="(err, i) in validationResult.errors" :key="i" class="error-item">
                · {{ err }}
              </div>
            </div>
          </template>
          <template v-if="validationResult.warnings.length">
            <n-divider style="margin: 6px 0" />
            <div class="warning-list">
              <div v-for="(warn, i) in validationResult.warnings" :key="i" class="warning-item">
                ⚠ {{ warn }}
              </div>
            </div>
          </template>
        </n-alert>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import {
  NFormItem, NInput, NInputNumber, NColorPicker, NSelect, NSwitch,
  NCollapse, NCollapseItem, NAlert, NEmpty, NDivider, useMessage
} from 'naive-ui'
import { useTemplateStore } from '@/stores/template'
import { validateTemplate } from '@/utils/validation'
import type { FishTailPosition, FishTailStyle } from '@/types'

const templateStore = useTemplateStore()
const message = useMessage()

const template = computed(() => templateStore.currentTemplate)

const validationResult = computed(() => {
  if (!template.value) {
    return { valid: false, errors: ['未选择版式'], warnings: [] }
  }
  return validateTemplate(template.value)
})

const marginsValid = computed(() => {
  if (!template.value) return true
  const typeSettingWidth = template.value.pageSize.width - template.value.margins.left - template.value.margins.right
  const typeSettingHeight = template.value.pageSize.height - template.value.margins.top - template.value.margins.bottom
  return typeSettingWidth > 0 && typeSettingHeight > 0
})

const fishTailPositionOptions = [
  { label: '上方', value: 'top' },
  { label: '下方', value: 'bottom' },
  { label: '上下都有', value: 'both' }
]

const fishTailStyleOptions = [
  { label: '单鱼尾', value: 'single' },
  { label: '双鱼尾', value: 'double' },
  { label: '黑鱼尾', value: 'black' },
  { label: '白鱼尾', value: 'white' }
]

function handleCodeChange(value: string) {
  if (!template.value) return
  if (templateStore.isCodeDuplicate(value, template.value.id)) {
    message.error('版式编号不能重复')
    return
  }
  updateField('code', value)
}

function updateField(key: string, value: any) {
  if (!template.value) return
  templateStore.updateTemplate(template.value.id, { [key]: value })
}

function updatePageSize(key: 'width' | 'height', value: number | null) {
  if (!template.value || value === null) return
  const newSize = { ...template.value.pageSize, [key]: value }
  templateStore.updateTemplate(template.value.id, { pageSize: newSize })
}

function updateMargin(key: 'top' | 'bottom' | 'left' | 'right', value: number | null) {
  if (!template.value || value === null) return
  const newMargins = { ...template.value.margins, [key]: value }
  templateStore.updateTemplate(template.value.id, { margins: newMargins })
}

function updateBorder(key: string, value: any) {
  if (!template.value) return
  const newBorder = { ...template.value.border, [key]: value }
  templateStore.updateTemplate(template.value.id, { border: newBorder })
}

function updateColumn(key: string, value: any) {
  if (!template.value) return
  const newColumn = { ...template.value.column, [key]: value }
  templateStore.updateTemplate(template.value.id, { column: newColumn })
}

function updateFishTail(key: string, value: FishTailPosition | FishTailStyle | number | null) {
  if (!template.value || value === null) return
  const newFishTail = { ...template.value.fishTail, [key]: value }
  templateStore.updateTemplate(template.value.id, { fishTail: newFishTail })
}

function updateCenterLine(key: string, value: any) {
  if (!template.value) return
  const newCenterLine = { ...template.value.centerLine, [key]: value }
  templateStore.updateTemplate(template.value.id, { centerLine: newCenterLine })
}
</script>

<style scoped>
.property-panel {
  padding: 12px;
  height: 100%;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.form-group {
  padding: 8px 4px;
}

.form-tip {
  font-size: 12px;
  margin-top: 4px;
}

.form-tip.error {
  color: #d03050;
}

.validation-section {
  margin-top: 16px;
}

.error-list,
.warning-list {
  font-size: 12px;
  line-height: 1.6;
}

.error-item {
  color: #d03050;
}

.warning-item {
  color: #f0a020;
}
</style>
