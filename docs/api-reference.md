# Ontrack Operations App — Phase 2: API Inventory & Dependency Map

Auto-extracted from `operationsapp-frontend` (v6.2.0). **285 call sites → 172 distinct endpoints** across 5 HTTP clients and 2 backends.

Purpose lines are drafted from the endpoint path and the functions that call it — verify each with Aranya before treating it as the contract. Request/response fields are what the **frontend actually sends and reads**, not the backend's full schema.

## Endpoints by domain

| Domain                  | Endpoints | Legacy |      v2 | Bare axios |
| ----------------------- | --------: | -----: | ------: | ---------: |
| Bookings                |        28 |      5 |      20 |          3 |
| Vehicles                |        22 |      3 |      19 |          0 |
| Payments                |        16 |      0 |      16 |          0 |
| Models & Inventory      |        15 |      3 |      11 |          1 |
| Agent & Attendance      |        13 |      3 |      10 |          0 |
| Customers               |        12 |      2 |       9 |          1 |
| GPS & Tracking          |        11 |      1 |       4 |          6 |
| Master data             |        11 |      4 |       7 |          0 |
| Extensions              |         7 |      0 |       7 |          0 |
| Recovery                |         6 |      0 |       6 |          0 |
| KM Billing              |         5 |      0 |       5 |          0 |
| Analytics & Attribution |         4 |      0 |       4 |          0 |
| Lessors                 |         3 |      0 |       3 |          0 |
| Service                 |         3 |      3 |       0 |          0 |
| Uncategorised           |         3 |      0 |       3 |          0 |
| Auth                    |         2 |      0 |       2 |          0 |
| Roadside Assistance     |         2 |      0 |       2 |          0 |
| Activity log            |         1 |      1 |       0 |          0 |
| Documents               |         1 |      0 |       1 |          0 |
| External / Google       |         1 |      0 |       0 |          1 |
| Fines & Violations      |         1 |      0 |       1 |          0 |
| Loyalty                 |         1 |      0 |       1 |          0 |
| Notifications           |         1 |      1 |       0 |          0 |
| Purchases               |         1 |      0 |       1 |          0 |
| Reports                 |         1 |      1 |       0 |          0 |
| Waitlist                |         1 |      1 |       0 |          0 |
| **Total**               |   **172** | **28** | **132** |     **12** |

## Call chains (waterfalls)

Functions that fire more than one request. Each of these is a sequential round trip in the browser and a candidate for a single composed v3 endpoint.

| File                           | Function          | Requests | Endpoints                                                                                                                                                                                                                                                                  |
| ------------------------------ | ----------------- | -------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/assignVehicle.vue` | `createBooking()` |        5 | `POST https://api.on-track.in/api/booking/:id`<br>`POST https://api.on-track.in/api/createActivity`<br>`POST https://api.on-track.in/api/flagActiveToRepute`<br>`POST https://api.on-track.in/api/sendConfirmationEmail`<br>`POST https://api.on-track.in/api/vehicle/:id` |
| `store.js`                     | `getGpsVendors()` |        3 | `GET `<br>`GET gps/vendor`<br>`GET tickets/:id`                                                                                                                                                                                                                            |

## Endpoint reference

### Activity log

#### `A-001` — `POST createActivity`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Submits Activity — called from createAgentActivity()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Vuex side effects:** commits `LOADING_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

### Agent & Attendance

#### `A-002` — `POST ///operations/agent/verifyToken/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits verify Token — called from verifyToken()
- **Request:** body: token
- **Response read by frontend:** data.message
- **Used in:** `components/login-token.vue`, `components/login.vue`
- **Vuex side effects:** dispatches `authRequest`, `verifyAuthWithToken`
- **Issues:** malformed URL (double/triple slash)

#### `A-003` — `POST /attendance`

- **Backend:** v2 · glacier (duplicate client) · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits attendance — called from getAttendance()
- **Request:** body: date
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/profile.vue`
- **Issues:** redundant `test` client

#### `A-004` — `POST /attendance/punch/in`

- **Backend:** v2 · glacier (duplicate client) · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits in — called from punchIn()
- **Request:** body: device, lat, long, place
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/profile.vue`
- **Issues:** redundant `test` client

#### `A-005` — `POST /attendance/punch/out`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits out — called from punchOut()
- **Request:** body: device, lat, long, place
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/profile.vue`
- **Vuex side effects:** dispatches `authLogout` — **CORRECTED 2026-09-18:** this does not reflect `components/profile.vue`'s real behavior — confirmed against the live running old app, punching out stays on the page and shows the day's final work duration (via a `getAttendance()` re-fetch), it does not log the agent out or navigate away. Likely misattributed from a different/older call site.

#### `A-006` — `GET /operations/agent/generateToken/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Fetches generate Token — called from generateToken()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/login-token.vue`, `components/login.vue`

#### `A-007` — `POST /operations/agent/verifyToken/:id`

- **Backend:** v2 · glacier (no token) · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits verify Token — called from verifyAuthWithToken()
- **Request:** body: <user> (variable — inspect at runtime)
- **Response read by frontend:** data.userData, data.userData.token
- **Used in:** `store.js`
- **Vuex side effects:** commits `AUTH_LOGOUT`, `LOADING_API`, `UPDATE_LOGIN`, `UPDATE_TOKEN`

#### `A-008` — `GET /operations/agentActivities`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Fetches agent Activities — called from loadData()
- **Request:** query: bookingId, limit, offset
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/v2/agentActivities.vue`, `components/vehicles/agentActivity.vue`

#### `A-009` — `POST /operations/agentActivities`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits agent Activities — called from createAgentActivity()
- **Request:** body: type
- **Response read by frontend:** data.message
- **Used in:** `components/AllBookingDetailsV2.vue`

#### `A-010` — `POST /profile/agent/v2/login`

- **Backend:** v2 · glacier (no token) · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits login — called from authRequest()
- **Request:** body: `{ employeeId, password, deviceToken, device }` — confirmed from a real request payload (2026-09-07). `deviceToken` is the FCM push token (`null` if not registered); `device` is the client user agent string.
- **Response read by frontend:** data.userData, data.userData.token
- **Used in:** `store.js`
- **Vuex side effects:** commits `LOADING_API`, `UPDATE_LOGIN`, `UPDATE_TOKEN`

#### `A-011` — `GET get/agent`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches agent — called from get_agents_by_id()
- **Request:** query: id
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Vuex side effects:** commits `LOADING_API`
- **Issues:** raw response.data consumed (no envelope)

#### `A-012` — `GET getAgents`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 3
- **Purpose:** Fetches Agents — called from get_agents(), get_agents_by_id()
- **Request:** query: id, status
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_AGENT`, `LOADING_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

#### `A-013` — `POST getAgents`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Submits Agents — called from checkAuthentication()
- **Request:** body: id
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_AGENT`, `LOADING_API`
- **Issues:** LEGACY backend; POST used for a read; raw response.data consumed (no envelope)

#### `A-014` — `POST getAgentsActivity`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Submits Agents Activity — called from getExtendHistory()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `store.js`
- **Co-called with:** `GET tickets/:id`
- **Issues:** LEGACY backend; POST used for a read

### Analytics & Attribution

#### `A-015` — `GET /attribution/anonymous/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches anonymous — called from fetchData()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/customers/trafficAttribution.vue`

#### `A-016` — `GET attribution/analytics/traffic-attribution`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Traffic Attribution report, "By Traffic" mode: traffic, signups and conversions per source, medium, campaign, platform and attribution type, each compared with the previous period
- **Request:** query: startDate, endDate (epoch ms, local start and end of day)
- **Response read by frontend:** `{ success, type, totals[], attributedCount, bySource, bySourceMedium, bySourceCampaign, byPlatform, byAttributionType }`. Totals are Traffic, Signed Up and Converted; each total and group row has `label, count, previousCount, change, changePercent, trend`, and group rows add `signedUp, converted`. Confirmed 2026-09-24.
- **Used in:** `views/TrafficAttribution.vue` (old) → v3 `src/pages/reports/TrafficAttributionPage.vue`
- **Issues:** raw response.data consumed (no envelope)

#### `A-017` — `GET attribution/analytics/traffic-attribution-by-value`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Traffic Attribution report, "By Value" mode: the same groups as A-016, with conversion rates, sorted server-side
- **Request:** query: startDate, endDate (epoch ms), sortBy (`count` \| `signedUp` \| `converted`), sortOrder (`asc` \| `desc`)
- **Response read by frontend:** same envelope as A-016. Group rows carry `signup_conversion_rate` and `booking_conversion_rate` as "12.34" strings and have no trend; the Signed Up and Converted totals add `signed_up_conversion_rate` and `booking_conversion_rate`. Shape taken from the backend controller `getTrafficAttributionStatsByValue`; not yet confirmed with a live response.
- **Used in:** `views/TrafficAttributionByValue.vue` (old) → v3 `src/pages/reports/TrafficAttributionPage.vue` (By Value mode)
- **Issues:** raw response.data consumed (no envelope)

#### `A-018` — `GET operations/analytics/rentals/metrics`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches metrics — called from getRentalMetrics()
- **Request:** query: endDate, startDate
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/reports/ReportHome.vue`

