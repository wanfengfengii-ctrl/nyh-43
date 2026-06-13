import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { GuideLine, RulerConfig, TemplateCanvasStates, PerTemplateCanvasState } from '@/types'
import { generateId, clamp } from '@/utils/validation'
import { useTemplateStore } from './template'

function createDefaultPerTemplateState(): PerTemplateCanvasState {
  return {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    guides: [],
    selectedElement: null
  }
}

export const useCanvasStore = defineStore('canvas', () => {
  const perTemplateStates = ref<TemplateCanvasStates>({})
  const currentTemplateId = ref<string | null>(null)

  const showRuler = ref(true)
  const showGuides = ref(true)
  const ruler = ref<RulerConfig>({
    enabled: true,
    unit: 'px',
    showTicks: true
  })

  const minScale = 0.2
  const maxScale = 5
  const zoomStep = 0.1

  const currentState = computed<PerTemplateCanvasState>(() => {
    if (!currentTemplateId.value) {
      return createDefaultPerTemplateState()
    }
    if (!perTemplateStates.value[currentTemplateId.value]) {
      perTemplateStates.value[currentTemplateId.value] = createDefaultPerTemplateState()
    }
    return perTemplateStates.value[currentTemplateId.value]
  })

  const scale = computed({
    get: () => currentState.value.scale,
    set: (v: number) => {
      if (currentTemplateId.value) {
        ensureStateExists()
        perTemplateStates.value[currentTemplateId.value].scale = v
      }
    }
  })

  const offsetX = computed({
    get: () => currentState.value.offsetX,
    set: (v: number) => {
      if (currentTemplateId.value) {
        ensureStateExists()
        perTemplateStates.value[currentTemplateId.value].offsetX = v
      }
    }
  })

  const offsetY = computed({
    get: () => currentState.value.offsetY,
    set: (v: number) => {
      if (currentTemplateId.value) {
        ensureStateExists()
        perTemplateStates.value[currentTemplateId.value].offsetY = v
      }
    }
  })

  const guides = computed({
    get: () => currentState.value.guides,
    set: (v: GuideLine[]) => {
      if (currentTemplateId.value) {
        ensureStateExists()
        perTemplateStates.value[currentTemplateId.value].guides = v
      }
    }
  })

  const selectedElement = computed({
    get: () => currentState.value.selectedElement,
    set: (v: string | null) => {
      if (currentTemplateId.value) {
        ensureStateExists()
        perTemplateStates.value[currentTemplateId.value].selectedElement = v
      }
    }
  })

  const scalePercent = computed(() => Math.round(scale.value * 100))

  function ensureStateExists() {
    if (currentTemplateId.value && !perTemplateStates.value[currentTemplateId.value]) {
      perTemplateStates.value[currentTemplateId.value] = createDefaultPerTemplateState()
    }
  }

  function setCurrentTemplate(id: string | null) {
    currentTemplateId.value = id
    if (id) {
      ensureStateExists()
    }
  }

  function zoomIn() {
    scale.value = clamp(scale.value + zoomStep, minScale, maxScale)
  }

  function zoomOut() {
    scale.value = clamp(scale.value - zoomStep, minScale, maxScale)
  }

  function setScale(newScale: number) {
    scale.value = clamp(newScale, minScale, maxScale)
  }

  function resetZoom() {
    scale.value = 1
    offsetX.value = 0
    offsetY.value = 0
  }

  function pan(dx: number, dy: number) {
    offsetX.value += dx
    offsetY.value += dy
  }

  function setOffset(x: number, y: number) {
    offsetX.value = x
    offsetY.value = y
  }

  function toggleRuler() {
    showRuler.value = !showRuler.value
    ruler.value.enabled = showRuler.value
  }

  function toggleGuides() {
    showGuides.value = !showGuides.value
  }

  function addGuide(type: 'horizontal' | 'vertical', position: number) {
    ensureStateExists()
    const guide: GuideLine = {
      id: generateId(),
      type,
      position
    }
    guides.value = [...guides.value, guide]
    return guide
  }

  function updateGuide(id: string, position: number) {
    const guide = guides.value.find(g => g.id === id)
    if (guide) {
      guide.position = position
      guides.value = [...guides.value]
    }
  }

  function removeGuide(id: string) {
    guides.value = guides.value.filter(g => g.id !== id)
  }

  function clearGuides() {
    guides.value = []
  }

  function selectElement(id: string | null) {
    selectedElement.value = id
  }

  function setRulerUnit(unit: 'mm' | 'px' | 'cun') {
    ruler.value.unit = unit
  }

  function cleanupTemplateState(id: string) {
    if (perTemplateStates.value[id]) {
      delete perTemplateStates.value[id]
    }
  }

  const templateStore = useTemplateStore()

  watch(
    () => templateStore.currentTemplateId,
    (newId) => {
      setCurrentTemplate(newId)
    },
    { immediate: true }
  )

  return {
    scale,
    offsetX,
    offsetY,
    showRuler,
    showGuides,
    guides,
    ruler,
    selectedElement,
    scalePercent,
    perTemplateStates,
    currentTemplateId,
    zoomIn,
    zoomOut,
    setScale,
    resetZoom,
    pan,
    setOffset,
    toggleRuler,
    toggleGuides,
    addGuide,
    updateGuide,
    removeGuide,
    clearGuides,
    selectElement,
    setRulerUnit,
    setCurrentTemplate,
    cleanupTemplateState
  }
}, {
  persist: {
    key: 'ancient-book-canvas',
    paths: ['perTemplateStates', 'showRuler', 'showGuides', 'ruler', 'currentTemplateId']
  }
})
