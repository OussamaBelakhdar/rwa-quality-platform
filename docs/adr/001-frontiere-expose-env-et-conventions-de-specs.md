# ADR-001 — Adopter la frontière `Cypress.expose()` / `Cypress.env()` et figer les conventions de specs au moment du fork

**Statut** : accepté
**Date** : 2026-08-31
**Semaine du plan** : 0

## Contexte

Le plan initial prévoyait en semaine 0 une « migration de Cypress vers 15.x » avec un ADR listant les breaking changes v14→v15. Lecture faite de l'upstream (`cypress-io/cypress-realworld-app`, branche `develop`), cette tâche n'existe pas : le dépôt est déjà sur la branche 15.x, et sa configuration a déjà été refondue.

Faits relevés au moment du fork :

| Constat                                                                                                                                                                       | Source dans l'upstream        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `"cypress": "15.17.0"`                                                                                                                                                        | `package.json`                |
| `"typescript": "5.8.3"`, `"xstate": "4.38.3"`, `"react": "18.2.0"`, `"eslint": "^10.0.2"`                                                                                     | `package.json`                |
| `22.20.0`                                                                                                                                                                     | `.node-version`               |
| La config sépare `expose:` (11 clés publiques : `apiUrl`, `coverage`, `codeCoverage`, `paginationPageSize`, clés des fournisseurs SSO…) de `env:` (1 clé : `defaultPassword`) | `cypress.config.ts`           |
| `Cypress.expose("apiUrl")` est déjà utilisé dans le code de test                                                                                                              | `cypress/support/commands.ts` |
| `specPattern: "cypress/tests/**/*.spec.{js,jsx,ts,tsx}"`                                                                                                                      | `cypress.config.ts`           |
| `projectId: "7s5okt"`                                                                                                                                                         | `cypress.config.ts`           |

Écrire l'ADR d'une migration que je n'ai pas faite serait invérifiable en trente secondes par un lecteur. Il reste en revanche une décision réelle à acter : **quelle frontière je maintiens entre configuration publique et secret**, et quelles conventions de dépôt je fige avant d'écrire la première spec — c'est-à-dire au seul moment où elles coûtent zéro.

## Options considérées

### A. Frontière config / secret

| Option                                                                           | Avantages                                                                                                                                                                                | Inconvénients                                                                                                                                             | Coût                                          |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **A1 — Tout dans `env:`** (usage historique)                                     | Une seule API à connaître ; tout le tooling tiers la documente                                                                                                                           | Aucune distinction lisible entre `apiUrl` (public, commitable) et `defaultPassword` (secret) ; rien n'empêche un secret de finir dans un log ou une vidéo | 0 à court terme, dette de sécurité permanente |
| **A2 — Frontière `expose:` / `env:` telle que l'upstream l'a posée** _(retenue)_ | La frontière est déclarative et relisible : ce qui est dans `expose` est publiable par construction ; aligne le fork sur l'amont, donc les futurs `git pull upstream` ne conflictent pas | Deux APIs à connaître ; `Cypress.expose()` est récent, peu documenté hors du dépôt officiel                                                               | 0 (déjà en place) ; discipline de revue       |
| **A3 — Objet de config maison importé en TS**                                    | Typage total, une seule source                                                                                                                                                           | Réinvente ce que Cypress fournit ; casse l'override par `CYPRESS_*` en CI ; diverge de l'amont                                                            | ~1 j + friction CI permanente                 |

### B. Convention de nommage des specs

