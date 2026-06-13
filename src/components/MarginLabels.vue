<template>
  <v-group>
    <v-text
      :config="{
        x: -margins.left + 5,
        y: typeSettingHeight / 2 - 6,
        text: '版心',
        fontSize: 10,
        fill: '#999',
        listening: false
      }"
    />

    <v-line
      :config="{
        points: [-margins.left + 2, -2, -margins.left + 2, typeSettingHeight + 2],
        stroke: '#d9d9d9',
        strokeWidth: 0.5,
        dash: [2, 2],
        listening: false
      }"
    />
    <v-line
      :config="{
        points: [typeSettingWidth + margins.right - 2, -2, typeSettingWidth + margins.right - 2, typeSettingHeight + 2],
        stroke: '#d9d9d9',
        strokeWidth: 0.5,
        dash: [2, 2],
        listening: false
      }"
    />
    <v-line
      :config="{
        points: [-2, -margins.top + 2, typeSettingWidth + 2, -margins.top + 2],
        stroke: '#d9d9d9',
        strokeWidth: 0.5,
        dash: [2, 2],
        listening: false
      }"
    />
    <v-line
      :config="{
        points: [-2, typeSettingHeight + margins.bottom - 2, typeSettingWidth + 2, typeSettingHeight + margins.bottom - 2],
        stroke: '#d9d9d9',
        strokeWidth: 0.5,
        dash: [2, 2],
        listening: false
      }"
    />

    <v-text
      v-if="pageSide !== 'right'"
      :config="{
        x: -margins.left / 2 - 15,
        y: -margins.top / 2 - 5,
        text: '天头',
        fontSize: 10,
        fill: '#888',
        align: 'center',
        width: 30,
        listening: false
      }"
    />

    <v-text
      v-if="pageSide !== 'right'"
      :config="{
        x: -margins.left / 2 - 15,
        y: typeSettingHeight + margins.bottom / 2 - 5,
        text: '地脚',
        fontSize: 10,
        fill: '#888',
        align: 'center',
        width: 30,
        listening: false
      }"
    />
  </v-group>
</template>

<script setup lang="ts">
import type { PageMargins, Size, PageSide } from '@/types'

defineProps<{
  margins: PageMargins
  pageSize: Size
  typeSettingWidth: number
  typeSettingHeight: number
  pageSide: PageSide
}>()
</script>
