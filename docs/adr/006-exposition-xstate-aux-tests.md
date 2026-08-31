# ADR-006 — Exposer les services XState aux tests via `VITE_TEST_HOOKS`, en conservant le garde `window.Cypress` de l'upstream

**Statut** : proposé (implémentation semaine 3 ; à passer « accepté » après revue `adr-challenger`)
**Date** : 2026-08-31
**Semaine du plan** : 3

## Contexte

L'architecture (§4, couche L2) annonçait un accès à l'état applicatif par `window.__xstate__`, exposé sous garde `import.meta.env.MODE === 'test'`. Lecture faite de l'upstream, aucune de ces deux affirmations n'est exacte, et la réalité est plus désordonnée que prévu.

**Cinq services sont exposés, depuis six fichiers, avec deux gardes différents — dont un absent :**

| Fichier                                                                                     | Service                      | Garde            |
| ------------------------------------------------------------------------------------------- | ---------------------------- | ---------------- |
| `src/containers/App.tsx:29`                                                                 | `authService`                | `window.Cypress` |
| `src/containers/AppAuth0.tsx:28`, `AppOkta.tsx:30`, `AppCognito.tsx:32`, `AppGoogle.tsx:15` | `authService`                | `window.Cypress` |
| `src/components/TransactionPublicList.tsx:27`                                               | `publicTransactionService`   | `window.Cypress` |
| `src/components/TransactionContactsList.tsx:27`                                             | `contactTransactionService`  | `window.Cypress` |
| `src/components/TransactionPersonalList.tsx:27`                                             | `personalTransactionService` | `window.Cypress` |
| `src/containers/TransactionCreateContainer.tsx:41`                                          | `createTransactionService`   | **aucun**        |

Trois conséquences :

1. **Une surface de test part en production.** `TransactionCreateContainer` fait `window.createTransactionService = createTransactionService` sans condition, précédé d'un `@ts-ignore`. Ce n'est pas un choix, c'est un oubli : les cinq autres sites sont gardés. Dans un build de production, n'importe qui peut piloter la machine de création de transaction depuis la console.
2. **Le garde `window.Cypress` dépend du runner.** Il est posé par Cypress lui-même. Un test **Playwright** (module de la semaine 10) ne le voit jamais : il n'aurait aucune app action, alors que la parité des capacités entre les deux outils est précisément l'argument de l'ADR-005 (« le coût d'une migration est borné à L2 + L3 »). Comparer les deux outils avec des capacités inégales fausserait la conclusion.
3. **L'exposition est éparpillée.** Six sites, deux conventions de nommage (`contactTransactionService` côté `window` mais `contactsTransactionService` côté machine), et des services créés mais jamais exposés (`notificationsService`, `snackbarService`, `bankAccountsService`, tous trois instanciés dans `App.tsx`). Il n'y a pas de point unique où lire ce que les tests peuvent atteindre.

## Options considérées

| Option                                                                            | Avantages                                                                                                                                                                           | Inconvénients                                                                                                                                                                                                                      | Coût                                  |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **1 — Garder `window.Cypress` seul**                                              | Zéro modification de `src/` ; strictement conforme à l'amont                                                                                                                        | Playwright sans app actions : soit il passe par l'UI (lent, fragile), soit la comparaison Cypress/Playwright de la semaine 10 est biaisée en faveur de Cypress. Reste limité à `authService`                                       | 0, mais casse la semaine 10           |
| **2 — Remplacer par `import.meta.env.MODE === 'test'`**                           | Indépendant du runner                                                                                                                                                               | `MODE` vaut `development` sous `yarn dev`, qui est précisément le mode dans lequel tournent les tests : le garde serait faux au moment où on en a besoin. Et remplacer le garde amont crée un conflit à chaque `git pull upstream` | ~2 h + conflits récurrents            |
| **3 — Garder `window.Cypress` et ajouter un garde `VITE_TEST_HOOKS`** _(retenue)_ | Le bloc amont reste intact (pas de conflit de merge) ; le nouveau bloc est explicite, indépendant du runner, et pilotable par variable d'environnement ; couvre les quatre services | Deux gardes coexistent, à documenter                                                                                                                                                                                               | ~3 h dans `src/`, une ligne de script |
| **4 — Exposer inconditionnellement**                                              | Le plus simple                                                                                                                                                                      | Surface de test présente dans tout build ; contredit §9                                                                                                                                                                            | 0 et inacceptable                     |

## Décision

Conserver les blocs `window.Cypress` existants **tels quels** (pas de conflit sur un futur `git pull upstream`), et ajouter **un point d'exposition unique** dans `src/containers/App.tsx` :

```ts
// conservé de l'upstream, non modifié
if (window.Cypress) {
  window.authService = authService;
}

// ajouté : point unique, indépendant du runner, piloté au build
if (import.meta.env.VITE_TEST_HOOKS === "true") {
  window.__services__ = {
    auth: authService,
    notifications: notificationsService,
    snackbar: snackbarService,
    bankAccounts: bankAccountsService,
  };
}
```

Les services portés par des composants (`publicTransactionService`, `contactTransactionService`, `personalTransactionService`, `createTransactionService`) s'enregistrent dans le même registre depuis leur composant, sous le même garde.

**Et corriger le défaut trouvé** : `TransactionCreateContainer.tsx:41` passe sous garde comme les cinq autres sites. C'est une correction de sécurité, pas un refactor — elle part dans sa propre PR, en amont si possible.

- `VITE_TEST_HOOKS` est **absent** de `.env`, donc absent de tout build par défaut. Les scripts de test le posent explicitement (`VITE_TEST_HOOKS=true yarn dev`).
- La couche L2 (`support/app-actions/xstate.actions.ts`) lit `window.__services__` et **uniquement** lui.
- Le typage vit dans `cypress/support/index.d.ts` et importe les types depuis `src/machines` — jamais de redéclaration (`rules/typescript.md`).
- Playwright consomme le même registre : la parité de capacité est vérifiable, pas postulée.

## Conséquences

- Positives : la semaine 10 compare deux outils à capacités égales. Un seul endroit décrit ce que les tests peuvent atteindre, au lieu de six. Une surface de test qui fuitait en production est refermée. Le bloc amont n'est pas touché, donc aucun conflit sur `App.tsx` lors d'une resynchronisation.
- Négatives assumées : deux mécanismes d'exposition coexistent dans `App.tsx` — un lecteur pressé peut croire à une redondance. Le commentaire au-dessus de chaque bloc doit dire lequel appartient à l'amont et lequel appartient au fork.
- Négative de sécurité : une variable d'environnement mal positionnée exposerait l'état applicatif dans un build. Mitigation : `VITE_TEST_HOOKS` n'est jamais écrit dans un fichier commité, et le job CI de build vérifie l'absence de `__services__` dans le bundle produit.
- Surveillé via : une assertion dans la suite (`window.__services__` est `undefined` sur un build sans le flag) et le gate de build en CI.

## Réversibilité

Retirer le registre = ~8 lignes dans `src/containers/App.tsx` et une ligne par composant enregistré + réécriture de `support/app-actions/xstate.actions.ts` (L2). Les specs (L3) ne bougent pas : elles n'appellent que `cy.appState(...)`. Coût estimé : 2 h. C'est exactement le périmètre annoncé au §10 de l'architecture — une capacité L2 se remplace sans toucher aux specs.
