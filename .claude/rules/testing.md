# Règles de test — contraintes dures (non négociables)

Dérivées des principes P1-P6 de `docs/ARCHITECTURE.md`. Le hook `check-spec.sh` en bloque une partie ; le reste est vérifié en revue par l'agent `test-reviewer`.

1. **Isolation** — chaque spec commence par `cy.seed(...)`. Aucun test ne lit un état laissé par un autre. `yarn cy:random` doit passer. `cy.seed` passe par les endpoints `/testData` du backend ; jamais d'écriture directe dans `data/database.json` ni d'import de lowdb depuis `cypress/`.
2. **Pas de login UI** hors de `cypress/e2e/auth/`. Partout ailleurs : `cy.login(username)` (cy.session).
3. **Interdit** : `cy.wait(<nombre>)`, `it.only`, `it.skip`, sélecteurs `#id` / `.class`, accès direct à lowdb depuis une spec ou un plugin, mot de passe en dur dans le code (utiliser `cy.env(['defaultPassword'])` — `Cypress.env()` est déprécié depuis Cypress 15.4 et lisible par le code de la page, voir ADR-001).
4. **`beforeEach` ≤ 3 lignes** : seed, login, visit. Au-delà, la préparation descend en L2 (commande ou app action).
5. **Un `it` = un comportement**. Pas de `it` de plus de 25 lignes.
6. **Tags obligatoires** (appliqué par `check-spec.sh` sur `cypress/e2e/` et `cypress/api/` ; `cypress/manual/` est hors du specPattern par conception) sur chaque `describe` : un domaine (`@transactions`, `@auth`, …) + un niveau (`@smoke` ou `@regression`). `@quarantine` uniquement avec un commentaire `// QUARANTINE: #<issue> <date>`.
7. **Niveau de test** : avant d'écrire un E2E, vérifier la grille ADR-004. Si le comportement se prouve en component test ou via `cy.request`, l'E2E est refusé.
8. **Intercepts** : toujours via une factory de `support/intercepts/` qui retourne son alias. Pas de `cy.intercept` inline avec un body de plus de 3 lignes.
9. **Sélecteurs** : `cy.getBySel(key)` avec `key: DataTestKey`, ou `cy.findByRole` (Testing Library). Ajouter un `data-test` dans `src/` est autorisé et doit mettre à jour `selectors/data-test.ts`.
10. **Retries** : `runMode: 2` est une mesure, pas une solution. Un test qui a nécessité un retry en CI est traité comme flaky (skill `flake-diagnosis`).
11. **Fichiers de spec en `.cy.ts`** (`specPattern: cypress/e2e/**/*.cy.{ts,tsx}`). Un fichier `.spec.ts` ne sera ni exécuté ni contrôlé par `check-spec.sh`.
12. **État XState** : lire `window.__services__` via `cy.appState` ou une app action (garde `process.env.VITE_TEST_HOOKS`, figée au build — la suite tourne contre `yarn dev:test`) via une app action de `support/app-actions/`, jamais `cy.window()` inline dans une spec. Une app action **attend** qu'un service apparaisse : les services portés par un composant n'existent que monté (ADR-006).
