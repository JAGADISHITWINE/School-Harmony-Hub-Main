const clean = (v: string) => (v || "").trim();

export const MENUS_ME_ENDPOINT = clean(import.meta.env.VITE_MENUS_ME_ENDPOINT || "/menus/me");