### Auth

#### `A-019` — `GET /outreach/user/loggedin/info`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches info — called from created()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/profile.vue`
- **Response — CONFIRMED live 2026-09-18:** raw object (no envelope): `{ id, userName, name, role, displayPicture, status, dob, doj, email, mobile, isOnline, token, alertForRSA, employeeID, canUpdateCollectionInfo, lessor, createdAt, updatedAt }`. `displayPicture` is an S3 URL (agent's profile photo); `role` is a plain string (e.g. `"ADMIN"`). Used by v3's `AppLayout.vue` for the sidebar/top-bar avatar, name, and role.

#### `A-020` — `GET outreach/user/loggedin/info`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches info — called from init()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Response — CONFIRMED live 2026-09-18:** same shape as A-019 (same endpoint) — see that row.
- **Used in:** `store.js`
- **Vuex side effects:** commits `LOADING_API`, `UPDATE_LOGIN`
- **Issues:** raw response.data consumed (no envelope)

### Bookings

#### `A-021` — `POST //getBookingByQuery`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Submits Booking By Query — called from get_completed_booking_by_vehicle()
- **Request:** body: Authorization, status, vehicle
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `store.js`
- **Co-called with:** `POST operations/getBookings`
- **Vuex side effects:** commits `LOADING_API`
- **Issues:** LEGACY backend; malformed URL (double/triple slash)

#### `A-022` — `POST /operations/booking/end/send-pin-generation-link`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits send-pin-generation-link — called from sendOTPGenerationLink()
- **Request:** body: bookingId
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/endbooking.vue`

#### `A-023` — `PUT /operations/booking/update-delivery`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Updates -delivery — called from updateDelivery()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** data.error, data.message
- **Used in:** `components/UpdateDeliveryTypeModal.vue`

#### `A-024` — `GET /operations/bookings`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches bookings — called from updateQueryParamUrl()
- **Request:** query: limit, locations, models, offset, plan_types, searchQuery, sortOrder, statuses
- **Response — CONFIRMED against the live backend 2026-09-07** (ontrack-ops-v3 Home/Bookings list): envelope `{ count, rows }`. Each row: `id` (numeric PK), `bookingId` (string, often a descriptive test id), `customer`/`vehicle`/`model` (bare ids), `status` (numeric, no documented enum), `startDate`, `endDate`, `bookingEndDate`, `amount`, `paymentStatus` (numeric), plus **embedded** `customerData` (full customer record, incl. `fName`/`lName`/`mobile`/`email`), `vehicleData` (full vehicle record, incl. `registrationNumber`), `modelData` (full model record, incl. `name`) — the backend denormalizes these three for this endpoint, so a list UI doesn't need separate lookups for customer/vehicle/model display names.
- **Used in:** `components/bookings.vue`; also `ontrack-ops-v3` (`src/services/bookings/bookings.api.js`, `src/stores/bookings.store.js`)

#### `A-025` — `POST /operations/cancelBooking/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits cancel Booking — called from cancelBooking()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/AllBookingDetailsV2.vue`, `components/allbookingdetails.vue`

#### `A-026` — `POST /operations/endbooking`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits endbooking — called from confirmEndBooking()
- **Request:** body: absconding, blacklist, bookingEndComment, forcefullyRecovered, otp
- **Response read by frontend:** data.error, data.message
- **Used in:** `components/endbooking.vue`

#### `A-027` — `POST /operations/getBookings`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 3
- **Purpose:** Submits Bookings — called from fetchBooking(), getBookingData()
- **Request:** query: limit · body: bookingId, customer, paymentStatus
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/AllBookingDetailsV2.vue`, `components/UpdateDeliveryTypeModal.vue`, `components/createBooking.vue`
- **Co-called with:** `GET /locations`
- **Issues:** POST used for a read; called from 3 files

#### `A-028` — `POST /operations/modifyBooking`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits modify Booking — called from updateBooking()
- **Request:** body: HH, amount, bookingId, collectedAmount, comment, model, newEndDate, null, paymentId, paymentReceivedOn, paymentSource, paymentStatus, reason, refundId, refundedAmount, transactionType, type, vehicle
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/modifyBooking.vue`

#### `A-029` — `POST /operations/modifybooking/exchangeVehicleImage/upload`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits upload — called from uploadExchangeVehicleImage()
- **Request:** body: <fd> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/modifyBooking.vue`

#### `A-030` — `POST /operations/preBookingData/`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits pre Booking Data — called from confirmAssign(), submitForm()
- **Request:** query: id
- **Response read by frontend:** data (raw), data.message
- **Used in:** `components/assignVehicle2.vue`, `views/bookings/preBookingData.vue`
- **Vuex side effects:** dispatches `assignVehicle`

#### `A-031` — `POST /operations/revertBooking/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits revert Booking — called from reinitiate_booking()
- **Request:** body: description
- **Response read by frontend:** data.message
- **Used in:** `components/AllBookingDetailsV2.vue`, `components/allbookingdetails.vue`

#### `A-032` — `GET /outreach/bookings/expired/map-data`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches map-data — called from loadVehicles()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/vehicles/gpsTrackerList.vue`
- **Issues:** the calling page has 3 confirmed template/data bugs — a marker `v-if` references `vehicle` before it's in scope (likely a render-time error on every load), `selectVehicle()` reads `vehicle.lat`/`.lng` instead of the real `vehicle.gpsData.lat`/`.lng`, and `scrollToVehicle()` looks up `vehicle.id` instead of the real `vehicle.vehicleId` — the page is likely substantially broken in production today. All fixed in the v3 port (not replicated).

#### `A-033` — `POST /v2/booking/upload-image-mandatory/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits upload-image-mandatory — called from confirmUpload()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/endbooking.vue`

#### `A-034` — `POST booking/:id/vehicle/assign`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits assign — called from assignVehicle()
- **Request:** body: <payload.data> (variable — inspect at runtime)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Vuex side effects:** commits `LOADING_API`
- **Issues:** raw response.data consumed (no envelope)

#### `A-035` — `GET bookingLineItems`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Fetches booking Line Items — called from get_booking_line_item()
- **Request:** query: booking
- **Response read by frontend:** data (raw)
- **Used in:** `store/modules/booking.js`
- **Vuex side effects:** commits `GET_BOOKING_LINE_ITEM`, `LOADING_API`, `LOADING_CUSTOMER`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

#### `A-036` — `POST getBookingById`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Submits Booking By Id — called from get_booking_by_id()
- **Request:** body: id
- **Response read by frontend:** data (raw)
- **Used in:** `store/modules/booking.js`
- **Vuex side effects:** commits `GET_BOOKING_BY_ID`, `LOADING_API`
- **Issues:** LEGACY backend; POST used for a read; raw response.data consumed (no envelope)

#### `A-037` — `POST getBookingByQuery`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 6
- **Purpose:** Submits Booking By Query — called from get_booking_by_customer(), get_booking_by_query(), get_booking_by_vehicle()
- **Request:** body: customer, paymentStatus, status, vehicle
- **Response read by frontend:** data (raw), data.length
- **Used in:** `store.js`, `store/modules/booking.js`
- **Co-called with:** `POST operations/getBookings`
- **Vuex side effects:** commits `GET_BOOKING_BY_CUSTOMER`, `GET_BOOKING_BY_VEHICLE`, `GET_COMPLETED_BOOKING_BY_VEHICLE`, `GET_NEW_BOOKING`, `LOADING_API`, `LOADING_COMPLETED`, `LOADING_CUSTOMER`, `LOADING_VEHICLE`
- **Issues:** LEGACY backend; POST used for a read; raw response.data consumed (no envelope)

#### `A-038` — `POST getBookingList`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Submits Booking List — called from get_bookings()
- **Request:** body: paymentStatus, status
- **Response read by frontend:** data (raw)
- **Used in:** `store/modules/booking.js`
- **Vuex side effects:** commits `GET_BOOKING`, `LOADING_API`
- **Issues:** LEGACY backend; POST used for a read; raw response.data consumed (no envelope)

#### `A-039` — `POST https://api.on-track.in/api/booking/:id`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits booking — called from createBooking()
- **Request:** body: endDate, model, startDate, status, vehicle
- **Response read by frontend:** data (raw)
- **Used in:** `components/assignVehicle.vue`
- **Co-called with:** `POST https://api.on-track.in/api/createActivity`, `POST https://api.on-track.in/api/flagActiveToRepute`, `POST https://api.on-track.in/api/sendConfirmationEmail`, `POST https://api.on-track.in/api/vehicle/:id`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling); raw response.data consumed (no envelope)

