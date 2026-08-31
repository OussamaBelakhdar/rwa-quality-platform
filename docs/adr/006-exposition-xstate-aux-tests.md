# ADR-006 — Exposer les services XState aux tests via un registre gardé par `VITE_TEST_HOOKS`

**Statut** : proposé (implémentation semaine 3 ; gate CI en semaine 6)
**Date** : 2026-08-31
**Semaine du plan** : 3
**Révision** : v2 — après revue `adr-challenger`. La v1 plaçait le registre à un scope où trois des quatre services n'existent pas, et affirmait une parité Playwright qu'elle ne définissait pas.

## Contexte

L'architecture (§4, couche L2) annonçait un accès à l'état applicatif par `window.__xstate__` sous garde `import.meta.env.MODE === 'test'`. Ni le nom ni le garde n'existent. La réalité est plus désordonnée.

### Ce que l'amont expose réellement

| Fichier                                                                      | Service                      | Garde            | Durée de vie                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| `src/containers/App.tsx:29`                                                  | `authService`                | `window.Cypress` | **singleton de module** (`interpret(authMachine).start()`, `authMachine.ts:275`) |
| `AppAuth0.tsx:28`, `AppOkta.tsx:30`, `AppCognito.tsx:32`, `AppGoogle.tsx:15` | `authService`                | `window.Cypress` | idem                                                                             |
| `TransactionPublicList.tsx:27`                                               | `publicTransactionService`   | `window.Cypress` | par montage (`useMachine`)                                                       |
| `TransactionContactsList.tsx:27`                                             | `contactTransactionService`  | `window.Cypress` | par montage                                                                      |
| `TransactionPersonalList.tsx:27`                                             | `personalTransactionService` | `window.Cypress` | par montage                                                                      |
| `TransactionCreateContainer.tsx:41`                                          | `createTransactionService`   | **aucun**        | par montage                                                                      |

Et trois sites où `window.Cypress` ne garde pas une exposition mais **décide du comportement de l'application** :

| Fichier            | Effet                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `AppOkta.tsx:48`   | enveloppe un `useEffect` qui injecte l'auth depuis `localStorage`                                                       |
| `AppOkta.tsx:98`   | `window.Cypress && VITE_OKTA_PROGRAMMATIC ? AppOkta : withOktaAuth(AppOkta)` — **le runner choisit le composant monté** |
| `AppGoogle.tsx:51` | même mécanique pour le flux Google                                                                                      |

### Les quatre problèmes

1. **Une surface de test part en production.** `TransactionCreateContainer.tsx:41` affecte `window.createTransactionService` sans condition, précédé d'un `@ts-ignore`. Les huit autres sites sont gardés : c'est un oubli, pas un choix. Dans un build de production, la machine de création de transaction est pilotable depuis la console.
2. **Le garde dépend du runner.** `window.Cypress` est posé par Cypress. Playwright (semaine 10) ne le voit jamais.
3. **Les durées de vie sont hétérogènes.** `authService` existe avant tout montage ; les cinq autres n'existent que pendant que leur composant est monté et sont recréés au remontage. Un registre plat laisserait croire à six objets équivalents — et lire un service démonté renverrait `undefined`, ou pire, enverrait un événement à un acteur arrêté sans erreur. Dans un projet dont P4 dit « le flake est un bug », c'est une source de flake structurelle.
4. **Il n'y a pas de point unique de lecture.** Six sites, deux conventions de nommage (`contactTransactionService` côté `window`, `contactsTransactionService` côté machine), et trois machines instanciées dans `App.tsx` mais jamais exposées (`notifications`, `snackbar`, `bankAccounts`).

## Options considérées

