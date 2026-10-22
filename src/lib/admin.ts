import { buildApiUrl } from "./config";

export const ADMIN_SESSION_KEY = "spb.fan-management.password";

export function getStoredAdminState(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.sessionStorage.getItem(ADMIN_SESSION_KEY));
}

export function getAdminPassword(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ADMIN_SESSION_KEY);
}

export async function signInAdmin(password: string): Promise<void> {
  if (!password) {
    throw new Error("관리자 비밀번호를 입력해 주세요.");
  }

  const response = await fetch(buildApiUrl("/admin/session"), {
    method: "POST",
    headers: {
      "x-admin-password": password,
    },
  });

  if (!response.ok) {
    throw new Error("관리자 비밀번호가 올바르지 않습니다.");
  }

  window.sessionStorage.setItem(ADMIN_SESSION_KEY, password);
}

export function lockAdminSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
}
