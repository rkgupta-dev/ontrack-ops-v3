<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '../stores/auth.store'
import { useUiStore } from '../stores/ui.store'

const authStore = useAuthStore()
const uiStore = useUiStore()
const router = useRouter()
const route = useRoute()
const { mobile } = useDisplay()

// Temporary drawer, mobile only ("More" menu opened from the bottom nav).
const mobileDrawerOpen = ref(false)

// Desktop bottom bar (separate from the always-present left rail above) —
// collapses down to a single up-arrow that re-expands it, rather than
// hiding entirely, so there's always something to click to bring it back.
const desktopNavCollapsed = ref(false)

const navItems = [
  { to: { name: 'home' }, icon: 'mdi-home-outline', label: 'Home' },
  { to: { name: 'vehicles' }, icon: 'mdi-motorbike', label: 'Vehicles' },
  { to: { name: 'bookings' }, icon: 'mdi-calendar', label: 'Bookings' },
  { to: { name: 'customers' }, icon: 'mdi-account-group-outline', label: 'Customers' },
  { to: { name: 'stock-count' }, icon: 'mdi-warehouse', label: 'Inventory' },
  { to: { name: 'models' }, icon: 'mdi-scooter', label: 'Models' },
  { to: { name: 'vehicle-stats' }, icon: 'mdi-chart-bar', label: 'Utilisation' },
  { to: { name: 'vehicle-reminders' }, icon: 'mdi-bell-alert-outline', label: 'Expiry Reminder' },
  { to: { name: 'recovery' }, icon: 'mdi-tow-truck', label: 'Recovery' },
]

// The floating mobile bar / desktop bottom bar only have room for the four
// primary sections; everything else (Attendance, Inventory, ...) lives
// behind the "More" icon (mobile) or the left rail only (desktop).
const bottomNavItems = navItems.filter(
  (item) =>
    ![
      'attendance',
      'stock-count',
      'models',
      'vehicle-stats',
      'vehicle-reminders',
      'recovery',
    ].includes(item.to.name),
)

const userDisplayName = computed(
  () => authStore.user?.name || authStore.user?.userName || 'Account',
)

const userRole = computed(() => authStore.user?.role || null)

const userInitial = computed(() => userDisplayName.value.trim().charAt(0).toUpperCase() || '?')

// A-019/A-020 — confirmed live response field (2026-09-18): `displayPicture`.
const userAvatarUrl = computed(() => authStore.user?.displayPicture || null)

function isActive(name) {
  return route.name === name
}

const isHome = computed(() => route.name === 'home')

// Home is the app's root — every other page gets a "< back" link, with a
// title alongside it when the route declares one (`meta.title`,
// router/index.js) and just the link on its own when it doesn't.
const showBack = computed(() => !isHome.value)
const pageTitle = computed(() => route.meta.title || null)

function goBack() {
  // vue-router 4 stores `{ back, current, forward }` in history.state —
  // `back` is null when this entry has no predecessor (e.g. a deep link
  // opened directly), so router.back() would otherwise leave the app.
  if (window.history.state?.back) {
    router.back()
  } else {
    router.push({ name: 'home' })
  }
}

function handleLogout() {
  authStore.logout()
  uiStore.notify('You have been logged out.', { type: 'success' })
  router.push({ name: 'login' })
}
</script>

