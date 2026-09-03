# Projet portfolio — Référentiel Expert Cypress 2026 appliqué à la Cypress Real World App

**Cible** : fork de `cypress-io/cypress-realworld-app`, suite de tests supprimée puis reconstruite de zéro.
**Règle unique** : une semaine = un livrable mergé sur `main` + une section README + une publication LinkedIn. Rien ne démarre tant que la semaine précédente n'est pas mergée.
**Durée** : 10 semaines à 6-8 h/semaine.

---

## Semaine 0 — Fondation (prérequis, non négociable)

| Tâche                                                                                                      | Critère de fin                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fork + renommage `rwa-quality-platform`                                                                    | Dépôt public, licence MIT conservée                                                                                                              |
| Node aligné sur `.node-version` (**22.20.0**)                                                              | `node -v` correspond ; `yarn dev` up sur 3000 (front) + 3001 (API)                                                                               |
| Retirer `projectId: "7s5okt"` de `cypress.config.ts`                                                       | Plus aucune référence à Cypress Cloud dans le dépôt ni la CI (P6)                                                                                |
| `specPattern` → `cypress/e2e/**/*.cy.{ts,tsx}`                                                             | L'upstream utilise `cypress/tests/**/*.spec.ts` ; une seule convention `.cy.ts` pour e2e et component, celle que ciblent les garde-fous du dépôt |
| Supprimer `cypress/tests/**`, vider `cypress/support`, retirer `@percy/cypress` et les `cy.visualSnapshot` | Suite = 0 test, `yarn lint` vert                                                                                                                 |
| `cypress/tsconfig.json` strict                                                                             | `yarn types` passe                                                                                                                               |
| **ADR-001** — `Cypress.expose()` comme frontière config/secret                                             | ADR accepté, index d'`ARCHITECTURE.md` à jour                                                                                                    |

> Il n'y a **pas** de migration de version à faire : l'upstream est déjà sur la dernière branche stable et sa config a déjà basculé de `Cypress.env()` vers `Cypress.expose()`. Le sujet d'ADR-001 est cette frontière `expose`/`env`, pas une montée de version que je n'aurais pas faite. Les versions exactes constatées au moment du fork sont relevées dans l'ADR.

**README section** : "Pourquoi ce projet" — 10 lignes, décisions, pas de tuto.
**Lignes du référentiel couvertes** : TypeScript strict, Git, lecture d'une config existante (Diagnostic).

---

## Semaine 1 — Internes Cypress : queue, sujet, retry-ability

**Livrable** : `cypress/e2e/00-foundations/` — 8 specs pédagogiques sur l'app réelle.

- Un test qui **casse volontairement** sur un sujet capturé trop tôt, puis sa version corrigée (`.then` vs variable).
- Un test sur le détachement DOM après re-render XState (la RWA est parfaite pour ça : la liste de transactions se re-rend).
  - _Constaté en semaine 1_ : un `FETCH` envoyé à `publicTransactionService` ne détache rien si les données reviennent identiques — React réconcilie et réutilise les noeuds. Le détachement demande que le jeu de résultats change ; la spec envoie donc `FETCH` avec un filtre `amountMin/amountMax` qui vide la liste.
- Assertions mid-chain : `.should(callback)` avec retry sur plusieurs conditions.
- Démonstration `cy.press()` / `cy.stop()` (Cypress 14+).
  - _Constaté_ : c'est `Cypress.stop()`, pas `cy.stop()`, et il interrompt le runner — donc impossible à exécuter dans une suite verte. La spec 04 en vérifie le contrat ; la démonstration réelle vit dans `cypress/manual/`, lançable par `yarn cy:demo:stop`. Piège au passage : `Cypress.stop()` n'est pas une commande de la file et s'exécute à la collecte, arrêtant le runner **avant** le `cy.visit` — il faut l'appeler depuis un `cy.then`.

**README section** : "Ce que la queue de commandes change" — un schéma, trois règles.
**Référentiel** : Commandes & internes (Expert), JavaScript profond.

---

## Semaine 2 — Auth : `cy.session` + login programmatique

**Livrable** : `cy.login(username)` typée, session cachée, zéro login UI hors du test de login lui-même.

