import { createRouter, createWebHistory } from 'vue-router'
import { attachAuthGuard } from './guards'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/dashboard/HomePage.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/auth/LoginPage.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../pages/profile/ProfilePage.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/attendance',
    name: 'attendance',
    component: () => import('../pages/attendance/AttendancePage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Attendance' },
  },
  {
    path: '/customers',
    name: 'customers',
    component: () => import('../pages/customers/CustomersPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Customers' },
  },
  {
    // Must come before /customers/:customerId — otherwise the dynamic
    // route would swallow "create" as a customerId.
    path: '/customers/create',
    name: 'customer-create',
    component: () => import('../pages/customers/CreateCustomerPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Create Customer' },
  },
  {
    path: '/customers/:customerId',
    name: 'customer-detail',
    component: () => import('../pages/customers/CustomerDetailPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Customer Detail' },
  },
  {
    path: '/bookings',
    name: 'bookings',
    component: () => import('../pages/bookings/BookingsPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Bookings' },
  },
  {
    path: '/bookings/create',
    name: 'booking-create',
    component: () => import('../pages/bookings/CreateBookingManualPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Create Booking' },
  },
  {
    path: '/bookings/create/:customerId/dynamic',
    name: 'booking-create-dynamic',
    component: () => import('../pages/bookings/CreateBookingDynamicPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Create Booking' },
  },
  {
    path: '/booking/:bookingId',
    name: 'booking-detail',
    component: () => import('../pages/bookings/BookingDetailPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Booking Detail' },
  },
  {
    path: '/bookings/:bookingId/payment-methods',
    name: 'booking-payment',
    component: () => import('../pages/bookings/BookingPaymentPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Payment Methods' },
  },
  {
    path: '/bookings/:bookingId/assign-vehicle',
    name: 'booking-assign-vehicle',
    component: () => import('../pages/bookings/AssignVehiclePage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Assign Vehicle' },
  },
  {
    path: '/bookings/:bookingId/modify',
    name: 'booking-modify',
    component: () => import('../pages/bookings/ModifyBookingPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Modify Booking' },
  },
  {
    path: '/bookings/:bookingId/extend',
    name: 'booking-extend',
    component: () => import('../pages/bookings/ExtendBookingPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Extend Booking' },
  },
  {
    path: '/bookings/:bookingId/extend/:extendId/payment-methods',
    name: 'booking-extend-payment',
    component: () => import('../pages/bookings/ExtendBookingPaymentPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Extend Payment' },
  },
  {
    path: '/bookings/:bookingId/end',
    name: 'booking-end',
    component: () => import('../pages/bookings/EndBookingPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'End Booking' },
  },
  {
    path: '/bookings/:bookingId/pre-booking-data',
    name: 'booking-pre-booking-data',
    component: () => import('../pages/bookings/PreBookingDataPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Pre-Booking Data' },
  },
  {
    path: '/vehicles',
    name: 'vehicles',
    component: () => import('../pages/vehicles/VehiclesPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Vehicles' },
  },
  {
    // Must come before /vehicles/:vehicleId — otherwise the dynamic route
    // would swallow "reminders" as a vehicle id.
    path: '/vehicles/reminders',
    name: 'vehicle-reminders',
    component: () => import('../pages/vehicles/RemindersPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Expiry Reminder' },
  },
  {
    // The old app used the singular `/vehicle/track/gps` — normalized
    // to this repo's consistent `/vehicles/...` prefix instead.
    path: '/vehicles/track/gps',
    name: 'vehicle-gps-tracker',
    component: () => import('../pages/vehicles/GpsTrackerPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'GPS Tracker' },
  },
  {
    path: '/vehicle-details/:vehicleId',
    name: 'vehicle-detail',
    component: () => import('../pages/vehicles/VehicleDetailPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Vehicle Detail' },
  },
  {
    path: '/vehicles/:vehicleId/snapshot',
    name: 'vehicle-snapshot',
    component: () => import('../pages/vehicles/VehicleSnapshotPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Vehicle Snapshot' },
  },
  {
    // Old-app-style path (`stockCount.vue`) kept as-is rather than nested
    // under `/vehicles/...` — it's a fleet-wide, lessor-scoped view, not a
    // single-vehicle one.
    path: '/stock-count',
    name: 'stock-count',
    component: () => import('../pages/inventory/StockCountPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Inventory' },
  },
  {
    path: '/models',
    name: 'models',
    component: () => import('../pages/models/ModelsPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Model List' },
  },
  {
    // Old-app path kept as-is (camelCase and all) so existing bookmarks work.
    path: '/vehicleStats',
    name: 'vehicle-stats',
    component: () => import('../pages/reports/VehicleStatsPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Utilisation Report' },
  },
  {
    path: '/recovery',
    name: 'recovery',
    component: () => import('../pages/recovery/RecoveryPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Recovery List' },
  },
  {
    path: '/traffic-attribution',
    name: 'traffic-attribution',
    component: () => import('../pages/reports/TrafficAttributionPage.vue'),
    meta: { layout: 'app', requiresAuth: true, title: 'Traffic Attribution' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/NotFoundPage.vue'),
    meta: { layout: 'app', title: 'Not Found' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

attachAuthGuard(router)
