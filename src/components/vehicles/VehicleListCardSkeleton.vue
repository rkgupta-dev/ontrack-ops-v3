<!--
  Loading placeholder that mirrors VehicleListCard.vue's layout (thumbnail
  on the left; registration, model and lessor lines plus status chips, with
  the Insurance/RC chips to the right on `sm`+ and wrapped underneath on
  phones; divider + date footer). Same plain-CSS-bone approach as
  BookingListCardSkeleton.vue.
-->
<template>
  <v-card
    variant="outlined"
    rounded="lg"
    class="pa-4 vehicle-list-card-skeleton"
    aria-hidden="true"
  >
    <div class="d-flex ga-4 align-center">
      <div class="bone thumb flex-shrink-0" />

      <div class="flex-grow-1 min-w-0">
        <div class="d-flex flex-column flex-sm-row justify-space-between align-start ga-2 min-w-0">
          <div class="flex-grow-1 min-w-0 w-100">
            <div class="bone line line--heading" style="width: 50%" />
            <div class="bone line mt-2" style="width: 35%" />
            <div class="bone line mt-2" style="width: 45%" />
            <div class="d-flex ga-2 mt-3">
              <div class="bone chip" />
              <div class="bone chip chip--short" />
            </div>
          </div>

          <div class="d-flex ga-2 flex-shrink-0 mt-1 mt-sm-0">
            <div class="bone pill" />
            <div class="bone pill pill--short" />
          </div>
        </div>

        <v-divider class="mt-4 mb-3" />
        <div class="bone line line--caption" style="width: 40%" />
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.vehicle-list-card-skeleton {
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
  width: 68px;
  height: 68px;
  border-radius: 8px;
}

.chip {
  width: 56px;
  height: 18px;
  border-radius: 999px;
}

.chip--short {
  width: 48px;
}

/* Insurance / RC outlined chips (size="small") */
.pill {
  width: 96px;
  height: 24px;
  border-radius: 999px;
}

.pill--short {
  width: 56px;
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
