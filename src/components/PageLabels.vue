<template>
  <v-group>
    <v-text
      :config="{
        x: typeSettingX,
        y: typeSettingY - 25,
        text: pageLabelText,
        fontSize: 11,
        fill: '#666',
        listening: false
      }"
    />

    <template v-if="pageSide === 'left'">
      <v-text
        :config="{
          x: typeSettingX + typeSettingWidth + 10,
          y: typeSettingY + typeSettingHeight / 2 - 5,
          text: '装订边',
          fontSize: 9,
          fill: '#999',
          rotation: 90,
          listening: false
        }"
      />
    </template>

    <template v-if="pageSide === 'right'">
      <v-text
        :config="{
          x: typeSettingX - 30,
          y: typeSettingY + typeSettingHeight / 2 - 5,
          text: '装订边',
          fontSize: 9,
          fill: '#999',
          rotation: -90,
          listening: false
        }"
      />
    </template>
  </v-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageTemplate, PageSide } from '@/types'

const props = defineProps<{
  template: PageTemplate | null
  pageSide: PageSide
  typeSettingX: number
  typeSettingY: number
  typeSettingWidth: number
  typeSettingHeight: number
}>()

const pageLabelText = computed(() => {
  if (!props.template) return ''
  const sideText = props.pageSide === 'left' ? '左页' : props.pageSide === 'right' ? '右页' : '单页'
  return `${props.template.code} - ${props.template.name} (${sideText})`
})
</script>
