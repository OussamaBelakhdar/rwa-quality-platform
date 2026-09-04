# Architecture de la plateforme de test — RWA Quality Platform

**Statut** : v1.0 — cible du projet sur 10 semaines
**Périmètre** : Cypress Real World App (React + XState + Express + lowdb), Cypress 15.x, TypeScript strict
**Auteur** : Oussama Belakhdar — QA Orchestration Architect, ISTQB CTAL-TM

---

## 1. Principes d'architecture

Six règles. Toute contribution qui en viole une est refusée en revue.

| #   | Principe                                                     | Conséquence concrète                                                                                                                  |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **Un test = un état initial déterministe**                   | Aucun test ne dépend d'un autre ; seed par test via plugin Node ; ordre d'exécution aléatoire en CI                                   |
| P2  | **L'UI ne sert qu'à tester l'UI**                            | Login, seeding, navigation vers l'état cible passent par API ou App Actions. Un seul test parcourt le formulaire de login             |
| P3  | **Le niveau de test le plus bas qui prouve le comportement** | Grille de décision composant / API / E2E appliquée avant d'écrire (ADR-004). Un E2E qui pourrait être un test de composant est refusé |
| P4  | **Le flake est un bug, pas un aléa**                         | Zéro `cy.wait(ms)`. Tout échec intermittent est diagnostiqué, corrigé ou mis en quarantaine avec ticket — jamais relancé "pour voir"  |
| P5  | **Le code de test est du code de production**                | TS strict, lint, revue obligatoire, ADR pour toute décision structurante, pas de logique métier dupliquée entre helpers               |
| P6  | **Reproductible par un inconnu en 3 commandes**              | `yarn && yarn dev && yarn cy:run` — sans compte Cloud, sans secret, sans doc supplémentaire                                           |

---

## 2. Vue en couches

```
┌─────────────────────────────────────────────────────────────┐
│ L5  GOUVERNANCE      quality gates · métriques · ADR · IA   │
├─────────────────────────────────────────────────────────────┤
│ L4  EXÉCUTION        GitHub Actions · Docker · sharding      │
│                      · reporting · quarantaine               │
├─────────────────────────────────────────────────────────────┤
│ L3  SPECS            e2e/ (par domaine métier)               │
│                      component/ (à côté des composants)      │
│                      api/ (contrats Express)                 │
├─────────────────────────────────────────────────────────────┤
│ L2  CAPACITÉS        custom commands · app actions           │
│                      · intercept factories · sélecteurs      │
├─────────────────────────────────────────────────────────────┤
│ L1  DONNÉES & ENV    plugin Node (seed/reset) · builders     │
│                      · fixtures typées · config par env      │
├─────────────────────────────────────────────────────────────┤
│ L0  SYSTÈME SOUS TEST  RWA front :3000 · API :3001 · lowdb   │
└─────────────────────────────────────────────────────────────┘
```

**Règle de dépendance** : une couche n'appelle que la couche directement inférieure. Une spec (L3) n'accède jamais à lowdb (L1) directement — elle passe par une commande (L2) qui appelle une tâche (L1). C'est ce qui permet de remplacer lowdb par Postgres, ou Cypress par Playwright, sans réécrire les specs.

---

## 3. Structure du dépôt

