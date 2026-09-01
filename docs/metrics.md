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

| Métrique                                      | Valeur                                                          | Note                                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specs E2E                                     | **8**                                                           | `cypress/e2e/00-foundations/`                                                                                                                         |
| Tests                                         | **20**                                                          | 20 passants, 0 en quarantaine. Dont un test qui échoue réellement, son échec intercepté par `cy.on("fail")` et asserté                                |
| Durée de suite (séquentiel, Electron)         | **12 s**                                                        | mesure locale, non shardée                                                                                                                            |
| Stabilité                                     | **3/3 exécutions consécutives vertes**                          | aucun retry déclenché                                                                                                                                 |
| Filtrage par tag                              | **CETTE LIGNE ÉTAIT FAUSSE** — corrigée en semaine 4            | `--env grep=@foundations` retournait « 8 specs », c'est-à-dire la totalité de la suite d'alors : rien n'était filtré. Voir la section de la semaine 4 |
| Capacités L2 livrées                          | 4 commandes, 1 app action, 3 factories d'intercept              | `getBySel`, `getBySelLike`, `seed`, `login`                                                                                                           |
| Clés `data-test` typées                       | 75                                                              | union littérale, faute de frappe = erreur de compilation                                                                                              |
| `yarn types` / `tsc -p cypress` / `yarn lint` | verts                                                           | —                                                                                                                                                     |
| Isolation (`yarn cy:random`)                  | **3 ordres aléatoires, 19/19 à chaque fois**                    | graines 989457388, 43520517, 162811761 ; ordre rejouable via `CY_RANDOM_SEED`                                                                         |
| Taux de flake (`yarn cy:burn`)                | **0,00 %**                                                      | 10 exécutions × 19 tests = 190 exécutions, 0 échec, retries désactivés. Seuil §6 : 2 %                                                                |
| Durée du burn                                 | 3 min 04                                                        | 10 exécutions séquentielles                                                                                                                           |
| Revue `test-reviewer`                         | **passée, 8 points bloquants corrigés**                         | dont `yarn types` qui ne compilait pas `cypress/`                                                                                                     |
| Assertions vérifiées par mutation             | 2/2 discriminantes                                              | specs 05 et 06 : inverser l'attendu fait bien échouer                                                                                                 |
| Garde-fou sélecteurs                          | `yarn check:selectors`                                          | 75 clés, `src/` et l'union comparées dans les deux sens ; chaîné dans `yarn lint`                                                                     |
| Règles TS appliquées au code de test          | `no-explicit-any`, `ban-ts-comment` en `error` sur `cypress/**` | vérifié par sonde : les deux rejettent                                                                                                                |
| **Base de référence semaine 2**               | **12–13 s** pour 20 tests                                       | sans `cy.session` : `cy.login` charge `/signin` puis la spec charge sa page — deux chargements par test                                               |

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

## Semaine 4 — points « Recommandé » de la revue, traités