| Option                                                                                                                | Avantages                                                                                                                                                             | Inconvénients                                                                                                                                                 | Coût (en sites touchés)                     |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **1 — Garder `window.Cypress` seul**                                                                                  | 0 modification de `src/` ; conforme à l'amont                                                                                                                         | Playwright sans app actions : la comparaison de la semaine 10 serait biaisée en faveur de Cypress. Ne corrige pas la fuite.                                   | 0, mais invalide la semaine 10              |
| **2 — Remplacer par `import.meta.env.MODE === 'test'`**                                                               | Indépendant du runner                                                                                                                                                 | `MODE` vaut `development` sous `yarn dev`, précisément le mode où les tests tournent. Et remplacer le garde amont crée un conflit à chaque resynchronisation. | 9 sites + conflits                          |
| **3 — `vite --mode test` + `.env.test`, sans registre**                                                               | Idiomatique Vite, déclaratif, relisible en revue                                                                                                                      | Résout le garde, pas la dispersion ni les durées de vie ni le nommage. On aurait 6 variables globales propres au lieu de 6 sales.                             | 9 sites                                     |
| **4 — Registre `window.__services__` gardé par `VITE_TEST_HOOKS`, livré par `.env.test` + `--mode test`** _(retenue)_ | Un seul objet à lire pour L2 ; garde indépendant du runner ; déclaratif ; blocs amont intacts donc pas de conflit ; permet de traiter les durées de vie explicitement | Deux mécanismes coexistent ; impose deux artefacts de build (cf. Conséquences)                                                                                | 9 sites d'écriture + L2 + typage + 1 job CI |
| **5 — Exposer inconditionnellement**                                                                                  | Le plus simple                                                                                                                                                        | Contredit §9.                                                                                                                                                 | inacceptable                                |

L'option 3 est la bonne réponse à la question « quel garde ? ». Elle est reprise **à l'intérieur** de l'option 4 comme mécanisme de livraison du flag : le désaccord ne porte pas sur le garde mais sur la présence d'un registre.

## Décision

### 1. Le flag

`VITE_TEST_HOOKS`, lu via `process.env.VITE_TEST_HOOKS` — **convention du dépôt** : `vite.config.ts:9-11` fait `define: { "process.env": env }`, donc l'expression est remplacée par un littéral au build et le bloc mort est éliminé. Le dépôt compte 24 `process.env.VITE_*` dans `src/` et zéro `import.meta.env` ; on ne crée pas une seconde convention.

Livraison déclarative, pas par export de shell :

```
# .env.test — commité, aucun secret
VITE_TEST_HOOKS=true
```

```jsonc
// package.json
"dev:test": "cross-env VITE_TEST_HOOKS=true concurrently ...",   // comme les autres scripts du dépôt
"build:test": "vite build --mode test"
```

### 2. Le registre et les durées de vie

`authService` est un singleton : il s'enregistre au scope module, à côté du bloc amont, dans `App.tsx` et les quatre shells SSO.

```ts
// src/containers/App.tsx — bloc amont conservé, non modifié
if (window.Cypress) {
  window.authService = authService;
}

// ajouté, au scope module : authService est un singleton
if (process.env.VITE_TEST_HOOKS === "true") {
  registerService("auth", authService);
}
```

Les services portés par un composant s'enregistrent **et se désenregistrent** depuis un effet, ce qui rend la durée de vie observable au lieu d'être subie :

```ts
// dans le composant, pour chaque service issu de useMachine
useTestHook("createTransaction", createTransactionService);
```

`useTestHook` (un hook de `src/utils/testHooks.ts`) est un `useEffect` qui écrit dans `window.__services__` au montage et supprime la clé au démontage. Conséquence contractuelle pour L2 : **une app action attend qu'un service apparaisse**, elle ne le suppose jamais présent. C'est ce qui empêche le flake décrit au problème 3.

### 3. Ce que « parité Playwright » veut dire ici

Définition opérationnelle, parce que « parité » sans définition est une opinion :

- **Parité de lecture — visée.** `getSnapshot().value` et le `context`, sérialisables, franchissent `page.evaluate` sans difficulté.
- **Parité de pilotage — visée, avec restriction.** Playwright envoie des événements **sérialisables** (`{ type, ...payload }`) depuis une closure `evaluate`. Exemple minimal :
  ```ts
  await page.evaluate(() => window.__services__.auth.send({ type: "LOGOUT" }));
  ```