#### `A-040` — `POST https://api.on-track.in/api/preBookingData`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits pre Booking Data — called from assignVehicle()
- **Request:** query: comment, id, km
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/assignVehicle.vue`
- **Vuex side effects:** dispatches `assignVehicle`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling)

#### `A-041` — `PUT https://api.on-track.in/api/preBookingData`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 2
- **Purpose:** Updates pre Booking Data — called from saveUpdateBookingLineItem(), updateBookingLineItem()
- **Request:** query: id
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/allbookingdetails.vue`, `components/assignVehicle.vue`
- **Vuex side effects:** dispatches `get_booking_line_item`, `get_models`, `get_new_bookings`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling)

#### `A-042` — `GET operations/analytics/booking/source`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches source — called from loadSourceWise()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/bookings/analytics/home.vue`

#### `A-043` — `GET operations/analytics/booking/status`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches status — called from loadStatus()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/bookings/analytics/home.vue`

#### `A-044` — `GET operations/bookingLineItems`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 4
- **Purpose:** Fetches booking Line Items — called from getBookingLineData(), getBookingLineItemData(), getBookingLineItems()
- **Request:** query: booking
- **Response read by frontend:** data (raw), data.message
- **Used in:** `components/assignVehicle2.vue`, `components/endbooking.vue`, `store.js`, `views/bookings/preBookingData.vue`
- **Vuex side effects:** commits `GET_BOOKING_LINE_ITEM`, `LOADING_API`, `LOADING_CUSTOMER`
- **Issues:** called from 4 files; raw response.data consumed (no envelope)

#### `A-045` — `POST operations/getBookingList`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 3
- **Purpose:** Submits Booking List — called from getBookingList(), get_bookings()
- **Request:** query: limit · body: paymentStatus, searchTerm, status
- **Response read by frontend:** data (raw), data.count, data.rows
- **Used in:** `components/customers/bookingHistory.vue`, `store.js`
- **Vuex side effects:** commits `GET_BOOKING`, `LOADING_API`
- **Issues:** POST used for a read; raw response.data consumed (no envelope)

#### `A-046` — `POST operations/getBookings`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 18
- **Purpose:** Submits Bookings — called from fetchBookingData(), getBookingData(), getBookingDetails()
- **Request:** query: limit · body: bookingId, customer, deliveryType, location, paymentStatus, status, vehicle
- **Response — CONFIRMED against the live backend 2026-09-07** (ontrack-ops-v3 Home dashboard feed, `{ status: 0, paymentStatus: 1, deliveryType: null, location: null }` + `limit=200`): a **bare array** (not the `{ count, rows }` envelope A-024/A-158 use). Same row shape as A-024's confirmed dump, plus two more embedded objects on this endpoint: `locationData` (full location record, incl. `name`/`address`/lat-long — `null` when the booking's `pickUpLocation` isn't set, e.g. a delivery booking) and `recoveryData` (array, empty in samples seen). `deliveryType`: `0` = pickup, `1` = delivery, `null` = unset.
- **Used in:** `components/Recovery/BookingView.vue`, `components/Recovery/VehicleView.vue`, `components/allbookingdetails.vue`, `components/assignVehicle2.vue`, `components/endbooking.vue`, `components/newBookings.vue`, `pages/bookingConfirmed.vue`, `pages/paymentLink.vue` _(+4 more)_; also `ontrack-ops-v3` (`src/services/home/home.api.js`, `src/pages/dashboard/HomePage.vue`) for the Home "today's bookings" feed specifically
- **Co-called with:** `POST //getBookingByQuery`, `POST getBookingByQuery`
- **Vuex side effects:** commits `GET_BOOKING_BY_CUSTOMER`, `GET_BOOKING_BY_ID`, `GET_BOOKING_BY_QUERY`, `GET_BOOKING_BY_VEHICLE`, `GET_COMPLETED_BOOKING_BY_VEHICLE`, `GET_NEW_BOOKING`, `LOADING_API`, `LOADING_COMPLETED`, `LOADING_CUSTOMER`, `LOADING_VEHICLE` · dispatches `get_booking_line_item`
- **Issues:** POST used for a read; called from 12 files; raw response.data consumed (no envelope)

#### `A-047` — `GET outreach/funnel/bookings/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches bookings — called from searchBooking()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/ExtendBookingv2.vue`

#### `A-048` — `PUT v2/bookingLineItemsData/:id/update`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Updates update — called from updateBookingLineItems()
- **Request:** body: postComment, postKm
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/endbooking.vue`

### Customers

#### `A-049` — `POST /operations/create/customer`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits customer — called from submitForm()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** data (raw), data.message
- **Used in:** `pages/createCustomer.vue`

#### `A-050` — `GET /operations/customer-activities`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches customer-activities — called from loadData()
- **Request:** query: customerId, limit, offset
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/customers/activitiesHistory.vue`

#### `A-051` — `GET /operations/customer/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches customer — called from fetchCustomerDetails()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/bookingForm.vue`

#### `A-052` — `POST /operations/customer/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 4
- **Purpose:** Submits customer — called from assignVehicle(), dlnumber(), dlverify()
- **Request:** body: DLVerified, DLnumberVerified, IDVerified
- **Response read by frontend:** data (raw)
- **Used in:** `components/bookingDetails.vue`
- **Issues:** raw response.data consumed (no envelope)

#### `A-053` — `GET /operations/customer/:id/address`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches address — called from loadCustomerAddresses()
- **Request:** query: customerId
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/bookingForm.vue`

#### `A-054` — `GET customer/:id`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Fetches customer — called from get_customer_detail()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_CUSTOMER_DETAIL`, `LOADING_API`
- **Issues:** LEGACY backend

