import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setAccessToken, clearAccessToken } from "@/lib/api";

interface AuthState {
  accessToken: string | null;
  workspaceId: string | null;
  userId: string | null;
  role: "admin" | "member" | "guest" | null;
  setTokens: (accessToken: string) => void;
  logout: () => void;
}

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      workspaceId: null,
      userId: null,
      role: null,

      setTokens(accessToken) {
        const payload = parseJwt(accessToken);
        setAccessToken(accessToken);
        set({
          accessToken,
          workspaceId: payload?.wid ?? null,
          userId: payload?.sub ?? null,
          role: payload?.role ?? null,
        });
      },

      logout() {
        clearAccessToken();
        set({ accessToken: null, workspaceId: null, userId: null, role: null });
      },
    }),
    {
      name: "cotask-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
      },
    },
  ),
);
