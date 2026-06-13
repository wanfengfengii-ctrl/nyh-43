import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Book, Chapter, BookPage, PageElement, PageSide } from '@/types'
import { generateId } from '@/utils/validation'
import { paginateContent } from '@/utils/pagination'
import { validatePage } from '@/utils/validation'

function createEmptyBook(): Book {
  const now = Date.now()
  return {
    id: generateId(),
    title: '未命名书籍',
    author: '',
    description: '',
    totalPages: 0,
    createdAt: now,
    updatedAt: now,
    chapters: [],
    defaultTemplateId: null
  }
}

function createEmptyChapter(bookId: string, order: number, title?: string): Chapter {
  return {
    id: generateId(),
    bookId,
    title: title || `第${order}章`,
    order,
    startPageNumber: 1,
    pageCount: 0,
    templateId: '',
    pages: []
  }
}

function createEmptyPage(
  chapterId: string,
  pageNumber: number,
  pageSide: PageSide,
  templateId: string
): BookPage {
  return {
    id: generateId(),
    chapterId,
    pageNumber,
    pageSide,
    templateId,
    elements: [],
    violations: [],
    content: ''
  }
}

export const useBookStore = defineStore('book', () => {
  const books = ref<Book[]>([])
  const currentBookId = ref<string | null>(null)
  const currentChapterId = ref<string | null>(null)
  const currentPageId = ref<string | null>(null)
  const showSpreadView = ref(false)

  const currentBook = computed<Book | null>(() => {
    return books.value.find(b => b.id === currentBookId.value) || null
  })

  const currentChapter = computed<Chapter | null>(() => {
    if (!currentBook.value) return null
    return currentBook.value.chapters.find(c => c.id === currentChapterId.value) || null
  })

  const currentPage = computed<BookPage | null>(() => {
    if (!currentChapter.value) return null
    return currentChapter.value.pages.find(p => p.id === currentPageId.value) || null
  })

  const allPages = computed<BookPage[]>(() => {
    if (!currentBook.value) return []
    return currentBook.value.chapters.flatMap(c => c.pages)
  })

  const currentPageIndex = computed(() => {
    const pages = allPages.value
    if (!currentPageId.value) return -1
    return pages.findIndex(p => p.id === currentPageId.value)
  })

  const spreadPages = computed(() => {
    const pages = allPages.value
    const idx = currentPageIndex.value
    if (idx < 0 || !showSpreadView.value) return []
    const leftIdx = idx % 2 === 0 ? idx - 1 : idx
    const rightIdx = leftIdx + 1
    const result: Array<BookPage | null> = []
    if (leftIdx >= 0 && pages[leftIdx]) result.push(pages[leftIdx])
    else result.push(null)
    if (rightIdx < pages.length && pages[rightIdx]) result.push(pages[rightIdx])
    else result.push(null)
    return result
  })

  function createBook(title?: string, author?: string): Book {
    const book = createEmptyBook()
    if (title) book.title = title
    if (author) book.author = author
    books.value.push(book)
    currentBookId.value = book.id
    return book
  }

  function selectBook(id: string) {
    const book = books.value.find(b => b.id === id)
    if (book) {
      currentBookId.value = id
      if (book.chapters.length > 0) {
        currentChapterId.value = book.chapters[0].id
        if (book.chapters[0].pages.length > 0) {
          currentPageId.value = book.chapters[0].pages[0].id
        }
      }
    }
  }

  function deleteBook(id: string) {
    const idx = books.value.findIndex(b => b.id === id)
    if (idx === -1) return
    books.value.splice(idx, 1)
    if (currentBookId.value === id) {
      currentBookId.value = books.value[0]?.id || null
      currentChapterId.value = null
      currentPageId.value = null
    }
  }

  function updateBook(id: string, updates: Partial<Book>) {
    const book = books.value.find(b => b.id === id)
    if (!book) return
    Object.assign(book, updates, { updatedAt: Date.now() })
  }

  function addChapter(bookId: string, title?: string): Chapter | null {
    const book = books.value.find(b => b.id === bookId)
    if (!book) return null
    const order = book.chapters.length + 1
    const chapter = createEmptyChapter(bookId, order, title)
    if (book.defaultTemplateId) {
      chapter.templateId = book.defaultTemplateId
    }
    book.chapters.push(chapter)
    currentChapterId.value = chapter.id
    recalculateBookPageNumbers(bookId)
    return chapter
  }

  function updateChapter(chapterId: string, updates: Partial<Chapter>) {
    for (const book of books.value) {
      const chapter = book.chapters.find(c => c.id === chapterId)
      if (chapter) {
        Object.assign(chapter, updates)
        recalculateBookPageNumbers(book.id)
        return
      }
    }
  }

  function deleteChapter(chapterId: string) {
    for (const book of books.value) {
      const idx = book.chapters.findIndex(c => c.id === chapterId)
      if (idx !== -1) {
        book.chapters.splice(idx, 1)
        book.chapters.forEach((c, i) => { c.order = i + 1 })
        if (currentChapterId.value === chapterId) {
          currentChapterId.value = book.chapters[0]?.id || null
          currentPageId.value = book.chapters[0]?.pages[0]?.id || null
        }
        recalculateBookPageNumbers(book.id)
        return
      }
    }
  }

  function selectChapter(chapterId: string) {
    currentChapterId.value = chapterId
    for (const book of books.value) {
      const chapter = book.chapters.find(c => c.id === chapterId)
      if (chapter) {
        currentBookId.value = book.id
        if (chapter.pages.length > 0) {
          currentPageId.value = chapter.pages[0].id
        }
        return
      }
    }
  }

  function applyTemplateToChapter(chapterId: string, templateId: string) {
    for (const book of books.value) {
      const chapter = book.chapters.find(c => c.id === chapterId)
      if (chapter) {
        chapter.templateId = templateId
        chapter.pages.forEach(p => { p.templateId = templateId })
        return
      }
    }
  }

  function applyTemplateToBook(bookId: string, templateId: string) {
    const book = books.value.find(b => b.id === bookId)
    if (!book) return
    book.defaultTemplateId = templateId
    book.chapters.forEach(chapter => {
      chapter.templateId = templateId
      chapter.pages.forEach(p => { p.templateId = templateId })
    })
  }

  function addPage(chapterId: string, templateId?: string): BookPage | null {
    for (const book of books.value) {
      const chapter = book.chapters.find(c => c.id === chapterId)
      if (!chapter) return null
      const tplId = templateId || chapter.templateId || book.defaultTemplateId || ''
      const pageNumber = chapter.pages.length + 1
      const pageSide: PageSide = ((chapter.startPageNumber + pageNumber - 1) % 2 === 0) ? 'left' : 'right'
      const page = createEmptyPage(chapterId, pageNumber, pageSide, tplId)
      chapter.pages.push(page)
      chapter.pageCount = chapter.pages.length
      currentPageId.value = page.id
      recalculateBookPageNumbers(book.id)
      return page
    }
    return null
  }

  function addPagesFromPagination(
    chapterId: string,
    pages: Array<{ content: string; pageSide: PageSide; chapterTitle?: string }>,
    templateId?: string
  ): BookPage[] {
    const result: BookPage[] = []
    for (const book of books.value) {
      const chapter = book.chapters.find(c => c.id === chapterId)
      if (!chapter) return result
      const tplId = templateId || chapter.templateId || book.defaultTemplateId || ''
      for (const p of pages) {
        const pageNumber = chapter.pages.length + 1
        const pageSide: PageSide = ((chapter.startPageNumber + pageNumber - 1) % 2 === 0) ? 'left' : 'right'
        const page = createEmptyPage(chapterId, pageNumber, pageSide, tplId)
        page.content = p.content
        chapter.pages.push(page)
        result.push(page)
      }
      chapter.pageCount = chapter.pages.length
      recalculateBookPageNumbers(book.id)
      if (result.length > 0) {
        currentPageId.value = result[0].id
      }
      return result
    }
    return result
  }

  function deletePage(pageId: string) {
    for (const book of books.value) {
      for (const chapter of book.chapters) {
        const idx = chapter.pages.findIndex(p => p.id === pageId)
        if (idx !== -1) {
          chapter.pages.splice(idx, 1)
          chapter.pageCount = chapter.pages.length
          if (currentPageId.value === pageId) {
            currentPageId.value = chapter.pages[idx]?.id || chapter.pages[idx - 1]?.id || null
          }
          recalculateBookPageNumbers(book.id)
          return
        }
      }
    }
  }

  function selectPage(pageId: string) {
    currentPageId.value = pageId
    for (const book of books.value) {
      for (const chapter of book.chapters) {
        const page = chapter.pages.find(p => p.id === pageId)
        if (page) {
          currentBookId.value = book.id
          currentChapterId.value = chapter.id
          return
        }
      }
    }
  }

  function updatePage(pageId: string, updates: Partial<BookPage>) {
    for (const book of books.value) {
      for (const chapter of book.chapters) {
        const page = chapter.pages.find(p => p.id === pageId)
        if (page) {
          Object.assign(page, updates)
          return
        }
      }
    }
  }

  function navigatePrevPage() {
    const pages = allPages.value
    const idx = currentPageIndex.value
    if (idx > 0) {
      currentPageId.value = pages[idx - 1].id
    }
  }

  function navigateNextPage() {
    const pages = allPages.value
    const idx = currentPageIndex.value
    if (idx >= 0 && idx < pages.length - 1) {
      currentPageId.value = pages[idx + 1].id
    }
  }

  function toggleSpreadView() {
    showSpreadView.value = !showSpreadView.value
  }

  function addElementToPage(pageId: string, element: Omit<PageElement, 'id'>): PageElement | null {
    for (const book of books.value) {
      for (const chapter of book.chapters) {
        const page = chapter.pages.find(p => p.id === pageId)
        if (page) {
          const newElement: PageElement = { ...element, id: generateId() }
          page.elements.push(newElement)
          return newElement
        }
      }
    }
    return null
  }

  function updatePageElement(pageId: string, elementId: string, updates: Partial<PageElement>) {
    for (const book of books.value) {
      for (const chapter of book.chapters) {
        const page = chapter.pages.find(p => p.id === pageId)
        if (page) {
          const el = page.elements.find(e => e.id === elementId)
          if (el) {
            Object.assign(el, updates)
          }
          return
        }
      }
    }
  }

  function removePageElement(pageId: string, elementId: string) {
    for (const book of books.value) {
      for (const chapter of book.chapters) {
        const page = chapter.pages.find(p => p.id === pageId)
        if (page) {
          page.elements = page.elements.filter(e => e.id !== elementId)
          return
        }
      }
    }
  }

  function recalculateBookPageNumbers(bookId: string) {
    const book = books.value.find(b => b.id === bookId)
    if (!book) return
    let globalPageNum = 1
    const sortedChapters = [...book.chapters].sort((a, b) => a.order - b.order)
    for (const chapter of sortedChapters) {
      chapter.startPageNumber = globalPageNum
      for (let i = 0; i < chapter.pages.length; i++) {
        const pageNum = chapter.startPageNumber + i
        chapter.pages[i].pageNumber = i + 1
        chapter.pages[i].pageSide = (pageNum % 2 === 0) ? 'left' : 'right'
      }
      chapter.pageCount = chapter.pages.length
      globalPageNum += chapter.pages.length
    }
    book.totalPages = globalPageNum - 1
    book.updatedAt = Date.now()
  }

  function getChapterNextPageSide(chapterId: string): PageSide {
    for (const book of books.value) {
      const chapter = book.chapters.find(c => c.id === chapterId)
      if (chapter) {
        const nextGlobalNum = chapter.startPageNumber + chapter.pages.length
        return nextGlobalNum % 2 === 0 ? 'left' : 'right'
      }
    }
    return 'right'
  }

  async function importManuscriptToChapter(
    chapterId: string,
    content: string,
    templateId: string,
    charsPerPage: number = 500,
    startPageSide?: PageSide
  ): Promise<BookPage[]> {
    let blankPage: BookPage | null = null

    if (startPageSide) {
      const nextSide = getChapterNextPageSide(chapterId)
      if (startPageSide !== nextSide) {
        blankPage = addPage(chapterId, templateId)
      }
    }

    const actualStartSide = startPageSide || getChapterNextPageSide(chapterId)
    const paginationResult = paginateContent(content, charsPerPage, actualStartSide)
    const result = addPagesFromPagination(chapterId, paginationResult.pages, templateId)

    if (blankPage) {
      result.unshift(blankPage)
    }
    return result
  }

  function runPageValidation(pageId: string) {
    for (const book of books.value) {
      for (const chapter of book.chapters) {
        const page = chapter.pages.find(p => p.id === pageId)
        if (page) {
          page.violations = validatePage(page)
          return page.violations
        }
      }
    }
    return []
  }

  function runBookValidation(bookId: string) {
    const book = books.value.find(b => b.id === bookId)
    if (!book) return []
    const allViolations: typeof book.chapters[0]['pages'][0]['violations'] = []
    for (const chapter of book.chapters) {
      for (const page of chapter.pages) {
        page.violations = validatePage(page)
        allViolations.push(...page.violations)
      }
    }
    return allViolations
  }

  return {
    books,
    currentBookId,
    currentChapterId,
    currentPageId,
    showSpreadView,
    currentBook,
    currentChapter,
    currentPage,
    allPages,
    currentPageIndex,
    spreadPages,
    createBook,
    selectBook,
    deleteBook,
    updateBook,
    addChapter,
    updateChapter,
    deleteChapter,
    selectChapter,
    applyTemplateToChapter,
    applyTemplateToBook,
    addPage,
    addPagesFromPagination,
    deletePage,
    selectPage,
    updatePage,
    navigatePrevPage,
    navigateNextPage,
    toggleSpreadView,
    addElementToPage,
    updatePageElement,
    removePageElement,
    importManuscriptToChapter,
    runPageValidation,
    runBookValidation
  }
}, {
  persist: {
    key: 'ancient-book-books',
    paths: ['books', 'currentBookId', 'currentChapterId', 'currentPageId', 'showSpreadView']
  }
})
