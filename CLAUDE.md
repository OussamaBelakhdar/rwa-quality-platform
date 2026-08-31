# RWA Quality Platform — contexte projet

Fork de `cypress-io/cypress-realworld-app` dont la suite de tests a été supprimée et reconstruite pour démontrer le référentiel Expert Cypress 2026. Projet portfolio : chaque décision doit être défendable devant un lead dev.

## Source de vérité
- Architecture (couches L0-L5, principes P1-P6, quality gates) : `docs/ARCHITECTURE.md` — la lire avant toute modification structurelle.
- Plan par semaine et critères de fin : `docs/PLAN.md`.
- Décisions actées : `docs/adr/`. Une décision non tracée par un ADR n'existe pas.
- Contraintes dures : `.claude/rules/` (chargées automatiquement).

## Stack
- App : React 18 + XState + Express + lowdb, front :3000, API :3001. Node = `.node-version`, **Yarn Classic 1.x uniquement**.
- Tests : Cypress 15.x, TypeScript strict (`cypress/tsconfig.json`), `cypress-split` pour le sharding, Allure + JUnit, `cypress-axe`.
- Module Playwright séparé dans `playwright/` (semaine 10).

## Commandes
- `yarn dev` — démarre front + API (reseed lowdb au démarrage)
- `yarn cypress:open` / `yarn cy:run` — suite E2E
- `yarn cy:run --env grep=@smoke` — par tag
- `yarn cy:component` — component tests
- `yarn cy:burn` — 10 runs, taux de flake par test
- `yarn cy:random` — ordre aléatoire (preuve d'isolation)
- `yarn types` — tsc strict sur app + cypress
- `yarn lint`

## Structure à respecter (extrait)
```
cypress/e2e/<domaine-metier>/     specs, jamais par page ni par outil
cypress/support/commands/         une responsabilité par fichier
cypress/support/app-actions/      accès XState via window.__xstate__ (mode test seulement)
cypress/support/intercepts/       factories qui retournent leur alias
cypress/support/selectors/        DataTestKey — union typée
cypress/plugins/                  seul point d'écriture lowdb
cypress/fixtures/builders/        builders typés, pas de JSON statique
```

## Avancement
- Semaine courante : voir `docs/PLAN.md` et l'issue GitHub épinglée.
- Ne jamais commencer une semaine N+1 tant que N n'est pas mergée sur `main`.

## Ce que Claude ne fait pas ici
- Pas de Page Objects (ADR-002). Pas de Gherkin. Pas de framework maison au-dessus de L2.
- Pas de dépendance à Cypress Cloud dans le code ou la CI.
- Ne jamais lire, afficher ou committer `.env`, `cypress.env.json`, secrets Auth0.
- Ne pas générer de test sans invoquer le skill `new-spec`.
