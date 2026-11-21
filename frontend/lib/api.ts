import { getSession } from "next-auth/react";
import { BACKEND_URL } from "./config";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  let session = await getSession();
  let token = (session as any)?.user?.token;

  // Client-side fallback: check localStorage or retry getSession after brief hydration delay
  if (!token && typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("restro_auth_token");
      if (cached) {
        token = cached;
      }
    } catch {}

    if (!token) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      session = await getSession();
      token = (session as any)?.user?.token;
    }
  }

  // Cache token if available
  if (token && typeof window !== "undefined") {
    try {
      localStorage.setItem("restro_auth_token", token);
    } catch {}
  }

  const headers = new Headers(options.headers || {});
  
  // Apply authorization bearer header if user is logged in
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      try {
        localStorage.removeItem("restro_auth_token");
      } catch {}
    }
    throw new Error(result.error || result.message || "API request failed");
  }

  return result;
}

export default apiFetch;
