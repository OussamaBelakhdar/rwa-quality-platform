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

## Semaine 1 — fondations (2026-08-31)

| Métrique                                      | Valeur                                                          | Note                                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Specs E2E                                     | **8**                                                           | `cypress/e2e/00-foundations/`                                                                                          |
| Tests                                         | **20**                                                          | 20 passants, 0 en quarantaine. Dont un test qui échoue réellement, son échec intercepté par `cy.on("fail")` et asserté |
| Durée de suite (séquentiel, Electron)         | **12 s**                                                        | mesure locale, non shardée                                                                                             |
| Stabilité                                     | **3/3 exécutions consécutives vertes**                          | aucun retry déclenché                                                                                                  |
| Filtrage par tag                              | fonctionnel                                                     | `--env grep=@foundations` → 8 specs                                                                                    |
| Capacités L2 livrées                          | 4 commandes, 1 app action, 3 factories d'intercept              | `getBySel`, `getBySelLike`, `seed`, `login`                                                                            |
| Clés `data-test` typées                       | 75                                                              | union littérale, faute de frappe = erreur de compilation                                                               |
| `yarn types` / `tsc -p cypress` / `yarn lint` | verts                                                           | —                                                                                                                      |
| Isolation (`yarn cy:random`)                  | **3 ordres aléatoires, 19/19 à chaque fois**                    | graines 989457388, 43520517, 162811761 ; ordre rejouable via `CY_RANDOM_SEED`                                          |
| Taux de flake (`yarn cy:burn`)                | **0,00 %**                                                      | 10 exécutions × 19 tests = 190 exécutions, 0 échec, retries désactivés. Seuil §6 : 2 %                                 |
| Durée du burn                                 | 3 min 04                                                        | 10 exécutions séquentielles                                                                                            |
| Revue `test-reviewer`                         | **passée, 8 points bloquants corrigés**                         | dont `yarn types` qui ne compilait pas `cypress/`                                                                      |
| Assertions vérifiées par mutation             | 2/2 discriminantes                                              | specs 05 et 06 : inverser l'attendu fait bien échouer                                                                  |
| Garde-fou sélecteurs                          | `yarn check:selectors`                                          | 75 clés, `src/` et l'union comparées dans les deux sens ; chaîné dans `yarn lint`                                      |
| Règles TS appliquées au code de test          | `no-explicit-any`, `ban-ts-comment` en `error` sur `cypress/**` | vérifié par sonde : les deux rejettent                                                                                 |
| **Base de référence semaine 2**               | **12–13 s** pour 20 tests                                       | sans `cy.session` : `cy.login` charge `/signin` puis la spec charge sa page — deux chargements par test                |

## Semaine 2 — `cy.session` (2026-09-01)

Mesure à périmètre égal : les **8 specs de la semaine 1**, 20 tests, même machine, Electron.

| Métrique                     | Avant                                 | Après   | Écart     |
| ---------------------------- | ------------------------------------- | ------- | --------- |
| Durée de suite               | 12–13 s                               | **8 s** | **−35 %** |
| Chargements de page par test | 2 (`/signin` puis la page de la spec) | 1       | −50 %     |

| Autre                                   | Valeur                                                          |
| --------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Suite complète (22 tests, auth incluse) | 10–11 s                                                         |
| Isolation `yarn cy:random`              | 3 ordres, 22/22 — le cache de session ne crée pas de couplage   |
| `yarn cy:burn`                          | 10 × 22 = 220 exécutions, **0,00 %**                            |
| Login UI restant                        | **1 spec** (`e2e/auth/login.cy.ts`, 2 tests)                    |
| Chemin d'échec de `validate()`          | **exercé et prouvé**                                            | `e2e/auth/session.cy.ts` ; sans `validate()` le test échoue (vérifié par mutation) |
| `Cypress.stop()`                        | contrat vérifié en suite, démonstration réelle hors specPattern | `yarn cy:demo:stop`                                                                |
