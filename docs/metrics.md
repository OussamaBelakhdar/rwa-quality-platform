# Métriques

Mises à jour à chaque clôture de semaine. Définitions au §8 de `docs/ARCHITECTURE.md`.
Une case vide signifie « pas encore mesurable », jamais « non mesuré ».

## Semaine 0 — fondation (2026-08-31)

| Métrique                       | Valeur                          | Note                                                                                                                                                            |
| ------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cypress                        | 15.17.0                         | hérité de l'amont, aucune migration effectuée                                                                                                                   |
| Node                           | 22.20.0                         | `.node-version`                                                                                                                                                 |
| Specs E2E                      | **0**                           | suite héritée supprimée (23 fichiers)                                                                                                                           |
| Component tests                | **0**                           | 5 fichiers supprimés, reconstruits en semaine 8                                                                                                                 |
| Tests unitaires Vitest hérités | 8                               | conservés, hors périmètre du projet                                                                                                                             |
| `yarn types`                   | vert, 1,7 s                     | racine                                                                                                                                                          |
| `tsc -p cypress/tsconfig.json` | vert                            | strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`                                                                                              |
| `yarn lint`                    | vert                            | eslint + prettier                                                                                                                                               |
| `yarn install`                 | 77 s                            | `patch-package` inclus                                                                                                                                          |
| Dépendances retirées           | 2                               | `@percy/cypress`, `@percy/cli`                                                                                                                                  |
| Vulnérabilités Dependabot      | voir l'onglet Security du dépôt | héritées de l'amont, non introduites ici. Le compte varie tant que GitHub scanne ; à figer et traiter en semaine 6 avec la gate chaîne d'approvisionnement (§6) |
| Durée de suite                 | —                               | pas de suite                                                                                                                                                    |
| Taux de flake                  | —                               | pas de suite                                                                                                                                                    |
| Quarantaine                    | 0                               | —                                                                                                                                                               |
| Ratio composant / API / E2E    | —                               | pas de suite                                                                                                                                                    |
