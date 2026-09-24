<script setup>
import { formatPercent, trendColor } from '../../utils/trafficAttribution'

// One attribution group's rows (source / medium / campaign), shared by the
// top-5 cards and the "View All" dialog.
// - traffic mode (A-016): "traffic / signed up / converted" + change vs the
//   previous period, with a bar scaled against total traffic.
// - value mode (A-017): a table with signup / booking conversion rates.
defineProps({
  items: { type: Array, default: () => [] },
  mode: { type: String, default: 'traffic' }, // 'traffic' | 'value'
  column: { type: String, default: 'Source' },
  maxCount: { type: Number, default: 1 },
})
</script>

<template>
  <div v-if="!items.length" class="text-body-2 text-medium-emphasis py-4">No data.</div>

  <div v-else-if="mode === 'traffic'" class="d-flex flex-column ga-4">
    <div v-for="(item, idx) in items" :key="item.label">
      <div class="d-flex align-center justify-space-between ga-3 mb-1">
        <span
          class="text-body-2 font-weight-medium text-capitalize text-truncate"
          :title="item.label"
        >
          {{ item.label }}
        </span>
        <span class="d-flex align-center ga-2 flex-shrink-0 text-body-2">
          <span class="font-weight-bold">
            <span title="Traffic">{{ item.count }}</span>
            <span class="text-medium-emphasis"> / </span>
            <span class="text-primary" title="Signed up">{{ item.signedUp }}</span>
            <span class="text-medium-emphasis"> / </span>
            <span class="text-success" title="Converted">{{ item.converted }}</span>
          </span>
          <v-tooltip location="top">
            <template #activator="{ props: tip }">
              <span
                v-bind="tip"
                class="d-inline-flex align-center font-weight-medium trend"
                :class="`text-${trendColor(item.trend)}`"
              >
                <v-icon :icon="item.trend === 'up' ? 'mdi-arrow-up' : 'mdi-arrow-down'" size="14" />
                {{ formatPercent(item.changePercent) }}
              </span>
            </template>
            Current {{ item.count }} · Previous {{ item.previousCount ?? 0 }}
          </v-tooltip>
        </span>
      </div>
      <v-progress-linear
        :model-value="item.count"
        :max="maxCount"
        :color="idx === 0 ? 'primary' : 'grey-darken-3'"
        bg-color="grey-lighten-2"
        bg-opacity="1"
        height="6"
        rounded
      />
    </div>
  </div>

  <v-table v-else density="compact" class="value-table">
    <thead>
      <tr>
        <th>{{ column }}</th>
        <th class="text-right">Traffic</th>
        <th class="text-right">Signed Up</th>
        <th class="text-right">Converted</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in items" :key="item.label">
        <td class="text-capitalize font-weight-medium label-cell" :title="item.label">
          {{ item.label }}
        </td>
        <td class="text-right">{{ item.count }}</td>
        <td class="text-right text-primary text-no-wrap">
          {{ item.signedUp }}
          <span class="text-caption">({{ Math.round(item.signup_conversion_rate || 0) }}%)</span>
        </td>
        <td class="text-right text-success text-no-wrap">
          {{ item.converted }}
          <span class="text-caption">({{ Math.round(item.booking_conversion_rate || 0) }}%)</span>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<style scoped>
.trend {
  min-width: 72px;
  justify-content: flex-end;
}

.value-table th {
  font-weight: 600 !important;
  white-space: nowrap;
}

.label-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