```
rwa-quality-platform/
├── cypress/
│   ├── e2e/
│   │   ├── 00-foundations/          # internes Cypress (pédagogique, tagué @foundations)
│   │   ├── auth/                    # login UI, session, sso (branche feat/auth0)
│   │   ├── transactions/            # création, liste, détail, likes, commentaires
│   │   ├── notifications/
│   │   ├── bank-accounts/
│   │   ├── user-settings/
│   │   └── network/                 # cas réseau injectés (500, latence, vide)
│   ├── api/                         # tests de contrat Express via cy.request
│   ├── support/
│   │   ├── e2e.ts                   # entrypoint : imports, hooks globaux, axe
│   │   ├── component.ts             # entrypoint component testing
│   │   ├── commands/
│   │   │   ├── auth.commands.ts     # cy.login, cy.loginViaApi
│   │   │   ├── data.commands.ts     # cy.seed, cy.createUser, cy.createTransaction
│   │   │   ├── dom.commands.ts      # cy.getBySel, cy.getByRole
│   │   │   └── index.ts
│   │   ├── app-actions/
│   │   │   └── xstate.actions.ts    # registre window.__services__ (VITE_TEST_HOOKS)
│   │   ├── intercepts/
│   │   │   ├── transactions.intercepts.ts   # factories d'intercept réutilisables
│   │   │   └── notifications.intercepts.ts
│   │   ├── selectors/
│   │   │   └── data-test.ts         # constantes data-test centralisées
│   │   └── index.d.ts               # declaration merging Cypress.Chainable
│   ├── plugins/
│   │   ├── index.ts                 # setupNodeEvents : enregistre les tâches
│   │   ├── db.task.ts               # proxy HTTP vers /testData — aucune écriture lowdb
│   │   └── env.task.ts              # lecture .env, validation des variables
│   ├── fixtures/
│   │   └── builders/                # userBuilder(), transactionBuilder() — pas de JSON statique
│   └── tsconfig.json                # strict, paths @support/*, @plugins/*
├── backend/testdata-routes.ts       # endpoints /testData étendus (seul écrivain lowdb)
├── src/**/*.cy.tsx                  # component tests à côté des composants (convention RWA)
├── playwright/                      # 5 scénarios critiques, même structure de domaines
│   ├── tests/
│   ├── fixtures/
│   └── playwright.config.ts
├── .github/workflows/
│   ├── e2e.yml                      # matrice 4 shards, Chrome + Firefox
│   ├── component.yml
│   ├── quarantine.yml               # non bloquant, tests @quarantine
│   └── report.yml                   # Allure → GitHub Pages
├── docs/
│   ├── ARCHITECTURE.md              # ce document
│   ├── adr/
│   │   ├── 001-frontiere-expose-env-et-conventions-de-specs.md
│   │   ├── 002-typer-et-durcir-les-app-actions.md
│   │   ├── 003-parallelisation-sans-cypress-cloud.md
│   │   ├── 004-grille-composant-api-e2e.md
│   │   ├── 005-coexistence-playwright.md          # semaine 10, à venir
│   │   ├── 006-exposition-xstate-aux-tests.md
│   │   ├── 007-endpoints-de-test-dans-le-backend.md
│   │   ├── 008-factories-d-intercept-nommees-par-intention.md
│   │   ├── 009-login-auth0-programmatique-vs-cy-origin.md
│   │   ├── 010-fournisseur-oidc-local-pour-le-flux-auth0.md
│   │   └── 011-cypress-cloud-pour-cy-prompt.md
│   ├── flakiness-report.md
│   └── metrics.md                   # chiffres suivis (cf. §8)
├── cypress.config.ts
├── .env                             # commité, sans secret (ports, seed, mot de passe public)
└── README.md                        # 1 page, FR/EN, décisions + chiffres
```

**Décisions de structure** :