| Option                                                 | Avantages                                                                                                                                              | Inconvénients                                                                                                                    | Coût                                                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **B1 — Garder `cypress/tests/**/\*.spec.ts`\*\*        | Zéro divergence avec l'amont                                                                                                                           | Deux conventions dans le même dépôt (`.spec.ts` en e2e, `.cy.tsx` en component) ; les garde-fous outillés doivent gérer les deux | 0 maintenant, ambiguïté permanente                                                                                                                           |
| **B2 — `cypress/e2e/**/_.cy.{ts,tsx}`\*\* _(retenue)\* | Une seule convention pour e2e et component ; `e2e/` par domaine métier (§3 de l'architecture) ; les hooks et le skill `new-spec` ciblent un seul motif | Divergence avec l'amont sur le chemin des specs                                                                                  | **0 aujourd'hui** : la suite héritée est supprimée en semaine 0, il y a 0 fichier à renommer. Le même changement après la semaine 5 coûterait ~40 renommages |

### C. `projectId`

| Option                                   | Avantages                                               | Inconvénients                                                                                                                                          | Coût    |
| ---------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| **C1 — Conserver `projectId: "7s5okt"`** | Test Replay disponible sans configuration               | C'est l'identifiant Cloud **de l'upstream**, pas le mien : mes runs alimenteraient un projet tiers. Contredit P6 (« reproductible sans compte tiers ») | 0       |
| **C2 — Retirer `projectId`** _(retenue)_ | P6 tenu, aucune dépendance Cloud dans le dépôt ni la CI | La démonstration Test Replay de la semaine 7 devra passer par `--record --key` fourni à la volée, hors dépôt                                           | 1 ligne |

## Décision

1. **Conserver et faire respecter la frontière `expose:` / `env:`.** Toute valeur publiable (URL, port, seuil, breakpoint, identifiant client OAuth public) va dans `expose:`. Seul un secret va dans `env:`. Une valeur publique remise dans `env:` est un défaut de revue, pas un détail de style.
2. **`specPattern: "cypress/e2e/**/\*.cy.{ts,tsx}"`\*\*, appliqué en semaine 0 pendant que le coût est nul.
3. **Retirer `projectId`** de `cypress.config.ts`.

## Ce que cet ADR n'affirme pas

Il ne fait aucune affirmation sur une version de Cypress postérieure à celle constatée dans `package.json` au moment du fork (`15.17.0`), ni sur un calendrier de publication. La frontière `expose`/`env` est adoptée pour ce qu'elle apporte aujourd'hui — une séparation lisible entre config et secret — indépendamment de toute version future.

## Conséquences

- Positives : la question « est-ce que cette valeur peut être commitée ? » a une réponse mécanique. Le dépôt n'a aucune dépendance Cloud. Un seul motif de fichier à connaître pour les hooks, le skill `new-spec` et `cypress-split`.
- Négatives assumées : divergence de chemin avec l'amont, qui rendra un futur `git pull upstream` plus bruyant sur `cypress/`. Acceptée : la suite est réécrite de zéro, il n'y a rien à resynchroniser.
- **Deux incohérences assumées, à ne pas découvrir plus tard :**
  - `.circleci/config.yml` référence Percy et les specs supprimées. Il n'est **pas** touché : ADR-003 posera « j'ajoute GitHub Actions, je ne migre pas CircleCI ». CircleCI n'est pas branché sur ce fork, la config est donc inerte — mais elle est fausse, et c'est écrit ici plutôt que laissé à découvrir.
  - `src/__tests__` (8 fichiers de tests unitaires Vitest) est **conservé**. Il n'appartient pas à la suite Cypress héritée et l'architecture ne l'a jamais revendiqué. « Suite = 0 test » vaut pour la suite Cypress, pas pour le dépôt.
- Surveillé via : le hook `check-spec.sh` (qui ne cible que `.cy.ts`/`.cy.tsx` et les couches `cypress/support` et `cypress/plugins`) et la revue `test-reviewer`.

## Réversibilité

- Revenir sur la frontière `expose`/`env` : L1 (`cypress.config.ts`) + tous les appels `Cypress.expose(...)` en L2. Mécanique, ~1 h.
- Revenir sur `specPattern` : 1 ligne de config + `git mv` sur l'ensemble des specs. Coût proportionnel au nombre de specs — d'où la décision de trancher maintenant.
- Remettre `projectId` : 1 ligne.
