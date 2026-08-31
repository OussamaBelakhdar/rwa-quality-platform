# Règles de test — contraintes dures (non négociables)

Dérivées des principes P1-P6 de `docs/ARCHITECTURE.md`. Le hook `check-spec.sh` en bloque une partie ; le reste est vérifié en revue par l'agent `test-reviewer`.

1. **Isolation** — chaque spec commence par `cy.seed(...)`. Aucun test ne lit un état laissé par un autre. `yarn cy:random` doit passer.
2. **Pas de login UI** hors de `cypress/e2e/auth/`. Partout ailleurs : `cy.login(username)` (cy.session).
3. **Interdit** : `cy.wait(<nombre>)`, `it.only`, `it.skip`, sélecteurs `#id` / `.class`, accès direct à lowdb depuis une spec, mot de passe en dur dans le code.
4. **`beforeEach` ≤ 3 lignes** : seed, login, visit. Au-delà, la préparation descend en L2 (commande ou app action).
5. **Un `it` = un comportement**. Pas de `it` de plus de 25 lignes.
6. **Tags obligatoires** sur chaque `describe` : un domaine (`@transactions`, `@auth`, …) + un niveau (`@smoke` ou `@regression`). `@quarantine` uniquement avec un commentaire `// QUARANTINE: #<issue> <date>`.
7. **Niveau de test** : avant d'écrire un E2E, vérifier la grille ADR-004. Si le comportement se prouve en component test ou via `cy.request`, l'E2E est refusé.
8. **Intercepts** : toujours via une factory de `support/intercepts/` qui retourne son alias. Pas de `cy.intercept` inline avec un body de plus de 3 lignes.
9. **Sélecteurs** : `cy.getBySel(key)` avec `key: DataTestKey`, ou `cy.findByRole` (Testing Library). Ajouter un `data-test` dans `src/` est autorisé et doit mettre à jour `selectors/data-test.ts`.
10. **Retries** : `runMode: 2` est une mesure, pas une solution. Un test qui a nécessité un retry en CI est traité comme flaky (skill `flake-diagnosis`).
