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
| --------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Suite complète (22 tests, auth incluse) | 10–11 s                                                         |
| Isolation `yarn cy:random`              | 3 ordres, 22/22 — le cache de session ne crée pas de couplage   |
| `yarn cy:burn`                          | 10 × 22 = 220 exécutions, **0,00 %**                            |
| Login UI restant                        | **1 spec** (`e2e/auth/login.cy.ts`, 2 tests)                    |
| Chemin d'échec de `validate()`          | **exercé et prouvé**                                            | `e2e/auth/session.cy.ts` ; sans `validate()` le test échoue (vérifié par mutation)                                                          |
| `Cypress.stop()`                        | contrat vérifié en suite, démonstration réelle hors specPattern | `yarn cy:demo:stop`                                                                                                                         |
| Règle #6 (tags) outillée                | `check-spec.sh`                                                 | vérifié par 3 sondes : sans tag → bloqué, domaine seul → bloqué, conforme → passe                                                           |
| Garde-fou préfixes                      | `check:selectors` couvre `DataTestPrefix`                       | vérifié : un préfixe inventé est nommé                                                                                                      |
| Assertions vérifiées par mutation       | 4                                                               | specs 05, 06 et les deux tests de `auth/session.cy.ts`                                                                                      |
| Coût réel de `cy.seed()`                | **1,5–5 ms** par appel                                          | mesuré, pas supposé : ~40 ms sur les 25 tests, soit **0,25 %** d'une suite de 16 s. L'hypothèse « prochain gisement de temps » était fausse |
| Déterminisme du seed                    | mêmes IDs après reseed                                          | c'est ce qui permet au cache `cy.session` de survivre d'un test à l'autre                                                                   |
| Assertions vérifiées par mutation       | **6**                                                           | specs 05, 06, 08 et les deux de `auth/session.cy.ts`                                                                                        |

## Semaine 3 — App Actions typées (2026-09-01)

| Métrique                                     | Valeur                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests                                        | **26** (25 + `cy.appState`)                                                                                                                                                          |
| Expositions `window` non gardées dans `src/` | **0** (9 sur 9 gardées ; la fuite de `TransactionCreateContainer` est fermée)                                                                                                        |
| Points d'exposition lus par L2               | **1** (`window.__services__`) au lieu de 6 dispersés                                                                                                                                 |
| Casts non vérifiés dans `cypress/`           | **0**                                                                                                                                                                                |
| Contrat de typage                            | `support/typage.contract.ts` — 6 `@ts-expect-error`, vérifié par mutation : élargir `DataTestKey` à `string` casse `yarn types`                                                      |
| Registre absent d'un build par défaut        | **vérifié à l'exécution** : `window.__services__ === undefined` après `yarn build` ; présent après `yarn build:test`                                                                 |
| ADR acceptés                                 | 001, 002, 006                                                                                                                                                                        |
| `yarn cy:burn`                               | 10 × 26 = 260 exécutions, **0,00 %**                                                                                                                                                 |
| Suite                                        | 26/26, 17 s ; ordre aléatoire 26/26                                                                                                                                                  |
| Note d'environnement                         | le burn échoue au lancement du navigateur si des processus Cypress traînent (`browser CRI connection was reset`) — le script le distingue d'un échec de suite et le dit              |
| Autocomplétion                               | **prouvée**, pas capturée                                                                                                                                                            | `yarn check:autocompletion` interroge le service de langage TypeScript : `cy.getBySel("` propose les 75 clés. Discriminant — élargir `DataTestKey` à `string` fait tomber la liste à 0 |
| Services enregistrés                         | 8                                                                                                                                                                                    | dont `userOnboarding`, livré mais non exercé (aucun utilisateur seedé sans compte bancaire — semaine 4)                                                                                |
| Revue `adr-challenger` sur ADR-002           | passée, 5 points corrigés                                                                                                                                                            | dont une faille réelle : un `data-test` écrit en dur échappait au typage                                                                                                               |
| Couche L2                                    | 14 fichiers, 513 lignes dont 205 de commentaires                                                                                                                                     | coût **mesuré** de l'option retenue, pas estimé                                                                                                                                        |
| `yarn cy:burn` semaine 3                     | 10 × 26 = 260 exécutions, **0,00 %**                                                                                                                                                 |
| `yarn cy:run` / `cy:random`                  | **34/34** dans les deux cas (l écart de 4 est corrigé)                                                                                                                               |
| `yarn cy:burn`                               | 10 × 34 = **340 exécutions, 0,00 %**                                                                                                                                                 |
| Tests                                        | **35** (+1 contrat : refus du doublon de username)                                                                                                                                   |
| Garde serveur `/testData`                    | **vérifiée** : 404 sous `NODE_ENV=production`, `/checkAuth` à 401 comme contrôle                                                                                                     |
| Isolation, preuve déterministe               | les **deux ordres adverses** passent : la spec qui vide la base placée en premier, puis en dernier. La garantie vient du `cy.seed()` de chaque `beforeEach`, pas d'un tirage heureux |
| Doublon de `username`                        | **refusé en 409**. Avant : deux utilisateurs homonymes créés silencieusement, et `POST /login` en retournait un au hasard                                                            |

## Semaine 4 — après revue `test-reviewer`

| Métrique                          | Valeur                                                                                                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests                             | **37** · `cy:run` et `cy:random` tous deux à 37/37 · burn 10 × 37 = **370 exécutions, 0,00 %**                                                                                                                                           |
| ADR                               | 001, 002, 006, **007** — tous acceptés                                                                                                                                                                                                   |
| `TaskMap`                         | branchée **côté handler** (vérifié par mutation). Côté appel, impossible à durcir : les surcharges natives de `cy.task` sont permissives et le declaration merging ajoute sans retirer. Le hook refuse donc `cy.task` brut dans une spec |
| Règle #1 (`cy.seed`)              | **outillée** — le hook la fait respecter ; elle ne l'était par personne, et `api/testdata.cy.ts` la violait                                                                                                                              |
| `cy.appState`                     | **query retriable** (`cy.window().its().its().invoke().its()`). Une version bâtie sur `.then` capturait la valeur une fois : `.should()` ne relisait jamais la machine                                                                   |
| Bug fonctionnel corrigé           | le builder produisait des utilisateurs sans `defaultPrivacyLevel` : leurs transactions recevaient `privacyLevel: null` et étaient **invisibles du flux public**                                                                          |
| Doublon de `username`             | refusé en 409 (avant : homonyme créé et `POST /login` en retournait un au hasard)                                                                                                                                                        |
| Ordre `--spec` honoré par Cypress | **vérifié** dans les deux sens en comparant les lignes `Running:`                                                                                                                                                                        |
| `data/database.json`              | **retiré du suivi git** — le commit précédent y avait embarqué un utilisateur de test, hash bcrypt inclus                                                                                                                                |
| Casts dans `cypress/`             | **0**                                                                                                                                                                                                                                    |
