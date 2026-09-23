<script setup>
import { computed } from 'vue'

// Horizontal stacked bars, one per row: booked + in stock = the row's
// fleet. Every bar shares one scale (the largest row), so bar length
// compares fleet size across rows and the booked share within one.
const props = defineProps({
  // [{ key, label, booked, inStock, total, utilisation }]
  rows: { type: Array, required: true },
})

const max = computed(() => Math.max(1, ...props.rows.map((row) => row.total)))

function pct(value, of) {
  return of > 0 ? `${(value / of) * 100}%` : '0%'
}

function formatUtilisation(value) {
  return value === null ? '—' : `${value.toFixed(0)}%`
}
</script>

<template>
  <div class="stock-bars">
    <div class="d-flex align-center ga-4 text-body-2 text-medium-emphasis mb-3">
      <span class="d-flex align-center ga-1"> <span class="swatch swatch--booked" /> Booked </span>
      <span class="d-flex align-center ga-1"> <span class="swatch swatch--stock" /> In stock </span>
    </div>

    <v-tooltip v-for="row in rows" :key="row.key" location="top" open-delay="100">
      <template #activator="{ props: activator }">
        <div v-bind="activator" class="bar-row">
          <div class="bar-label text-body-2 text-truncate">{{ row.label }}</div>
          <div class="bar-track">
            <div class="bar" :style="{ width: pct(row.total, max) }">
              <div v-if="row.booked" class="seg seg--booked" :style="{ flexGrow: row.booked }" />
              <div v-if="row.inStock" class="seg seg--stock" :style="{ flexGrow: row.inStock }" />
            </div>
          </div>
          <div class="bar-value text-body-2">
            <span class="font-weight-medium">{{ formatUtilisation(row.utilisation) }}</span>
            <span class="text-medium-emphasis"> · {{ row.total }}</span>
          </div>
        </div>
      </template>
      <div class="font-weight-medium mb-1">{{ row.label }}</div>
      <div>Booked: {{ row.booked }}</div>
      <div>In stock: {{ row.inStock }}</div>
      <div>Total: {{ row.total }}</div>
      <div>Utilisation: {{ formatUtilisation(row.utilisation) }}</div>
    </v-tooltip>
  </div>
</template>

<style scoped>
.stock-bars {
  --series-booked: #2a78d6;
  --series-stock: #eb6834;
}
.swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}
.swatch--booked,
.seg--booked {
  background: var(--series-booked);
}
.swatch--stock,
.seg--stock {
  background: var(--series-stock);
}
.bar-row {
  display: grid;
  grid-template-columns: minmax(96px, 180px) 1fr 84px;
  align-items: center;
  gap: 12px;
  padding: 3px 0;
  border-radius: 4px;
}
.bar-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.bar-track {
  min-width: 0;
}
.bar {
  display: flex;
  gap: 2px;
  height: 14px;
}
.seg {
  min-width: 2px;
}
.seg:first-child {
  border-radius: 4px 0 0 4px;
}
.seg:last-child {
  border-radius: 0 4px 4px 0;
}
.seg:only-child {
  border-radius: 4px;
}
.bar-value {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
</style>
