import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PageTemplate, TemplateVersion, TemplateDiff } from '@/types'
import { generateId } from '@/utils/validation'

export function diffTemplates(oldTpl: PageTemplate, newTpl: PageTemplate): TemplateDiff[] {
  const diffs: TemplateDiff[] = []

  function traverse(obj1: Record<string, unknown>, obj2: Record<string, unknown>, path: string = '') {
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)])
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key
      const v1 = obj1[key]
      const v2 = obj2[key]
      if (v1 === undefined && v2 !== undefined) {
        diffs.push({ field: key, oldValue: undefined, newValue: v2, path: currentPath })
      } else if (v1 !== undefined && v2 === undefined) {
        diffs.push({ field: key, oldValue: v1, newValue: undefined, path: currentPath })
      } else if (typeof v1 === 'object' && typeof v2 === 'object' && v1 !== null && v2 !== null) {
        traverse(v1 as Record<string, unknown>, v2 as Record<string, unknown>, currentPath)
      } else if (JSON.stringify(v1) !== JSON.stringify(v2)) {
        diffs.push({ field: key, oldValue: v1, newValue: v2, path: currentPath })
      }
    }
  }

  traverse(oldTpl as unknown as Record<string, unknown>, newTpl as unknown as Record<string, unknown>)
  return diffs
}

export const useTemplateVersionStore = defineStore('template-version', () => {
  const versions = ref<TemplateVersion[]>([])

  const versionsByTemplate = computed(() => {
    const map: Record<string, TemplateVersion[]> = {}
    for (const v of versions.value) {
      if (!map[v.templateId]) map[v.templateId] = []
      map[v.templateId].push(v)
    }
    for (const id of Object.keys(map)) {
      map[id].sort((a, b) => b.version - a.version)
    }
    return map
  })

  function getVersions(templateId: string): TemplateVersion[] {
    return versionsByTemplate.value[templateId] || []
  }

  function getLatestVersion(templateId: string): TemplateVersion | null {
    const list = getVersions(templateId)
    return list[0] || null
  }

  function getVersion(templateId: string, version: number): TemplateVersion | null {
    const list = getVersions(templateId)
    return list.find(v => v.version === version) || null
  }

  function saveVersion(template: PageTemplate, note: string = '', author: string = 'user'): TemplateVersion {
    const existing = getVersions(template.id)
    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1
    const version: TemplateVersion = {
      id: generateId(),
      templateId: template.id,
      version: nextVersion,
      snapshot: JSON.parse(JSON.stringify(template)),
      note,
      createdAt: Date.now(),
      author
    }
    versions.value.push(version)
    return version
  }

  function compareVersions(versionA: TemplateVersion, versionB: TemplateVersion): TemplateDiff[] {
    return diffTemplates(versionA.snapshot, versionB.snapshot)
  }

  function compareWithTemplate(version: TemplateVersion, template: PageTemplate): TemplateDiff[] {
    return diffTemplates(version.snapshot, template)
  }

  function restoreVersion(version: TemplateVersion): PageTemplate {
    return JSON.parse(JSON.stringify(version.snapshot))
  }

  function deleteVersion(versionId: string) {
    const idx = versions.value.findIndex(v => v.id === versionId)
    if (idx !== -1) {
      versions.value.splice(idx, 1)
    }
  }

  function deleteTemplateVersions(templateId: string) {
    versions.value = versions.value.filter(v => v.templateId !== templateId)
  }

  return {
    versions,
    versionsByTemplate,
    getVersions,
    getLatestVersion,
    getVersion,
    saveVersion,
    compareVersions,
    compareWithTemplate,
    restoreVersion,
    deleteVersion,
    deleteTemplateVersions
  }
}, {
  persist: {
    key: 'ancient-book-template-versions',
    paths: ['versions']
  }
})
