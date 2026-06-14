import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CollationRule, CollationRuleType } from '@/types'
import { generateId } from '@/utils/validation'
import { getAllBuiltInRules } from '@/utils/collation'

function initializeBuiltInRules(): CollationRule[] {
  const builtInData = getAllBuiltInRules()
  return builtInData.map(data => ({
    ...data,
    id: generateId(),
    createdAt: Date.now()
  }))
}

export const useCollationRuleStore = defineStore('collationRules', () => {
  const rules = ref<CollationRule[]>(initializeBuiltInRules())
  const selectedRuleType = ref<CollationRuleType | 'all'>('all')
  const searchKeyword = ref('')

  const allRules = computed(() => rules.value)

  const variantRules = computed(() => rules.value.filter(r => r.type === 'variant'))
  const borrowedRules = computed(() => rules.value.filter(r => r.type === 'borrowed'))
  const tabooRules = computed(() => rules.value.filter(r => r.type === 'taboo'))

  const builtInRules = computed(() => rules.value.filter(r => r.isBuiltIn))
  const customRules = computed(() => rules.value.filter(r => !r.isBuiltIn))

  const filteredRules = computed(() => {
    let result = rules.value
    
    if (selectedRuleType.value !== 'all') {
      result = result.filter(r => r.type === selectedRuleType.value)
    }
    
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.trim().toLowerCase()
      result = result.filter(r => 
        r.originalChar.includes(keyword) ||
        r.standardChar.includes(keyword) ||
        r.source.toLowerCase().includes(keyword) ||
        r.description.toLowerCase().includes(keyword)
      )
    }
    
    return result
  })

  const ruleCountByType = computed(() => ({
    variant: variantRules.value.length,
    borrowed: borrowedRules.value.length,
    taboo: tabooRules.value.length,
    total: rules.value.length
  }))

  function addRule(ruleData: Omit<CollationRule, 'id' | 'createdAt' | 'isBuiltIn' | 'createdBy'>): CollationRule {
    const newRule: CollationRule = {
      ...ruleData,
      id: generateId(),
      createdAt: Date.now(),
      isBuiltIn: false,
      createdBy: 'user'
    }
    rules.value.push(newRule)
    return newRule
  }

  function updateRule(id: string, updates: Partial<Omit<CollationRule, 'id' | 'createdAt' | 'isBuiltIn'>>) {
    const rule = rules.value.find(r => r.id === id)
    if (rule && !rule.isBuiltIn) {
      Object.assign(rule, updates)
    }
  }

  function deleteRule(id: string) {
    const idx = rules.value.findIndex(r => r.id === id)
    if (idx !== -1 && !rules.value[idx].isBuiltIn) {
      rules.value.splice(idx, 1)
    }
  }

  function getRuleById(id: string): CollationRule | undefined {
    return rules.value.find(r => r.id === id)
  }

  function getRulesByType(type: CollationRuleType): CollationRule[] {
    return rules.value.filter(r => r.type === type)
  }

  function importRules(ruleData: Array<Omit<CollationRule, 'id' | 'createdAt' | 'isBuiltIn' | 'createdBy'>>): CollationRule[] {
    const newRules: CollationRule[] = []
    for (const data of ruleData) {
      const exists = rules.value.some(r => 
        r.type === data.type && 
        r.originalChar === data.originalChar && 
        r.standardChar === data.standardChar
      )
      if (!exists) {
        const newRule: CollationRule = {
          ...data,
          id: generateId(),
          createdAt: Date.now(),
          isBuiltIn: false,
          createdBy: 'user'
        }
        rules.value.push(newRule)
        newRules.push(newRule)
      }
    }
    return newRules
  }

  function exportRules(format: 'json' = 'json', type?: CollationRuleType): string {
    let data = rules.value.filter(r => !r.isBuiltIn)
    if (type) {
      data = data.filter(r => r.type === type)
    }
    return JSON.stringify(data, null, 2)
  }

  function resetToDefault() {
    rules.value = initializeBuiltInRules()
  }

  function addMatchToRules(match: {
    originalChar: string
    standardChar: string
    type: CollationRuleType
    source: string
    description: string
    confidence: number
  }): CollationRule {
    return addRule({
      type: match.type,
      originalChar: match.originalChar,
      standardChar: match.standardChar,
      source: match.source,
      description: match.description,
      confidence: match.confidence
    })
  }

  return {
    rules,
    selectedRuleType,
    searchKeyword,
    allRules,
    variantRules,
    borrowedRules,
    tabooRules,
    builtInRules,
    customRules,
    filteredRules,
    ruleCountByType,
    addRule,
    updateRule,
    deleteRule,
    getRuleById,
    getRulesByType,
    importRules,
    exportRules,
    resetToDefault,
    addMatchToRules
  }
}, {
  persist: {
    key: 'ancient-book-collation-rules',
    paths: ['rules']
  }
})
