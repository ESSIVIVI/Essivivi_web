/**
 * Stockage des jetons. L'access vit en mémoire (jamais écrit sur disque) ; le refresh est conservé dans
 * localStorage pour survivre à un rechargement de la PWA. localStorage peut être indisponible (navigation
 * privée, stockage bloqué) : tout accès est protégé et l'application reste utilisable sans.
 */
const REFRESH_KEY = "essivivi.refresh";

let accessToken: string | null = null;
let refreshFallback: string | null = null; // si localStorage est inaccessible

export const tokenStore = {
  getAccess: () => accessToken,
  setAccess(token: string | null) {
    accessToken = token;
  },
  getRefresh(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY) ?? refreshFallback;
    } catch {
      return refreshFallback;
    }
  },
  setRefresh(token: string | null) {
    refreshFallback = token;
    try {
      if (token) localStorage.setItem(REFRESH_KEY, token);
      else localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* stockage indisponible : on garde la valeur en mémoire */
    }
  },
  clear() {
    accessToken = null;
    this.setRefresh(null);
  },
};
