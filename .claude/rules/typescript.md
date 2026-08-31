# Règles TypeScript — dossier cypress/

- `strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess`. Aucun `any`, aucun `// @ts-ignore`. `unknown` + narrowing si nécessaire.
- Custom commands : déclarées dans `cypress/support/index.d.ts` via declaration merging de `Cypress.Chainable`. Chaque commande a une JSDoc d'une ligne (visible en autocomplétion).
- Types partagés app/tests : importer depuis `src/models` — ne jamais redéclarer `User`, `Transaction`, etc. dans `cypress/`.
- Builders : `xBuilder(overrides?: Partial<X>): X`. Defaults valides, overrides explicites.
- `cy.task` : typer entrée et sortie via une interface `TaskMap` dans `cypress/plugins/index.ts`.
- Imports : alias `@support/*` et `@plugins/*` (définis dans `cypress/tsconfig.json`), pas de `../../..`.
- `yarn types` doit passer avant tout commit. Le hook `typecheck.sh` le rappelle en fin de tour.
