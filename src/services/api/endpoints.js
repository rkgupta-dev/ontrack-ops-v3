/**
 * Path constants for every v2 endpoint Login/Attendance uses, mapped to
 * their docs/api-reference.md IDs so the source of truth is traceable.
 */
export const ENDPOINTS = {
  // A-010 — POST — login
  LOGIN: '/profile/agent/v2/login',
  // A-019 / A-020 — GET — current logged-in user (same endpoint, two call
  // sites in the old app; used here both for session bootstrap and for
  // fetching the profile shown in the app shell)
  LOGGED_IN_INFO: '/outreach/user/loggedin/info',
  // A-003 — POST — today's attendance record
  ATTENDANCE_TODAY: '/attendance',
  // A-004 — POST — punch in
  ATTENDANCE_PUNCH_IN: '/attendance/punch/in',
  // A-005 — POST — punch out
  ATTENDANCE_PUNCH_OUT: '/attendance/punch/out',
  // A-058 — POST — customer list (the one endpoint here with a documented
  // response envelope: data.count, data.rows)
  CUSTOMERS_LIST: 'operations/getCustomerList',
  // A-049 — POST — create a new customer. Request body CONFIRMED live
  // 2026-09-18 (real payload): { fName, lName, gender, email, mobile,
  // alternateNo, address, city, state, pincode }. Response: { error,
  // message } — `error: 0` = success, no created-customer id is returned.
  CREATE_CUSTOMER: 'operations/create/customer',
  // A-024 — GET — booking list (powers the old app's bookings.vue grid;
  // response envelope undocumented, see services/bookings/bookings.api.js)
  BOOKINGS_LIST: '/operations/bookings',
  // A-158 — GET — vehicle list (powers the old app's vehiclesList.vue grid;
  // response envelope undocumented, see services/vehicles/vehicles.api.js)
  VEHICLES_LIST: '/operations/vehicles',
  // A-107 — GET — model list, for the vehicles-list filter's model options
  MODELS_LIST: '/operations/models',
  // A-089 — GET — lessor list, for the vehicles-list filter's lessor options
  LESSORS_LIST: '/rentals/operations/lessors',
  // A-046 — POST — bookings feed (the old app's homepage-content.vue "today's
  // bookings" feed, filtered server-side by status/paymentStatus). Response
  // is a bare array, not the { count, rows } envelope A-024/A-158 use —
  // CONFIRMED live 2026-09-07, see services/home/home.api.js.
  HOME_BOOKINGS_FEED: '/operations/getBookings',
  // A-109 — GET — fleet inventory stat strip, confirmed live 2026-09-07 —
  // same source page (homepage-content.vue) as HOME_BOOKINGS_FEED above.
  INVENTORY_STATS: 'operations/models/inventory/stats',
  // A-108 — GET — per-model inventory breakdown table (old app:
  // components/stockCount.vue). Query: lessor, searchQuery.
  MODEL_INVENTORY: 'operations/models/inventory',
  // --- Inventory Utilisation Report (old app: views/vehicles/stats.vue) ---
  // A-167 — GET — headline cards
  VEHICLE_REPORT_SUMMARY: 'operations/vehicle/report/v2',
  // A-156 — GET — per-model available/booked counts split by vehicle age
  VEHICLE_REPORT_CHART_DATA: '/operations/vehicle/report/chart-data',
  // A-111 — GET — per-model in-stock/booked/total counts
  VEHICLE_REPORT_COUNT_BY_MODEL: '/operations/vehicle/report/vehicle-count-by-model',
  // A-157 — GET — per-model vehicle counts by age
  VEHICLE_REPORT_COUNT_BY_AGE: '/operations/vehicle/report/vehicle-count-by-age',
  // A-110 — PUT — update a model's show flag / price / extension price
  // (Model List page, old app: components/ModelsList.vue)
  MODEL_UPDATE: (modelId) => `/operations/models/update/${modelId}`,
  // A-100 — GET — locations list, used here to resolve a location id to a
  // display name for the Home location filter. Response is a bare array.
  LOCATIONS: 'locations',
  // A-045 — POST — booking list, powers the Customer Detail "Booking
  // History" tab (components/customers/bookingHistory.vue). Response
  // envelope + row shape CONFIRMED live 2026-09-18 (real payload, incl.
  // embedded customerData/vehicleData.modelData) — see
  // services/customers/customers.api.js::fetchCustomerBookings.
  CUSTOMER_BOOKING_HISTORY: 'operations/getBookingList',
  // A-090 — GET — points ledger, powers the Customer Detail "Points
  // History" tab (components/customers/pointsHistory.vue). Response
  // envelope + row shape CONFIRMED live 2026-09-18 (real payload) — see
  // services/customers/customers.api.js::fetchCustomerPoints.
  CUSTOMER_POINTS_LEDGER: 'operations/points-ledger',
  // A-050 — GET — customer activity log, powers the Customer Detail
  // "Activities History" tab (components/customers/activitiesHistory.vue).
  // Response envelope + row shape CONFIRMED live 2026-09-18 (real
  // payload) — see services/customers/customers.api.js::fetchCustomerActivities.
  CUSTOMER_ACTIVITIES: 'operations/customer-activities',
  // A-015 — GET — per-customer attribution history, powers the Customer
  // Detail "Traffic Attribution" tab (components/customers/
  // trafficAttribution.vue). Response envelope + row shape CONFIRMED live
  // 2026-09-18 (real payload) — see
  // services/customers/customers.api.js::fetchCustomerTrafficAttribution.
  // No pagination params — the endpoint returns every row at once.
  CUSTOMER_TRAFFIC_ATTRIBUTION: (customerId) => `attribution/anonymous/${customerId}`,

  // --- Booking detail dashboard (Phase 1) ---
  // A-046 — POST — same endpoint as HOME_BOOKINGS_FEED, called instead with
  // { bookingId } to fetch one booking's full detail (customerData/
  // vehicleData/modelData/locationData/recoveryData all embedded).
  BOOKING_DETAIL: '/operations/getBookings',
  // A-044 — GET — the pre/post-booking image + KM line item for a booking
  BOOKING_LINE_ITEM: '/operations/bookingLineItems',
  // A-025 — POST — cancel a booking
  BOOKING_CANCEL: (id) => `/operations/cancelBooking/${id}`,
  // A-031 — POST — reinitiate a cancelled/ended booking
  BOOKING_REINITIATE: (id) => `/operations/revertBooking/${id}`,
  // A-139 / A-140 — POST — recovery list membership
  BOOKING_ADD_TO_RECOVERY: (id) => `/operations/bookings/${id}/add-to-recovery`,
  BOOKING_REMOVE_FROM_RECOVERY: (id) => `/operations/bookings/${id}/remove-from-recovery`,
  // A-136 — GET — recovery list (bare array response, embeds bookingData
  // (+ customerData) and vehicleData (+ modelData)), confirmed live 2026-09-23
  RECOVERY_LIST: '/operations/recovery-list',
  // A-137 — GET — comments on one recovery record
  RECOVERY_COMMENTS: (id) => `/operations/recovery-list/${id}/comments`,
  // A-138 — POST — add a comment to a recovery record
  RECOVERY_ADD_COMMENT: '/operations/recovery-list/comment',
  // A-135 — POST — mark a recovery as recovered. Despite the `bookings/:id`
  // path, the old app passes the *recovery record's* id here, not the
  // booking's — ported as-is.
  RECOVERY_CLOSE: (id) => `/operations/bookings/${id}/close-from-recovery`,
  // A-130 — POST — reconcile a manually-confirmed Razorpay payment
  BOOKING_UPDATE_PAYMENT: 'operations/razorpay/payment/update',
  // A-148 — PUT — adjust a customer's outstanding penalty for a booking
  CUSTOMER_PENALTY_UPDATE: (customerId) => `/operations/${customerId}/penalty/update/`,
  // A-023 — PUT — change delivery/pickup type + location/address
  BOOKING_UPDATE_DELIVERY: '/operations/booking/update-delivery',
  // A-103 — GET — pickup locations available for a given model
  MODEL_LOCATIONS: (modelId) => `/operations/${modelId}/locations/list`,
  // A-119 — GET — paginated collection/payment history
  COLLECTIONS_LIST: '/operations/collectionPayments',
  // A-123 — POST — add a manual collection/payment entry
  COLLECTION_ADD: (bookingId) => `/operations/misc/payment/${bookingId}`,
  // A-008 — GET — paginated agent activity log
  AGENT_ACTIVITIES: '/operations/agentActivities',
  // A-131 / A-132 — GET/POST — payment (retrieval) tickets
  PAYMENT_TICKETS: 'tickets',
  // A-062 — GET — one extension's full detail
  EXTENSION_DETAIL: (extendId) => `/operations/extension/${extendId}`,
  // A-063 — GET — paginated extension/payment history
  EXTENSIONS_LIST: '/operations/extensionPayments',
  // A-083 / A-084 — GET/POST — KM-overage bills
  KM_BILLS_LIST: '/operations/km-logs/bill',
  KM_BILL_CREATE: '/operations/km-logs/bill',
  // A-082 — GET — mark a KM bill paid
  KM_BILL_MARK_PAID: (billId) => `/operations/bills/${billId}/mark-paid`,

  // --- Assign vehicle (Phase 1) ---
  // A-104 — GET — model stock list, for the model picker
  MODELS_STOCK: 'models/stock',
  // A-152 — POST (used for a read) — available vehicles for a model
  AVAILABLE_VEHICLES: 'operations/getVehicles',
  // A-030 — POST — pre-booking data (images/KM/address), query: id
  PRE_BOOKING_DATA: '/operations/preBookingData/',
  // A-034 — POST — the actual vehicle assignment
  ASSIGN_VEHICLE: (bookingId) => `booking/${bookingId}/vehicle/assign`,

  // --- Extend booking (Phase 1) ---
  // A-047 — GET — booking summary used to seed the extend screen
  EXTEND_BOOKING_LOOKUP: (bookingId) => `outreach/funnel/bookings/${bookingId}`,
  // A-065 / A-066 — POST — calculate the extend price, then create the order
  EXTEND_CALCULATE: 'operations/booking/extend/calculate',
  EXTEND_CREATE_ORDER: 'operations/booking/extend/create-order',
  // A-067 — POST — send a Razorpay payment link for an extension
  EXTEND_SEND_PAYMENT_LINK: 'operations/booking/extend/send-payment-link',
  // A-064 — POST — send a Cashfree payment link for an extension
  EXTEND_SEND_PAYMENT_LINK_CASHFREE: 'create-extension-payment-link-cf',
  // A-129 — POST — send a payment link over an alternate channel (sms/email)
  SEND_PAYMENT_LINK_ALTERNATE: 'operations/booking/send-payment-link',
  // A-126 — POST — record a manually-collected cash/points/TOA payment
  CASH_VERIFY_PAYMENT: 'operations/booking/cash/verify-payment',

  // --- Modify booking (Phase 1) ---
  // A-152 — POST (used for a read) — vehicles eligible for exchange (a
  // different real param shape than assign-vehicle's fetchAvailableVehicles:
  // status=[0,2,5,4] instead of type=all)
  EXCHANGEABLE_VEHICLES: 'operations/getVehicles',
  // A-029 — POST — upload the exchange vehicle's condition photo
  EXCHANGE_VEHICLE_IMAGE_UPLOAD: '/operations/modifybooking/exchangeVehicleImage/upload',
  // A-028 — POST — the actual extend/exchange submission, `type` discriminated
  MODIFY_BOOKING: '/operations/modifyBooking',

  // --- Create booking (Phase 1) ---
  // A-060 — GET — customer search by phone (v2, despite the near-identical
  // A-059 LEGACY sibling with the same purpose but a different real caller)
  SEARCH_CUSTOMER_BY_PHONE: (phone) => `searchCustomer/${phone}`,
  // A-094 — GET — delivery charge lookup
  DELIVERY_CHARGE: 'getDeliveryCharge',
  // A-101 — GET — addon/merchandise list
  MERCHANDISE: 'merchandise/get',
  // A-124 — POST — "Old (Manual)" flow's booking submission
  BOOKING_ORDER_MANUAL: '/ops/booking/order',
  // A-051 / A-053 / A-057 — customer detail/addresses for the "New
  // (Dynamic)" flow
  CUSTOMER_DETAIL: (customerId) => `/operations/customer/${customerId}`,
  CUSTOMER_ADDRESSES: (customerId) => `/operations/customer/${customerId}/address`,
  CUSTOMER_ADD_ADDRESS: (customerId) => `operations/customer/${customerId}/add-address`,
  // A-127 — POST — "New (Dynamic)" flow's booking submission
  BOOKING_CREATE_ORDER: 'operations/booking/create-order',

  // --- End booking (Phase 1) ---
  // A-086 / A-085 — pending KM bills (Step 1, EV vehicles)
  KM_BILLS_PENDING_SUMMARY: (bookingId) => `/operations/km-logs/bills/${bookingId}/pending-summary`,
  KM_BILL_CREATE_PENDING: (bookingId) => `/operations/km-logs/bills/${bookingId}/create-pending`,
  // A-022 — POST — send the drop-PIN generation link (Step 2)
  SEND_PIN_GENERATION_LINK: '/operations/booking/end/send-pin-generation-link',
  // A-048 — PUT — post-KM reading + comment (Step 3)
  BOOKING_LINE_ITEM_UPDATE: (lineItemId) => `v2/bookingLineItemsData/${lineItemId}/update`,
  // A-033 — POST — mandatory post-booking image upload (Step 4)
  UPLOAD_MANDATORY_IMAGE: (lineItemId) => `/v2/booking/upload-image-mandatory/${lineItemId}`,
  // A-056 — POST — penalty adjustment specific to the end-booking wizard
  // (Step 5 — a different real call shape than A-148's PUT .../penalty/update/)
  END_BOOKING_UPDATE_PENALTY: (customerId) => `operations/customer/${customerId}`,
  // A-070 — POST — traffic violations for a booking (Step 6)
  TRAFFIC_VIOLATIONS: 'violations/find',
  // A-026 — POST — the terminal end-booking submission (Step 9)
  END_BOOKING: '/operations/endbooking',

  // --- Booking payment methods (Phase 1) ---
  // A-118 — POST — send a Cashfree payment link for a fresh booking
  BOOKING_PAYMENT_LINK_CASHFREE: '/create-order-payment-link-cf',
  // A-128 — POST — send/generate a Razorpay payment link for a fresh booking
  BOOKING_PAYMENT_LINK_RAZORPAY: 'operations/booking/razorpay/send-payment-link',

  // --- Vehicle detail (Phase 2) ---
  // A-165 — GET — main vehicle load
  VEHICLE_DETAIL: (vehicleId) => `operations/getVehicles/${vehicleId}`,
  // A-169 — GET — service history
  VEHICLE_SERVICE_HISTORY: (vehicleId) => `services/vehicle/${vehicleId}`,
  // A-046 — POST — same endpoint as the booking-detail/home-feed lookup,
  // called here with `{ vehicle }` instead of `{ bookingId }`
  VEHICLE_BOOKING_HISTORY: '/operations/getBookings',
  // A-161 — POST — single/multi-field patch (RC/insurance dates, permit,
  // swap key id, insurance policy — all go through this one endpoint)
  VEHICLE_FIELD_UPDATE: (vehicleId) => `/vehicles/${vehicleId}`,
  // A-093 — GET — full (non-model-scoped) location list, for the vehicle's
  // location picker — distinct from A-100 (bare `locations`, used on Home)
  // and A-103 (model-scoped, used by Assign Vehicle)
  VEHICLE_LOCATIONS: '/operations/locations/list',
  // A-154 — POST — update a vehicle's location
  VEHICLE_UPDATE_LOCATION: (vehicleId) => `/operations/vehicle/${vehicleId}/update/location`,
  // A-155 — POST — update a vehicle's status
  VEHICLE_UPDATE_STATUS: (vehicleId) => `/operations/vehicle/${vehicleId}/update/status`,
  // A-073 — POST — toggle GPS install status
  VEHICLE_TOGGLE_GPS: (vehicleId) => `/toggleGpsStatus/vehicle/${vehicleId}`,
  // A-171 — POST — multipart document image upload (insurance/PUCC/RC/permit)
  VEHICLE_UPLOAD_IMAGE: 'vehicle/upload',
  // A-168 — PUT — resale listing details
  VEHICLE_UPDATE_RESALE: 'operations/vehicle/update/list-for-sale',
  // Undocumented (found live in vehicleDetails.vue, not yet in
  // docs/api-inventory.csv as its own row) — block/unblock a swap key
  VEHICLE_SWAP_KEY_BLOCK: (swapKeyId) => `/admin/swap-key/${swapKeyId}/block`,
  VEHICLE_SWAP_KEY_UNBLOCK: (swapKeyId) => `/admin/swap-key/${swapKeyId}/unblock`,
  // Vehicle Condition Report — GET services/qcheck?vehicleId=:id
  VEHICLE_VCR: 'services/qcheck',
  // A-072 — GET — live GPS position for one vehicle, query: registrationNumber
  VEHICLE_CURRENT_LOCATION: '/operations/vehicle/current-location',
  // A-074 — GET — GPS vendor list, for the GPS-status toggle's vendor picker
  VEHICLE_GPS_VENDORS: 'gps/vendor',
  // A-159 — GET — vehicles with an expired RC/insurance/permit/PUCC
  VEHICLES_EXPIRED: '/operations/vehicles/expired',
  // A-032 — GET — vehicles tied to upcoming/active/expired bookings, with
  // GPS data, for the GPS Tracker map
  GPS_TRACKER_MAP_DATA: '/outreach/bookings/expired/map-data',
  // A-016 / A-017 — GET — traffic attribution report (by traffic / by value)
  TRAFFIC_ATTRIBUTION: 'attribution/analytics/traffic-attribution',
  TRAFFIC_ATTRIBUTION_BY_VALUE: 'attribution/analytics/traffic-attribution-by-value',
}

// A-069 — GET — reverse geocode. Bare external call to Google, not part
// of the ops backend, so it isn't proxied through v2Client.
export const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
