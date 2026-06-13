<template>
  <v-group :config="{ x, y }">
    <template v-if="style === 'single'">
      <v-line
        :config="{
          points: singleTailPoints,
          stroke: color,
          strokeWidth: lineWidth,
          closed: false,
          listening: false
        }"
      />
    </template>

    <template v-else-if="style === 'double'">
      <v-line
        :config="{
          points: doubleTailOuterPoints,
          stroke: color,
          strokeWidth: lineWidth,
          closed: false,
          listening: false
        }"
      />
      <v-line
        :config="{
          points: doubleTailInnerPoints,
          stroke: color,
          strokeWidth: lineWidth,
          closed: false,
          listening: false
        }"
      />
    </template>

    <template v-else-if="style === 'black'">
      <v-line
        :config="{
          points: blackFishPoints,
          fill: color,
          stroke: color,
          strokeWidth: lineWidth,
          closed: true,
          listening: false
        }"
      />
    </template>

    <template v-else-if="style === 'white'">
      <v-line
        :config="{
          points: whiteFishOuterPoints,
          stroke: color,
          strokeWidth: lineWidth,
          closed: true,
          listening: false
        }"
      />
      <v-line
        :config="{
          points: whiteFishInnerPoints,
          stroke: color,
          strokeWidth: lineWidth,
          closed: true,
          listening: false
        }"
      />
    </template>
  </v-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  x: number
  y: number
  width: number
  height: number
  style: 'single' | 'double' | 'black' | 'white'
  lineWidth: number
  color: string
  orientation: 'up' | 'down'
}>()

const w = computed(() => props.width)
const h = computed(() => props.height)

const singleTailPoints = computed(() => {
  const { orientation } = props
  if (orientation === 'down') {
    return [
      0, 0,
      w.value / 2, h.value,
      w.value, 0
    ]
  } else {
    return [
      0, h.value,
      w.value / 2, 0,
      w.value, h.value
    ]
  }
})

const doubleTailOuterPoints = computed(() => {
  const { orientation } = props
  if (orientation === 'down') {
    return [
      0, 0,
      w.value / 2, h.value,
      w.value, 0
    ]
  } else {
    return [
      0, h.value,
      w.value / 2, 0,
      w.value, h.value
    ]
  }
})

const doubleTailInnerPoints = computed(() => {
  const { orientation } = props
  const innerW = w.value * 0.5
  const innerH = h.value * 0.5
  const offsetX = (w.value - innerW) / 2
  const offsetY = orientation === 'down' ? 0 : h.value - innerH

  if (orientation === 'down') {
    return [
      offsetX, offsetY,
      offsetX + innerW / 2, offsetY + innerH,
      offsetX + innerW, offsetY
    ]
  } else {
    return [
      offsetX, offsetY + innerH,
      offsetX + innerW / 2, offsetY,
      offsetX + innerW, offsetY + innerH
    ]
  }
})

const blackFishPoints = computed(() => {
  const { orientation } = props
  if (orientation === 'down') {
    return [
      0, 0,
      w.value / 2, h.value,
      w.value, 0,
      w.value * 0.7, 0,
      w.value / 2, h.value * 0.6,
      w.value * 0.3, 0
    ]
  } else {
    return [
      0, h.value,
      w.value / 2, 0,
      w.value, h.value,
      w.value * 0.7, h.value,
      w.value / 2, h.value * 0.4,
      w.value * 0.3, h.value
    ]
  }
})

const whiteFishOuterPoints = computed(() => {
  const { orientation } = props
  if (orientation === 'down') {
    return [
      0, 0,
      w.value / 2, h.value,
      w.value, 0
    ]
  } else {
    return [
      0, h.value,
      w.value / 2, 0,
      w.value, h.value
    ]
  }
})

const whiteFishInnerPoints = computed(() => {
  const { orientation } = props
  const innerW = w.value * 0.4
  const innerH = h.value * 0.5
  const offsetX = (w.value - innerW) / 2
  const offsetY = orientation === 'down' ? 0 : h.value - innerH
  if (orientation === 'down') {
    return [
      offsetX, offsetY,
      offsetX + innerW / 2, offsetY + innerH,
      offsetX + innerW, offsetY
    ]
  } else {
    return [
      offsetX, offsetY + innerH,
      offsetX + innerW / 2, offsetY,
      offsetX + innerW, offsetY + innerH
    ]
  }
})
</script>
