<!--
  Loading placeholder that mirrors BookingListCard.vue's layout (thumbnail
  on the left; status/plan chips, booking id, registration, model and
  customer lines on the right; divider + date footer) so the list doesn't
  jump when real rows replace it. Uses plain CSS bones rather than stacked
  `v-skeleton-loader`s, whose built-in bone margins can't be made to line
  up with the real card's spacing.
-->
<template>
  <v-card
    variant="outlined"
    rounded="lg"
    class="pa-4 booking-list-card-skeleton"
    aria-hidden="true"
  >
    <div class="d-flex ga-4 align-center">
      <div class="bone thumb flex-shrink-0" />

      <div class="flex-grow-1 min-w-0">
        <div class="d-flex ga-2">
          <div class="bone chip" />
          <div class="bone chip chip--short" />
        </div>
        <div class="bone line mt-2" style="width: 45%" />
        <div class="bone line line--heading mt-2" style="width: 55%" />
        <div class="bone line mt-2" style="width: 40%" />
        <div class="bone line mt-2" style="width: 60%" />

        <v-divider class="mt-4 mb-3" />
        <div class="bone line line--caption" style="width: 50%" />
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.booking-list-card-skeleton {
  border-color: rgba(0, 0, 0, 0.12);
}

.bone {
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.bone::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(var(--v-theme-surface), 0.6), transparent);
  animation: shimmer 1.4s infinite;
}

.thumb {
  width: 78px;
  height: 78px;
  border-radius: 8px;
}

.chip {
  width: 56px;
  height: 18px;
  border-radius: 999px;
}

.chip--short {
  width: 44px;
}

.line {
  height: 12px;
  max-width: 100%;
}

.line--heading {
  height: 20px;
}

.line--caption {
  height: 10px;
}

/* Phone widths: smaller thumbnail and wider text bones, since the text
   column is much narrower and the real card's lines fill more of it. */
@media (max-width: 599.98px) {
  .thumb {
    width: 56px;
    height: 56px;
  }

  .line {
    min-width: 70%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bone::after {
    animation: none;
  }
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
