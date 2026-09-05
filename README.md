# RWA Quality Platform

**FR** — Fork de [`cypress-io/cypress-realworld-app`](https://github.com/cypress-io/cypress-realworld-app) dont la suite de tests a été supprimée puis reconstruite de zéro, en dix semaines, sur une application réelle (React + XState + Express + lowdb). Chaque décision structurante est un ADR ; **une décision non tracée n'existe pas**.

**EN** — A fork of `cypress-io/cypress-realworld-app` whose test suite was deleted and rebuilt from scratch over ten weeks, against a real application. Every structural decision is an ADR; **an untraced decision does not exist**.

## Les chiffres · The numbers

|                                      |                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Tests                                | **71** E2E · **27** composant · **47** unitaires · **8** Playwright WebKit |
| Durée · Duration                     | 76 s (E2E séquentiel) · 20 s (composant) · 9 s (WebKit)                    |
| Flake                                | **0,00 %** — `cy:burn`, 10 exécutions, retries forcés à zéro               |
| Couverture · Coverage                | 80,25 % statements · 57,33 % branches                                      |
| Quality gates                        | **12**, dont une qui prouve les onze autres                                |
| Règles de gate prouvées par mutation | **38**, 50 cas rejoués à chaque `yarn lint`                                |
| ADR                                  | **12**                                                                     |

Tout est reproductible : [`docs/metrics.md`](docs/metrics.md) donne la commande derrière chaque chiffre.

## Cinq décisions qui expliquent le reste · Five decisions

| Décision                                                                                                          | Le chiffre qui l'a tranchée · The number that settled it                                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [**ADR-003** — paralléliser sans Cypress Cloud](docs/adr/003-parallelisation-sans-cypress-cloud.md)               | Un compte tiers casserait P6 : « reproductible par un inconnu en 3 commandes ». `cypress-split` sur 4 shards, zéro secret.                     |
| [**ADR-004** — la grille composant / API / E2E](docs/adr/004-grille-composant-api-e2e.md)                         | Les deux défauts trouvés en semaine 5 sont props → rendu : **18 ms en composant contre 283 ms en E2E**. Le ratio est publié, jamais ciblé.     |
| [**ADR-009** — Auth0 par `cy.origin`, pas par l'API](docs/adr/009-login-auth0-programmatique-vs-cy-origin.md)     | Décision **inversée par une mesure** : les 27 appels à `cy.login` produisent **11 connexions réelles**, pas 27. L'argument de coût était faux. |
| [**ADR-005** — coexistence Playwright, bornée par WebKit](docs/adr/005-coexistence-playwright.md)                 | Migrer coûterait **3 442 lignes sur 3 653 (94 %)**. Obtenir WebKit en coûte 5 scénarios.                                                       |
| [**ADR-012** — les gates sont prouvées, ou elles ne comptent pas](docs/adr/012-prouver-les-gates-par-mutation.md) | **Sept garde-fous** de ce dépôt avaient cessé de garder. Cinq échouaient _ouvert_. Aucun n'a été trouvé par la CI.                             |

## Ce que ce dépôt démontre · What it demonstrates

- **Des décisions révisées par la mesure, pas défendues.** ADR-009 a vu sa décision s'inverser sur un chiffre ; ADR-001 a été révisé après le premier run ; ADR-005 a corrigé sa propre lecture des couches. Les révisions sont dans le texte, pas effacées.
- **Des garde-fous qui échouent fermé.** Sept ont été pris en défaut, dont un dans le code écrit pour les empêcher. La réponse n'est pas la vigilance : c'est [`check-gates.js`](scripts/check-gates.js), qui refuse toute règle sans preuve par mutation.
- **Une gouvernance de l'IA fondée sur une mesure.** Six specs demandées à un LLM sans contexte : **6/6 bloquées, 34 violations** — et **11 défauts que seule une revue humaine voit**. Deux specs ne devaient pas exister, dont une qui testait un comportement inexistant. [`docs/ia-revue.md`](docs/ia-revue.md).
- **Un coût de migration mesuré, pas estimé.** Et le constat qu'aucun chiffre ne donnait : _une suite bien découpée ne partage pas du code entre deux outils, elle partage un contrat._

## Démarrer · Getting started

```bash
nvm use              # 22.20.0 — cf. .node-version
corepack enable      # Yarn Classic 1.x : le projet est incompatible Yarn Modern
yarn && yarn dev:test # front :3000, API :3001 — dev:test, pas dev (ADR-006)
yarn cy:run          # la suite E2E
```

Le module Playwright s'installe à part — c'est la borne 1 d'[ADR-005](docs/adr/005-coexistence-playwright.md), et **son coût est une exception assumée à P6** :

```bash
cd playwright && yarn && yarn install:browsers && yarn test
```

## Aller plus loin · Further reading

[Architecture, principes, quality gates](docs/ARCHITECTURE.md) · [Plan par semaine](docs/PLAN.md) · [Les 12 ADR](docs/adr/) · [Chiffres et mesures](docs/metrics.md) · [Journal semaine par semaine](docs/journal.md) · [Revue des specs générées par IA](docs/ia-revue.md) · [Diagnostic de flakiness](docs/flakiness-report.md)
