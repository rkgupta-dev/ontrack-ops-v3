import { v2Client } from '../api/v2Client'
import { ENDPOINTS } from '../api/endpoints'

/** A-051 — a single customer's full record, incl. `addressBooks`/`penaltyCharge`. */
export async function fetchCustomer(customerId) {
  const response = await v2Client.get(ENDPOINTS.CUSTOMER_DETAIL(customerId))
  return response.data
}

/** A-053 — a customer's saved addresses (also embedded as `addressBooks` on the detail fetch above). */
export async function fetchCustomerAddresses(customerId) {
  const response = await v2Client.get(ENDPOINTS.CUSTOMER_ADDRESSES(customerId), {
    params: { customerId },
  })
  return Array.isArray(response.data) ? response.data : []
}

/** A-057 — add a new saved address for a customer. */
export async function addCustomerAddress(customerId, form) {
  const response = await v2Client.post(ENDPOINTS.CUSTOMER_ADD_ADDRESS(customerId), form)
  return response.data
}
