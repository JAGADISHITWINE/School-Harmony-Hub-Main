export function hasPersistedUser() {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem("sms_auth");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: { user?: unknown } };
    return Boolean(parsed?.state?.user);
  } catch {
    return false;
  }
}

export function hasAuthToken() {
  if (typeof window === "undefined") return false;
  return Boolean(sessionStorage.getItem("sms_token"));
}

export function isBackendConfigured() {
  return Boolean((import.meta.env.VITE_API_BASE_URL || "").trim());
}

export function isLikelyAuthenticated() {
  return isBackendConfigured() && hasPersistedUser() && hasAuthToken();
}