#### `A-055` — `POST https://api.on-track.in/api/customer`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits customer — called from savePenalty()
- **Request:** body: penaltyCharge
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/allbookingdetails.vue`
- **Vuex side effects:** dispatches `get_customer_detail`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling)

#### `A-056` — `POST operations/customer/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits customer — called from updatePenalty()
- **Request:** body: penaltyCharge
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/endbooking.vue`

#### `A-057` — `POST operations/customer/:id/add-address`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits add-address — called from onSubmit()
- **Request:** body: <this.form> (variable — inspect at runtime)
- **Response read by frontend:** data (raw), data.message
- **Used in:** `components/customers/AddAddress.vue`

#### `A-058` — `POST operations/getCustomerList`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 3
- **Purpose:** Submits Customer List — called from getCustomerData(), getCustomerList()
- **Request:** query: limit · body: customerId, paymentStatus, searchTerm, status
- **Response — row shape CONFIRMED against the live backend 2026-09-07** (ontrack-ops-v3 Customers list): envelope `data.count`, `data.rows` as previously documented. Each row: `id`, `fName`/`lName` (no single name field), `mobile`, `email`, `address`/`state`/`city`/`pinCode`, boolean `blacklist`/`absconding` flags, verification booleans (`DLVerified`, `AadharVerified`, `IDVerified`, `emailVerified`, `mobileVerified`), and a numeric `status`/`activeStatus` with no documented enum.
- **Used in:** `views/customers/customerList.vue`, `views/customers/viewCustomer.vue`; also `ontrack-ops-v3` (`src/services/customers/customers.api.js`, `src/stores/customers.store.js`)
- **Issues:** POST used for a read

#### `A-059` — `POST searchCustomer`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Submits Customer — called from get_customerbyname()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_CX_BY_NUM`, `LOADING_API`
- **Issues:** LEGACY backend; POST used for a read; raw response.data consumed (no envelope)

#### `A-060` — `GET searchCustomer/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches Customer — called from fetchCustomer()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/createBooking.vue`

### Documents

#### `A-061` — `POST /otr_vault/upload-document`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits upload-document — called from uploadImage()
- **Request:** body: <formData> (variable — inspect at runtime)
- **Response read by frontend:** data.image_path
- **Used in:** `pages/createModel.vue`, `pages/createVehicle.vue`

### Extensions

#### `A-062` — `GET /operations/extension/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches extension — called from onRowClick()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/v2/extensionList.vue`

#### `A-063` — `GET /operations/extensionPayments`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Fetches extension Payments — called from loadData()
- **Request:** query: bookingId, customerId, limit, offset
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/customers/extensionHistory.vue`, `components/v2/extensionList.vue`

#### `A-064` — `POST create-extension-payment-link-cf`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits -extension-payment-link-cf — called from sendPaymentLinkCashFree()
- **Request:** body: extendId
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/ExtendBookingPaymentMethods.vue`

#### `A-065` — `POST operations/booking/extend/calculate`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits calculate — called from calculatePayment()
- **Request:** body: <obj> (variable — inspect at runtime)
- **Response read by frontend:** data (raw), data.message
- **Used in:** `components/ExtendBookingv2.vue`

#### `A-066` — `POST operations/booking/extend/create-order`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits -order — called from createOrder()
- **Request:** body: <this.extendResponse> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/ExtendBookingv2.vue`

#### `A-067` — `POST operations/booking/extend/send-payment-link`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits send-payment-link — called from sendPaymentLink()
- **Request:** body: extendId
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/ExtendBookingPaymentMethods.vue`

#### `A-068` — `GET operations/extension/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches extension — called from getExtensionDetails()
- **Request:** (none detected)
- **Response read by frontend:** data (raw), data.message
- **Used in:** `components/ExtendBookingPaymentMethods.vue`

### External / Google

#### `A-069` — `GET https://maps.googleapis.com/maps/api/geocode/json`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 1
- **Purpose:** Fetches json — called from getLocation()
- **Request:** query: key, latlng
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/profile.vue`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling)

### Fines & Violations

#### `A-070` — `POST violations/find`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits find — called from getTrafficViolation()
- **Request:** body: bookingId
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Vuex side effects:** commits `LOADING_API`, `TRAFFIC_VIOLATION_DATA`
- **Issues:** raw response.data consumed (no envelope); old app's Vuex action overrides this call's Authorization header with a hardcoded LEGACY Basic-auth constant even though the endpoint is Bearer-token v2 — looks like a copy-paste bug, not a real requirement (not replicated in v3, see A-070 in CSV Notes)

### GPS & Tracking

#### `A-071` — `POST //https://api.on-track.in/api/vehicle`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits vehicle — called from modelchange()
- **Request:** query: location, model · body: Authorization, https
- **Response read by frontend:** data (raw)
- **Used in:** `components/assignVehicle.vue`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling); malformed URL (double/triple slash); raw response.data consumed (no envelope)

#### `A-072` — `GET /operations/vehicle/current-location`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Live GPS position of one vehicle, polled for the vehicle detail map — called from fetchLocation()
- **Request:** query: registrationNumber
- **Response — CONFIRMED against the live backend 2026-09-23** (`KA01AU4527`): `{ data: [ { vehicleNumber, vehicleId, lat, lng, movementStatus ("STOPPED", ...), speed (nullable), ignition ("ON"/"OFF"), orientation, lastUpdated (nullable), batteryValue, batteryUnit, totalSatellites } ] }`. Empty `data` = no tracking. The old app also read `speed_unit`, which is not in the response.
- **Used in:** `components/vehicles/gpsTracker.vue`; also `ontrack-ops-v3` (`src/services/vehicles/vehicleDetail.api.js`, `src/components/vehicles/detail/VehicleLiveLocation.vue`)

#### `A-073` — `POST /toggleGpsStatus/vehicle/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits vehicle — called from changeGpsStatus()
- **Request:** body: gps, gps_vendor
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/Recovery/VehicleView.vue`, `views/vehicles/vehicleDetails.vue`
- **Vuex side effects:** dispatches `get_vehicle_by_id`
- **Issues:** both call sites send a hardcoded admin Basic-auth header override alongside the normal Bearer token flow — unlike A-070's single-anomalous-caller pattern (judged a copy-paste bug, not replicated in v3), this consistent 2-site override was judged a genuine backend requirement and IS replicated in v3 (`vehicleDetail.api.js::toggleGpsStatus()`), flagged as an ASSUMPTION pending a real backend check; the response also carries the vehicle's actual GPS-install boolean as top-level `gps` — the old app's local `vehicleGps` data property was never actually populated from it (a real, separately-confirmed bug, fixed in the v3 port).

#### `A-074` — `GET gps/vendor`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches vendor — called from getGpsVendors()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `store.js`
- **Co-called with:** `GET `, `GET tickets/:id`

#### `A-075` — `POST https://api.on-track.in/api/createActivity`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 3
- **Purpose:** Submits Activity — called from createAgentActivity(), createAgentActivityafterCancel(), createBooking()
- **Request:** body: agentId, bookingId, description, name, type
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/allbookingdetails.vue`, `components/assignVehicle.vue`, `components/createBooking.vue`
- **Co-called with:** `POST https://api.on-track.in/api/booking/:id`, `POST https://api.on-track.in/api/flagActiveToRepute`, `POST https://api.on-track.in/api/sendConfirmationEmail`, `POST https://api.on-track.in/api/vehicle/:id`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling); called from 3 files

#### `A-076` — `POST https://api.on-track.in/api/flagActiveToRepute`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits flag Active To Repute — called from createBooking()
- **Request:** body: bookingId, customerId, null, pickupDateTime, registrationNumber, status
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/assignVehicle.vue`
- **Co-called with:** `POST https://api.on-track.in/api/booking/:id`, `POST https://api.on-track.in/api/createActivity`, `POST https://api.on-track.in/api/sendConfirmationEmail`, `POST https://api.on-track.in/api/vehicle/:id`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling)

#### `A-077` — `POST https://api.on-track.in/api/sendConfirmationEmail`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits send Confirmation Email — called from createBooking()
- **Request:** body: id
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/assignVehicle.vue`
- **Co-called with:** `POST https://api.on-track.in/api/booking/:id`, `POST https://api.on-track.in/api/createActivity`, `POST https://api.on-track.in/api/flagActiveToRepute`, `POST https://api.on-track.in/api/vehicle/:id`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling)

#### `A-078` — `POST https://api.on-track.in/api/vehicle/:id`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits vehicle — called from createBooking()
- **Request:** body: status
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/assignVehicle.vue`
- **Co-called with:** `POST https://api.on-track.in/api/booking/:id`, `POST https://api.on-track.in/api/createActivity`, `POST https://api.on-track.in/api/flagActiveToRepute`, `POST https://api.on-track.in/api/sendConfirmationEmail`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling)