- Login via `cy.request` sur `/login` (l'API Express existe), cookie de session capturé.
  - _Constaté en semaine 2_ : le cookie ne suffit pas. `authMachine` démarre en `unauthorized` et ne consulte pas `/checkAuth` de lui-même ; il reprend l'état persisté dans `localStorage.authState`. Reconstruire cet état à la main coupleraît le code de test aux internes XState (refusé par ADR-006). Le setup de `cy.session` amorce donc la machine une fois, et le cache capture cookies **et** localStorage — c'est de là que vient le gain. `cy.request` est utilisé là où il est le bon outil : `validate()`.
- `cy.session` avec `validate()` qui vérifie `/checkAuth`.
- Un seul test `login.cy.ts` couvre l'UI ; tout le reste passe par la session.
- Mesure : temps de suite avant/après sur les 8 specs de la semaine 1 (chiffre dans le README).

**Référentiel** : Authentification (Avancé), Custom commands (Avancé), HTTP.

---

## Semaine 3 — Custom commands typées + App Actions

**Livrable** : `cypress/support/commands/` éclaté par responsabilité + `cypress/support/index.d.ts` (declaration merging) ; `cypress/support/app-actions/xstate.actions.ts`.

- L'upstream fournit déjà `getBySel`, `getBySelLike`, `login` (UI), `loginByApi`, `loginByXstate`, `logoutByXstate`, `reactComponent` — **non typés, dans un `commands.ts` unique**. La valeur ajoutée n'est pas de les inventer, c'est de les typer strictement, de les découper par responsabilité et d'y brancher `cy.session`.
- App Actions : forcer un état de machine XState sans passer par l'UI. `loginByXstate` **est** déjà ce pattern côté upstream.
  - _Constaté en semaine 3_ : le pilotage par événements est livré et exercé (`sendToService`, qui amène la machine d'auth à `authorized` sans le formulaire). L'exemple « onboarding terminé » est livré (`completeOnboarding`) mais **non exercé** : les cinq utilisateurs seedés ont tous un compte bancaire, donc le dialogue ne s'ouvre jamais. Il faudra un utilisateur sans compte — endpoints `/testData` granulaires de la semaine 4.
- ADR-002 : "Typer et durcir les App Actions héritées de l'upstream" — l'upstream n'a jamais eu de Page Objects ; l'ADR dit ce que j'ajoute (types, session, découpage) et ce que je refuse d'ajouter (une couche POM par-dessus).
- ADR-006 : exposition des services XState (`VITE_TEST_HOOKS` / `window.__services__`). Conditionne la parité d'app actions avec Playwright en semaine 10.
- Autocomplétion IDE vérifiée (capture d'écran dans le README).

**Référentiel** : Custom commands (Expert), Architecture de test (Avancé→Expert), TypeScript declaration merging, Design logiciel.

---

## Semaine 4 — Seeding et isolation : `cy.task` + plugins Node

**Livrable** : seeding déterministe par test, indépendance totale de l'ordre d'exécution.

- **Ne pas écrire dans lowdb depuis Node.** L'upstream fait son seeding par HTTP (`POST /testData/seed`, plus les tâches `filter:database` / `find:database` en axios sur `/testData`). Le serveur Express tient son instance lowdb en mémoire : écrire `data/database.json` derrière son dos diverge ou se fait écraser.
- Étendre le backend : `POST /testData/user`, `POST /testData/transaction` dans `backend/`. C'est le seul écrivain lowdb.
- `cypress/plugins/db.task.ts` devient un **proxy HTTP typé** (`db:reset`, `db:createUser`, `db:createTransaction`) au-dessus de ces endpoints, avec une interface `TaskMap`.
- Vérifier que le seed reste déterministe (IDs stables entre deux `db:reset`) pour que le cache `cy.session` de la semaine 2 survive. Si non : `db:reset` en `before()` de spec, seed incrémental en `beforeEach`. Chiffre avant/après dans le README.
- Secrets via `.env.local` et `cypress.env.json` (gitignorés). Pas de `.env.example` : le `.env` commité de l'upstream en tient lieu et ne contient aucun secret.
- Preuve d'isolation : lancer la suite en ordre aléatoire (script `yarn cy:random`) — doit passer.

**Référentiel** : Node/plugins (Expert), Architecture de test (seeding), Sécurité (secrets).

---

## Semaine 5 — Réseau : `cy.intercept` avancé

**Livrable** : `cypress/tests/e2e/network/` — cas que le backend réel ne produit pas.

**Livrable réel** : `cypress/e2e/network/` — 5 specs, 10 tests. Le dossier annoncé `cypress/tests/e2e/network/` était le chemin de l'amont, abandonné en semaine 0.

- Spy vs stub documentés sur `/transactions`.
  - _Acté en semaine 5_ : ADR-008. La forme paramétrée `interceptTransactions({ status })` promise par `ARCHITECTURE.md` §3 est écartée — elle rend `{ status: 500 }` (le backend est coupé) et `{ delay: 500 }` (le backend répond) indiscernables à la lecture. Les factories sont nommées par intention.
- Latence injectée (`delay`) → vérifier les spinners.
  - _Constaté_ : `cy.intercept(url, { delay })` ne retarde pas la vraie réponse, il sert un `StaticResponse` **vide** en retard. Retarder ce que le backend a réellement renvoyé demande `req.continue((res) => res.setDelay(ms))`.
- 500 / timeout / réponse vide → vérifier les messages d'erreur (ces cas n'existent pas dans la suite officielle).
  - _Couvert_ : 500, coupure réseau (`forceNetworkError`) et réponse vide (200 sans résultat) — les trois rendent le même écran, ce que le 4e test de `erreurs-serveur.cy.ts` établit explicitement. Le **timeout n'existe pas comme comportement de l'application** : `asyncUtils.ts:4` crée l'instance axios sans `timeout`, et axios 1.20.0 vaut `timeout: 0` par défaut — sa propre documentation dit « _a timeout is not created_ ». Rien dans `src/` ne le fixe ailleurs. Donc aucun abandon côté application, donc aucun état d'erreur à observer ; seul le navigateur finit par céder, hors de portée de l'application. Un backend lent laisse la liste en `loading` sans fin. Un E2E qui le prouvait par le succès (réponse retardée de 8 s, encore acceptée) a été écrit, mesuré — **9 s, soit 16 % de la suite** — puis **retiré** : il prouvait une propriété statique du code, avec un seuil arbitraire, ce que P3 refuse. Le constat est donc sourcé sur la ligne de code, pas sur un test lent. **C'est le seul point de la semaine 5 qui n'est couvert par aucun test**, et c'est délibéré.
  - _Constaté puis **corrigé**_ : il n'y avait **pas de message d'erreur à vérifier**. `dataMachine` a bien un état `failure` qui capture un `message` (`dataMachine`, état `failure`), mais aucun composant ne le lit. Le rendu retombe sur `showEmptyList` (`TransactionList`, `showEmptyList`) : un 500 et une coupure réseau s'affichent exactement comme un compte sans transaction. Correctif : un écran d'erreur dédié dans `TransactionList`, avec le message porté par la machine et un bouton de reprise — les trois causes sont désormais distinguées, et la reprise est testée. En voulant afficher ce message, un troisième défaut est apparu : `setMessage` lisait `event.message` alors que XState v4 range l'erreur d'un `invoke` dans `event.data`, donc le message était **toujours vide**. Corrigé aussi. Le correctif est ensuite étendu aux **trois autres surfaces bâties sur `dataMachine`** — notifications, comptes bancaires, détail de transaction — via un composant `ErrorState` partagé plutôt qu'un bloc recopié. Le détail était le pire cas : en échec il ne rendait rien, et il restait blanc pendant tout le chargement (le conteneur n'affichait « Loading... » que sur `idle`, quitté dès le `FETCH`). Tous les correctifs sont mutation-testés. Neutraliser `ErrorState` fait échouer **6 des 9** tests des deux specs d'erreur. Les trois survivants sont instructifs : deux n'assertent pas l'écran d'erreur (état de la machine, indicateur de chargement), et le troisième — « une liste vide n'est pas une erreur » — n'assertait que l'**absence** de l'écran d'erreur, ce qu'un composant cassé satisfait tout autant. Une assertion de non-existence ne porte pas de charge sous cette mutation-là. Rétablir `matches("idle")` seul fait par ailleurs échouer le test de chargement.
- Séquençage d'alias : ~~pagination des notifications~~, `cy.wait(['@page1','@page2'])`.
  - _Constaté_ : **les notifications ne paginent pas**. `notificationsMachine` appelle `GET /notifications` sans aucun paramètre de page. La seule pagination de l'application est le défilement infini des listes de transactions. Le séquençage est donc démontré là.
  - _Constaté_ : l'état `loading` de `dataMachine` ne déclare **aucune transition sur `FETCH`**. Un `FETCH` envoyé pendant le chargement de la page 1 est perdu en silence et la requête de la page 2 ne part jamais. Le séquençage commence dans la machine, pas dans le réseau.
- Modification de réponse à la volée (solde négatif, montant XXL).
  - _Constaté, dans le code de test cette fois_ : `cy.appState` était typée `string` sur la foi d'un commentaire affirmant que « les machines de cette application ont toutes des états plats ». `dataMachine.success` en a trois (l'état `success` de `dataMachine`), et la commande rendait un objet sous un type qui promettait une chaîne. Corrigé par le type `EtatXState`.
  - _Constaté puis **corrigé**_ : un montant négatif injecté dans une réponse réelle se rendait **`--$5.00`**. `TransactionAmount`, le préfixe de signe préfixe `-` pour tout paiement et `formatAmount` en produit un second. Le backend ne renvoyant jamais de négatif, le cas n'existait pour personne — mais `backend/validators.ts:87` ne valide `amount` qu'avec `isNumeric()`, sans borne inférieure : il est atteignable par l'API. Correctif : le signe affiché est le SENS de la transaction, le montant est rendu en valeur absolue. Le même correctif règle un second défaut du même endroit — `{transaction.amount && …}` rendait `-0` sur un montant nul. Deux tests de régression, mutation-testés : annuler le correctif les fait échouer.