| Amélioration                   | Preuve                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Tests                          | **40** · `cy:run` et `cy:random` à 40/40                                                                                        |
| Validation d'entrée des routes | `400` qui **nomme les champs manquants** au lieu d'un 500 au corps vide ; `senderId` inconnu nommé aussi                        |
| Traversée de chemin            | `POST /seed/..%2F..%2Fpackage` → **400**. `seedDatabaseWith` prend une union fermée, plus une chaîne libre                      |
| Ancre de chemin                | `__dirname` partout dans `database.ts` ; `process.cwd()` et `__dirname` coexistaient et auraient cassé sous un `WORKDIR` Docker |
| Source unique des scénarios    | le backend publie `GET /testData/seed/scenarios`, un contrat le compare au type `SeedScenario`                                  |
| `env:validate` (§4, §5)        | **livré et prouvé** : contre un serveur sans `dev:test`, arrêt en **119 ms** avec la cause et les ADR cités                     |
| Contrats de seeding            | **1** — la tâche `db:seed` de l'amont est retirée, `db:reset` typée reste seule                                                 |
| Duplication P5                 | la lecture de `defaultPassword` était copiée mot pour mot entre deux commandes — factorisée dans `env.commands.ts`              |
| `cypress/plugins/index.ts`     | créé : la règle le référençait, le fichier n'existait pas                                                                       |
| Tag de domaine de la spec API  | `@seeding` — `@api` décrivait le niveau, pas le domaine (règle #6)                                                              |
| `yarn cy:burn`                 | 10 × 40 = **400 exécutions, 0,00 %**                                                                                            |

## Semaine 5 — réseau (2026-09-01)

| Métrique                      | Valeur                               | Note                                                                                                           |
| ----------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Specs E2E                     | 18 fichiers (13 → 18)                | `cypress/e2e/network/` : 5 fichiers                                                                            |
| Tests                         | **52** (40 → 52)                     | 12 tests réseau                                                                                                |
| Suite complète                | vert, **48 s**                       | 52/52                                                                                                          |
| `cypress/e2e/network/` seul   | **22 s**, 12/12                      | 3 exécutions consécutives vertes                                                                               |
| `yarn cy:random`              | vert, **6 ordres sur 6**, 48 s       | preuve d'isolation (P1) maintenue. Deux mesures écartées : voir ci-dessous                                     |
| `yarn cy:burn` sur `network/` | **10 × 12 = 120 exécutions, 0,00 %** | retries forcés à zéro ; seuil §6 : 2 %                                                                         |
| Factories d'intercept         | 8 exports, **4 corps** de fonction   | ADR-008 : les exports par endpoint sont des noms, la logique de chaque famille n'existe qu'en un exemplaire    |
| Alias TypeScript              | +1 (`@fixtures/*`)                   | supprime les derniers imports relatifs vers `cypress/fixtures/` (6 sites, dont 2 en dette depuis la semaine 4) |

### Ce que le stub réseau a trouvé, que le backend ne pouvait pas produire

C'est le rendement de la semaine : six comportements que la suite ne pouvait pas
atteindre avant — quatre défauts ou risques de l'application amont, une
contrainte de conception, et un défaut du code de test lui-même.

| Constat                                                           | Preuve                                                                                                                                             | Statut                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Un **500 se rend comme une liste vide** — pas de message d'erreur | `dataMachine` entre bien en `failure` avec un `message` (`dataMachine.ts:104`) qu'aucun composant ne lit                                           | défaut amont, **constaté par 2 tests**, non corrigé ici                         |
| Une **coupure réseau** produit exactement le même rendu qu'un 500 | même état `failure`, même `empty-list-header`                                                                                                      | défaut amont, constaté                                                          |
| Un **montant négatif** se rend `--$5.00`                          | `TransactionAmount.tsx:45` préfixe `-`, `formatAmount` en produit un second                                                                        | défaut amont, constaté. Le backend n'en renvoie jamais : personne ne l'avait vu |
| Un **`FETCH` envoyé pendant `loading` est perdu en silence**      | l'état `loading` de `dataMachine` ne déclare aucune transition sur `FETCH` ; la requête de page 2 ne partait jamais                                | contrainte de conception, documentée dans la spec et dans `PLAN.md`             |
| L'application **n'a aucun timeout HTTP**                          | `asyncUtils.ts:3` crée axios sans `timeout`. L'E2E qui le prouvait par le succès a été **retiré** : 9 s pour une propriété statique, refusé par P3 | risque amont, constaté. Un backend lent laisse la liste en `loading` sans fin   |
| `cy.appState` rendait un **objet sous un type `string`**          | `dataMachine.success` a trois sous-états (`dataMachine.ts:85-99`) ; le type L2 affirmait que « toutes les machines ont des états plats »           | **défaut du code de test, corrigé** — type `EtatXState` livré en semaine 5      |

Aucun n'est atteignable sans intercept : le backend réel ne renvoie ni 500 ni
montant négatif, ne se coupe pas, et répond trop vite pour qu'un timeout se
pose. Le dernier est le plus instructif — **un test a trouvé un bug dans la
couche de test** : un type y affirmait une propriété du domaine qui était fausse.

### Deux mesures d'isolation écartées, et pourquoi elles sont écrites ici

Deux exécutions de `cy:random` ont échoué pendant la clôture — 2 tests de
`e2e/onboarding/premier-acces.cy.ts` (semaine 4), sur un `POST /login` en 401.
Ni l'une ni l'autre n'est retenue comme mesure, et la raison est vérifiable :

| Fait                                                                   | Mesure                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Les deux échecs ont eu lieu pendant qu'un **autre run Cypress** vivait | 5 processus `cypress` concurrents constatés au moment du second          |
| Durée de la première : **37 min 19 s** pour une suite de 48 s          | **46× le nominal** — le budget de 4 s des assertions n'a plus aucun sens |
| Rejeu de la graine exacte, machine libre (`CY_RANDOM_SEED=1566325581`) | **52/52** — donc ni dépendance d'ordre, ni couplage entre specs          |
| `cy:burn` sur la spec incriminée, isolée                               | **40 exécutions, 0 échec**                                               |
| `cy:random`, machine libre                                             | **6 ordres, 6 verts**, 48 s chacun                                       |

Écrit ici plutôt que supprimé pour deux raisons. La première : un vert obtenu
après avoir jeté un rouge doit dire ce qu'il a jeté, sinon c'est le vert qui
ment. La seconde : la conclusion « c'est un flake » a été formulée AVANT d'être
mesurée, et elle était fausse — le coupable est le banc de mesure, pas la spec.
C'est le même piège que la semaine 4, à l'envers.

**Ce que ça laisse ouvert** : ces tests tiennent un aller-retour `POST /login`
dans le budget de 4 s par défaut. Sous une charge 46× supérieure, ils cèdent.
Le sharding de la semaine 6 mettra plusieurs runs en parallèle sur une même
machine — c'est exactement cette condition. À revérifier là, pas à supposer.

### Deux pièges d'API relevés en écrivant

| Piège                                                       | Ce qui se passe réellement                                                                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cy.intercept(url, { delay })` pour « retarder la réponse » | construit un `StaticResponse` : c'est un **stub vide** servi en retard. Retarder la vraie réponse demande `req.continue((res) => res.setDelay(ms))` |
| Deux alias sur le même endpoint pour séquencer deux pages   | Cypress résout du **dernier** intercept déclaré au premier. L'ordre inverse fait résoudre les deux requêtes sur le même alias                       |

## Semaine 4 — isolation intra-spec : deux approches mesurées, une retenue

P1 parle de « chaque test », or `cy:random` ne mélangeait que les **fichiers**.
Deux façons de mélanger les `it` ont été essayées, et **mesurées** :

| Approche                                             | Mesure                                            | Verdict                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Réordonner `suite.tests` depuis un `before()` racine | spec de 4 tests → **3 exécutés, 1 « Skipped »**   | abandonnée — Mocha tient un pointeur sur le tableau qu'il parcourt. Un mélange qui perd des tests est pire que pas de mélange |
| Isoler chaque `it` par `--env grep=<titre>`          | un motif **inexistant** laisse passer les 4 tests | inutilisable — le filtrage par titre ne filtre pas. `grepTags` filtre, mais au niveau des fichiers                            |

**Retenu, par construction et non par échantillonnage** : `testIsolation` (défaut Cypress) réinitialise l'état navigateur entre deux `it`, et `check-spec.sh` exige désormais un `cy.seed()` **dans le `beforeEach`** — pas n'importe où dans le fichier. Le couplage entre deux `it` voisins est donc empêché à l'écriture, au lieu d'être cherché après coup par tirage.

La règle est bornée à `cypress/e2e/` et `cypress/api/` ; `cypress/manual/` est hors specPattern par conception. Vérifié : une spec e2e avec `cy.seed` hors du `beforeEach` est bloquée, les 15 specs du dépôt passent.

## Semaine 4 — le filtrage par tag ne filtrait rien

Affirmé fonctionnel depuis la semaine 1, sur la foi d'un « 8 specs found » qui
était en réalité la suite entière.

**Cause** : `@cypress/grep` 7.0.0 lit toutes ses options depuis `config.expose`
(côté Node) et `Cypress.expose()` (côté navigateur) — la même migration que
celle d'ADR-001. Or `--env grep=…` écrit dans `config.env`. Le plugin ne
trouvait donc rien, et sortait en vert après avoir tout exécuté.

**Diagnostic** : un motif volontairement inexistant (`grep=ZZZINEXISTANT`)
laissait passer les 4 tests d'une spec. Un filtre qui ne filtre pas est pire
qu'un filtre absent, parce qu'on lui fait confiance.

**Correctif** : un pont `config.env` → `config.expose` dans `setupNodeEvents`,
plus `grepFilterSpecs` activé pour le pré-filtrage des fichiers.

**Vérifié aux deux niveaux :**

| Commande                                    | Résultat                              |
| ------------------------------------------- | ------------------------------------- |
| aucun filtre                                | 13 specs, **40/40**                   |
| `--env grepTags=@auth`                      | **2 specs** (login, session), 5 tests |
| `--env grepTags=@smoke`                     | **1 spec** (login)                    |
| `--env grep=CORRIG` sur une spec de 4 tests | **1 exécuté, 3 en attente**           |
| `--env grepTags=@nexistepas`                | aucune spec retenue                   |

## Dettes soldées avant la semaine 5

| Dette                                                        | État                                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Gate de surface de test (ADR-006 + ADR-007, dû en semaine 6) | **livré** — `yarn check:surface`, 17 s                                                               |
| Cypress 15.17.0 → 15.21.1 (Dependabot #8)                    | **mergé** après évaluation : 40/40, `cy:random` 40/40, burn 400 exécutions à 0,00 %, filtrage intact |
| PR amont #1735                                               | **bloquée par le CLA Cypress non signé** — pas par l'équipe. Les 2 commentaires sont automatiques    |

### Le gate, vérifié dans les deux sens

| Contrôle                                         | Nominal              | Sous mutation                                                                   |
| ------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------- |
| `window.__services__` absent du build par défaut | ✔                   | build fait avec `build:test` → **détecté**                                      |
| `/testData` injoignable en `NODE_ENV=production` | ✔ (4 routes en 404) | backend en `NODE_ENV=development` → **4 routes détectées** (200, 400, 400, 200) |

Un `grep` du bundle aurait produit un faux positif permanent : `__services__` **est** présent dans le bundle par défaut, seule la garde est fausse à l'exécution. Le gate vérifie le comportement, pas le texte.
