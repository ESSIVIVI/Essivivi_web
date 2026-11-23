# Essivivi_web

Application web (PWA) d'ESSIVIVI-Sarl : gestion des ventes et des dépôts de boissons.
React + TypeScript + Vite + Tailwind, consomme l'API Django du dépôt `Essivivi_backend`.

## Démarrage

```bash
npm install
cp .env.example .env.local     # puis adapter VITE_API_URL si besoin
npm run dev                    # http://localhost:5173
```

L'API doit tourner (par défaut `http://localhost:8000/api/v1`) et autoriser l'origine
`http://localhost:5173` (variable `CORS_ALLOWED_ORIGINS` du backend).

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérifie les types puis construit `dist/` (avec service worker PWA) |
| `npm run typecheck` | Vérification TypeScript seule |
| `npm test` | Tests unitaires (Vitest) |

## Déploiement (Vercel)

Variable d'environnement : `VITE_API_URL` = URL publique de l'API Render, préfixe `/api/v1` inclus.
Penser à ajouter le domaine Vercel dans `CORS_ALLOWED_ORIGINS` du backend.
