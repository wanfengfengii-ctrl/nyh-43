import type { PaginationResult, PageSide } from '@/types'

const CHAPTER_PATTERN = /^第[一二三四五六七八九十百千万零〇0-9]+[章节回卷篇]\s*.+$/m
const PUNCTUATION_SPLIT = /[。！？；\n\r]/g

function splitIntoSentences(text: string): string[] {
  const sentences: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const regex = new RegExp(PUNCTUATION_SPLIT.source, 'g')
  while ((match = regex.exec(text)) !== null) {
    const end = match.index + match[0].length
    sentences.push(text.slice(lastIndex, end))
    lastIndex = end
  }
  if (lastIndex < text.length) {
    sentences.push(text.slice(lastIndex))
  }
  return sentences.filter(s => s.trim().length > 0)
}

function splitChapters(text: string): Array<{ title: string | null; content: string }> {
  const lines = text.split(/\n/)
  const chapters: Array<{ title: string | null; content: string }> = []
  let currentContent: string[] = []
  let currentTitle: string | null = null
  let hasStarted = false

  for (const line of lines) {
    if (CHAPTER_PATTERN.test(line.trim())) {
      if (hasStarted) {
        chapters.push({ title: currentTitle, content: currentContent.join('\n') })
      }
      currentTitle = line.trim()
      currentContent = []
      hasStarted = true
    } else {
      if (!hasStarted) {
        currentTitle = null
        hasStarted = true
      }
      currentContent.push(line)
    }
  }
  if (hasStarted) {
    chapters.push({ title: currentTitle, content: currentContent.join('\n') })
  }
  return chapters
}

export function paginateContent(
  content: string,
  charsPerPage: number = 500,
  startPageSide: PageSide = 'right'
): PaginationResult {
  const cleanContent = content.replace(/\r\n/g, '\n').trim()
  const chapters = splitChapters(cleanContent)

  const pages: PaginationResult['pages'] = []
  let currentSide: PageSide = startPageSide
  let totalChars = 0

  for (const chapter of chapters) {
    let chapterContent = chapter.content
    if (chapter.title) {
      chapterContent = chapter.title + '\n\n' + chapter.content
    }
    const sentences = splitIntoSentences(chapterContent)
    let currentPageChars = 0
    let currentPageContent = ''

    for (const sentence of sentences) {
      const sentenceLen = sentence.length
      if (currentPageChars + sentenceLen > charsPerPage && currentPageChars > 0) {
        pages.push({
          content: currentPageContent.trim(),
          pageSide: currentSide,
          chapterTitle: chapter.title || undefined
        })
        totalChars += currentPageChars
        currentSide = currentSide === 'left' ? 'right' : 'left'
        currentPageContent = sentence
        currentPageChars = sentenceLen
      } else {
        currentPageContent += sentence
        currentPageChars += sentenceLen
      }
    }

    if (currentPageContent.trim().length > 0) {
      pages.push({
        content: currentPageContent.trim(),
        pageSide: currentSide,
        chapterTitle: chapter.title || undefined
      })
      totalChars += currentPageChars
      currentSide = currentSide === 'left' ? 'right' : 'left'
    }
  }

  if (pages.length === 0 && cleanContent.length > 0) {
    pages.push({
      content: cleanContent,
      pageSide: startPageSide
    })
    totalChars = cleanContent.length
  }

  return {
    pages,
    totalPages: pages.length,
    estimatedChars: totalChars
  }
}

export function estimatePageCount(
  content: string,
  charsPerPage: number = 500
): number {
  const clean = content.replace(/\s+/g, '')
  return Math.max(1, Math.ceil(clean.length / charsPerPage))
}