**Référentiel** : Réseau (Expert), HTTP/REST.

---

## Semaine 6 — CI/CD : GitHub Actions, Docker, sharding sans Cloud

**Livrable** : pipeline `.github/workflows/e2e.yml` avec matrice 4 runners.

- Image officielle `cypress/browsers` (Chrome + Firefox).
- **Sharding gratuit** via `cypress-split` (Gleb Bahmutov) — pas de Cypress Cloud requis.
- Artifacts vidéo/screenshots uniquement sur échec.
- `retries: { runMode: 2, openMode: 0 }` et justification écrite.
- Rapport JUnit + Allure publié sur GitHub Pages.
- ADR-003 : "Cloud vs Currents vs cypress-split" — inclure le point protocole 12.6.0+ (Sorry-Cypress incompatible avec Cypress récent). **Doit dire explicitement : « j'ajoute GitHub Actions, je ne migre pas CircleCI »** — le `.circleci/` de l'upstream reste en place et n'est pas touché.
- Actions épinglées par SHA de commit complet, `permissions:` minimales sur `GITHUB_TOKEN`. Pas de `--ignore-scripts` : `patch-package` tourne en postinstall.
- Chiffre : temps séquentiel vs 4 shards dans le README.

**Référentiel** : CI/CD & parallélisation (Expert), Docker, YAML, Reporting.

