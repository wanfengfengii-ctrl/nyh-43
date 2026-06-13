import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PageTemplate } from '@/types'
import { generateId, validateTemplate, isTemplateComplete } from '@/utils/validation'
import { useCanvasStore } from './canvas'

function createDefaultTemplate(code: string, name: string): PageTemplate {
  const now = Date.now()
  return {
    id: generateId(),
    code,
    name,
    description: '',
    pageSize: { width: 400, height: 600 },
    margins: { top: 60, bottom: 60, left: 40, right: 40 },
    border: { lineWidth: 2, color: '#2c2c2c' },
    column: { count: 9, lineWidth: 1, spacing: 20, color: '#2c2c2c' },
    fishTail: {
      position: 'both',
      style: 'double',
      width: 24,
      height: 40,
      lineWidth: 1
    },
    centerLine: { enabled: true, lineWidth: 1, color: '#2c2c2c' },
    createdAt: now,
    updatedAt: now
  }
}

export const useTemplateStore = defineStore('template', () => {
  const templates = ref<PageTemplate[]>([
    { ...createDefaultTemplate('GJ-001', '宋版蝴蝶装'), description: '宋代标准蝴蝶装版式，九行本' },
    { ...createDefaultTemplate('GJ-002', '明版包背装'), description: '明代包背装版式，十行本' }
  ])

  const currentTemplateId = ref<string | null>(templates.value[0]?.id || null)

  const currentTemplate = computed(() => {
    return templates.value.find(t => t.id === currentTemplateId.value) || null
  })

  const isCurrentComplete = computed(() => {
    if (!currentTemplate.value) return false
    return isTemplateComplete(currentTemplate.value)
  })

  function isCodeDuplicate(code: string, excludeId?: string): boolean {
    return templates.value.some(
      t => t.code === code && t.id !== excludeId
    )
  }

  function selectTemplate(id: string) {
    const template = templates.value.find(t => t.id === id)
    if (template) {
      currentTemplateId.value = id
    }
  }

  function addTemplate(template?: Partial<PageTemplate>): PageTemplate {
    let code = 'GJ-' + String(templates.value.length + 1).padStart(3, '0')
    let counter = templates.value.length + 1
    while (isCodeDuplicate(code)) {
      counter++
      code = 'GJ-' + String(counter).padStart(3, '0')
    }
    const newTemplate = createDefaultTemplate(code, '新版式')
    if (template) {
      Object.assign(newTemplate, template, {
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    }
    templates.value.push(newTemplate)
    currentTemplateId.value = newTemplate.id
    return newTemplate
  }

  function duplicateTemplate(id: string): PageTemplate | null {
    const source = templates.value.find(t => t.id === id)
    if (!source) return null
    let code = source.code + '-副本'
    let counter = 1
    while (isCodeDuplicate(code)) {
      counter++
      code = source.code + `-副本${counter}`
    }
    const newTemplate: PageTemplate = {
      ...JSON.parse(JSON.stringify(source)),
      id: generateId(),
      code,
      name: source.name + ' 副本',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    templates.value.push(newTemplate)
    currentTemplateId.value = newTemplate.id
    return newTemplate
  }

  function deleteTemplate(id: string) {
    const index = templates.value.findIndex(t => t.id === id)
    if (index === -1) return
    templates.value.splice(index, 1)
    if (currentTemplateId.value === id) {
      currentTemplateId.value = templates.value[0]?.id || null
    }
    const canvasStore = useCanvasStore()
    canvasStore.cleanupTemplateState(id)
  }

  function updateTemplate(id: string, updates: Partial<PageTemplate>) {
    const template = templates.value.find(t => t.id === id)
    if (!template) return
    if (updates.code && updates.code !== template.code) {
      if (isCodeDuplicate(updates.code, id)) {
        throw new Error('版式编号不能重复')
      }
    }
    Object.assign(template, updates, { updatedAt: Date.now() })
  }

  function validateCurrent() {
    if (!currentTemplate.value) {
      return { valid: false, errors: ['未选择任何版式'], warnings: [] }
    }
    return validateTemplate(currentTemplate.value)
  }

  function exportTemplate(id: string): string {
    const template = templates.value.find(t => t.id === id)
    if (!template) throw new Error('版式不存在')
    return JSON.stringify(template, null, 2)
  }

  function importTemplate(jsonString: string): PageTemplate {
    const data = JSON.parse(jsonString) as PageTemplate
    if (isCodeDuplicate(data.code)) {
      let counter = 1
      let newCode = data.code + '-导入'
      while (isCodeDuplicate(newCode)) {
        counter++
        newCode = data.code + `-导入${counter}`
      }
      data.code = newCode
    }
    const newTemplate: PageTemplate = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    templates.value.push(newTemplate)
    currentTemplateId.value = newTemplate.id
    return newTemplate
  }

  return {
    templates,
    currentTemplateId,
    currentTemplate,
    isCurrentComplete,
    isCodeDuplicate,
    selectTemplate,
    addTemplate,
    duplicateTemplate,
    deleteTemplate,
    updateTemplate,
    validateCurrent,
    exportTemplate,
    importTemplate
  }
}, {
  persist: {
    key: 'ancient-book-templates',
    paths: ['templates', 'currentTemplateId']
  }
})