#### `A-079` — `POST https://api.on-track.in/api/vehicle/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits vehicle — called from changingInsurance()
- **Request:** body: InsurancePolicy, insuranceDate, nextInsuranceDate
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/Recovery/VehicleView.vue`, `views/vehicles/vehicleDetails.vue`
- **Co-called with:** `POST https://api.on-track.in/api/booking/:id`, `POST https://api.on-track.in/api/createActivity`, `POST https://api.on-track.in/api/flagActiveToRepute`, `POST https://api.on-track.in/api/sendConfirmationEmail`
- **Vuex side effects:** dispatches `get_vehicle_by_id`

#### `A-080` — `GET https://glacier.on-track.in/api/otr_dealer`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Fetches otr dealer — called from get_otr_dealers()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_OTR_DEALERS`, `LOADING_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

#### `A-081` — `POST https://glacier.on-track.in/api/send/notification`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits notification — called from pushNotification()
- **Request:** body: channel, content, event, message
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/assignVehicle.vue`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling)

### KM Billing

#### `A-082` — `GET /operations/bills/:id/mark-paid`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches mark-paid — called from markAsPaid()
- **Request:** query: comment, paymentId, source
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/payments&others/kmlogs.vue`

#### `A-083` — `GET /operations/km-logs/bill`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches bill — called from fetchBills()
- **Request:** query: bookingId
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/payments&others/kmlogs.vue`

#### `A-084` — `POST /operations/km-logs/bill`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits bill — called from generateBill()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/payments&others/kmlogs.vue`

#### `A-085` — `POST /operations/km-logs/bills/:id/create-pending`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits -pending — called from createPendingBill()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/PendingKmBills.vue`

#### `A-086` — `GET /operations/km-logs/bills/:id/pending-summary`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches pending-summary — called from loadPending()
- **Request:** (none detected)
- **Response read by frontend:** data.pending
- **Used in:** `components/PendingKmBills.vue`

### Lessors

#### `A-087` — `GET /lessor`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches lessor — called from fetchLessors()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `pages/Vehicle/AddVehicle.vue`
- **Issues:** raw response.data consumed (no envelope)

#### `A-088` — `POST /operations/create/lessor`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits lessor — called from createLessor()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** data (raw), data.message
- **Used in:** `components/LessorForm.vue`, `pages/createLessor.vue`

#### `A-089` — `GET /rentals/operations/lessors`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 6
- **Purpose:** Fetches lessors — called from fetchLessors(), loadLessor()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/LessorList.vue`, `components/bookings.vue`, `components/stockCount.vue`, `views/DownloadCenter.vue`, `views/vehicles/stats.vue`, `views/vehicles/vehiclesList.vue`
- **Issues:** called from 6 files

### Loyalty

#### `A-090` — `GET /operations/points-ledger`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches points-ledger — called from loadData()
- **Request:** query: customerId, limit, offset
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/customers/pointsHistory.vue`

### Master data

#### `A-091` — `GET /locations`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Fetches locations — called from getBookingData(), nextBillingDate()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/UpdateDeliveryTypeModal.vue`, `components/bookingForm.vue`
- **Co-called with:** `POST /operations/getBookings`
- **Issues:** no pagination params

#### `A-092` — `GET /operations/:id/locations/list`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches list — called from getModelLocations()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/UpdateDeliveryTypeModal.vue`
- **Issues:** no pagination params

#### `A-093` — `GET /operations/locations/list`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches list — called from openUpdateLocationModal()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/vehicles/vehicleDetails.vue`
- **Issues:** no pagination params

#### `A-094` — `GET getDeliveryCharge`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches Delivery Charge — called from getDeliveryCharges()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Vuex side effects:** commits `GET_DELIVERY_CHARGES`, `LOADING_API`
- **Issues:** raw response.data consumed (no envelope)

#### `A-095` — `GET getDeliveyCharge`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Fetches Delivey Charge — called from getDeliveryCharges()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store/modules/booking.js`
- **Vuex side effects:** commits `GET_DELIVERY_CHARGES`, `LOADING_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

#### `A-096` — `GET getLocations`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches Locations — called from getLocations()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Vuex side effects:** commits `BG_COLOR`, `GET_LOCATIONS`, `LOADING_API`, `SET_THEME`, `SET_USER`
- **Issues:** no pagination params; raw response.data consumed (no envelope)

#### `A-097` — `GET getLocations`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Fetches Locations — called from getLocations()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store/modules/booking.js`
- **Vuex side effects:** commits `BG_COLOR`, `GET_LOCATIONS`, `LOADING_API`, `SET_THEME`, `SET_USER`
- **Issues:** LEGACY backend; no pagination params; raw response.data consumed (no envelope)

#### `A-098` — `POST getTimeSlotByDate`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Submits Time Slot By Date — called from get_timeSlot()
- **Request:** body: date
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_TIME_SLOT`, `LOADING_API`
- **Issues:** LEGACY backend; POST used for a read; raw response.data consumed (no envelope)

#### `A-099` — `GET getVendor`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Fetches Vendor — called from get_customers()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_CX`, `LOADING_API`
- **Issues:** LEGACY backend

#### `A-100` — `GET locations`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 4
- **Purpose:** Fetches locations — called from getLocations()
- **Request:** (none detected)
- **Response — CONFIRMED against the live backend 2026-09-07** (ontrack-ops-v3 Home location filter): a bare array of location records — `id`, `name`, `address`, `latitude`/`langitude` [sic, real field name], `state`, `city`, `pinCode`, `status`, `mapUrl`, `isDeliveryAvailableFromThisLocation`.
- **Used in:** `components/ModelsList.vue`, `components/bookings.vue`, `components/newBookings.vue`, `views/vehicles/vehiclesList.vue`; also `ontrack-ops-v3` (`src/services/home/home.api.js`) to populate the Home location filter dropdown
- **Issues:** called from 4 files; no pagination params

#### `A-101` — `GET merchandise/get`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Fetches get — called from fetchAddons(), prepareCreateBooking()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/bookingForm.vue`, `components/createBooking.vue`

### Models & Inventory

#### `A-102` — `POST /api/models`

- **Backend:** bare axios · absolute URL · **Auth:** None · **Call sites:** 1
- **Purpose:** Submits models — called from onSubmit()
- **Request:** body: <this.model> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `pages/createModel.vue`
- **Issues:** bypasses shared client (absolute URL, no interceptor, no 401 handling)

#### `A-103` — `GET /model/:id/locations/list`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches list — called from fetchModelLocations()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/bookingForm.vue`
- **Issues:** no pagination params

#### `A-104` — `GET /models/stock`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Per-model stock counts + embedded model record, optionally filtered by location — called from loadModels()
- **Request:** query: location (optional)
- **Response — CONFIRMED against the live backend 2026-09-23** (`?location=1`): bare array, one entry per model: `total`, `available`, `booked`, `underService`, `not_working`, `ongoingUnderService`, `underWaterWash`, `returned`, `model` (id), plus embedded `modelData` (`id`, `name`, `image`, `image300`, `price`, `old_price`, `show`, `model_type`, `evType`, ...). Count keys mix snake/camelCase and differ from A-108's naming.
- **Used in:** `components/ModelsList.vue`; also `ontrack-ops-v3` (`src/services/models/models.api.js`, `src/pages/models/ModelsPage.vue`; `src/services/bookings/assignVehicle.api.js`)
- **Issues:** no pagination params; raw response.data consumed (no envelope)

#### `A-105` — `POST /operations/create/model`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits model — called from createModel()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** data (raw), data.message
- **Used in:** `pages/createModel.vue`

#### `A-106` — `GET /operations/getModelList`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches Model List — called from fetchModels()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `pages/Vehicle/AddVehicle.vue`
- **Issues:** raw response.data consumed (no envelope)