<template>
  <v-layout>
    <!-- Desktop: icon-only rail that expands on hover to show labels + user info -->
    <v-navigation-drawer
      v-if="!mobile"
      rail
      expand-on-hover
      permanent
      rail-width="72"
      width="260"
      elevation="2"
      color="surface"
      class="app-drawer"
    >
      <v-list-item class="py-4">
        <template #prepend>
          <v-avatar color="primary" size="36">
            <v-img v-if="userAvatarUrl" :src="userAvatarUrl" :alt="userDisplayName" cover />
            <span v-else class="text-subtitle-2 font-weight-bold text-white">{{
              userInitial
            }}</span>
          </v-avatar>
        </template>
        <v-list-item-title class="font-weight-bold text-no-wrap">
          {{ userDisplayName }}
        </v-list-item-title>
        <v-list-item-subtitle v-if="userRole" class="text-no-wrap text-uppercase text-caption">
          {{ userRole }}
        </v-list-item-subtitle>
      </v-list-item>

      <v-list nav density="comfortable" class="px-4">
        <v-list-item
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.label"
          color="primary"
          rounded="lg"
          class="mb-1 app-nav-item"
          :active="isActive(item.to.name)"
        />
      </v-list>

      <!-- <v-list nav density="comfortable" class="px-4 mt-auto">
        <v-list-item
          prepend-icon="mdi-logout"
          title="Logout"
          color="error"
          rounded="lg"
          data-testid="logout-button"
          @click="handleLogout"
        />
      </v-list> -->
    </v-navigation-drawer>

    <!-- Mobile: temporary full drawer, opened from the "More" icon in the bottom nav -->
    <v-navigation-drawer
      v-if="mobile"
      v-model="mobileDrawerOpen"
      temporary
      location="left"
      width="260"
    >
      <v-list-item v-if="isHome" class="py-4">
        <template #prepend>
          <v-avatar color="primary" size="36">
            <v-img v-if="userAvatarUrl" :src="userAvatarUrl" :alt="userDisplayName" cover />
            <span v-else class="text-subtitle-2 font-weight-bold text-white">{{
              userInitial
            }}</span>
          </v-avatar>
        </template>
        <v-list-item-title class="font-weight-bold text-no-wrap">
          {{ userDisplayName }}
        </v-list-item-title>
        <v-list-item-subtitle v-if="userRole" class="text-no-wrap text-uppercase text-caption">
          {{ userRole }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item
        v-else
        class="py-4"
        prepend-avatar="/ontrack_logo.webp"
        title="Ontrack Operations"
      />

      <v-list nav density="comfortable" class="pa-2">
        <v-list-item
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.label"
          color="primary"
          rounded="lg"
          class="mb-1"
          @click="mobileDrawerOpen = false"
        />
      </v-list>

      <v-divider />

      <v-list nav density="comfortable" class="pa-2">
        <v-list-item
          prepend-icon="mdi-logout"
          title="Logout"
          color="error"
          rounded="lg"
          @click="handleLogout"
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar flat color="background" :class="{ 'app-bar--bordered': showBack }">
      <v-container class="d-flex align-center py-0 px-2 px-sm-4">
        <template v-if="showBack">
          <button type="button" class="back-link" @click="goBack">
            <v-icon icon="mdi-chevron-left" size="20" />
            back
          </button>
          <span v-if="pageTitle" class="text-medium-emphasis ml-2">{{ pageTitle }}</span>
        </template>
        <v-toolbar-title v-else class="d-flex d-sm-none text-subtitle-1 font-weight-bold">
          Ontrack
        </v-toolbar-title>

        <v-spacer />

        <v-avatar
          v-if="isHome"
          color="primary"
          size="40"
          class="cursor-pointer"
          data-testid="user-menu-avatar"
          @click="router.push({ name: 'profile' })"
        >
          <v-img v-if="userAvatarUrl" :src="userAvatarUrl" :alt="userDisplayName" cover />
          <span v-else class="text-subtitle-2 font-weight-bold text-white">
            {{ userInitial }}
          </span>
        </v-avatar>
      </v-container>
    </v-app-bar>

    <v-main class="bg-white" :class="{ 'pb-16': mobile }">
      <v-container class="pa-4 pa-sm-6">
        <slot />
      </v-container>
    </v-main>

    <!-- Mobile: floating bottom nav pill -->
    <div v-if="mobile" class="mobile-bottom-nav">
      <button
        type="button"
        class="mobile-bottom-nav__btn"
        aria-label="More"
        @click="mobileDrawerOpen = true"
      >
        <v-icon icon="mdi-menu" />
      </button>
      <router-link
        v-for="item in bottomNavItems"
        :key="item.label"
        v-slot="{ navigate }"
        :to="item.to"
        custom
      >
        <button
          type="button"
          class="mobile-bottom-nav__btn"
          :class="{ 'mobile-bottom-nav__btn--active': isActive(item.to.name) }"
          :aria-label="item.label"
          @click="navigate"
        >
          <v-icon :icon="item.icon" />
        </button>
      </router-link>
    </div>

    <!-- Desktop: bottom bar mirroring the left rail's nav items, with its
         own collapse toggle — independent of the left rail, which stays
         put either way. -->
    <div v-else>
      <div v-if="!desktopNavCollapsed" class="desktop-bottom-bar">
        <v-tooltip text="Collapse Menu" location="top">
          <template #activator="{ props: tooltipProps }">
            <button
              type="button"
              class="desktop-bottom-bar__btn"
              aria-label="Collapse Menu"
              v-bind="tooltipProps"
              @click="desktopNavCollapsed = true"
            >
              <v-icon icon="mdi-minus" />
            </button>
          </template>
        </v-tooltip>
        <router-link
          v-for="item in bottomNavItems"
          :key="item.label"
          v-slot="{ navigate }"
          :to="item.to"
          custom
        >
          <button
            type="button"
            class="desktop-bottom-bar__btn mx-4"
            :class="{ 'desktop-bottom-bar__btn--active': isActive(item.to.name) }"
            :aria-label="item.label"
            @click="navigate"
          >
            <v-icon :icon="item.icon" />
          </button>
        </router-link>
      </div>
      <button
        v-else
        type="button"
        class="desktop-bottom-bar__expand"
        aria-label="Expand menu"
        @click="desktopNavCollapsed = false"
      >
        <v-icon icon="mdi-arrow-up" />
      </button>
    </div>
  </v-layout>
</template>

<style scoped>
/* The outer Vuetify layout wrapper (.v-layout / .v-application) clips
   overflow by design, so v-main needs its own scroll container — without
   this, any page taller than the viewport is silently cut off with no
   scrollbar anywhere (nothing else in the ancestor chain scrolls). */
.v-main {
  overflow-y: auto;
  overflow-x: hidden;
}

.app-bar--bordered {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.back-link {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  padding: 0;
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
  cursor: pointer;
}

.back-link:hover {
  text-decoration: none;
}

.app-drawer :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
}

.app-drawer {
  border-top-right-radius: 24px !important;
  border-bottom-right-radius: 24px !important;
  border-right: 1px solid rgba(59, 130, 246, 0.4) !important;
  border-left: none !important;
  box-shadow:
    6px 0 20px -2px rgba(59, 130, 246, 0.22),
    2px 0 8px 0px rgba(59, 130, 246, 0.15) !important;
  overflow: hidden !important;
}

.app-nav-item:hover:not(.v-list-item--active) {
  background: rgba(0, 0, 0, 0.04);
}

.app-nav-item.v-list-item--active {
  background: rgba(24, 103, 192, 0.1);
}

.mobile-bottom-nav {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 1005;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}

.mobile-bottom-nav__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.mobile-bottom-nav__btn--active {
  background: rgb(var(--v-theme-primary));
  color: #fff;
}

.desktop-bottom-bar {
  position: fixed;
  left: 50%;
  bottom: 0px;
  transform: translateX(-50%);
  z-index: 1005;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 16px 16px 0 0;

  /* Frosted glass background */
  background: rgba(var(--v-theme-surface), 0.65);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  backdrop-filter: blur(12px) saturate(160%);

  /* Soft border & shadow to enhance glass depth */
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: none;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
}

.desktop-bottom-bar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
}

.desktop-bottom-bar__btn--active {
  background: rgb(var(--v-theme-primary));
  color: #f3f6f3;
}

.desktop-bottom-bar__expand {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 1005;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
</style>