---

## Semaine 7 — Flakiness comme discipline

**Livrable** : `docs/flakiness-report.md` + quarantaine.

- **Travailler sur la branche `flake-demo` maintenue par l'upstream** (workflow `merge-develop-into-flake-demo` dans `.github/workflows/`) : du flake réel, entretenu par l'équipe Cypress. **Aucun flake fabriqué** — un flake que j'ai écrit moi-même ne prouve que ma capacité à écrire un bug.
- Diagnostic écrit pour chacun : symptôme → hypothèse → preuve → correction.
- Étudier `fileParallelism: false` dans `vite.config.ts` (mitigation de flake déjà en place côté upstream, commentée « to prevent flakiness ») : ce qu'elle traite, ce qu'elle masque.
- Tag `@quarantine` + job CI séparé non bloquant.
- Script qui lance la suite 10× et sort un taux d'échec par test (`yarn cy:burn`).
- ~~Activer **Test Replay** sur le free tier Cypress Cloud pour un run de démonstration (500 résultats/mois suffisent) — capture dans le README.~~
  - _Non livré, et c'est une décision, pas un oubli._ Cette ligne a été écrite en semaine 0. **ADR-003 a été accepté en semaine 6**, après mesure, et son argument central est que ce dépôt tourne sans compte ni clé (P6) — au point d'écarter Cypress Cloud, Currents et sorry-cypress pour cette seule raison. Ouvrir un compte six jours plus tard pour une capture d'écran affaiblirait l'ADR sans rien prouver de plus : un plan écrit avant une décision ne l'emporte pas sur elle.
  - _Ce que Test Replay apporte, et par quoi il a été remplacé._ Sa valeur est le post-mortem d'un échec CI. Le dépôt y répond autrement, et sans compte : artefacts vidéo et captures **sur échec seulement**, rapport HTML agrégé des 4 shards publié à chaque run, annotations `::error::` lisibles sans authentification, et `yarn cy:burn` qui mesure le flake en **forçant les retries à zéro** — ce que Test Replay ne fait pas. La couverture n'est pas identique ; elle est honnête sur ce qu'elle couvre.
  - _Si la démonstration est voulue quand même_ : elle reste possible **hors CI**, sur une branche jetable, avec une clé locale jamais commitée et jamais introduite dans `.github/`. Le contrôle existe déjà — `grep -rn "record\|RECORD_KEY" .github/` doit rester vide (ADR-003, section « Surveillé via »).