- **Hors périmètre.** Aucune référence à un `Interpreter` XState v4 ne traverse la frontière : c'est une instance de classe avec `machine`, `children` (une `Map`) et des cycles — non sérialisable. La L2 Playwright s'écrit donc en closures, pas en handles.

**Limite explicite** : le registre ne répare que l'observabilité. Les trois sites `AppOkta:48`, `AppOkta:98`, `AppGoogle:51` font que sous Cypress l'application **montée n'est pas la même**. La comparaison de la semaine 10 porte donc sur les domaines hors SSO, ou bien la semaine 9 normalise aussi ces trois gardes — décision reportée à l'ADR-005, pas tranchée ici.

### 4. La fuite est corrigée séparément

`TransactionCreateContainer.tsx:41` passe sous garde `window.Cypress` comme les huit autres sites. C'est un correctif de sécurité indépendant de ce registre, proposé en amont dans sa propre PR.

### 5. Typage

Le type de `window.__services__` vit dans `src/utils/testHooks.ts` (donc dans le programme TS qui compile `src/`, ce que `cypress/tsconfig.json` ne fait pas) et est réexporté vers `cypress/support/index.d.ts`. Sans cela, le site d'écriture resterait sur `@ts-ignore`, que `rules/typescript.md` interdit.

## Conséquences

- Positives : un seul objet décrit ce que les tests peuvent atteindre. Les durées de vie sont explicites. Une surface de test qui fuitait en production est refermée. Le flag est commité et relisible en revue plutôt qu'exporté dans un shell.
- **Négative structurante — deux artefacts.** `VITE_TEST_HOOKS` est figé **au build**, pas au démarrage du serveur. Dès que la CI teste un bundle (`vite build` puis `preview`, ce que fait le workflow amont et ce que fera Playwright), il faut un build de test et un build de livraison. **L'artefact testé n'est plus l'artefact livré.** C'est le prix de l'option 4 et il est assumé ici, pas découvert en semaine 6.
- Négative : deux mécanismes d'exposition coexistent. Ils ne sont pas équivalents — `window.Cypress` est celui de l'amont, `__services__` est celui du projet, et L2 ne lit que le second.
- Négative de sécurité : `loadEnv` reprend aussi les variables `VITE_*` **du shell**. L'absence de `VITE_TEST_HOOKS` dans `.env` n'est donc pas une garantie ; seul le gate CI l'est.
- **Surveillé via : rien aujourd'hui.** Le gate — un job qui construit sans `--mode test` et vérifie l'absence de `__services__` dans `build/**/*.js` **et dans `build/**/\*.js.map`** (`vite.config.ts:18` active les sourcemaps) — est un livrable de la **semaine 6**. Tant qu'il n'existe pas, cette ligne décrit une intention, et l'ADR le dit plutôt que de cocher une case.

## Réversibilité

Comptée en sites, parce qu'un nombre se vérifie et qu'une durée ne se vérifie pas :

| À défaire                                    | Sites                        |
| -------------------------------------------- | ---------------------------- |
| Enregistrement `authService`                 | 5 (`App.tsx` + 4 shells SSO) |
| Enregistrement par composant                 | 4                            |
| `src/utils/testHooks.ts` + son type          | 1                            |
| L2 `support/app-actions/xstate.actions.ts`   | 1                            |
| `.env.test`, scripts `dev:test`/`build:test` | 2                            |
| Gate CI                                      | 1                            |

**14 sites.** Les specs (L3) ne bougent pas : elles n'appellent que `cy.appState(...)`. C'est exactement le périmètre annoncé au §10 de l'architecture — une capacité L2 se remplace sans toucher aux specs.

## Dépendance de version

Le registre expose des `Interpreter` XState **v4** (`xstate@4.38.3`, `@xstate/react@3.2.2`). C'est v4 qui fournit le troisième élément de `useMachine` (`[state, send, service]`), donc l'existence même de ces services. Une montée en v5 (`createActor`, `getSnapshot()`, disparition de `send(type, payload)` à deux arguments) réécrit L2 et le registre.