- `e2e/` par **domaine métier**, pas par type de test ni par page. Un recruteur y lit le produit, pas l'outil.
- `support/commands/` **éclaté par responsabilité** — un `commands.ts` de 600 lignes est le signal n°1 d'une suite non maintenue.
- `intercepts/` en **factories nommées par intention** (`interceptPublicTransactions()` espionne, `stubPublicTransactionsEnErreur()` coupe le backend) — le stub réseau est une capacité partagée, pas du code inline dans chaque spec. La forme paramétrée `interceptTransactions({ status: 500 })` annoncée jusqu'en semaine 4 a été écartée : elle cachait la frontière espion/stub sur le site d'appel (ADR-008).
- `fixtures/builders/` plutôt que JSON : un builder typé avec defaults + overrides évite les 40 fichiers `user-with-no-bank-account.json`.
- Aucun dossier `pages/` ou `pageObjects/` — décision ADR-002, justifiée par l'accès XState.
- Extension `.cy.ts` et `specPattern: "cypress/{e2e,api}/**/*.cy.{ts,tsx}"` (l'upstream utilise `cypress/tests/**/*.spec.ts`). Changement acté en semaine 0 : une seule convention de fichier pour e2e, api et component, celle que ciblent les garde-fous du dépôt. `api/` reste un **répertoire frère** de `e2e/`, pas un sous-dossier : c'est un niveau de test distinct au sens d'ADR-004, et le ranger sous `e2e/` par commodité d'outillage effacerait la distinction que la grille sert à faire.

---

## 4. Composants et interfaces

### L1 — Données & environnement

| Composant                    | Interface                                                                                                                         | Responsabilité                                                                                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `db.task.ts`                 | `cy.task('db:reset', scenario)` · `db:createUser` · `db:createTransaction`, typées par `TaskMap`                                  | **Proxy HTTP vers `/testData`** — n'écrit jamais dans `data/database.json`. Entrées et sorties typées ; les sorties viennent de `src/models`                                                                                   |
| `backend/testdata-routes.ts` | `POST /testData/seed/:scenario` (`default` \| `empty`) · `POST /testData/user` (`withBankAccount`) · `POST /testData/transaction` | **Seul écrivain lowdb.** Le serveur tient son instance en mémoire : toute écriture derrière son dos diverge ou est écrasée. Un scénario inconnu est refusé en 400 plutôt que seedé au hasard                                   |
| `env.task.ts`                | `cy.task('env:validate')` au `before()` global                                                                                    | Vérifie `expose.apiUrl`, `env.defaultPassword`, et que `/testData` répond. **Prouvé** : contre un serveur lancé sans `dev:test`, la suite s'arrête en **119 ms** avec un message qui nomme la cause et cite ADR-006 et ADR-007 |
| `builders/`                  | `userBuilder().withoutBankAccount().build()`                                                                                      | Defaults valides, écarts explicites. Le mot de passe n'y est pas : `cy.createUser` l'injecte depuis `cy.env` (règle #3)                                                                                                        |
| `cypress.config.ts`          | `expose: { apiUrl, coverage, codeCoverage }` · `env: { defaultPassword }` · `e2e.baseUrl`                                         | Frontière `expose` (config publique) / `env` (secrets) — voir ADR-001. Une seule source pour les ports ; override par `CYPRESS_*` en CI                                                                                        |

### L2 — Capacités

| Composant           | Interface                                                                                            | Règle                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.commands.ts`  | `cy.login(username?)` → `cy.session` + `cy.request('/login')`                                        | `validate()` appelle `/checkAuth`. Le mot de passe vient de `Cypress.env`, jamais en dur                                                                                                                                                                                                                                                                                                                                           |
| `data.commands.ts`  | `cy.seed('default' \| 'empty')` · `cy.createUser` · `cy.createTransaction`                           | Wrapper typé sur les tâches ; les specs ne connaissent pas lowdb. `rich` retiré du contrat en semaine 4 : un scénario opaque est moins lisible qu'une création explicite                                                                                                                                                                                                                                                           |
| `dom.commands.ts`   | `cy.getBySel(key: DataTestKey)`                                                                      | `DataTestKey` est un type union généré depuis `selectors/data-test.ts` — une faute de frappe est une erreur de compilation                                                                                                                                                                                                                                                                                                         |
| `xstate.actions.ts` | `cy.appState(nom)` (lecture) · `sendToService(nom, evenement)` et `completeOnboarding()` (pilotage)  | Lit `window.__services__`, peuplé **uniquement** si `process.env.VITE_TEST_HOOKS === 'true'` — valeur figée **au build** (`.env.test` + `--mode test`, donc `yarn dev:test`). Attend qu'un service apparaisse, ne le suppose jamais présent. **Pas de setter générique** `cy.appState(nom, etat)` : écrire un état arbitraire dans une machine contourne ses invariants. On pilote par événements, la machine décide. Voir ADR-006 |
| `*.intercepts.ts`   | `intercept…` (espion) · `delay…`/`mutate…` (espion modifiant) · `stub…` (le backend n'est pas joint) | Chaque factory retourne son alias typé `` `@${string}` `` pour `cy.wait`. Le **préfixe dit la famille** : c'est la seule information qu'une revue doit lire sans ouvrir la factory, parce qu'un stub, lui, peut mentir sur le contrat. Voir ADR-008                                                                                                                                                                                |

### L3 — Specs

Contrat d'une spec :

```ts
describe("Transactions — création", { tags: ["@transactions", "@smoke"] }, () => {
  beforeEach(() => {
    cy.seed("default"); // L1 via L2 — état déterministe (P1)
    cy.login("Katharina_Bernier"); // session cachée (P2)
    cy.visit("/transaction/new");
  });
  it("refuse un montant supérieur au solde", () => {
    /* … */
  });
});
```

- `beforeEach` en trois lignes maximum : seed, auth, visit. Plus long = la préparation appartient à L2.
- Tags obligatoires : domaine + niveau (`@smoke`, `@regression`, `@quarantine`).
- Une assertion de comportement par `it`, pas de `it` à 40 lignes.

### L4 — Exécution

| Composant       | Décision                                                              | Alternative écartée (ADR-003)                                                  |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Runner          | GitHub Actions, image `cypress/browsers:node-22-chrome-*-ff-*`        | Runner self-hosted (coût de maintien)                                          |
| Parallélisation | `cypress-split` sur matrice `[1..4]`                                  | Cypress Cloud (payant), Sorry-Cypress (incompatible ≥ 12.6), Currents (payant) |
| Navigateurs     | Chrome (bloquant) + Firefox (non bloquant, hebdo)                     | WebKit — impossible en Cypress, couvert par le module Playwright               |
| Retries         | `runMode: 2` avec rapport des tests ayant nécessité un retry          | `retries: 0` (trop de faux rouges) ; `retries: 5` (masque le flake)            |
| Artifacts       | Vidéo + screenshots **uniquement sur échec**                          | Vidéo systématique (coût stockage, temps)                                      |
| Reporting       | JUnit (annotations PR) + Allure (GitHub Pages)                        | Mochawesome (pas d'historique)                                                 |
| Quarantaine     | Workflow séparé, tags `@quarantine`, non bloquant, ticket obligatoire | Skip silencieux (`it.skip`)                                                    |

### L5 — Gouvernance

Voir §6 (quality gates) et §8 (métriques).

---

## 5. Flux d'exécution d'un test

```
CI trigger (PR)
  → env:validate (fail-fast)
  → cypress-split : distribution des specs par durée historique
  → par shard :
      docker cypress/browsers
      yarn dev (front + API) en arrière-plan, wait-on :3000 :3001
      cypress run --browser chrome --env grep=<tags>
        → beforeEach : db:reset → db:createUser → cy.session (cache hit dès le 2ᵉ test)
        → spec
        → afterEach : screenshot si échec
  → agrégation JUnit → annotations PR
  → Allure → GitHub Pages
  → quality gate (§6)
```

Temps cible : **< 6 min** de PR à verdict pour la suite complète sur 4 shards. Chiffre réel publié dans `docs/metrics.md`.

---

## 6. Quality gates

| Gate                                  | Seuil                                                                                                               | Bloquant                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Suite `@smoke` (Chrome)               | 100 % vert                                                                                                          | Oui — merge                                                         |
| Suite `@regression` (Chrome)          | 100 % vert hors `@quarantine`                                                                                       | Oui — merge                                                         |
| Tests ayant nécessité un retry        | ≤ 2 % de la suite                                                                                                   | Oui — sinon ticket flake obligatoire avant merge                    |
| Firefox                               | 100 % vert                                                                                                          | Non — job hebdo, issue auto si rouge                                |
| Component tests                       | 100 % vert                                                                                                          | Oui — merge                                                         |
| `cypress-axe` pages clés              | 0 violation `critical` / `serious`                                                                                  | Oui — merge (`moderate` = warning)                                  |
| Couverture (`@cypress/code-coverage`) | Pas de seuil bloquant                                                                                               | Non — tendance publiée, un seuil sur une app démo serait du théâtre |
| Quarantaine                           | ≤ 5 tests, chacun avec ticket daté < 14 j                                                                           | Oui — au-delà, la PR de quarantaine est refusée                     |
| TS / lint                             | 0 erreur                                                                                                            | Oui                                                                 |
| Chaîne d'approvisionnement            | Actions GitHub épinglées par SHA de commit complet ; `permissions:` minimales sur `GITHUB_TOKEN` ; `yarn.lock` figé | Oui                                                                 |

---

## 7. Stratégie de niveaux (résumé — la grille complète et ses dix cas sont dans ADR-004)

| Comportement                                         | Niveau             | Raison                                                |
| ---------------------------------------------------- | ------------------ | ----------------------------------------------------- |
| Validation d'un champ de formulaire                  | Composant          | Pas de réseau, pas de navigation, 200 ms              |
| Rendu conditionnel d'une liste                       | Composant          | Props → rendu, isolable                               |
| Contrat d'une route Express                          | API (`cy.request`) | Le front n'est pas le sujet                           |
| Parcours métier multi-écrans (créer une transaction) | E2E                | Seul niveau qui prouve l'intégration front/XState/API |
| Comportement sous erreur réseau                      | E2E + intercept    | Le backend réel ne produit pas de 500 à la demande    |
| Login SSO externe                                    | E2E `cy.origin`    | Domaine tiers, pas isolable                           |
| Régression visuelle                                  | Hors périmètre     | Coût/valeur défavorable sur une app démo (documenté)  |

Une couche héritée non revendiquée : `src/__tests__` (tests unitaires Vitest de l'upstream) est conservée telle quelle. Elle n'entre pas dans le ratio ci-dessous et n'est pas maintenue par ce projet.

Ratio **observé et publié**, non ciblé — ADR-004. Une cible de ratio se retourne contre la grille : atteindre un pourcentage obligerait à écrire des tests que la grille ne réclame pas. Le ratio est une conséquence de la grille, pas une consigne. Il est relu à chaque clôture de semaine dans `metrics.md`, et l'écart est commenté.

---

## 8. Métriques suivies

Publiées dans `docs/metrics.md`, mises à jour à chaque semaine du plan.

| Métrique                               | Définition                                                                 | Cible                                    |
| -------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| Durée de suite (séquentiel / 4 shards) | Wall-clock CI                                                              | < 6 min shardé                           |
| Taux de flake                          | Tests échouant puis passant au retry / total, sur 10 runs (`yarn cy:burn`) | < 2 %                                    |
| Taille de la quarantaine               | Tests `@quarantine` actifs                                                 | ≤ 5, âge < 14 j                          |
| Temps gagné par `cy.session`           | Durée suite avec vs sans cache de session                                  | Chiffre brut                             |
| Couverture front / back                | `@cypress/code-coverage`                                                   | Tendance                                 |
| Violations a11y                        | axe, par sévérité                                                          | 0 critical/serious                       |
| Ratio composant / API / E2E            | Nombre de tests par niveau                                                 | **aucune** — publié, non ciblé (ADR-004) |

---

## 9. Sécurité et environnements

- Secrets : `.env.local` et `cypress.env.json` gitignorés ; en CI, GitHub Secrets → `CYPRESS_*`.
- `window.__services__` peuplé uniquement si `process.env.VITE_TEST_HOOKS === 'true'`, valeur figée au build. La CI produit donc **deux artefacts** : celui qu'on teste et celui qu'on livre. `loadEnv` reprenant aussi les variables `VITE_*` du shell, l'absence du flag dans `.env` n'est pas une garantie : seul le gate de build (semaine 6, inspecte `build/**/*.js` **et** les sourcemaps) l'est. Voir ADR-006.
- **Les routes `/testData` n'existent pas hors mode test.** `backend/app.ts:72` ne monte le routeur que si `NODE_ENV` vaut `test` ou `development`. Vérifié : sous `NODE_ENV=production`, `POST /testData/seed`, `POST /testData/user` et `GET /testData/users` répondent **404**, tandis que `/checkAuth` répond 401 — le serveur tourne, les routes de test n'existent simplement pas. C'est le pendant serveur de `VITE_TEST_HOOKS` (ADR-006) : deux mécanismes différents, une même garantie, aux deux extrémités.
- `.env` est **commité** (hérité de l'upstream) et ne contient aucun secret : tailles de seed, ports, `SEED_DEFAULT_USER_PASSWORD=s3cret` documenté publiquement. Les secrets réels vont dans `.env.local` (chargé en premier par `cypress.config.ts`) et `cypress.env.json`, tous deux gitignorés. Pas de `.env.example` : le `.env` commité en tient lieu.
- Auth0 (semaine 9) : tenant dédié, utilisateur de test, credentials en secrets, aucun token dans les vidéos (masquage `cy.origin` + `log: false`).
- Aucune donnée réelle : lowdb seedé par builders, réinitialisé par test.

---

## 10. Extension et migration

| Scénario                           | Ce qui change                                                                              | Ce qui ne change pas                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Passage de lowdb à Postgres        | `backend/test-data.routes.ts` uniquement (`db.task.ts` est un proxy HTTP, il ne bouge pas) | Specs, commandes, builders, tâches                |
| 30 → 500 specs                     | Nombre de shards, durée historique pour `cypress-split`                                    | Structure, gates, principes                       |
| Ajout de Playwright sur un domaine | Dossier `playwright/tests/<domaine>`                                                       | Builders (partagés via `shared/`), seed via API   |
| Migration complète vers Playwright | L2 réécrit (fixtures Playwright ≈ commands), L3 réécrit                                    | L1 intégral, L4 quasi intégral, L5 intégral       |
| Ajout de l'IA (`cy.prompt`, LLM)   | Nouveau gate : revue humaine obligatoire des specs générées, tag `@ai-generated`           | Tous les autres gates s'appliquent sans exception |

Le coût d'une migration Cypress → Playwright est ainsi borné à L2 + L3 — c'est l'argument central d'ADR-005 et ce qu'un client paie réellement quand il demande "combien coûte le changement d'outil".

---

## 11. Ce que cette architecture ne fait pas (délibérément)

- Pas de couche BDD/Gherkin : coût de maintenance élevé, valeur nulle sans partie prenante non technique.
- Pas de Page Objects : redondants avec App Actions + sélecteurs typés sur cette app.
- Pas de Cypress Cloud en dépendance dure : le projet doit tourner sans compte tiers (P6).
  La démonstration Test Replay prévue en semaine 7 a été **annulée**, pas réalisée — cette
  ligne affirmait le contraire jusqu'en semaine 10. Sa valeur (post-mortem d'un échec CI)
  était remplaçable sans compte, et elle l'a été : artefacts sur échec, rapport HTML agrégé,
  annotations `::error::`, `cy:burn` (`docs/metrics.md`). Seule exception ouverte, et bornée
  à un fichier hors `specPattern` : la démonstration `cy.prompt` d'ADR-011, tenue par la gate
  `check-cloud.js`.
- Pas de visual regression : `@percy/cypress` et `cy.visualSnapshot` sont **présents dans l'upstream et retirés ici** — le calcul coût/valeur est écrit, ce n'est pas un oubli.
- Pas d'installation avec `--ignore-scripts` : `patch-package` s'exécute en postinstall (patches MUI v5). Le durcissement passe par le SHA-pin des actions et des `permissions:` minimales.
- Pas de framework maison au-dessus de Cypress : les abstractions s'arrêtent à L2.

---

## Index des ADR

| ADR | Décision                                                                                   | Semaine |
| --- | ------------------------------------------------------------------------------------------ | ------- |
| 001 | `Cypress.expose()` comme frontière config/secret, et conventions de specs                  | 0       |
| 002 | Typer et durcir les App Actions héritées de l'upstream                                     | 3       |
| 003 | Paralléliser par `cypress-split` sans Cloud, et retirer les workflows hérités qui échouent | 6       |
| 004 | Grille de décision composant / API / E2E                                                   | 8       |
| 005 | Coexistence et critères de migration Playwright                                            | 10      |
| 006 | Exposition des services XState aux tests (`VITE_TEST_HOOKS`)                               | 3       |
| 007 | Endpoints d'écriture dans le backend pour le seeding des tests                             | 4       |
| 008 | Factories d'intercept nommées par intention, pas paramétrées                               | 5       |