**Référentiel** : Diagnostic (Expert), Debugging & profiling.

---

## Semaine 8 — Component testing + accessibilité

**Livrable** : 6 composants React testés en isolation + audit axe.

- Component tests sur `TransactionCreateStepOne`, `NotificationList`, `UserSettingsForm` etc. (dossier `src/` à côté des composants, convention RWA).
- ADR-004 : "Composant vs E2E vs API — grille de décision" appliquée à 10 fonctionnalités de l'app.
- `cypress-axe` sur 5 pages clés, violations listées, 2 corrigées dans l'app (PR visible).
- Code coverage réactivé (`yarn dev:coverage`) — chiffre dans le README.

**Référentiel** : Component testing (Expert), Qualité transverse (a11y), stratégie de couverture.

---

## Semaine 9 — `cy.origin` + SSO Auth0

**Livrable** : le flux Auth0 testé avec `cy.session` + `cy.origin`.

- Compte Auth0 gratuit, tenant SPA, `.env` non commité.
- Branche `week-9/auth0` avec `src/index.auth0.tsx` (fourni par la RWA). _Le plan
  disait `feat/auth0` ; `.claude/rules/git.md` impose `week-<n>/<sujet>` et c'est
  une contrainte dure. La règle l'emporte sur le plan qui la précède._
- Deux variantes documentées : login programmatique (API Auth0) vs `cy.origin` (UI Auth0) — quand utiliser laquelle.
- Vidéo 60 s du test qui passe. — **faite** : `cypress/videos/auth0.cy.ts.mp4`,
  4 s, non commitée (`rules/git.md` interdit les vidéos au dépôt).

**État des critères au 2026-09-03.** Le premier reste **non tenu**, et ce
document le porte tel quel plutôt que de l'adapter.

| Critère                          | État                                                                                                                                                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compte Auth0 gratuit, tenant SPA | **non tenu** — exige un compte tiers. ADR-010 constate que cette ÉTAPE contredit **P6**, tranche en faveur du principe, et livre un fournisseur OIDC local comme cible par défaut. Le tenant réel reste joignable en changeant `VITE_AUTH0_DOMAIN` |
| `.env` non commité               | tenu, et **exécutoire** depuis `check-secrets.js`                                                                                                                                                                                                  |
| Branche + `src/index.auth0.tsx`  | tenu — le fichier n'était chargé par personne, il l'est                                                                                                                                                                                            |
| Deux variantes documentées       | tenu — ADR-009, décision révisée après mesure                                                                                                                                                                                                      |
| Vidéo du test qui passe          | tenu                                                                                                                                                                                                                                               |

**Référentiel** : Authentification (Expert). C'est la ligne la plus rare sur un profil francophone — ne pas la sauter.

---

## Semaine 10 — Playwright, IA, et clôture