#### `A-107` — `GET /operations/models`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 3
- **Purpose:** Fetches models — called from fetchModels()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/bookings.vue`, `pages/createVehicle.vue`, `views/vehicles/vehiclesList.vue`
- **Issues:** called from 3 files

#### `A-108` — `GET /operations/models/inventory`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches inventory — called from saveToLocalStorage()
- **Request:** query: lessor, searchQuery
- **Response read by frontend:** data (raw)
- **Used in:** `components/stockCount.vue`
- **Issues:** raw response.data consumed (no envelope)

#### `A-109` — `GET /operations/models/inventory/stats`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches stats — called from getVehicleCount()
- **Request:** (none detected)
- **Response — CONFIRMED against the live backend 2026-09-07** (ontrack-ops-v3 Home fleet stat strip): `{ data: [...], count }`. Each `data` entry: `{ count, filter_tag, label, abbr_label, status, percentage }` — a breakdown by vehicle status (Asset Under Management, Available, Booked, Under Service, Not Working, Ongoing Service, Water Wash, Returned) plus separate expiry breakdowns (`insurance_expiry`, `rc_expiry`, `permit_expiry`, `pucc_expiry`) and Sold/Scrapped/Total entries; `percentage` and `filter_tag` are omitted on the `Total` entry.
- **Used in:** `components/homepage-content.vue`; also `ontrack-ops-v3` (`src/services/home/home.api.js`, `src/pages/dashboard/HomePage.vue`)
- **Vuex side effects:** dispatches `authLogout`, `bg_color`

#### `A-110` — `PUT /operations/models/update/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Updates a model's show flag, rental price and extension (old) price — called from onSubmit()
- **Request:** body: old_price, price, show
- **Response read by frontend:** data (raw), data.error, data.message
- **Used in:** `components/ModelsList.vue`; also `ontrack-ops-v3` (`src/services/models/models.api.js`, `src/pages/models/ModelsPage.vue`)

#### `A-111` — `GET /operations/vehicle/report/vehicle-count-by-model`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Per-model in-stock/booked/total vehicle counts, optionally per lessor — called from loadVehicleData()
- **Request:** query: lessor (optional)
- **Response — CONFIRMED against the live backend 2026-09-23:** object keyed by model name, each `{ inStock, booked, total }` (total = inStock + booked).
- **Used in:** `views/reports/VehicleCountsByModel.vue`; also `ontrack-ops-v3` (`src/services/reports/vehicleReport.api.js`, `src/pages/reports/VehicleStatsPage.vue`)
- **Issues:** raw response.data consumed (no envelope)

#### `A-112` — `GET getModels`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 3
- **Purpose:** Fetches Models — called from get_models(), get_vehicle_count()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Co-called with:** `GET models/stock`
- **Vuex side effects:** commits `GET_MODELS`, `GET_REMINDER`, `GET_REMINDER_COUNT`, `LOADING_API`, `VEHICLE_COUNT`
- **Issues:** LEGACY backend; no pagination params; raw response.data consumed (no envelope)

#### `A-113` — `GET https://glacier.on-track.in/api/otr_models`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Fetches otr models — called from get_otr_model()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_OTR_MODELS`, `LOADING_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

#### `A-114` — `GET https://glacier.on-track.in/api/otr_models/:id`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Fetches otr models — called from get_otr_model_by_id()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_OTR_MODELS_BY_ID`, `LOADING_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

#### `A-115` — `GET models/stock`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 3
- **Purpose:** Fetches stock — called from fetchModels(), getModels(), get_models()
- **Request:** (none detected)
- **Response read by frontend:** data (raw), data.message
- **Used in:** `components/assignVehicle2.vue`, `components/bookingForm.vue`, `store.js`
- **Co-called with:** `GET getModels`
- **Vuex side effects:** commits `GET_MODELS`, `GET_REMINDER`, `GET_REMINDER_COUNT`, `LOADING_API`
- **Issues:** called from 3 files; no pagination params; raw response.data consumed (no envelope)

#### `A-116` — `GET operations/getModels`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches Models — called from getModelById()
- **Request:** query: model_id
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Vuex side effects:** commits `GET_OTR_MODELS`, `LOADING_API`
- **Issues:** no pagination params; raw response.data consumed (no envelope)

### Notifications

#### `A-117` — `POST readNotes`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Submits read Notes — called from notes()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_NOTES`, `LOADING_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

### Payments

#### `A-118` — `POST /create-order-payment-link-cf`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits -order-payment-link-cf — called from sendPaymentLinkCashfree()
- **Request:** body: bookingId
- **Response read by frontend:** data (raw), data.message
- **Used in:** `pages/paymentMethods.vue`

#### `A-119` — `GET /operations/collectionPayments`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Fetches collection Payments — called from loadData()
- **Request:** query: customerId, limit, offset
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/customers/collectionHistory.vue`, `components/v2/collectionList.vue`

#### `A-120` — `GET /operations/collections/export-reports`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches export-reports — called from exportCollectionsCSV()
- **Request:** query: endDate, startDate
- **Response read by frontend:** data (raw)
- **Used in:** `views/reports/ReportsV2.vue`
- **Issues:** raw response.data consumed (no envelope)

#### `A-121` — `GET /operations/collections/report`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches report — called from fetchTableData()
- **Request:** query: fromDate, limit, onlyVerified, toDate
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/reports/ReportsV2.vue`

#### `A-122` — `GET /operations/collections/report-meta`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches report-meta — called from fetchMeta()
- **Request:** query: fromDate, onlyVerified, toDate
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/reports/ReportsV2.vue`

#### `A-123` — `POST /operations/misc/payment/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits payment — called from addCollection()
- **Request:** body: HH, amount, comment, paymentId, paymentReceivedOn, paymentStatus, refundId, refundedAmount, service, source, transactionType
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/v2/collectionList.vue`

#### `A-124` — `POST /ops/booking/order`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits order — called from createBookingApi()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/createBooking.vue`
- **Vuex side effects:** dispatches `get_models`

#### `A-125` — `GET operations/analytics/booking/payment-status`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches payment-status — called from loadPaymentStatus()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/bookings/analytics/home.vue`

#### `A-126` — `POST operations/booking/cash/verify-payment`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits verify-payment — called from submitAndConfirmPaid()
- **Request:** body: bookingId, comment, paymentId, paymentMethod
- **Response read by frontend:** data (raw), data.message
- **Used in:** `components/ExtendBookingPaymentMethods.vue`, `pages/paymentMethods.vue`

#### `A-127` — `POST operations/booking/create-order`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits -order — called from createBooking()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** data (raw), data.data, data.message
- **Used in:** `components/bookingForm.vue`

#### `A-128` — `POST operations/booking/razorpay/send-payment-link`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits send-payment-link — called from sendPaymentLink()
- **Request:** body: bookingId
- **Response read by frontend:** data (raw), data.data.paymentLink, data.message
- **Used in:** `pages/paymentMethods.vue`

#### `A-129` — `POST operations/booking/send-payment-link`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits send-payment-link — called from sendPaymentLink(), sendPaymentLinkAlternate()
- **Request:** body: bookingId, contact, email
- **Response read by frontend:** data (raw), data.message
- **Used in:** `components/ExtendBookingPaymentMethods.vue`, `pages/paymentLink.vue`

#### `A-130` — `POST operations/razorpay/payment/update`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits update — called from updatePayment()
- **Request:** body: bookingId, order_id
- **Response read by frontend:** data.message
- **Used in:** `components/AllBookingDetailsV2.vue`, `components/allbookingdetails.vue`

#### `A-131` — `GET tickets`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches tickets — called from getPaymentTickets()
- **Request:** query: booking
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `store.js`
- **Co-called with:** `GET tickets/:id`

#### `A-132` — `POST tickets`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits tickets — called from createPaymentTickets()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Vuex side effects:** commits `LOADING_API`
- **Issues:** raw response.data consumed (no envelope)

