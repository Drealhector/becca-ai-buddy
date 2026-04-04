/**
 * Auth utility for dashboard HTTP endpoint calls.
 * Adds Authorization header from sessionStorage business key.
 */

export function getAuthHeaders(): Record<string, string> {
  const key = sessionStorage.getItem("becca_business_key");
  return key ? { Authorization: `Bearer ${key}` } : {};
}