**Livrable** : positionnement polyglotte + gouvernance IA.

- `playwright/` : les 5 scénarios critiques (login, création de transaction, notifications, paramètres, onboarding) réécrits en Playwright TS.
- ADR-005 : "Migrer, garder ou hybrider" — tableau de décision avec critères (WebKit, DX, component testing, coût Cloud, équipe).
- **IA** : générer 3 specs avec `cy.prompt` (Cypress 15.4+, nécessite Cloud) et 3 avec un LLM externe ; revue écrite de chaque test généré comme une PR junior — assertions creuses relevées, sélecteurs fragiles corrigés. Conclusion : quand l'IA fait gagner du temps, quand elle en coûte.
- README final bilingue FR/EN : 1 page, décisions d'architecture, chiffres (temps de suite, taux de flake, couverture), liens vers les 5 ADR.
- Épingler en "Featured" sur LinkedIn.

**Référentiel** : Migration/coexistence Playwright (Expert), Gouvernance de l'IA.

---

## Matrice de couverture du référentiel

| Ligne du référentiel                 | Semaine | Preuve dans le dépôt                                                                    |
| ------------------------------------ | ------- | --------------------------------------------------------------------------------------- |
| Commandes & internes (Expert)        | 1       | `00-foundations/`                                                                       |
| Réseau cy.intercept (Expert)         | 5       | `network/`                                                                              |
| Authentification (Expert)            | 2, 9    | `cy.login`, branche `week-9/auth0`                                                      |
| Custom commands typées (Expert)      | 3       | `index.d.ts`                                                                            |
| Architecture / App Actions / seeding | 3, 4    | `app-actions/`, `plugins/db.task.ts`, `backend/test-data.routes.ts`, ADR-002, ADR-006   |
| Component testing (Expert)           | 8       | `src/**/*.cy.tsx`, ADR-004                                                              |
| Node / plugins (Expert)              | 4       | `plugins/db.task.ts` + endpoints `/testData`                                            |
| CI/CD & parallélisation (Expert)     | 6       | `e2e.yml`, ADR-003                                                                      |
| Diagnostic flakiness (Expert)        | 7       | `flakiness-report.md`, `cy:burn`, branche `flake-demo` upstream                         |
| Visual / a11y                        | 8       | `cypress-axe`, PR correctifs                                                            |
| Coexistence Playwright               | 10      | `playwright/`, ADR-005                                                                  |
| JS profond                           | 1       | tests cassés-corrigés                                                                   |
| TypeScript                           | 0, 3    | `cypress/tsconfig.json` strict, declaration merging, frontière `expose`/`env` (ADR-001) |
| Node.js                              | 4       | plugin                                                                                  |
| HTTP/REST                            | 2, 5    | `cy.request`, intercepts                                                                |
| Sélecteurs a11y-first                | 3       | `cy.getBySel` + rôles ARIA                                                              |
| Git                                  | 0-10    | ADR, PR, branches                                                                       |
| Docker & CI YAML                     | 6       | workflow                                                                                |
| Design logiciel                      | 3       | ADR-002                                                                                 |
| Debugging & profiling                | 7       | Test Replay, burn                                                                       |
| Sécurité                             | 4, 6    | `.env.local`/`cypress.env.json` gitignorés, secrets GitHub, SHA-pin des actions         |
| Gouvernance IA                       | 10      | revue des tests générés                                                                 |

**Non couvert volontairement** : visual regression (Percy/Applitools — coût, faible valeur sur une app démo) ; Currents en production (payant). Les deux sont mentionnés dans ADR-003 comme options, pas implémentés.

---

## Rythme de publication LinkedIn

Un post par semaine, le lundi, format identique : le problème rencontré → la décision → le chiffre. Jamais "j'ai appris Cypress". Le post de la semaine 7 (flakiness) et celui de la semaine 10 (Playwright) sont ceux qui génèrent le plus de commentaires : réserver du temps pour répondre.

## Critère d'abandon

Si la semaine 3 n'est pas mergée au bout de 5 semaines calendaires, le projet est réduit à 5 semaines (0, 1, 2, 3, 6) et publié tel quel. Un dépôt à 50 % publié vaut plus qu'un dépôt à 90 % privé.