#### `A-133` — `GET tickets/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 4
- **Purpose:** Fetches tickets — called from changeSubStatus(), getExtendHistory(), getGpsVendors()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Co-called with:** `GET `, `GET gps/vendor`, `GET tickets`, `POST /vehicles/:id`, `POST getAgentsActivity`
- **Vuex side effects:** commits `GET_EXTEND_HISTORY`, `GET_GPS_VENDORS`, `GET_PAYMENT_TICKET`, `LOADING_API`
- **Issues:** raw response.data consumed (no envelope)

### Purchases

#### `A-134` — `GET /outreach/fleet-purchase/status`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches status — called from mounted()
- **Request:** query: limit, paymentStatus, searchQuery, sortOrder
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/vehicles/purchaseOrders.vue`

### Recovery

#### `A-135` — `POST /operations/bookings/:id/close-from-recovery`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits close-from-recovery — called from executeCloseRecovery()
- **Request:** body: closingComment
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/Recovery/HomeVue.vue`

#### `A-136` — `GET /operations/recovery-list`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches recovery-list — called from getRecoveryVehicles()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/Recovery/HomeVue.vue`

#### `A-137` — `GET /operations/recovery-list/:id/comments`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches comments — called from fetchComments()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/Recovery/RecoveryComments.vue`

#### `A-138` — `POST /operations/recovery-list/comment`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits comment — called from addComment()
- **Request:** body: comment, recoveryId
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/Recovery/RecoveryComments.vue`

#### `A-139` — `POST operations/bookings/:id/add-to-recovery`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits add-to-recovery — called from addToRecovery()
- **Request:** body: address, comment
- **Response read by frontend:** data.message
- **Used in:** `components/AllBookingDetailsV2.vue`, `components/allbookingdetails.vue`

#### `A-140` — `POST operations/bookings/:id/remove-from-recovery`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits remove-from-recovery — called from removeFromRecovery()
- **Request:** (none detected)
- **Response read by frontend:** data.message
- **Used in:** `components/AllBookingDetailsV2.vue`, `components/allbookingdetails.vue`

### Reports

#### `A-141` — `POST newUsersByDay`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Submits new Users By Day — called from get_new_customers()
- **Request:** query: createdAt
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_NEW_CUSTOMERS`, `LOADING_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

### Roadside Assistance

#### `A-142` — `GET /outreach/assistance/rsa-leads`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches rsa-leads — called from fetchRsaData()
- **Request:** query: limit, offset, status
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/roadSideAssistance.vue`

#### `A-143` — `PUT /outreach/funnel/assistance/rsa-leads/:id/update/status`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Updates status — called from updateStatus()
- **Request:** body: comment, status
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/roadSideAssistance.vue`

### Service

#### `A-144` — `POST getServiceHistoryById`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Submits Service History By Id — called from get_serviceHistory_by_id()
- **Request:** body: vehicleId
- **Response read by frontend:** data (raw)
- **Used in:** `store/modules/booking.js`
- **Vuex side effects:** commits `GET_SERVICE_HISTORY_BY_ID`, `LOADING_API`, `LOADING_VEHICLE_API`
- **Issues:** LEGACY backend; POST used for a read; raw response.data consumed (no envelope)

#### `A-145` — `GET getServiceListById`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Fetches Service List By Id — called from get_services_by_id()
- **Request:** query: id
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_SERVICES_BY_ID`, `LOADING_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

#### `A-146` — `POST getServiceListByQuery`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Submits Service List By Query — called from get_services()
- **Request:** body: status
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_SERVICES`, `LOADING_API`
- **Issues:** LEGACY backend; POST used for a read; raw response.data consumed (no envelope)

### Uncategorised

#### `A-147` — `GET `

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches — called from getGpsVendors()
- **Request:** (none detected)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `store.js`
- **Co-called with:** `GET gps/vendor`, `GET tickets/:id`

#### `A-148` — `PUT /operations/:id/penalty/update/`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Updates update — called from savePenalty()
- **Request:** body: bookingId, customerId, penaltyCharge
- **Response read by frontend:** data.message
- **Used in:** `components/AllBookingDetailsV2.vue`

#### `A-149` — `GET url`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches url
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Vuex side effects:** commits `GET_VCR`, `LOADING_API`
- **Issues:** raw response.data consumed (no envelope)

### Vehicles

#### `A-150` — `POST /api/vehicles`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits vehicles — called from submitForm()
- **Request:** body: <this.vehicle> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `pages/Vehicle/AddVehicle.vue`

#### `A-151` — `POST /operations/create/vehicle`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits vehicle — called from createVehicle()
- **Request:** body: <payload> (variable — inspect at runtime)
- **Response read by frontend:** data (raw), data.message
- **Used in:** `pages/createVehicle.vue`

#### `A-152` — `POST /operations/getVehicles`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits Vehicles — called from modelchange()
- **Request:** query: limit, model_id, status
- **Response read by frontend:** data.rows
- **Used in:** `components/modifyBooking.vue`
- **Issues:** POST used for a read

#### `A-153` — `POST /operations/report/download/vehicle`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits vehicle — called from downloadReport()
- **Request:** body: bookingStatus, endDate, format, includeOptions, insuranceExpired, lessor, permitExpired, rcExpired, registrationNumber, startDate, vehicleStatus
- **Response read by frontend:** data.message
- **Used in:** `views/DownloadCenter.vue`

#### `A-154` — `POST /operations/vehicle/:id/update/location`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Submits location — called from updateVehicleLocation()
- **Request:** body: location
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/vehicles/vehicleDetails.vue`

#### `A-155` — `POST /operations/vehicle/:id/update/status`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits status — called from changeVehicleStatus()
- **Request:** body: status
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/Recovery/VehicleView.vue`, `views/vehicles/vehicleDetails.vue`

#### `A-156` — `GET /operations/vehicle/report/chart-data`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Per-model available/booked counts split by vehicle age, optionally per lessor — called from loadVehicleChartData()
- **Request:** query: lessor (optional)
- **Response — CONFIRMED against the live backend 2026-09-23:** object keyed by model name, each `{ available: { total, byAge }, booked: { total, byAge } }`; `byAge` maps age in whole years (`"0"`, `"1"`, ...) to a count.
- **Used in:** `views/reports/VehicleStatsChart.vue`; also `ontrack-ops-v3` (`src/services/reports/vehicleReport.api.js`, `src/pages/reports/VehicleStatsPage.vue`)
- **Issues:** raw response.data consumed (no envelope)

#### `A-157` — `GET /operations/vehicle/report/vehicle-count-by-age`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Per-model vehicle counts by age in years (all statuses), optionally per lessor — called from loadVehicleData()
- **Request:** query: lessor (optional)
- **Response — CONFIRMED against the live backend 2026-09-23:** object keyed by model name, each mapping age in years to a vehicle count. Totals can exceed A-156's available + booked.
- **Used in:** `views/reports/VehicleCountsByAge.vue`; also `ontrack-ops-v3` (`src/services/reports/vehicleReport.api.js`, `src/pages/reports/VehicleStatsPage.vue`)
- **Issues:** raw response.data consumed (no envelope)

#### `A-158` — `GET /operations/vehicles`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches vehicles — called from updateQueryParamUrl()
- **Request:** query: lessors, limit, locations, manufactureDate, models, offset, searchQuery, sortOrder, statuses
- **Response — CONFIRMED against the live backend 2026-09-07** (ontrack-ops-v3 Vehicles list): envelope `{ count, rows }`. Each row: `id`, `registrationNumber`, `chassisNo`, `engineNo`, `color`, `manufactureDate`, insurance/permit/PUCC date fields, bare `model`/`lessor`/`location`/`state`/`city` ids, numeric `status` (no documented enum) plus a human-readable `subStatus` string (e.g. `"Default"`), GPS fields (`gps`, `gps_vendor`, `gpsVendorId`), plus **embedded** `modelData` (full model record, incl. `name`) and `lessorData` (full lessor record, incl. `name`) — denormalized by the backend for this endpoint. No embedded location name — `location` is a bare id with nothing resolving it in this response; would need a separate locations lookup (A-091/A-093/A-096/A-097/A-100).
- **Used in:** `views/vehicles/vehiclesList.vue`; also `ontrack-ops-v3` (`src/services/vehicles/vehicles.api.js`, `src/stores/vehicles.store.js`)

