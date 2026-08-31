# ADR-006 — Exposer les services XState aux tests via `VITE_TEST_HOOKS`, en conservant le garde `window.Cypress` de l'upstream

**Statut** : proposé (implémentation semaine 3 ; à passer « accepté » après revue `adr-challenger`)
**Date** : 2026-08-31
**Semaine du plan** : 3

## Contexte

L'architecture (§4, couche L2) annonçait un accès à l'état applicatif par `window.__xstate__`, exposé sous garde `import.meta.env.MODE === 'test'`. Lecture faite de l'upstream, aucune de ces trois affirmations n'est exacte. `src/containers/App.tsx` fait :

```ts
if (window.Cypress) {
  // Expose authService on window for Cypress
  window.authService = authService;
}
```

Trois conséquences :

1. Le nom est `window.authService`, pas `window.__xstate__`.
2. Le garde est `window.Cypress` — une variable posée par le *runner*. Un test **Playwright** (module de la semaine 10) ne la voit jamais : il n'aurait donc aucune app action, alors que la parité des capacités entre les deux outils est précisément l'argument de l'ADR-005 (« le coût d'une migration est borné à L2 + L3 »).
3. **Seul `authService` est publié.** `notificationsService`, `snackbarService` et `bankAccountsService` sont bien créés dans `App.tsx` mais ne sont pas exposés. Toute app action au-delà de l'authentification demande donc une modification de `src/`.

## Options considérées

| Option | Avantages | Inconvénients | Coût |
|---|---|---|---|
| **1 — Garder `window.Cypress` seul** | Zéro modification de `src/` ; strictement conforme à l'amont | Playwright sans app actions : soit il passe par l'UI (lent, fragile), soit la comparaison Cypress/Playwright de la semaine 10 est biaisée en faveur de Cypress. Reste limité à `authService` | 0, mais casse la semaine 10 |
| **2 — Remplacer par `import.meta.env.MODE === 'test'`** | Indépendant du runner | `MODE` vaut `development` sous `yarn dev`, qui est précisément le mode dans lequel tournent les tests : le garde serait faux au moment où on en a besoin. Et remplacer le garde amont crée un conflit à chaque `git pull upstream` | ~2 h + conflits récurrents |
| **3 — Garder `window.Cypress` et ajouter un garde `VITE_TEST_HOOKS`** *(retenue)* | Le bloc amont reste intact (pas de conflit de merge) ; le nouveau bloc est explicite, indépendant du runner, et pilotable par variable d'environnement ; couvre les quatre services | Deux gardes coexistent, à documenter | ~3 h dans `src/`, une ligne de script |
| **4 — Exposer inconditionnellement** | Le plus simple | Surface de test présente dans tout build ; contredit §9 | 0 et inacceptable |

## Décision

Conserver le bloc `window.Cypress` de l'upstream **tel quel**, et lui ajouter un second point d'exposition :

```ts
// src/containers/App.tsx — conservé de l'upstream, non modifié
if (window.Cypress) {
  window.authService = authService;
}

// ajouté : indépendant du runner, piloté au build
if (import.meta.env.VITE_TEST_HOOKS === "true") {
  window.__services__ = {
    auth: authService,
    notifications: notificationsService,
    snackbar: snackbarService,
    bankAccounts: bankAccountsService,
  };
}
```

- `VITE_TEST_HOOKS` est **absent** de `.env`, donc absent de tout build par défaut. Il est posé explicitement par les scripts de test (`VITE_TEST_HOOKS=true yarn dev`).
- La couche L2 (`support/app-actions/xstate.actions.ts`) lit `window.__services__` et **uniquement** lui. `window.authService` reste disponible mais n'est plus la voie d'accès du projet.
- Le typage de `window.__services__` vit dans `cypress/support/index.d.ts` et importe les types de machines depuis `src/machines` — jamais de redéclaration (voir `rules/typescript.md`).
- Playwright (semaine 10) consomme le même `window.__services__` : la parité de capacité entre les deux outils est vérifiable, pas postulée.

## Conséquences

- Positives : la semaine 10 compare deux outils à capacités égales. Les app actions couvrent quatre machines au lieu d'une. Le bloc amont n'est pas touché, donc aucun conflit sur `App.tsx` lors d'une resynchronisation.
- Négatives assumées : deux mécanismes d'exposition coexistent dans `App.tsx` — un lecteur pressé peut croire à une redondance. Le commentaire au-dessus de chaque bloc doit dire lequel appartient à l'amont et lequel appartient au fork.
- Négative de sécurité : une variable d'environnement mal positionnée exposerait l'état applicatif dans un build. Mitigation : `VITE_TEST_HOOKS` n'est jamais écrit dans un fichier commité, et le job CI de build vérifie l'absence de `__services__` dans le bundle produit.
- Surveillé via : une assertion dans la suite (`window.__services__` est `undefined` sur un build sans le flag) et le gate de build en CI.

## Réversibilité

Retirer le bloc = 8 lignes dans `src/containers/App.tsx` + réécriture de `support/app-actions/xstate.actions.ts` (L2). Les specs (L3) ne bougent pas : elles n'appellent que `cy.appState(...)`. Coût estimé : 2 h. C'est exactement le périmètre annoncé au §10 de l'architecture — une capacité L2 se remplace sans toucher aux specs.
