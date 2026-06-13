import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CollationHistory, CollationMatch, Chapter } from '@/types'
import { generateId } from '@/utils/validation'

export const useCollationHistoryStore = defineStore('collationHistory', () => {
  const histories = ref<CollationHistory[]>([])
  const currentHistoryId = ref<string | null>(null)

  const allHistories = computed(() => 
    [...histories.value].sort((a, b) => b.startTime - a.startTime)
  )

  const currentHistory = computed(() => 
    histories.value.find(h => h.id === currentHistoryId.value) || null
  )

  function snapshotChapters(chapterIds: string[], allChapters: Chapter[]): Array<{ id: string; title: string }> {
    const result: Array<{ id: string; title: string }> = []
    const map = new Map(allChapters.map(c => [c.id, c.title]))
    for (const id of chapterIds) {
      if (map.has(id)) {
        result.push({ id, title: map.get(id) || '未知章节' })
      }
    }
    return result
  }

  function createHistory(
    bookId: string,
    bookTitle: string,
    chapterIds: string[],
    matches: CollationMatch[],
    chapters: Chapter[] = [],
    operator: string = 'user'
  ): CollationHistory {
    const now = Date.now()
    const history: CollationHistory = {
      id: generateId(),
      bookId,
      bookTitle,
      startTime: now,
      endTime: now,
      totalMatches: matches.length,
      confirmedCount: matches.filter(m => m.status === 'confirmed').length,
      ignoredCount: matches.filter(m => m.status === 'ignored').length,
      customCount: matches.filter(m => m.status === 'custom').length,
      chapterIds,
      chapters: snapshotChapters(chapterIds, chapters),
      operator
    }
    histories.value.push(history)
    currentHistoryId.value = history.id
    return history
  }

  function updateHistoryStats(historyId: string, matches: CollationMatch[]) {
    const history = histories.value.find(h => h.id === historyId)
    if (history) {
      history.endTime = Date.now()
      history.confirmedCount = matches.filter(m => m.status === 'confirmed').length
      history.ignoredCount = matches.filter(m => m.status === 'ignored').length
      history.customCount = matches.filter(m => m.status === 'custom').length
    }
  }

  function getHistoriesByBook(bookId: string): CollationHistory[] {
    return histories.value
      .filter(h => h.bookId === bookId)
      .sort((a, b) => b.startTime - a.startTime)
  }

  function deleteHistory(historyId: string) {
    const idx = histories.value.findIndex(h => h.id === historyId)
    if (idx !== -1) {
      histories.value.splice(idx, 1)
      if (currentHistoryId.value === historyId) {
        currentHistoryId.value = histories.value[0]?.id || null
      }
    }
  }

  function clearHistoriesByBook(bookId: string) {
    histories.value = histories.value.filter(h => h.bookId !== bookId)
    if (currentHistory.value?.bookId === bookId) {
      currentHistoryId.value = histories.value[0]?.id || null
    }
  }

  function clearAllHistories() {
    histories.value = []
    currentHistoryId.value = null
  }

  function selectHistory(historyId: string) {
    const history = histories.value.find(h => h.id === historyId)
    if (history) {
      currentHistoryId.value = historyId
    }
  }

  return {
    histories,
    currentHistoryId,
    allHistories,
    currentHistory,
    createHistory,
    updateHistoryStats,
    getHistoriesByBook,
    deleteHistory,
    clearHistoriesByBook,
    clearAllHistories,
    selectHistory
  }
}, {
  persist: {
    key: 'ancient-book-collation-history',
    paths: ['histories', 'currentHistoryId']
  }
})