#### `A-159` — `GET /operations/vehicles/expired`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Fetches expired — called from exportAllVehicles(), getVehicles()
- **Request:** query: insurance_expired, limit, offset, permit_expired, pucc_expired, rc_expired
- **Response read by frontend:** `{ total, data }` — a different envelope shape than every other list endpoint the frontend calls (`{ count, rows }`), confirmed live 2026-09-07.
- **Used in:** `components/vehicles/reminders.vue`
- **Issues:** `getVehicles()`'s "Load More" replaces `this.vehicles` instead of appending and hardcodes `offset = limit` on every call instead of accumulating it — clicking Load More re-fetches and re-displays the same second page forever, discarding page 1 and never reaching a third page; `exportAllVehicles()` reads 4 separate data properties that default to `false` and are never updated by the UI, so every export requests all expiry flags "0" regardless of the selected radio filter. Both fixed in the v3 port (not replicated).

#### `A-160` — `GET /stats/vehicles`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches vehicles — called from get_vehicle_count()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`
- **Vuex side effects:** commits `LOADING_API`, `VEHICLE_COUNT`
- **Issues:** raw response.data consumed (no envelope)

#### `A-161` — `POST /vehicles/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 8
- **Purpose:** Submits vehicles — called from changeSubStatus(), updateInsuranceEndDate(), updateInsuranceStartDate()
- **Request:** body: RCExpiry, insuranceDate, nextInsuranceDate, permitExpiry, swapKeyId
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/Recovery/VehicleView.vue`, `store.js`, `views/vehicles/vehicleDetails.vue`
- **Co-called with:** `GET tickets/:id`
- **Issues:** called from 3 files; `vehicleDetails.vue`'s `changingInsurance()` (Settings > Update Insurance) bypasses this endpoint for the same 3 fields (InsurancePolicy/insuranceDate/nextInsuranceDate), instead hardcoding a LEGACY URL (`https://api.on-track.in/api/vehicle/:id`) + a hardcoded Basic-auth header — inconsistent with every sibling field-update handler on the same page, which all correctly use this v2 endpoint; treated as a bug in the v3 port, not replicated.

#### `A-162` — `POST droppedVehicle`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 4
- **Purpose:** Submits dropped Vehicle — called from get_drop_vehicle(), get_drop_vehicle_byDate()
- **Request:** query: endDate
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_DROP_VEHICLE`, `GET_DROP_VEHICLE_BY_DATE`, `LOADING_API`, `LOAD_STATUS`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

#### `A-163` — `GET getVehicles`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Fetches Vehicles — called from get_total_vehicles()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store/modules/booking.js`
- **Vuex side effects:** commits `GET_TOTAL_VEHICLES`, `LOADING_API`
- **Issues:** LEGACY backend; no pagination params; raw response.data consumed (no envelope)

#### `A-164` — `POST operations/getVehicles`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Submits Vehicles — called from getAvailableVehicles(), get_total_vehicles()
- **Request:** query: model_id, type · body: Authorization
- **Response read by frontend:** data (raw), data.message
- **Used in:** `components/assignVehicle2.vue`, `store.js`
- **Vuex side effects:** commits `GET_TOTAL_VEHICLES`, `LOADING_API`
- **Issues:** POST used for a read; no pagination params; raw response.data consumed (no envelope)

#### `A-165` — `GET operations/getVehicles/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 3
- **Purpose:** Fetches Vehicles — called from getVehicleData(), get_vehicle_by_id()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `components/Recovery/VehicleView.vue`, `store.js`, `views/vehicles/vehicleDetails.vue`
- **Vuex side effects:** commits `GET_VEHICLE_BY_ID`, `LOADING_API`, `LOADING_VEHICLE_API`
- **Issues:** called from 3 files; no pagination params; raw response.data consumed (no envelope)

#### `A-166` — `GET operations/vehicle/report`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Fetches report — called from fetchVehicles()
- **Request:** query: lessor, limit, offset
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/vehicles/stats.vue`
- **Note:** the only consumer (a vehicle report table) is commented out in the old app, so this call is effectively dead — not ported to `ontrack-ops-v3`.

#### `A-167` — `GET operations/vehicle/report/v2`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Six headline cards for the Inventory Utilisation Report — called from fetchVehiclesv2()
- **Request:** query: lessor (optional), limit, offset
- **Response — CONFIRMED against the live backend 2026-09-23:** bare array of `{ label, percentage?, modelName?, createdAt?, count? }`; `percentage` is a preformatted string (`"70.31%"`), `createdAt` is the model record's creation date.
- **Used in:** `views/vehicles/stats.vue`; also `ontrack-ops-v3` (`src/services/reports/vehicleReport.api.js`, `src/pages/reports/VehicleStatsPage.vue`)

#### `A-168` — `PUT operations/vehicle/update/list-for-sale`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 2
- **Purpose:** Updates list-for-sale — called from updateReSaleDetails()
- **Request:** body: about, insuranceCost, isForSale, kmReading, miscCost, reSalePrice, registrationNumber, rsaCost, rtoCost, totalPrice, warrantyCost
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/Recovery/VehicleView.vue`, `views/vehicles/vehicleDetails.vue`

#### `A-169` — `GET services/vehicle/:id`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 3
- **Purpose:** Fetches vehicle — called from getServiceHistory(), get_serviceHistory_by_id()
- **Request:** (none detected)
- **Response read by frontend:** data.rows
- **Used in:** `components/Recovery/VehicleView.vue`, `store.js`, `views/vehicles/vehicleDetails.vue`
- **Vuex side effects:** commits `GET_SERVICE_HISTORY_BY_ID`, `LOADING_API`, `LOADING_VEHICLE_API`
- **Issues:** called from 3 files

#### `A-170` — `GET vehicle/:id`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 1
- **Purpose:** Fetches vehicle — called from get_vehicle_by_id()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store/modules/booking.js`
- **Vuex side effects:** commits `GET_VEHICLE_BY_ID`, `LOADING_API`, `LOADING_VEHICLE_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)

#### `A-171` — `POST vehicle/upload`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 8
- **Purpose:** Submits upload — called from updateInsuraceImage(), updatePUCCImage(), updatePermitImage()
- **Request:** body: <fd> (variable — inspect at runtime)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `components/Recovery/VehicleView.vue`, `views/vehicles/vehicleDetails.vue`
- **Vuex side effects:** dispatches `get_serviceHistory_by_id`, `get_vehicle_by_id`

#### `A-173` — `POST /admin/swap-key/:swapKeyId/block`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Suspends a vehicle's swap key — called from `confirmBlockSwapKey()`
- **Request:** (none — `swapKeyId` in the URL)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/vehicles/vehicleDetails.vue`
- **Issues:** not previously documented in this inventory — found while building the v3 Vehicle detail page (Phase 2); added here rather than left undiscovered.

#### `A-174` — `POST /admin/swap-key/:swapKeyId/unblock`

- **Backend:** v2 · glacier.on-track.in/api · **Auth:** Bearer agentToken · **Call sites:** 1
- **Purpose:** Reinstates a vehicle's swap key — called from `confirmUnblockSwapKey()`
- **Request:** (none — `swapKeyId` in the URL)
- **Response read by frontend:** (not read, or read indirectly)
- **Used in:** `views/vehicles/vehicleDetails.vue`
- **Issues:** not previously documented in this inventory — found while building the v3 Vehicle detail page (Phase 2); added here rather than left undiscovered.

### Waitlist

#### `A-172` — `POST waitlistQuery`

- **Backend:** LEGACY · api.on-track.in/api · **Auth:** Static Basic (hardcoded) · **Call sites:** 2
- **Purpose:** Submits waitlist Query — called from get_waitlist()
- **Request:** (none detected)
- **Response read by frontend:** data (raw)
- **Used in:** `store.js`, `store/modules/booking.js`
- **Vuex side effects:** commits `GET_WAITLIST`, `LOADING_API`
- **Issues:** LEGACY backend; raw response.data consumed (no envelope)
