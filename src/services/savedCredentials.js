/**
 * "Save for later" on the login form — persists the employee ID + password
 * locally so the agent doesn't have to retype them. Wrapped in try/catch
 * like tokenStorage.js (localStorage can throw in private/restricted
 * browsing modes). Plaintext in localStorage is readable by any script on
 * the origin (e.g. an XSS bug) — an accepted tradeoff here since this is an
 * opt-in convenience the agent explicitly checks, not on-by-default.
 */
const EMPLOYEE_ID_KEY = 'save_for_later_employeeId'
const PASSWORD_KEY = 'save_for_later_password'

export function getSavedCredentials() {
  try {
    const employeeId = localStorage.getItem(EMPLOYEE_ID_KEY)
    if (!employeeId) return null
    return { employeeId, password: localStorage.getItem(PASSWORD_KEY) ?? '' }
  } catch {
    return null
  }
}

export function setSavedCredentials(employeeId, password) {
  try {
    localStorage.setItem(EMPLOYEE_ID_KEY, employeeId)
    localStorage.setItem(PASSWORD_KEY, password)
  } catch {
    // localStorage unavailable — the checkbox simply won't persist.
  }
}

export function clearSavedCredentials() {
  try {
    localStorage.removeItem(EMPLOYEE_ID_KEY)
    localStorage.removeItem(PASSWORD_KEY)
  } catch {
    // no-op
  }
}
